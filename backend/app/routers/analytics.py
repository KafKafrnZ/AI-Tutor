from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.cache import get_cached, invalidate_user_cache, set_cached
from app.core.dependencies import get_current_user, limiter
from app.core.guards import guard_input
from app.models.database import ErrorLog, get_db, save_error_log
from app.schemas.api import ErrorLogResponse, ErrorPayload, RevisionPlanResponse, StatsResponse
from modules.data_analyzer import (
    calculate_accuracy,
    get_ai_revision_plan,
    get_overall_stats,
    get_weak_areas,
    load_data,
)

router = APIRouter(tags=["analytics"])


@router.get("/stats", response_model=StatsResponse)
@limiter.limit("10/minute")
def stats(request: Request, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    cache_key = f"stats_{current_user.id}"
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data

    df = load_data(db, current_user.id)
    df = calculate_accuracy(df)

    if df.empty:
        result = {
            "stats": {"avg_accuracy": 0, "total_tests": 0},
            "accuracy": 0,
            "testsTaken": 0,
            "recent_tests": [],
            "weak_areas": "No data yet",
        }
    else:
        overall_stats = get_overall_stats(df)
        weak_areas_result = get_weak_areas(df)
        if hasattr(weak_areas_result, "to_dict"):
            weak_areas_serialized = {
                str(key): float(value)
                for key, value in weak_areas_result.to_dict().items()
            }
        else:
            weak_areas_serialized = str(weak_areas_result)

        recent_tests = df.tail(5).to_dict(orient="records")
        for test in recent_tests:
            date_value = test.get("date")
            if hasattr(date_value, "isoformat"):
                test["date"] = date_value.isoformat()
            elif date_value is not None:
                test["date"] = str(date_value)

        result = {
            "stats": overall_stats,
            "accuracy": overall_stats["avg_accuracy"],
            "testsTaken": overall_stats["total_tests"],
            "recent_tests": recent_tests,
            "weak_areas": weak_areas_serialized,
        }

    set_cached(cache_key, result)
    return result


@router.get("/revision-plan", response_model=RevisionPlanResponse)
@limiter.limit("5/minute")
async def revision_plan(request: Request, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    cache_key = f"revision_{current_user.id}"
    cached_plan = get_cached(cache_key)
    if cached_plan:
        return cached_plan

    plan = await get_ai_revision_plan(db, current_user.id)
    set_cached(cache_key, plan)
    return plan


@router.post("/save-errors")
@limiter.limit("30/minute")
def save_errors(
    request: Request,
    payload: ErrorPayload,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    for error in payload.errors:
        sanitized = {
            "question_text": guard_input(error.question_text, max_length=2000),
            "user_answer": guard_input(error.user_answer, max_length=500),
            "correct_answer": guard_input(error.correct_answer, max_length=500),
            "explanation": guard_input(error.explanation, max_length=2000),
        }
        save_error_log(db, current_user.id, sanitized)
    invalidate_user_cache(current_user.id)
    return {"message": "Errors logged successfully"}


@router.get("/error-log", response_model=List[ErrorLogResponse])
def get_error_log(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    logs = (
        db.query(ErrorLog)
        .filter(ErrorLog.user_id == current_user.id)
        .order_by(ErrorLog.date_added.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs