"""
Global Error Handler Middleware

Catches all unhandled exceptions and provides user-friendly error responses.
"""

import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from alpaca.common.exceptions import APIError as AlpacaAPIError

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next):
    """Global error handling middleware"""
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        return await handle_exception(request, exc)


async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """Handle different types of exceptions and return appropriate responses"""

    # Log the full error for debugging
    logger.error(
        f"❌ Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True
    )

    # Alpaca API errors
    if isinstance(exc, AlpacaAPIError):
        error_message = str(exc)

        # Check for common Alpaca errors and provide helpful messages
        if "insufficient" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Insufficient funds or shares",
                    "message": "You don't have enough buying power or shares for this trade.",
                    "detail": error_message,
                    "type": "alpaca_error"
                }
            )
        elif "market" in error_message.lower() and "closed" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Market closed",
                    "message": "The market is currently closed. Your order will be queued for market open.",
                    "detail": error_message,
                    "type": "alpaca_error"
                }
            )
        elif "forbidden" in error_message.lower() or "unauthorized" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": "Authentication error",
                    "message": "Your brokerage connection has expired. Please reconnect your account.",
                    "detail": error_message,
                    "type": "alpaca_auth_error"
                }
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Brokerage error",
                    "message": "An error occurred with your brokerage. Please try again.",
                    "detail": error_message,
                    "type": "alpaca_error"
                }
            )

    # HTTP exceptions (already handled by FastAPI but we customize the response)
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "message": exc.detail,
                "type": "http_error"
            }
        )

    # Validation errors
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Validation error",
                "message": "The request data is invalid.",
                "detail": exc.errors(),
                "type": "validation_error"
            }
        )

    # Database errors
    if "supabase" in str(exc).lower() or "database" in str(exc).lower():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Database error",
                "message": "A database error occurred. Please try again.",
                "detail": str(exc) if logger.level == logging.DEBUG else "Database connection issue",
                "type": "database_error"
            }
        )

    # Network/timeout errors
    if "timeout" in str(exc).lower() or "connection" in str(exc).lower():
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={
                "error": "Connection timeout",
                "message": "The request timed out. Please try again.",
                "detail": str(exc),
                "type": "timeout_error"
            }
        )

    # Generic internal server error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Our team has been notified.",
            "detail": str(exc) if logger.level == logging.DEBUG else "Please try again later",
            "type": "internal_error",
            "request_id": id(request)
        }
    )


def setup_error_handlers(app):
    """Setup error handlers for the FastAPI application"""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return await handle_exception(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return await handle_exception(request, exc)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return await handle_exception(request, exc)

    logger.info("✅ Error handlers configured")
