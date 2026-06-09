"""Shared response cache — Redis when configured, in-memory fallback."""

from __future__ import annotations

import json
import time
from typing import Any

from app.core.config import settings

CACHE_TTL = 300

_cache: dict[str, dict[str, Any]] = {}
_redis_client = None

try:
    import redis as _redis

    _redis_client = (
        _redis.from_url(settings.REDIS_URL, decode_responses=True) if settings.REDIS_URL else None
    )
except Exception:
    _redis_client = None


def get_cached(key: str) -> Any | None:
    if _redis_client:
        try:
            raw = _redis_client.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]
    return None


def set_cached(key: str, data: Any) -> None:
    if _redis_client:
        try:
            _redis_client.setex(key, CACHE_TTL, json.dumps(data, default=str))
            return
        except Exception:
            pass
    _cache[key] = {"data": data, "ts": time.time()}


def invalidate_user_cache(user_id: int) -> None:
    for key in [f"stats_{user_id}", f"revision_{user_id}"]:
        if _redis_client:
            try:
                _redis_client.delete(key)
            except Exception:
                pass
        _cache.pop(key, None)