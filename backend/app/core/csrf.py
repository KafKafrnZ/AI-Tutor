"""CSRF origin checks. Pure functions so tests do not reload the app."""

from __future__ import annotations

from urllib.parse import urlparse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _normalize_origin(value: str) -> str | None:
    parsed = urlparse((value or "").strip())
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return None


def request_origin(origin: str, referer: str) -> str | None:
    """Prefer Origin; fall back to Referer's scheme+netloc (path ignored)."""
    return _normalize_origin(origin) or _normalize_origin(referer)


def origin_allowed(source: str, allowed: list[str]) -> bool:
    """Exact scheme+netloc match. No startswith."""
    normalized = _normalize_origin(source)
    if not normalized:
        return False
    for entry in allowed:
        if _normalize_origin(entry) == normalized:
            return True
    return False


def _is_localhost_origin(source: str) -> bool:
    parsed = urlparse(source)
    return parsed.hostname in {"localhost", "127.0.0.1"}


def csrf_should_reject(
    *,
    method: str,
    origin: str,
    referer: str,
    allowed_origins: list[str],
    environment: str,
) -> bool:
    if method.upper() in SAFE_METHODS:
        return False

    req_origin = request_origin(origin, referer)
    if not req_origin:
        return environment.lower() == "production"

    if origin_allowed(req_origin, allowed_origins):
        return False

    if environment.lower() != "production" and _is_localhost_origin(req_origin):
        return False

    return True
