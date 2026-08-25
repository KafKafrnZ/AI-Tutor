"""Ascend AI — FastAPI application entrypoint."""

from __future__ import annotations

import logging

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.dependencies import limiter
from app.core.error_handler import (
    general_exception_handler,
    http_exception_handler,
    rate_limit_exception_handler,
    sqlalchemy_exception_handler,
    validation_exception_handler,
)
from app.core.lifespan import lifespan
from app.core.middleware import (
    correlation_id_middleware,
    csrf_protection,
    log_requests_and_add_headers,
    request_timeout_middleware,
)
from app.routers import analytics, auth, health, mock_tests, practice, tutor

import os

_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.05,
        environment=settings.ENVIRONMENT,
        release=os.getenv("RAILWAY_GIT_COMMIT_SHA", "unknown"),
        integrations=[
            FastApiIntegration(transaction_style="url"),
            SqlalchemyIntegration(),
        ],
        before_send=lambda event, hint: event,
    )

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logging.basicConfig(level=logging.INFO, format="%(message)s")

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(correlation_id_middleware)
app.middleware("http")(request_timeout_middleware)
app.middleware("http")(log_requests_and_add_headers)
app.middleware("http")(csrf_protection)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tutor.router)
app.include_router(practice.router)
app.include_router(mock_tests.router)
app.include_router(analytics.router)