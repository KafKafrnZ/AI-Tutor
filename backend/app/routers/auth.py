from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Cookie, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth import (
    create_refresh_token,
    create_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.core.config import settings
from app.core.dependencies import cookie_security_options, get_current_user, limiter
from app.core.email import send_reset_email, send_verification_email
from app.core.error_handler import api_error
from app.models.database import AuthToken, User, create_user, get_db, get_user_by_email
from app.schemas.api import (
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    ResetPasswordRequest,
    SignupRequest,
)

router = APIRouter(tags=["auth"])


@router.post("/signup")
@limiter.limit("3/minute")
def signup(request: Request, data: SignupRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        raise api_error(409, "EMAIL_ALREADY_EXISTS", "Email already in use")
    new_user = create_user(
        db,
        data.name,
        data.email,
        hash_password(data.password),
        is_verified=not settings.REQUIRE_EMAIL_VERIFICATION,
    )
    if new_user and settings.REQUIRE_EMAIL_VERIFICATION:
        token_str = secrets.token_urlsafe(32)
        db_token = AuthToken(
            user_id=new_user.id,
            token=token_str,
            token_type="verify_email",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(db_token)
        db.commit()
        send_verification_email(new_user.email, token_str)
        return {"message": "Account created. Check your email to verify your account."}
    return {"message": "Account created. You can sign in now."}


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise api_error(401, "INVALID_CREDENTIALS", "Invalid credentials.")
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise api_error(403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in. Check your inbox.")

    token = create_token({"sub": user.email})
    raw_refresh, hashed_refresh = create_refresh_token()
    refresh_exp = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    auth_token_record = AuthToken(
        user_id=user.id,
        token=secrets.token_urlsafe(32),
        token_type="refresh",
        expires_at=refresh_exp,
        refresh_token=hashed_refresh,
        refresh_expires_at=refresh_exp,
    )
    db.add(auth_token_record)
    db.commit()

    response = JSONResponse(content={"message": "Login successful", "name": user.name})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        **cookie_security_options(),
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=cookie_security_options()["secure"],
        samesite=cookie_security_options()["samesite"],
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )
    return response


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    token_str = secrets.token_urlsafe(32)
    db_token = AuthToken(
        user_id=user.id,
        token=token_str,
        token_type="reset_password",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(db_token)
    db.commit()
    send_reset_email(user.email, token_str)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    db_token = db.query(AuthToken).filter(
        AuthToken.token == req.token,
        AuthToken.token_type == "reset_password",
        AuthToken.expires_at > datetime.now(timezone.utc),
    ).first()
    if not db_token:
        raise api_error(400, "TOKEN_INVALID", "Invalid or expired token")

    user = db.query(User).filter(User.id == db_token.user_id).first()
    user.password_hash = hash_password(req.new_password)
    db.delete(db_token)
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/verify-email")
@limiter.limit("10/minute")
def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    db_token = db.query(AuthToken).filter(
        AuthToken.token == token,
        AuthToken.token_type == "verify_email",
        AuthToken.expires_at > datetime.now(timezone.utc),
    ).first()
    if not db_token:
        raise api_error(400, "TOKEN_INVALID", "Invalid verification token")

    user = db.query(User).filter(User.id == db_token.user_id).first()
    user.is_verified = True
    db.delete(db_token)
    db.commit()
    return {"message": "Email successfully verified"}


@router.post("/logout")
def logout(current_user: Any = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AuthToken).filter(
        AuthToken.user_id == current_user.id,
        AuthToken.token_type == "refresh",
    ).update({"refresh_token": None, "refresh_expires_at": None})
    db.commit()
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="access_token", httponly=True, **cookie_security_options())
    response.delete_cookie(key="refresh_token", path="/auth")
    return response


@router.post("/auth/refresh")
async def refresh_access_token(
    refresh_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise api_error(401, "TOKEN_MISSING", "No refresh token.")
    records = db.query(AuthToken).filter(
        AuthToken.token_type == "refresh",
        AuthToken.refresh_expires_at > datetime.now(timezone.utc),
    ).all()
    matched = next(
        (r for r in records if verify_refresh_token(refresh_token, r.refresh_token or "")),
        None,
    )
    if not matched:
        raise api_error(401, "TOKEN_INVALID", "Refresh token invalid or expired.")

    user = db.query(User).filter(User.id == matched.user_id).first()
    if not user:
        raise api_error(401, "USER_NOT_FOUND", "User not found for refresh token.")
    raw_refresh, hashed_refresh = create_refresh_token()
    matched.refresh_token = hashed_refresh
    matched.refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()

    new_access = create_token({"sub": user.email})
    resp = JSONResponse({"message": "Token refreshed"})
    resp.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        **cookie_security_options(),
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    resp.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=cookie_security_options()["secure"],
        samesite=cookie_security_options()["samesite"],
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )
    return resp


@router.post("/auth/logout")
def auth_logout(current_user: Any = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AuthToken).filter(
        AuthToken.user_id == current_user.id,
        AuthToken.token_type == "refresh",
    ).update({"refresh_token": None, "refresh_expires_at": None})
    db.commit()
    resp = JSONResponse({"message": "Logged out"})
    resp.delete_cookie(key="access_token", httponly=True, **cookie_security_options())
    resp.delete_cookie(key="refresh_token", path="/auth")
    return resp


@router.get("/me")
def get_profile(current_user: Any = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "plan": current_user.plan,
    }


@router.put("/me")
def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    new_name = data.name.strip()
    if not new_name:
        raise api_error(400, "BAD_REQUEST", "Name cannot be empty")

    current_user.name = new_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "plan": current_user.plan,
    }