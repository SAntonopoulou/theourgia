"""Per-request locale, propagated via :mod:`contextvars`.

Asyncio's contextvars survive ``await`` boundaries so the locale set
by :class:`LocaleMiddleware` at request start flows into every nested
call (including spawned tasks). Outside an HTTP request, code that
needs a specific locale calls :func:`bind_locale` explicitly.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Final

__all__ = ["bind_locale", "clear_locale", "get_current_locale"]


_locale_var: Final[ContextVar[str | None]] = ContextVar(
    "theourgia.locale", default=None
)


def bind_locale(locale: str) -> None:
    """Set the current request's locale.

    Called by :class:`LocaleMiddleware` after negotiating the
    ``Accept-Language`` header. May also be called manually by Celery
    tasks / CLI scripts that want to act as if they were inside a
    request with a specific locale.
    """
    _locale_var.set(locale)


def get_current_locale() -> str | None:
    """Return the locale bound to the current context, or None when no
    middleware has set one (Celery tasks, CLI scripts that haven't
    explicitly bound)."""
    return _locale_var.get()


def clear_locale() -> None:
    """Reset the bound locale. Called by middleware at end-of-request
    and by test fixtures that need isolation between scenarios."""
    _locale_var.set(None)
