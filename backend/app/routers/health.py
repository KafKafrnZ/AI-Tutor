from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.cache import _redis_client
from app.core.dependencies import limiter
from app.core.error_handler import api_error
from app.core.rag import get_chroma_client
from app.models.database import get_db
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
@limiter.limit("30/minute")
def health_check(request: Request, db: Session = Depends(get_db)):
    """Health check — verifies DB, Redis, and ChromaDB availability."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.warning("db_health_failed", exc_info=True)

    redis_ok = True
    if _redis_client:
        try:
            _redis_client.ping()
        except Exception:
            redis_ok = False

    chroma_status = "unavailable"
    try:
        chroma_client = get_chroma_client()
        chroma_client.heartbeat()
        chroma_status = "connected"
    except Exception as exc:
        logger.warning("chroma_health_failed", error=str(exc))

    if not db_ok:
        raise api_error(503, "DB_UNAVAILABLE", "Database unavailable")

    return {
        "status": "ok",
        "database": "connected",
        "redis": "connected" if redis_ok else "unavailable",
        "chroma": chroma_status,
    }