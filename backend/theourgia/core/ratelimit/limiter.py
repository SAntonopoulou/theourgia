"""Rate limiter — applies a :class:`RateLimit` against a store.

Endpoints declare a limit; the limiter increments a counter keyed on
(endpoint, identity) and raises :class:`RateLimitExceeded` when the
cap is reached.

Identity choice — per-user (authenticated) or per-IP (anonymous) —
is up to the caller. The limiter accepts an opaque identity string
and doesn't care which.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from theourgia.core.ratelimit.stores import RateLimitStore

__all__ = ["RateLimit", "RateLimiter", "RateLimitExceeded"]


class RateLimitExceeded(Exception):
    """Raised when the caller has tripped a rate limit.

    Attributes:
        limit: The :class:`RateLimit` that was tripped.
        retry_after_seconds: How long the caller should wait before
            retrying. Surfaced to clients via the ``Retry-After``
            response header.
    """

    def __init__(self, limit: "RateLimit", *, retry_after_seconds: int) -> None:
        super().__init__(
            f"rate limit {limit.name!r} exceeded "
            f"({limit.count} per {limit.window_seconds}s); "
            f"retry after {retry_after_seconds}s"
        )
        self.limit = limit
        self.retry_after_seconds = retry_after_seconds


@dataclass(frozen=True, slots=True)
class RateLimit:
    """A declared rate limit.

    Attributes:
        name: Short stable identifier used for the counter key and
            for ``Retry-After`` diagnostics (``"login.attempt"``,
            ``"entry.write"``, ``"federation.publish"``).
        count: Max requests within ``window_seconds``.
        window_seconds: Fixed-window length.
    """

    name: str
    count: int
    window_seconds: int

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("RateLimit.name must not be empty")
        if self.count <= 0:
            raise ValueError(f"RateLimit.count must be > 0, got {self.count}")
        if self.window_seconds <= 0:
            raise ValueError(
                f"RateLimit.window_seconds must be > 0, got {self.window_seconds}"
            )


class RateLimiter:
    """Composes a :class:`RateLimitStore` into a usable limiter."""

    def __init__(self, store: "RateLimitStore") -> None:
        self._store = store

    async def check(self, limit: RateLimit, *, identity: str) -> None:
        """Increment the counter for (limit, identity). Raise
        :class:`RateLimitExceeded` if the cap is now exceeded.

        ``identity`` is opaque to the limiter — typically the user id
        for authenticated requests or the client IP for anonymous ones.
        Mixing user ids with IPs in the same identity string is the
        caller's responsibility to avoid (use distinct ``limit.name``
        values per identity flavour if necessary).
        """
        key = f"{limit.name}:{identity}"
        count = await self._store.incr_and_get(key, limit.window_seconds)
        if count > limit.count:
            # Average retry-after — half the window. Real
            # sliding-window analytics would compute the precise wait;
            # we keep it simple.
            retry = max(1, ceil(limit.window_seconds / 2))
            raise RateLimitExceeded(limit, retry_after_seconds=retry)

    async def peek(self, limit: RateLimit, *, identity: str) -> int:
        """Return the current count without incrementing. For
        diagnostics / admin dashboards."""
        return await self._store.get(f"{limit.name}:{identity}")

    async def reset(self, limit: RateLimit, *, identity: str) -> None:
        """Drop the counter. Operator override; tests use freely."""
        await self._store.reset(f"{limit.name}:{identity}")
