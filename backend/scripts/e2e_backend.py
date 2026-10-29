"""Boot a sqlite FastAPI for Playwright cookie E2E. Sets env before app import."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

os.environ.setdefault("JWT_SECRET", "e2e-secret-not-for-production")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{(ROOT / 'e2e.db').resolve().as_posix()}")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("LLM_API_KEY", "dummy-e2e-key")
os.environ.setdefault("REQUIRE_EMAIL_VERIFICATION", "false")
os.environ.setdefault("ALLOW_FALLBACK_QUESTIONS", "true")
os.environ.setdefault("RAG_REQUIRE_PERSISTENT_CHROMA", "false")
os.environ.setdefault("SKIP_EMBEDDING_WARMUP", "1")

from app.models.database import Base, engine  # noqa: E402

Base.metadata.create_all(bind=engine)

import uvicorn  # noqa: E402

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.getenv("E2E_BACKEND_PORT", "8000")), log_level="warning")
