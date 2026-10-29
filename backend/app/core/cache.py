"""Shared response cache — Redis when configured, in-memory fallback."""

from __future__ import annotations

import json
import time
from typing import Any

from app.core.config import settings

CACHE_TTL = 300

_cache: dict[str, dict[str, Any]] = {}
_counters: dict[str, dict[str, Any]] = {}
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


def incr(key: str, ttl_seconds: int) -> int:
    """Atomic daily counter. Redis when configured, per-process memory otherwise."""
    ttl_seconds = max(int(ttl_seconds), 1)
    if _redis_client:
        try:
            n = int(_redis_client.incr(key))
            if n == 1:
                _redis_client.expire(key, ttl_seconds)
            return n
        except Exception:
            pass
    now = time.time()
    entry = _counters.get(key)
    if not entry or now >= entry["exp"]:
        _counters[key] = {"n": 1, "exp": now + ttl_seconds}
        return 1
    entry["n"] += 1
    return int(entry["n"])


def get_counter(key: str) -> int:
    if _redis_client:
        try:
            raw = _redis_client.get(key)
            return int(raw) if raw is not None else 0
        except Exception:
            pass
    entry = _counters.get(key)
    if not entry or time.time() >= entry["exp"]:
        return 0
    return int(entry["n"])


def invalidate_user_cache(user_id: int) -> None:
    for key in [f"stats_{user_id}", f"revision_{user_id}"]:
        if _redis_client:
            try:
                _redis_client.delete(key)
            except Exception:
                pass
        _cache.pop(key, None)