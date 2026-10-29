from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import limiter, require_quota
from app.core.error_handler import api_error
from app.core.guards import guard_input
from app.schemas.api import PracticeRequest
from modules.tutor import LLMServiceError, generate_questions

router = APIRouter(tags=["practice"])


@router.post("/practice")
@limiter.limit("15/minute")
async def practice_ai(request: Request, data: PracticeRequest, current_user: Any = Depends(require_quota)):
    topic = guard_input(data.topic, max_length=500)
    try:
        questions = await generate_questions(topic)
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc
    return {"questions": [q.model_dump() for q in questions]}