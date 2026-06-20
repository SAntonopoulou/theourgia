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
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from theourgia.api.schemas import Problem
from theourgia.core.i18n import _, _lazy

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

    Titles are wrapped in :func:`_lazy` so they translate against the
    request's locale at render time. The English source is also the
    fallback when no translation exists.
    """

    status_code: int = 500
    title: Any = _lazy("Internal Server Error")
    type_uri: str = "about:blank"

    def __init__(self, detail: str | None = None, *, headers: dict[str, str] | None = None):
        super().__init__(detail or str(self.title))
        self.detail = detail
        self.headers = headers or {}


class UnauthorizedError(APIError):
    """No credentials, or credentials that didn't authenticate."""

    status_code = 401
    title = _lazy("Unauthorized")


class ForbiddenError(APIError):
    """Authenticated, but not permitted to perform the action."""

    status_code = 403
    title = _lazy("Forbidden")


class NotFoundError(APIError):
    """The resource does not exist (or the caller isn't allowed to know it does)."""

    status_code = 404
    title = _lazy("Not Found")


class ConflictError(APIError):
    """The request conflicts with the current resource state."""

    status_code = 409
    title = _lazy("Conflict")


class ValidationFailedError(APIError):
    """The request body or parameters failed validation."""

    status_code = 422
    title = _lazy("Validation Failed")


class RateLimitedError(APIError):
    """The client exceeded the rate limit."""

    status_code = 429
    title = _lazy("Too Many Requests")


class ServiceUnavailableError(APIError):
    """A dependency is unavailable (DB, Redis, federation peer)."""

    status_code = 503
    title = _lazy("Service Unavailable")


# ─────────────────────────────────────────────────────────────────────────────
# Handlers
# ─────────────────────────────────────────────────────────────────────────────


def _problem_response(
    request: Request,
    *,
    status_code: int,
    title: Any,  # may be str or LazyString — coerced below
    type_uri: str = "about:blank",
    detail: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Construct a JSONResponse carrying an RFC 7807 Problem.

    ``title`` accepts both :class:`str` and :class:`LazyString` — the
    latter resolves to the request's locale at coerce time via the
    explicit ``str()`` call below."""
    request_id = getattr(request.state, "request_id", None)
    body = Problem(
        type=type_uri,
        title=str(title),
        status=status_code,
        detail=detail,
        instance=str(request.url.path),
        request_id=request_id,
    ).model_dump(exclude_none=False)

    response_headers = dict(headers or {})
    if request_id and "x-request-id" not in {k.lower() for k in response_headers}:
        response_headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=status_code,
        content=body,
        media_type=PROBLEM_CONTENT_TYPE,
        headers=response_headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Attach exception handlers that translate exceptions to Problem responses."""

    @app.exception_handler(APIError)
    async def _on_api_error(request: Request, exc: APIError) -> JSONResponse:
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
    ) -> JSONResponse:
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
    ) -> JSONResponse:
        # Surface a concise summary; full per-field errors live in detail.
        return _problem_response(
            request,
            status_code=422,
            title=_("Validation Failed"),
            detail="; ".join(_summarize_validation_errors(exc.errors())),
        )

    @app.exception_handler(Exception)
    async def _on_unhandled(request: Request, exc: Exception) -> JSONResponse:
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
            title=_("Internal Server Error"),
            detail=_(
                "An unexpected error occurred. "
                "The request ID identifies it in server logs."
            ),
        )


def _status_phrase(code: int) -> str:
    """Best-effort title for a given HTTP status code.

    Each phrase is returned through :func:`_` so it renders in the
    request's locale at call time. The English source remains the
    fallback when no translation exists for the active locale."""
    phrases = {
        400: _("Bad Request"),
        401: _("Unauthorized"),
        403: _("Forbidden"),
        404: _("Not Found"),
        405: _("Method Not Allowed"),
        406: _("Not Acceptable"),
        408: _("Request Timeout"),
        409: _("Conflict"),
        410: _("Gone"),
        411: _("Length Required"),
        412: _("Precondition Failed"),
        413: _("Payload Too Large"),
        414: _("URI Too Long"),
        415: _("Unsupported Media Type"),
        416: _("Range Not Satisfiable"),
        422: _("Validation Failed"),
        425: _("Too Early"),
        428: _("Precondition Required"),
        429: _("Too Many Requests"),
        431: _("Request Header Fields Too Large"),
        451: _("Unavailable For Legal Reasons"),
        500: _("Internal Server Error"),
        501: _("Not Implemented"),
        502: _("Bad Gateway"),
        503: _("Service Unavailable"),
        504: _("Gateway Timeout"),
        505: _("HTTP Version Not Supported"),
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
