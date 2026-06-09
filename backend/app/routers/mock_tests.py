from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, limiter
from app.core.error_handler import api_error
from app.core.guards import detect_injection, sanitize_user_input
from app.core.cache import invalidate_user_cache
from app.mock_tests_logic import (
    build_exam_questions,
    build_fallback_mock_questions,
    fallback_question_count,
    format_question_payload,
    get_grading_catalog,
)
from app.models.database import (
    MasterQuestion,
    MockTestSession,
    get_db,
    save_error_log,
    save_mock_test,
)
from app.schemas.api import MockTestSubmission
from app.schemas.mock_test import MockTestCreate
from data.fallback_questions import MOCK_TEST_META

router = APIRouter(tags=["mock-tests"])

CORRECT_MARKS = 1.0
NEGATIVE_MARKS = 0.25


@router.get("/mock-tests")
def list_mock_tests(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    tests = []
    for tid, meta in MOCK_TEST_META.items():
        db_count = db.query(MasterQuestion).filter(MasterQuestion.test_id == tid).count()
        uses_fallback = db_count == 0
        if uses_fallback and not settings.ALLOW_FALLBACK_QUESTIONS:
            continue
        tests.append({
            "id": tid,
            "title": meta["title"],
            "duration_minutes": meta["duration_minutes"],
            "question_count": db_count or fallback_question_count(tid),
            "difficulty": meta["difficulty"],
            "is_fallback": uses_fallback,
            "source": "generated_fallback" if uses_fallback else "database",
        })
    if not tests and not settings.ALLOW_FALLBACK_QUESTIONS:
        raise api_error(
            503,
            "NO_CONTENT",
            "No mock tests available. Please contact support or check back later.",
        )
    return {"tests": tests}


@router.get("/mock-tests/{test_id}/questions")
def get_test_questions(test_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    if detect_injection(str(test_id)):
        raise api_error(400, "BAD_REQUEST", "Invalid input")

    catalog, uses_fallback = get_grading_catalog(db, test_id)
    if not catalog:
        if not settings.ALLOW_FALLBACK_QUESTIONS:
            raise api_error(
                503,
                "NO_CONTENT",
                "No mock tests available. Please contact support or check back later.",
            )
        formatted = build_fallback_mock_questions(test_id)
        uses_fallback = True
    else:
        formatted = build_exam_questions(catalog)

    meta = MOCK_TEST_META.get(test_id, {"title": f"Mock Test Set {test_id}", "duration_minutes": 90, "difficulty": "Medium"})

    session_token = secrets.token_urlsafe(32)
    duration_minutes = meta["duration_minutes"]
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes + 2)
    db_session = MockTestSession(
        id=session_token,
        user_id=current_user.id,
        test_id=test_id,
        expires_at=expires_at,
    )
    db.add(db_session)
    db.commit()

    return {
        "test": {
            "id": test_id,
            "title": meta["title"],
            "duration_minutes": duration_minutes,
            "difficulty": meta["difficulty"],
            "question_count": len(formatted),
            "is_fallback": uses_fallback,
            "source": "generated_fallback" if uses_fallback else "database",
            "session_id": session_token,
        },
        "questions": formatted,
    }


@router.post("/mock-tests/{test_id}/submit")
@limiter.limit("10/minute")
def submit_mock_test(
    request: Request,
    test_id: int,
    body: MockTestSubmission,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(MockTestSession).filter(
        MockTestSession.id == body.session_id,
        MockTestSession.user_id == current_user.id,
        MockTestSession.test_id == test_id,
    ).first()
    if not session:
        raise api_error(404, "SESSION_NOT_FOUND", "Session not found.")
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        db.delete(session)
        db.commit()
        raise api_error(400, "SESSION_EXPIRED", "Test session has expired.")

    catalog, _ = get_grading_catalog(db, test_id)
    if not catalog:
        raise api_error(404, "TEST_NOT_FOUND", "No questions found for this test.")

    q_map = {q["id"]: q for q in catalog}
    score = 0.0
    results = []
    correct_count = 0
    attempted_count = 0
    mistakes = []

    for ans in body.answers:
        q = q_map.get(ans.question_id)
        if not q:
            continue
        is_correct = False
        selected = (ans.selected or "").strip().upper() or None
        if selected is None:
            mark = 0.0
        else:
            attempted_count += 1
            if selected == (q["correct_answer"] or "").upper():
                mark = CORRECT_MARKS
                is_correct = True
                correct_count += 1
            else:
                mark = -NEGATIVE_MARKS
                mistakes.append({
                    "question_text": q["question"],
                    "user_answer": selected,
                    "correct_answer": q["correct_answer_text"],
                    "explanation": q.get("explanation") or "",
                })
        score += mark
        results.append(
            format_question_payload(
                question_id=q["id"],
                section=q["section"],
                topic=q["topic"],
                question=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                source=q["source"],
                mode="result",
            )
            | {
                "user_selected": ans.selected,
                "is_correct": is_correct,
                "marks_awarded": mark,
            }
        )

    final_score = max(0.0, score)
    total = len(catalog)
    percentage = round((final_score / total) * 100, 1) if total > 0 else 0.0

    meta = MOCK_TEST_META.get(test_id, {"title": f"Mock Test Set {test_id}"})
    save_mock_test(
        db,
        current_user.id,
        {
            "date": datetime.now(timezone.utc).date().isoformat(),
            "test_name": meta["title"],
            "section": "Full Mock",
            "attempted": attempted_count,
            "correct": correct_count,
            "time_taken": body.time_taken,
            "session_id": body.session_id,
        },
    )
    for mistake in mistakes:
        save_error_log(db, current_user.id, mistake)

    db.delete(session)
    db.commit()
    invalidate_user_cache(current_user.id)

    return {
        "score": final_score,
        "total": total,
        "percentage": percentage,
        "negative_marks_applied": True,
        "correct": correct_count,
        "attempted": attempted_count,
        "results": results,
    }


@router.post("/save-mock-test")
@limiter.limit("10/minute")
def save_mock_test_result(
    request: Request,
    data: MockTestCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    mock_inputs = [data.date, data.test_name, data.section]
    if any(detect_injection(value) for value in mock_inputs):
        raise api_error(400, "BAD_REQUEST", "Invalid input")

    data.date = sanitize_user_input(data.date)
    data.test_name = sanitize_user_input(data.test_name)
    data.section = sanitize_user_input(data.section)

    if data.session_id:
        session = db.query(MockTestSession).filter(
            MockTestSession.id == data.session_id,
            MockTestSession.user_id == current_user.id,
        ).first()
        if not session:
            raise api_error(400, "INVALID_SESSION", "Test session not found. Please reload and start a new test.")
        expires = session.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            db.delete(session)
            db.commit()
            raise api_error(400, "SESSION_EXPIRED", "Test time has expired. Results cannot be saved.")
        db.delete(session)

    saved_test = save_mock_test(db, current_user.id, data.model_dump())
    if not saved_test:
        raise api_error(500, "SAVE_FAILED", "Failed to save mock test")

    invalidate_user_cache(current_user.id)
    return {"message": "Mock test saved successfully", "id": saved_test.id}