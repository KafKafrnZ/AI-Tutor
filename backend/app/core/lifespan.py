"""Application lifespan: startup checks, session cleanup, embedding warmup."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path as _Path

import structlog
from fastapi import FastAPI
from sqlalchemy import delete as _delete

from app.core.config import settings
from app.core.rag import validate_chroma_persistence_config
from app.models.database import MockTestSession, SessionLocal

logger = structlog.get_logger("ascend_ai")


def _check_migration_drift() -> None:
    try:
        from alembic.config import Config as _AlembicConfig
        from alembic.runtime.migration import MigrationContext as _MigrationContext
        from alembic.script import ScriptDirectory as _ScriptDirectory
        from sqlalchemy import create_engine as _create_engine

        ini_path = _Path(__file__).resolve().parents[2] / "alembic.ini"
        alembic_cfg = _AlembicConfig(str(ini_path))
        script = _ScriptDirectory.from_config(alembic_cfg)
        engine = _create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            ctx = _MigrationContext.configure(conn)
            db_heads = set(ctx.get_current_heads())
        engine.dispose()
        script_heads = set(script.get_heads())
        if db_heads != script_heads:
            logger.warning(
                "migration_drift",
                db_heads=str(db_heads),
                script_heads=str(script_heads),
            )
        else:
            logger.info("migration_ok", heads=str(db_heads))
    except Exception as exc:
        logger.warning("migration_check_skipped", error=str(exc))


def _cleanup_expired_sessions() -> None:
    db = SessionLocal()
    try:
        result = db.execute(
            _delete(MockTestSession).where(MockTestSession.expires_at < datetime.now(timezone.utc))
        )
        db.commit()
        logger.info("expired_sessions_cleaned", count=result.rowcount)
    except Exception as exc:
        db.rollback()
        logger.warning("session_cleanup_failed", error=str(exc))
    finally:
        db.close()


def _warmup_embeddings() -> None:
    logger.info("embedding_warmup_start")
    try:
        from fastembed import TextEmbedding

        warmup_embed = TextEmbedding()
        list(warmup_embed.embed(["warmup query"]))
        logger.info("embedding_warmup_complete")
    except Exception as exc:
        logger.warning(
            "embedding_warmup_failed",
            error=str(exc),
            note="RAG will degrade gracefully on first query",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.WEB_CONCURRENCY > 1 and not settings.REDIS_URL:
        raise RuntimeError(
            "FATAL: REDIS_URL must be set when WEB_CONCURRENCY > 1. "
            "In-memory cache is per-process and causes data inconsistency across workers. "
            "Set REDIS_URL or reduce WEB_CONCURRENCY to 1."
        )
    if not settings.REDIS_URL:
        logger.warning(
            "cache_mode",
            mode="in_memory",
            note="Redis not configured — using in-memory cache. Single worker only.",
        )

    if (
        settings.ENVIRONMENT.lower() == "production"
        and settings.REQUIRE_EMAIL_VERIFICATION
        and not (settings.EMAIL_HOST and settings.EMAIL_USER and settings.EMAIL_PASSWORD)
    ):
        logger.error(
            "email_unconfigured_in_production",
            note="verification tokens will be created but emails will not send",
        )

    chroma_path = validate_chroma_persistence_config()
    logger.info("app_starting", chroma_path=str(chroma_path))
    _check_migration_drift()
    _cleanup_expired_sessions()
    _warmup_embeddings()
    yield