from fastapi import HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger(__name__)


def _error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    logger.warning("Validation error", errors=str(errors))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body("VALIDATION_ERROR", "One or more fields are invalid."),
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body("DATABASE_ERROR", "A database error occurred. Please try again."),
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", str(detail))
    else:
        code = "HTTP_ERROR"
        message = str(detail) if detail else "Request error"
    logger.warning("HTTP error", status_code=exc.status_code, code=code)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code, message),
    )


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(
        "Rate limit exceeded",
        client=request.client.host if request.client else "unknown",
        path=request.url.path,
    )
    return JSONResponse(
        status_code=429,
        content=_error_body("RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down and try again."),
    )


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unexpected error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
    )
