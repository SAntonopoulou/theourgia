"""API error types and the exception → :class:`Problem` translator.

Endpoints raise :class:`APIError` subclasses; a single exception handler
catches them and emits an RFC 7807 ``application/problem+json``
response. Pydantic validation errors and uncaught exceptions are also
translated to Problem responses (the latter without leaking internals).

Errors include the request ID (set by the request-ID middleware) for
log correlation; clients see it in the ``X-Request-ID`` response header
and inside the JSON body under ``request_id``.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from theourgia.api.schemas import Problem

__all__ = [
    "APIError",
    "UnauthorizedError",
    "ForbiddenError",
    "NotFoundError",
    "ConflictError",
    "ValidationFailedError",
    "RateLimitedError",
    "ServiceUnavailableError",
    "register_error_handlers",
    "PROBLEM_CONTENT_TYPE",
]

PROBLEM_CONTENT_TYPE = "application/problem+json"
_log = logging.getLogger(__name__)


class APIError(Exception):
    """Base class for API-surfaceable errors.

    Endpoints raise these; the registered handler emits a
    :class:`Problem` response. Subclasses set the HTTP status and a
    stable ``title``.
    """

    status_code: int = 500
    title: str = "Internal Server Error"
    type_uri: str = "about:blank"

    def __init__(self, detail: str | None = None, *, headers: dict[str, str] | None = None):
        super().__init__(detail or self.title)
        self.detail = detail
        self.headers = headers or {}


class UnauthorizedError(APIError):
    """No credentials, or credentials that didn't authenticate."""

    status_code = 401
    title = "Unauthorized"


class ForbiddenError(APIError):
    """Authenticated, but not permitted to perform the action."""

    status_code = 403
    title = "Forbidden"


class NotFoundError(APIError):
    """The resource does not exist (or the caller isn't allowed to know it does)."""

    status_code = 404
    title = "Not Found"


class ConflictError(APIError):
    """The request conflicts with the current resource state."""

    status_code = 409
    title = "Conflict"


class ValidationFailedError(APIError):
    """The request body or parameters failed validation."""

    status_code = 422
    title = "Validation Failed"


class RateLimitedError(APIError):
    """The client exceeded the rate limit."""

    status_code = 429
    title = "Too Many Requests"


class ServiceUnavailableError(APIError):
    """A dependency is unavailable (DB, Redis, federation peer)."""

    status_code = 503
    title = "Service Unavailable"


# ─────────────────────────────────────────────────────────────────────────────
# Handlers
# ─────────────────────────────────────────────────────────────────────────────


def _problem_response(
    request: Request,
    *,
    status_code: int,
    title: str,
    type_uri: str = "about:blank",
    detail: str | None = None,
    headers: dict[str, str] | None = None,
) -> ORJSONResponse:
    """Construct an ORJSONResponse carrying an RFC 7807 Problem."""
    request_id = getattr(request.state, "request_id", None)
    body = Problem(
        type=type_uri,
        title=title,
        status=status_code,
        detail=detail,
        instance=str(request.url.path),
        request_id=request_id,
    ).model_dump(exclude_none=False)

    response_headers = dict(headers or {})
    if request_id and "x-request-id" not in {k.lower() for k in response_headers}:
        response_headers["X-Request-ID"] = request_id

    return ORJSONResponse(
        status_code=status_code,
        content=body,
        media_type=PROBLEM_CONTENT_TYPE,
        headers=response_headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Attach exception handlers that translate exceptions to Problem responses."""

    @app.exception_handler(APIError)
    async def _on_api_error(request: Request, exc: APIError) -> ORJSONResponse:
        return _problem_response(
            request,
            status_code=exc.status_code,
            title=exc.title,
            type_uri=exc.type_uri,
            detail=exc.detail,
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _on_starlette_http_error(
        request: Request, exc: StarletteHTTPException
    ) -> ORJSONResponse:
        return _problem_response(
            request,
            status_code=exc.status_code,
            title=_status_phrase(exc.status_code),
            detail=str(exc.detail) if exc.detail else None,
            headers=dict(exc.headers or {}),
        )

    @app.exception_handler(RequestValidationError)
    async def _on_validation_error(
        request: Request, exc: RequestValidationError
    ) -> ORJSONResponse:
        # Surface a concise summary; full per-field errors live in detail.
        return _problem_response(
            request,
            status_code=422,
            title="Validation Failed",
            detail="; ".join(_summarize_validation_errors(exc.errors())),
        )

    @app.exception_handler(Exception)
    async def _on_unhandled(request: Request, exc: Exception) -> ORJSONResponse:
        # Log with full traceback but emit a generic Problem so internal
        # details (paths, query shapes, secret keys present in tracebacks)
        # never reach the client.
        _log.exception(
            "unhandled exception during request",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return _problem_response(
            request,
            status_code=500,
            title="Internal Server Error",
            detail="An unexpected error occurred. The request ID identifies it in server logs.",
        )


def _status_phrase(code: int) -> str:
    """Best-effort title for a given HTTP status code."""
    phrases = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Payload Too Large",
        414: "URI Too Long",
        415: "Unsupported Media Type",
        416: "Range Not Satisfiable",
        422: "Validation Failed",
        425: "Too Early",
        428: "Precondition Required",
        429: "Too Many Requests",
        431: "Request Header Fields Too Large",
        451: "Unavailable For Legal Reasons",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported",
    }
    return phrases.get(code, "Error")


def _summarize_validation_errors(errors: list[dict[str, Any]]) -> list[str]:
    """Render Pydantic validation errors into short strings."""
    summaries: list[str] = []
    for err in errors:
        loc = ".".join(str(p) for p in err.get("loc", ()))
        msg = err.get("msg", "invalid")
        summaries.append(f"{loc}: {msg}" if loc else msg)
    return summaries
