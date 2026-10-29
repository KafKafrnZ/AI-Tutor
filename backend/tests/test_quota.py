from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.core.lifespan import assert_production_redis_ready
from app.core.quota import consume_daily_quota, limit_for, quota_snapshot, seconds_until_utc_midnight


def test_limit_for_unknown_plan_uses_free():
    assert limit_for(None) == limit_for("free")
    assert limit_for("cinematic") == limit_for("free")


def test_seconds_until_utc_midnight():
    now = datetime(2026, 1, 1, 23, 59, 0, tzinfo=timezone.utc)
    assert seconds_until_utc_midnight(now) == 60


def test_consume_daily_quota_blocks_after_limit(monkeypatch):
    monkeypatch.setattr(
        "app.core.quota.DAILY_LIMITS",
        {"free": 2, "plus": 5, "pro": 9},
    )
    consume_daily_quota(424242, "free")
    consume_daily_quota(424242, "free")
    with pytest.raises(HTTPException) as exc:
        consume_daily_quota(424242, "free")
    assert exc.value.status_code == 429
    assert exc.value.detail["code"] == "QUOTA_EXCEEDED"


def test_quota_snapshot_does_not_increment(monkeypatch):
    monkeypatch.setattr(
        "app.core.quota.DAILY_LIMITS",
        {"free": 5, "plus": 5, "pro": 5},
    )
    assert quota_snapshot(424244, "free") == {
        "daily_limit": 5,
        "daily_used": 0,
        "daily_remaining": 5,
    }
    consume_daily_quota(424244, "free")
    assert quota_snapshot(424244, "free")["daily_used"] == 1
    assert quota_snapshot(424244, "free")["daily_remaining"] == 4


def test_zero_limit_is_unlimited(monkeypatch):
    monkeypatch.setattr("app.core.quota.DAILY_LIMITS", {"free": 0, "plus": 0, "pro": 0})
    for _ in range(5):
        consume_daily_quota(424243, "free")
    assert quota_snapshot(424243, "free")["daily_remaining"] is None


def test_assert_production_redis_ready():
    assert_production_redis_ready(environment="production", redis_url="redis://localhost")
    assert_production_redis_ready(environment="development", redis_url="")
    with pytest.raises(RuntimeError, match="REDIS_URL"):
        assert_production_redis_ready(environment="production", redis_url="")
