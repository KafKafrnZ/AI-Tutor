from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import structlog

from app.core.dependencies import get_current_user, limiter
from app.core.error_handler import api_error
from app.core.guards import guard_input
from app.models.database import Conversation, get_db
from app.schemas.api import AskRequest, ConversationSaveRequest
from modules.tutor import LLMServiceError, ask_tutor, ask_tutor_stream

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["tutor"])


@router.post("/ask")
@limiter.limit("15/minute")
async def ask_ai(request: Request, data: AskRequest, current_user: Any = Depends(get_current_user)):
    question = guard_input(data.question, max_length=2000)
    context = guard_input(data.context, max_length=4000) if data.context else ""
    try:
        answer = await ask_tutor(question, context, data.history)
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc
    return {"answer": answer}


@router.post("/ask/stream")
@limiter.limit("15/minute")
async def ask_tutor_stream_endpoint(request: Request, data: AskRequest, current_user: Any = Depends(get_current_user)):
    question = guard_input(data.question, max_length=2000)
    context = guard_input(data.context, max_length=4000) if data.context else ""
    stream = ask_tutor_stream(question, context, data.history)
    try:
        first_token = await anext(stream)
    except StopAsyncIteration as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", "AI model returned an empty response") from exc
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc

    async def event_generator():
        yield {"data": first_token}
        try:
            async for token in stream:
                yield {"data": token}
        except LLMServiceError as exc:
            logger.warning("ai_stream_failed", error=str(exc))
            yield {"event": "error", "data": str(exc)}
        finally:
            await stream.aclose()

    return EventSourceResponse(event_generator(), ping=10)


@router.get("/conversations")
def get_conversations(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    messages = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
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