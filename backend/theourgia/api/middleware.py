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

Implementation note — :class:`RequestIDMiddleware` is **raw ASGI**, not
``BaseHTTPMiddleware``. Starlette's BaseHTTPMiddleware re-raises
exceptions out of ``call_next`` even when an exception handler has
already produced a response (it doesn't compose cleanly with FastAPI's
exception-handler stack). Raw ASGI dodges that footgun by wrapping
``send`` rather than wrapping the app's return value.
"""

from __future__ import annotations

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from theourgia.core.config import Settings
from theourgia.core.ids import uuid7
from theourgia.core.observability.context import (
    bind_request_id,
    clear_observability_context,
)

__all__ = ["RequestIDMiddleware", "register_middleware"]


REQUEST_ID_HEADER = "X-Request-ID"
_MAX_INBOUND_LEN = 128


class RequestIDMiddleware:
    """Propagate / generate a request correlation ID.

    If the inbound request carries an ``X-Request-ID`` header with a
    reasonable value, we trust and propagate it. Otherwise a fresh
    UUIDv7 is generated. The ID is stored on ``request.state.request_id``
    for downstream use, bound to the observability contextvar (so it
    flows into every log line), and echoed back in the response header.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _request_id_from_headers(scope) or str(uuid7())

        # Make available downstream via request.state
        scope.setdefault("state", {})["request_id"] = request_id
        bind_request_id(request_id)

        async def send_with_header(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # Only add if not already set by a downstream handler.
                if not any(name.lower() == b"x-request-id" for name, _ in headers):
                    headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            clear_observability_context()


def _request_id_from_headers(scope: Scope) -> str | None:
    """Pull a trusted ``X-Request-ID`` value off the ASGI scope, if any."""
    for name, value in scope.get("headers", ()):  # name and value are bytes
        if name.lower() == b"x-request-id":
            try:
                inbound = value.decode("latin-1").strip()
            except UnicodeDecodeError:
                return None
            if inbound and len(inbound) <= _MAX_INBOUND_LEN and inbound.isprintable():
                return inbound
            return None
    return None


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
