"""Rate-limit dependencies for the API.

The pre-launch audit found the authentication endpoints unguarded: no
rate limit, no lockout, so a script could stuff credentials or brute a
magickal name unbounded. The primitives already existed in
``core.ratelimit``; this wires them to the auth routes.

Keyed by client IP. A per-IP fixed window is the standard first line
against automated auth abuse; it does not punish a shared-NAT human
(the window is generous) and needs no read of the request body. Redis
in production so the limit is shared across workers; an in-process
store in dev/test where a single worker (and no redis) is the norm.
"""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from theourgia.core.config import get_settings
from theourgia.core.ratelimit import (
    InMemoryRateLimitStore,
    RateLimit,
    RateLimiter,
    RateLimitExceeded,
    RedisRateLimitStore,
)

__all__ = ["enforce_auth_rate_limit", "reset_auth_limiter"]


# A one-slot holder rather than a rebindable module global: the limiter is
# a process-wide singleton, and tests reset it between cases (the in-memory
# store would otherwise accumulate attempts across a whole session).
_state: dict[str, RateLimiter] = {}


def reset_auth_limiter() -> None:
    """Drop the process-wide limiter so the next call rebuilds it."""
    _state.pop("limiter", None)


def _get_limiter() -> RateLimiter:
    """The process-wide limiter, built once.

    Redis-backed in production (shared across workers); in-process
    otherwise. Built lazily so importing this module never opens a
    socket, and so tests get the in-memory store without configuration.
    """
    limiter = _state.get("limiter")
    if limiter is not None:
        return limiter
    settings = get_settings()
    if settings.is_production:
        store = RedisRateLimitStore(aioredis.from_url(str(settings.redis_url)))
        limiter = RateLimiter(store)
    else:
        limiter = RateLimiter(InMemoryRateLimitStore())
    _state["limiter"] = limiter
    return limiter


def _client_ip(request: Request) -> str:
    """The caller's IP, trusting the last proxy hop's forwarded-for.

    The host Caddy / Cloudflare edge set X-Forwarded-For; the rightmost
    entry it appends is the address it actually saw. Falls back to the
    socket peer where no proxy header is present (direct dev access).
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def enforce_auth_rate_limit(request: Request) -> None:
    """FastAPI dependency: 429 when an IP exceeds the auth attempt cap."""
    settings = get_settings()
    limit = RateLimit(
        name="auth.attempt",
        count=settings.auth_rate_limit_max_attempts,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )
    try:
        await _get_limiter().check(limit, identity=_client_ip(request))
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Wait a moment and try again.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
