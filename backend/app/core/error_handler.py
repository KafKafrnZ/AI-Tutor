from fastapi import HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger(__name__)

_VALUE_ERROR_PREFIX = "value error, "
_LOC_SKIP = {"body", "query", "path"}


def _error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def _field_label(loc) -> str:
    if not isinstance(loc, (list, tuple)):
        return ""
    parts = [p for p in loc if isinstance(p, str) and p not in _LOC_SKIP]
    if not parts:
        return ""
    return parts[-1].replace("_", " ").capitalize()


def human_validation_message(errors: list) -> str:
    """First Pydantic error, without the 'Value error, ' prefix."""
    if not errors:
        return "One or more fields are invalid."
    first = errors[0] if isinstance(errors[0], dict) else {}
    label = _field_label(first.get("loc"))
    if str(first.get("type") or "") == "missing" and label:
        return f"{label} is required."
    msg = str(first.get("msg") or "").strip()
    if msg.lower().startswith(_VALUE_ERROR_PREFIX):
        msg = msg[len(_VALUE_ERROR_PREFIX) :].strip()
    if not msg:
        return "One or more fields are invalid."
    if msg[0].islower():
        msg = msg[0].upper() + msg[1:]
    if msg[-1] not in ".!?":
        msg += "."
    return msg


def api_error(status: int, code: str, message: str) -> HTTPException:
    """Create a semantically typed HTTPException."""
    return HTTPException(status_code=status, detail={"code": code, "message": message})


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    logger.warning("validation_error", errors=str(errors))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body("VALIDATION_ERROR", human_validation_message(errors)),
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("database_error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body("DATABASE_ERROR", "A database error occurred. Please try again."),
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        # Already a structured api_error() response — pass through as-is
        content = {"error": detail}
    elif isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", str(detail))
        content = _error_body(code, message)
    else:
        content = _error_body("HTTP_ERROR", str(detail) if detail else "Request error")
    logger.warning("http_exception", status=exc.status_code, code=content["error"].get("code"))
    return JSONResponse(status_code=exc.status_code, content=content)


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(
        "rate_limited",
        client=request.client.host if request.client else "unknown",
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=_error_body("RATE_LIMITED", "Too many requests. Please slow down and try again."),
    )


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("unexpected_error", exc_info=True)
    import os
    if os.getenv("SENTRY_DSN", ""):
        import sentry_sdk as _sentry
        _sentry.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content=_error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
    )