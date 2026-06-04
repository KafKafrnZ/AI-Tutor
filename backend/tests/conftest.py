import os
import uuid
from unittest.mock import MagicMock
# Set before any project imports — Settings reads env at class body level
os.environ.setdefault("JWT_SECRET", "test-only-secret-key-not-for-production-use")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("GROQ_API_KEY", "test-key-not-real")
os.environ.setdefault("REQUIRE_EMAIL_VERIFICATION", "true")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.database import Base, get_db
from app.main import app, limiter

# --- Disable rate limiting in tests ---
# slowapi checks limits via limiter._limiter.hit() (FixedWindowRateLimiter).
# Replacing _storage alone doesn't work because _limiter holds its own storage ref.
# Mock _limiter.hit directly so every request is always "under limit".
_mock_limiter = MagicMock()
_mock_limiter.hit.return_value = True   # always under limit → no 429s
_mock_limiter.test.return_value = True
limiter._limiter = _mock_limiter

# In-memory SQLite with StaticPool: single shared connection, no file locking
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def override_get_db():
    db = _TestingSession()
    try:
        yield db
    finally:
        db.close()


def make_db_session():
    """Direct DB session for test fixture setup — bypasses FastAPI DI."""
    return _TestingSession()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


# Function-scoped: each test gets a fresh client (empty cookies, no state leakage)
@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
