import os
from dotenv import load_dotenv

load_dotenv()

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
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    REQUIRE_EMAIL_VERIFICATION: bool = os.getenv("REQUIRE_EMAIL_VERIFICATION", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    # Parse comma-separated list from env (supports .env.example + docker overrides). Falls back to localhost dev.
    _cors_raw = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    BACKEND_CORS_ORIGINS: list = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]


settings = Settings()
