import logging
import os
import json as _json
from dotenv import load_dotenv

# .env.local (gitignored) overrides .env — matches Next.js / Docker Compose convention
load_dotenv(".env.local")
load_dotenv()  # fallback to .env if .env.local is absent

logger = logging.getLogger(__name__)
_smtp_alias_warned = False


def parse_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def parse_require_email_verification(raw: str | None, environment: str) -> bool:
    if raw is not None and raw.strip():
        return parse_bool(raw.strip())
    return environment.lower() == "production"


def _safe_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def get_cors_origins() -> list[str]:
    """Production: only env-specified origins. Dev: localhost fallback."""
    env_val = os.getenv("BACKEND_CORS_ORIGINS", "")
    if env_val.strip():
        try:
            origins = _json.loads(env_val)
            if isinstance(origins, list) and origins:
                return origins
        except (_json.JSONDecodeError, ValueError):
            pass
        # Comma-separated fallback for non-JSON env values
        parts = [origin.strip() for origin in env_val.split(",") if origin.strip()]
        if parts:
            return parts
    return ["http://localhost:3000", "http://localhost:3001"]


def _get_email_var(new_key: str, old_key: str, default: str = "") -> str:
    """Prefer EMAIL_*; fall back to deprecated SMTP_* once per process."""
    global _smtp_alias_warned
    new_val = (os.getenv(new_key) or "").strip()
    if new_val:
        return new_val
    old_val = (os.getenv(old_key) or "").strip()
    if old_val:
        if not _smtp_alias_warned:
            logger.warning(
                "Deprecated SMTP_* email env vars are set; use EMAIL_* instead. "
                "SMTP_* aliases will be removed in a later release."
            )
            _smtp_alias_warned = True
        return old_val
    return default


class Settings:
    PROJECT_NAME: str = "AI Tutor"
    VERSION: str = "1.2"

    JWT_SECRET: str = os.getenv("JWT_SECRET") or ""
    if not JWT_SECRET:
        raise ValueError("CRITICAL: JWT_SECRET environment variable is missing.")

    JWT_ALGORITHM: str = "HS256"

    DATABASE_URL: str = os.getenv("DATABASE_URL") or ""
    if not DATABASE_URL:
        raise ValueError("CRITICAL: DATABASE_URL environment variable is missing.")

    LLM_API_KEY: str = os.getenv("LLM_API_KEY", os.getenv("GROQ_API_KEY", ""))
    if not LLM_API_KEY:
        raise ValueError(
            "CRITICAL: LLM_API_KEY environment variable is missing. "
            "All AI features will fail. Set LLM_API_KEY in Railway Variables."
        )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    WEB_CONCURRENCY: int = _safe_int(os.getenv("WEB_CONCURRENCY"), 1)

    ALLOWED_ORIGINS: list = _json.loads(
        os.getenv("ALLOWED_ORIGINS", '["http://localhost:3000", "http://localhost:3001"]')
    )
    ENVIRONMENT: str = os.getenv(
        "ENVIRONMENT",
        "production" if os.getenv("RAILWAY_ENVIRONMENT") else "development",
    )
    REQUIRE_EMAIL_VERIFICATION: bool = parse_require_email_verification(
        os.getenv("REQUIRE_EMAIL_VERIFICATION"), ENVIRONMENT
    )

    BACKEND_CORS_ORIGINS: list = get_cors_origins()

    EMAIL_HOST: str = _get_email_var("EMAIL_HOST", "SMTP_HOST", "")
    EMAIL_PORT: int = _safe_int(_get_email_var("EMAIL_PORT", "SMTP_PORT", "587"), 587)
    EMAIL_USER: str = _get_email_var("EMAIL_USER", "SMTP_USER", "")
    EMAIL_PASSWORD: str = _get_email_var("EMAIL_PASSWORD", "SMTP_PASSWORD", "")
    EMAIL_FROM: str = _get_email_var("EMAIL_FROM", "SMTP_FROM", "noreply@ascend-ai.in")

    REDIS_URL: str = os.getenv("REDIS_URL", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
    LLM_ANTHROPIC_VERSION: str = os.getenv("LLM_ANTHROPIC_VERSION", "2023-06-01")

    RAILWAY_VOLUME_MOUNT_PATH: str = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "")
    _default_chroma_path = (
        os.path.join(RAILWAY_VOLUME_MOUNT_PATH, "chroma")
        if RAILWAY_VOLUME_MOUNT_PATH
        else "data/chroma"
    )
    RAG_CHROMA_PATH: str = os.getenv("RAG_CHROMA_PATH", _default_chroma_path)
    RAG_REQUIRE_PERSISTENT_CHROMA: bool = parse_bool(
        os.getenv("RAG_REQUIRE_PERSISTENT_CHROMA"),
        default=ENVIRONMENT.lower() == "production" or bool(os.getenv("RAILWAY_ENVIRONMENT")),
    )
    RAG_COLLECTION_NAME: str = os.getenv("RAG_COLLECTION_NAME", "ascend_rag")
    RAG_EMBEDDING_MODEL: str = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

    ALLOW_FALLBACK_QUESTIONS: bool = os.getenv("ALLOW_FALLBACK_QUESTIONS", "false").lower() == "true"


settings = Settings()