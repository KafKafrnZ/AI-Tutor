import os
from dotenv import load_dotenv

load_dotenv()

# Add your Vercel production URL to BACKEND_CORS_ORIGINS on Railway:
#   Railway dashboard → ai-tutor service → Variables →
#   BACKEND_CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
# These defaults are fallback only — always set the env var in production.

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def parse_cors_origins(raw: str | None) -> list[str]:
    configured_origins = [origin.strip() for origin in (raw or "").split(",") if origin.strip()]
    return list(dict.fromkeys([*configured_origins, *DEFAULT_CORS_ORIGINS]))


def parse_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}

def _safe_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default


class Settings:
    PROJECT_NAME: str = "AI Tutor"
    VERSION: str = "1.2"

    JWT_SECRET: str = os.getenv("JWT_SECRET")
    if not JWT_SECRET:
        raise ValueError("CRITICAL: JWT_SECRET environment variable is missing.")

    JWT_ALGORITHM: str = "HS256"

    DATABASE_URL: str = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("CRITICAL: DATABASE_URL environment variable is missing.")
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240  # 4 hours (quick UX improvement per system_flaws_fix_guide FIX-9 Option A; full refresh tokens planned before scale)
    ENVIRONMENT: str = os.getenv(
        "ENVIRONMENT",
        "production" if os.getenv("RAILWAY_ENVIRONMENT") else "development",
    )
    REQUIRE_EMAIL_VERIFICATION: bool = os.getenv("REQUIRE_EMAIL_VERIFICATION", "false").lower() in {
        "1",
        "true", "yes", "on",
    }

    # Parse comma-separated list from env (supports .env.example + docker overrides). Falls back to localhost dev.
    _cors_raw = os.getenv("BACKEND_CORS_ORIGINS")
    BACKEND_CORS_ORIGINS: list = parse_cors_origins(_cors_raw)

    # Email — SMTP adapter (any provider: Postal, Resend SMTP, Gmail, etc.)
    # If EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD are not set, emails fall back to logger.info (local dev).
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "")
    EMAIL_PORT: int = _safe_int(os.getenv("EMAIL_PORT"), 587)
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@ascend-ai.in")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # LLM provider adapter. Defaults preserve the current Groq setup, while
    # LLM_BASE_URL can be pointed at any OpenAI-compatible self-hosted server.
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", os.getenv("GROQ_API_KEY", ""))
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
    LLM_ANTHROPIC_VERSION: str = os.getenv("LLM_ANTHROPIC_VERSION", "2023-06-01")

    # Hybrid RAG store.
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


settings = Settings()
