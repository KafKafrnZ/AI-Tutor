from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import structlog

from app.core.dependencies import get_current_user, limiter, require_quota
from app.core.error_handler import api_error
from app.core.guards import guard_input
from app.core.quota import consume_daily_quota
from app.core.stream_buffer import (
    StreamFailed,
    get_stream,
    new_stream,
    parse_last_event_id,
    spawn,
)
from app.models.database import Conversation, get_db
from app.schemas.api import AskRequest, ConversationSaveRequest
from modules.tutor import LLMServiceError, ask_tutor, ask_tutor_stream

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["tutor"])


@router.post("/ask")
@limiter.limit("15/minute")
async def ask_ai(request: Request, data: AskRequest, current_user: Any = Depends(require_quota)):
    question = guard_input(data.question, max_length=2000)
    context = guard_input(data.context, max_length=4000) if data.context else ""
    try:
        answer = await ask_tutor(question, context, data.history)
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc
    return {"answer": answer}


async def _produce(buf, question: str, context: str, history: list | None) -> None:
    try:
        async for token in ask_tutor_stream(question, context, history):
            await buf.push(token)
        await buf.finish()
    except LLMServiceError as exc:
        logger.warning("ai_stream_failed", error=str(exc))
        await buf.finish(error=str(exc))
    except Exception as exc:
        logger.warning("ai_stream_failed", error=str(exc))
        await buf.finish(error="AI model stream is unavailable. Please try again shortly.")


async def _sse_from_buffer(stream_id: str, buf, start: int):
    try:
        async for seq, token in buf.iter_from(start):
            yield {"id": f"{stream_id}:{seq}", "data": token}
    except StreamFailed as exc:
        yield {"event": "error", "data": str(exc)}


@router.post("/ask/stream")
@limiter.limit("15/minute")
async def ask_tutor_stream_endpoint(
    request: Request,
    data: AskRequest,
    current_user: Any = Depends(get_current_user),
):
    question = guard_input(data.question, max_length=2000)
    context = guard_input(data.context, max_length=4000) if data.context else ""

    resume_id, last_seq = parse_last_event_id(request.headers.get("last-event-id"))
    buf = get_stream(resume_id, current_user.id)
    if buf is not None and resume_id:
        return EventSourceResponse(_sse_from_buffer(resume_id, buf, last_seq + 1), ping=10)

    consume_daily_quota(current_user.id, current_user.plan)
    stream_id, buf = new_stream(current_user.id)
    spawn(_produce(buf, question, context, data.history))
    await buf.wait_ready()
    if not buf.tokens:
        if buf.error:
            raise api_error(503, "SERVICE_UNAVAILABLE", buf.error)
        raise api_error(503, "SERVICE_UNAVAILABLE", "AI model returned an empty response")

    return EventSourceResponse(_sse_from_buffer(stream_id, buf, 0), ping=10)


@router.get("/conversations")
def get_conversations(
    limit: int = Query(50, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    messages = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc(), Conversation.id.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()
    return [{"role": m.role, "content": m.content} for m in messages]


@router.post("/conversations/save")
@limiter.limit("30/minute")
def save_conversation(
    request: Request,
    data: ConversationSaveRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    question = guard_input(data.question, max_length=2000)
    sanitized_answer = guard_input(data.answer, max_length=8000)
    db.add(Conversation(user_id=current_user.id, role="user", content=question))
    db.add(Conversation(user_id=current_user.id, role="assistant", content=sanitized_answer))
    db.commit()
    return {"saved": 2}