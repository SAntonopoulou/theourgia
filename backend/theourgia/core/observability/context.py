"""Per-request observability context, propagated via :mod:`contextvars`.

Asyncio's contextvars survive ``await`` boundaries and propagate to
spawned tasks. We use them to carry the request correlation ID and the
authenticated user ID through the call stack so log lines and metrics
can include them without explicit threading.

The set of variables here is intentionally small — anything more
detailed (route, tenant, plugin id) is bound by structlog's
``bind_contextvars`` at the binding site rather than dedicated globals.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Final
from uuid import UUID

__all__ = [
    "bind_request_id",
    "bind_user_id",
    "clear_observability_context",
    "get_request_id",
    "get_user_id",
]


_request_id_var: Final[ContextVar[str | None]] = ContextVar(
    "theourgia.request_id", default=None
)
_user_id_var: Final[ContextVar[str | None]] = ContextVar(
    "theourgia.user_id", default=None
)


def bind_request_id(request_id: str) -> None:
    """Bind a request correlation ID to the current context.

    Set by :class:`RequestIDMiddleware` at the start of each HTTP
    request and unset after the response is generated.
    """
    _request_id_var.set(request_id)


def bind_user_id(user_id: UUID | str) -> None:
    """Bind the authenticated user id to the current context.

    Set by the authentication dependency after the bearer token has
    been resolved.
    """
    _user_id_var.set(str(user_id))


def get_request_id() -> str | None:
    return _request_id_var.get()


def get_user_id() -> str | None:
    return _user_id_var.get()


def clear_observability_context() -> None:
    """Reset all observability contextvars. Used at end-of-request and in
    test fixtures that need isolation between scenarios."""
    _request_id_var.set(None)
    _user_id_var.set(None)
