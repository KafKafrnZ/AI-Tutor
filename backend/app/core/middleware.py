"""HTTP middleware: correlation IDs, timeouts, logging, CSRF."""

from __future__ import annotations

import asyncio
import time
import uuid

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.csrf import csrf_should_reject

logger = structlog.get_logger("ascend_ai")


async def correlation_id_middleware(request: Request, call_next):
    req_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=req_id,
        path=request.url.path,
        method=request.method,
    )
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response


async def request_timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=300.0)
    except asyncio.TimeoutError:
        logger.warning("request_timeout", method=request.method, path=request.url.path)
        return JSONResponse(
            status_code=504,
            content={"error": {"code": "REQUEST_TIMEOUT", "message": "The request took too long. Please try again."}},
        )


async def log_requests_and_add_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        "request_complete",
        status=response.status_code,
        duration_s=round(duration, 2),
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


async def csrf_protection(request: Request, call_next):
    if csrf_should_reject(
        method=request.method,
        origin=request.headers.get("origin", ""),
        referer=request.headers.get("referer", ""),
        allowed_origins=settings.ALLOWED_ORIGINS,
        environment=settings.ENVIRONMENT,
    ):
        return JSONResponse(
            status_code=403,
            content={"error": {"code": "CSRF_REJECTED", "message": "Cross-site request rejected."}},
        )
    return await call_next(request)