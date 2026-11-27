from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import get_current_user, limiter
from app.core.error_handler import api_error
from app.core.guards import guard_input
from app.schemas.api import PracticeRequest
from modules.tutor import LLMServiceError, generate_questions

logger = logging.getLogger(__name__)

router = APIRouter(tags=["practice"])


@router.post("/practice")
@limiter.limit("15/minute")
async def practice_ai(request: Request, data: PracticeRequest, current_user: Any = Depends(get_current_user)):
    topic = guard_input(data.topic, max_length=500)
    try:
        raw_result = await generate_questions(topic)
    except LLMServiceError as exc:
        raise api_error(503, "SERVICE_UNAVAILABLE", str(exc)) from exc
    questions, rejected = validate_questions(raw_result)
    if not questions:
        logger.warning("practice: model output had no valid questions (rejected=%d)", rejected)
        raise api_error(
            502,
            "BAD_MODEL_OUTPUT",
            "The AI returned questions in a form we could not check. Please try again.",
        )
    if rejected:
        logger.info("practice: dropped %d malformed question(s), kept %d", rejected, len(questions))
    return {"questions": questions}


_LETTERS = "ABCD"


def validate_questions(raw: str) -> tuple[list[dict[str, Any]], int]:
    """Parse the model's JSON and keep only questions a student can actually answer.

    A kept question has non-empty text, exactly 4 distinct non-empty options, and a correct_answer that is one of
    those options. The frontend marks an answer right only when it equals correct_answer, so a bare letter ("B") is
    mapped to the option it names; anything else that is not an option is rejected. Returns (kept, rejected_count).
    Never invents a placeholder question.
    """
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return [], 1
    if not isinstance(data, list):
        return [], 1

    kept: list[dict[str, Any]] = []
    rejected = 0
    for item in data:
        if not isinstance(item, dict):
            rejected += 1
            continue
        question = str(item.get("question") or "").strip()
        options = item.get("options")
        answer = str(item.get("correct_answer") or "").strip()
        if not question or not isinstance(options, list) or len(options) != 4:
            rejected += 1
            continue
        options = [str(option).strip() for option in options]
        if any(not option for option in options) or len(set(options)) != 4:
            rejected += 1
            continue
        if answer not in options:
            letter = answer.rstrip(").:").upper()
            if len(letter) == 1 and letter in _LETTERS:
                answer = options[_LETTERS.index(letter)]
            else:
                rejected += 1
                continue
        kept.append({
            "difficulty": str(item.get("difficulty") or "Medium"),
            "question": question,
            "options": options,
            "correct_answer": answer,
            "explanation": str(item.get("explanation") or ""),
        })
    return kept, rejected
