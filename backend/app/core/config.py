import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "IBPS SO AI Backend"
    VERSION: str = "2.0.0"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_fallback_key_for_dev_only_12345")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Database - Smart detection
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:Myraaa%4013@localhost:1327/ibps_db"
    )
    
    if os.getenv("ENVIRONMENT") == "docker":
        DATABASE_URL = os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:Myraaa%4013@db:5432/ibps_db"
        )
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        origin.strip() 
        for origin in os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    ]

settings = Settings()