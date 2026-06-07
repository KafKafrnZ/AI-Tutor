from fastapi import HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
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


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unexpected error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
    )
