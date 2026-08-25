import bcrypt
import hashlib
import secrets as _secrets
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database import AuthToken

def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    password_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password[:72].encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if not payload.get("sub"):
            return None
        return payload
    except InvalidTokenError:
        return None

def create_refresh_token() -> tuple[str, str]:
    """Returns (raw_token, hashed_token). Store the hash; send raw to the client."""
    raw = _secrets.token_hex(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed

def verify_refresh_token(raw: str, hashed: str) -> bool:
    return hashlib.sha256(raw.encode()).hexdigest() == hashed


def lookup_refresh(db: Session, raw: str) -> AuthToken | None:
    if not raw:
        return None
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return (
        db.query(AuthToken)
        .filter(
            AuthToken.token_type == "refresh",
            AuthToken.refresh_token == hashed,
            AuthToken.refresh_expires_at > datetime.now(timezone.utc),
        )
        .one_or_none()
    )
