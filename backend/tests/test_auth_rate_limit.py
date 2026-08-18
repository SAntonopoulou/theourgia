"""The auth endpoints are rate-limited per client IP.

The pre-launch audit found the sign-in / password endpoints unguarded —
no limit, no lockout, so a script could brute a magickal name or stuff
credentials unbounded. The dependency here caps attempts per IP per
window and 429s past it. Tested at the dependency level (no DB): the
route wiring is asserted separately in test_api_auth.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers

from theourgia.api.ratelimit_dep import (
    enforce_auth_rate_limit,
    reset_auth_limiter,
)


class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    """The two attributes the dependency reads off a Request."""

    def __init__(self, ip: str, forwarded: str | None = None) -> None:
        self.client = _FakeClient(ip)
        h = {"x-forwarded-for": forwarded} if forwarded else {}
        self.headers = Headers(h)


@pytest.fixture(autouse=True)
def _fresh_limiter() -> None:
    reset_auth_limiter()


async def test_attempts_are_capped_per_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("THEOURGIA_AUTH_RATE_LIMIT_MAX_ATTEMPTS", "5")
    monkeypatch.setenv("THEOURGIA_AUTH_RATE_LIMIT_WINDOW_SECONDS", "60")
    from theourgia.core.config import reset_settings_cache

    reset_settings_cache()
    try:
        req = _FakeRequest("203.0.113.7")
        # Five attempts pass; the sixth trips the cap.
        for _ in range(5):
            await enforce_auth_rate_limit(req)  # type: ignore[arg-type]
        with pytest.raises(HTTPException) as exc:
            await enforce_auth_rate_limit(req)  # type: ignore[arg-type]
        assert exc.value.status_code == 429
        assert "Retry-After" in exc.value.headers
    finally:
        reset_settings_cache()


async def test_a_different_ip_has_its_own_budget(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("THEOURGIA_AUTH_RATE_LIMIT_MAX_ATTEMPTS", "2")
    from theourgia.core.config import reset_settings_cache

    reset_settings_cache()
    try:
        a = _FakeRequest("198.51.100.1")
        b = _FakeRequest("198.51.100.2")
        await enforce_auth_rate_limit(a)  # type: ignore[arg-type]
        await enforce_auth_rate_limit(a)  # type: ignore[arg-type]
        with pytest.raises(HTTPException):
            await enforce_auth_rate_limit(a)  # type: ignore[arg-type]
        # b is untouched by a's exhaustion.
        await enforce_auth_rate_limit(b)  # type: ignore[arg-type]
        await enforce_auth_rate_limit(b)  # type: ignore[arg-type]
    finally:
        reset_settings_cache()


async def test_forwarded_for_identifies_the_real_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Behind the proxy every request's socket peer is the proxy; the
    per-IP budget must key on the forwarded client, not the proxy."""
    monkeypatch.setenv("THEOURGIA_AUTH_RATE_LIMIT_MAX_ATTEMPTS", "2")
    from theourgia.core.config import reset_settings_cache

    reset_settings_cache()
    try:
        # Same proxy socket, two different forwarded clients.
        c1 = _FakeRequest("10.0.0.1", forwarded="192.0.2.10")
        c2 = _FakeRequest("10.0.0.1", forwarded="192.0.2.11")
        await enforce_auth_rate_limit(c1)  # type: ignore[arg-type]
        await enforce_auth_rate_limit(c1)  # type: ignore[arg-type]
        with pytest.raises(HTTPException):
            await enforce_auth_rate_limit(c1)  # type: ignore[arg-type]
        # c2 is a different forwarded client → its own budget.
        await enforce_auth_rate_limit(c2)  # type: ignore[arg-type]
    finally:
        reset_settings_cache()


async def test_limiter_fails_open_on_store_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A store that errors (a Redis blip in prod) must NOT lock people out
    of sign-in — the limiter degrades to 'no limit', never 'no auth'."""
    import theourgia.api.ratelimit_dep as mod

    class _BrokenLimiter:
        async def check(self, *a: object, **k: object) -> None:
            raise OSError("redis unreachable")

    monkeypatch.setattr(mod, "_get_limiter", lambda: _BrokenLimiter())
    # No exception: the request is allowed through.
    await enforce_auth_rate_limit(_FakeRequest("203.0.113.9"))  # type: ignore[arg-type]
