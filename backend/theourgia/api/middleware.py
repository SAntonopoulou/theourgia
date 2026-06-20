"""HTTP middleware.

Each middleware is small and single-purpose. They are registered in the
app factory in the order that produces a sensible composition:

- :class:`RequestIDMiddleware` runs outermost so every other layer can
  read ``request.state.request_id`` (including the error handlers).
- CORS is handled by Starlette's built-in middleware, configured per
  :class:`Settings`.

Rate limiting and idempotency-key handling land in subsequent batches
when their backends (Redis-backed counter / idempotency cache) are in
place.
"""

from __future__ import annotations

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from theourgia.core.config import Settings
from theourgia.core.ids import uuid7

__all__ = ["RequestIDMiddleware", "register_middleware"]


REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Propagate / generate a request correlation ID.

    If the inbound request carries an ``X-Request-ID`` header with a
    reasonable value, we trust and propagate it. Otherwise a fresh
    UUIDv7 is generated. The ID is stored on ``request.state.request_id``
    for downstream use and echoed back in the response header.
    """

    _MAX_INBOUND_LEN: int = 128

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(  # type: ignore[override]
        self,
        request: Request,
        call_next: object,
    ) -> Response:
        inbound = request.headers.get(REQUEST_ID_HEADER, "").strip()
        if inbound and len(inbound) <= self._MAX_INBOUND_LEN and inbound.isprintable():
            request_id = inbound
        else:
            request_id = str(uuid7())

        request.state.request_id = request_id

        response: Response = await call_next(request)  # type: ignore[misc]
        response.headers[REQUEST_ID_HEADER] = request_id
        return response


def register_middleware(app: FastAPI, settings: Settings) -> None:
    """Install all configured middleware on the app, in the right order."""

    # CORS — locked down by default. In production, only same-origin and
    # known federation peers should be permitted (configured per-instance).
    # In development we allow localhost origins for convenience.
    if settings.is_development:
        allow_origins = [
            "http://localhost:4321",  # Astro dev
            "http://localhost:5173",  # Vite admin dev
            "http://127.0.0.1:4321",
            "http://127.0.0.1:5173",
        ]
    else:
        # Conservative default: only the same origin. The deployment can
        # override via env in a later batch when the surface grows.
        allow_origins = [settings.base_url]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )

    # Request-ID is added last so it ends up outermost (middleware stacks
    # are LIFO during request processing).
    app.add_middleware(RequestIDMiddleware)
