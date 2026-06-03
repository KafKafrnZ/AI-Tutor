from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Pydantic v2 includes ctx.error (an Exception object) in error dicts — not JSON-serializable.
    # jsonable_encoder converts non-serializable values to strings before JSONResponse renders them.
    errors = jsonable_encoder(exc.errors())
    logger.warning("Validation error", errors=str(errors))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors, "message": "Validation error"}
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