"""Daily usage quota per User.plan. One counter, all LLM-costing routes."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from app.core.cache import get_counter, incr
from app.core.error_handler import api_error

# 0 = unlimited. Env overrides without a Settings rebuild.
DAILY_LIMITS = {
    "free": int(os.getenv("QUOTA_DAILY_FREE", "20")),
    "plus": int(os.getenv("QUOTA_DAILY_PLUS", "100")),
    "pro": int(os.getenv("QUOTA_DAILY_PRO", "500")),
}


def limit_for(plan: str | None) -> int:
    key = (plan or "free").strip().lower()
    return DAILY_LIMITS.get(key, DAILY_LIMITS["free"])


def seconds_until_utc_midnight(now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    tomorrow = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) + timedelta(days=1)
    return max(int((tomorrow - now).total_seconds()), 1)


def quota_key(user_id: int, now: datetime | None = None) -> str:
    day = (now or datetime.now(timezone.utc)).strftime("%Y%m%d")
    return f"quota:{user_id}:{day}"


def quota_snapshot(user_id: int, plan: str | None) -> dict[str, int | None]:
    limit = limit_for(plan)
    used = get_counter(quota_key(user_id))
    if limit <= 0:
        return {"daily_limit": 0, "daily_used": used, "daily_remaining": None}
    return {
        "daily_limit": limit,
        "daily_used": used,
        "daily_remaining": max(limit - used, 0),
    }


def consume_daily_quota(user_id: int, plan: str | None) -> None:
    limit = limit_for(plan)
    if limit <= 0:
        return
    used = incr(quota_key(user_id), seconds_until_utc_midnight())
    if used > limit:
        raise api_error(
            429,
            "QUOTA_EXCEEDED",
            f"Daily {limit}-call limit reached for the {(plan or 'free')} plan. Try again tomorrow.",
        )
