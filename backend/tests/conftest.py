import os
import uuid
from unittest.mock import MagicMock

os.environ.setdefault("JWT_SECRET", "test-only-secret-key-not-for-production-use")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("GROQ_API_KEY", "test-key-not-real")
os.environ.setdefault("LLM_API_KEY", "test-key-not-real")
os.environ.setdefault("REQUIRE_EMAIL_VERIFICATION", "true")
os.environ.setdefault("ALLOW_FALLBACK_QUESTIONS", "true")
os.environ.setdefault("RAG_REQUIRE_PERSISTENT_CHROMA", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.database import Base, get_db
from app.main import app
from app.core.dependencies import limiter

_mock_limiter = MagicMock()
_mock_limiter.hit.return_value = True
_mock_limiter.test.return_value = True
limiter._limiter = _mock_limiter

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
    return _TestingSession()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def real_limiter():
    """Swap in a fresh real in-memory rate limiter for this test.

    The global mock always returns True (within-limit).  This fixture replaces
    it with a genuine MovingWindowRateLimiter backed by a clean MemoryStorage,
    so endpoint rate limits are actually enforced.  The mock is restored on
    teardown so every other test is unaffected.
    """
    from limits.storage import MemoryStorage
    from limits.strategies import MovingWindowRateLimiter

    old = limiter._limiter
    limiter._limiter = MovingWindowRateLimiter(MemoryStorage())
    yield
    limiter._limiter = old


@pytest.fixture
def db_session():
    """Yield a raw SQLAlchemy session for direct DB manipulation in tests."""
    session = _TestingSession()
    try:
        yield session
    finally:
        session.close()