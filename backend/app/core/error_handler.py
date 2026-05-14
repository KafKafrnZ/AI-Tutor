from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error", errors=exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation error"}
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred"}
    )

async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unexpected error", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )