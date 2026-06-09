from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import get_current_user, limiter
from app.core.error_handler import api_error
from app.core.guards import guard_input
from app.schemas.api import PracticeRequest
from modules.tutor import LLMServiceError, generate_questions

router = APIRouter(tags=["practice"])


@router.post("/practice")
@limiter.limit("15/minute")
async def practice_ai(request: Request, data: PracticeRequest, current_user: Any = Depends(get_current_user)):
    topic = guard_input(data.topic, max_length=500)
    try:
        raw_result = await generate_questions(topic)
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc
    try:
        return {"questions": json.loads(raw_result)}
    except Exception:
        return {
            "questions": [{
                "difficulty": "Hard",
                "question": "Parse Error",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation": "Failed to safely parse output string topology map to valid JSON elements.",
            }]
        }