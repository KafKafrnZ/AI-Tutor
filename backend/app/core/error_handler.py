from fastapi import HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger(__name__)

HTTP_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def rate_limit_exception_handler(request: Request, exc: Exception):
    logger.warning("Rate limit exceeded", path=request.url.path)
    return error_response(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "RATE_LIMITED",
        "Too many requests. Please wait and try again.",
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    logger.warning("Validation error", errors=str(errors))
    return error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "VALIDATION_ERROR",
        "Validation error",
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    code = HTTP_ERROR_CODES.get(exc.status_code, f"HTTP_{exc.status_code}")
    detail = exc.detail if isinstance(exc.detail, str) else jsonable_encoder(exc.detail)
    message = detail if isinstance(detail, str) else "Request failed"
    return error_response(exc.status_code, code, message)


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error", exc_info=True)
    return error_response(500, "DATABASE_ERROR", "Database error occurred")


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unexpected error", exc_info=True)
    return error_response(500, "INTERNAL_ERROR", "Internal server error")
