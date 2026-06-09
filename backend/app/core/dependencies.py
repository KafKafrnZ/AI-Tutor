"""Shared FastAPI dependencies used across routers."""

from __future__ import annotations

from typing import Any

from fastapi import Cookie, Depends, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.auth import verify_token
from app.core.config import settings
from app.core.error_handler import api_error
from app.models.database import get_db, get_user_by_email


limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


def cookie_security_options() -> dict[str, Any]:
    is_prod = settings.ENVIRONMENT.lower() == "production"
    return {
        "secure": is_prod,
        "samesite": "lax",
    }


def get_current_user(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        raise api_error(401, "UNAUTHORIZED", "Not authenticated")
    payload = verify_token(access_token)
    if not payload:
        raise api_error(401, "TOKEN_INVALID", "Token expired or invalid")
    user = get_user_by_email(db, payload.get("sub"))
    if not user:
        raise api_error(401, "USER_NOT_FOUND", "User not found")
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise api_error(403, "EMAIL_NOT_VERIFIED", "Email not verified. Please check your inbox.")
    return user