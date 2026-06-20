"""ASGI middleware that binds the request locale.

Each HTTP request:

1. Extracts the ``Accept-Language`` header (and an optional
   ``?locale=`` query override).
2. Negotiates against the supported locales declared in settings.
3. Binds the result to the locale contextvar for the request lifetime.
4. Clears the binding in ``finally`` so the next reuse of this asyncio
   task starts clean.

The middleware does NOT touch authenticated users' stored locale
preferences — that lookup happens later (Phase 03 adds
``User.preferred_locale``) inside auth dependencies, which call
:func:`bind_locale` to override the header-based choice.
"""

from __future__ import annotations

from starlette.types import ASGIApp, Receive, Scope, Send

from theourgia.core.i18n.locale import bind_locale, clear_locale
from theourgia.core.i18n.negotiation import negotiate_locale

__all__ = ["LocaleMiddleware"]


_QUERY_PARAM: bytes = b"locale="
_MAX_HEADER_LENGTH: int = 200


class LocaleMiddleware:
    """Bind the per-request locale.

    Args:
        app: Downstream ASGI app.
        supported_locales: Locale tags the app supports (e.g.
            ``["en", "es", "fr"]``). Order doesn't matter.
        default_locale: Fallback when no candidate matches.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        supported_locales: list[str],
        default_locale: str = "en",
    ) -> None:
        self.app = app
        self._supported = list(supported_locales)
        self._default = default_locale

    async def __call__(
        self, scope: Scope, receive: Receive, send: Send
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        locale = self._negotiate(scope)
        bind_locale(locale)
        try:
            await self.app(scope, receive, send)
        finally:
            clear_locale()

    def _negotiate(self, scope: Scope) -> str:
        # 1. Explicit override via ?locale=xx query string (operator/test
        #    convenience). We accept this only when it matches a
        #    supported locale exactly — no fuzzy matching for explicit
        #    requests; the caller asked for something specific.
        query = scope.get("query_string", b"") or b""
        if _QUERY_PARAM in query:
            for chunk in query.split(b"&"):
                if chunk.startswith(_QUERY_PARAM):
                    candidate = chunk[len(_QUERY_PARAM):].decode("latin-1", "replace")
                    if candidate in self._supported:
                        return candidate
                    break

        # 2. Accept-Language header negotiation.
        for name, value in scope.get("headers", ()):
            if name.lower() == b"accept-language":
                # Cap header length defensively — clients sometimes
                # send pathologically long Accept-Language values.
                raw = value[:_MAX_HEADER_LENGTH].decode("latin-1", "replace")
                return negotiate_locale(raw, self._supported, self._default)

        # 3. No header — fall back to default.
        return self._default
