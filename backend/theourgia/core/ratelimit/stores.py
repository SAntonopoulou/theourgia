"""Rate-limit counter storage.

Counter-store interface with two implementations:

- :class:`InMemoryRateLimitStore` — process-local sliding-window
  counter. Useful for tests and single-process dev. Not safe across
  multiple API workers (each worker has its own counter).
- :class:`RedisRateLimitStore` — Redis-backed. Atomic increment +
  expiry via Redis's INCR + EXPIRE, suitable for multi-worker
  production deployments.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

__all__ = [
    "InMemoryRateLimitStore",
    "RateLimitStore",
    "RedisRateLimitStore",
]


@runtime_checkable
class RateLimitStore(Protocol):
    """Counter store for the rate limiter.

    The contract: ``incr_and_get(key, window_seconds)`` increments the
    counter under ``key`` and returns the new value. If the key didn't
    exist (or had expired), the value is 1 and the store schedules
    expiry after ``window_seconds``.
    """

    async def incr_and_get(self, key: str, window_seconds: int) -> int:
        ...

    async def get(self, key: str) -> int:
        """Return the current count for ``key`` (0 if absent)."""
        ...

    async def reset(self, key: str) -> None:
        """Drop the counter. Tests and operator overrides only."""
        ...


@dataclass
class _Entry:
    count: int
    expires_at: float


@dataclass
class InMemoryRateLimitStore:
    """Process-local sliding-window counter.

    Suitable for tests and single-process dev. Multi-worker production
    must use :class:`RedisRateLimitStore`; each in-memory store sees
    only its own worker's traffic and the rate cap would be effectively
    multiplied by worker count."""

    _entries: dict[str, _Entry] = field(default_factory=dict)

    async def incr_and_get(self, key: str, window_seconds: int) -> int:
        now = time.monotonic()
        entry = self._entries.get(key)
        if entry is None or entry.expires_at <= now:
            self._entries[key] = _Entry(
                count=1, expires_at=now + window_seconds
            )
            return 1
        entry.count += 1
        return entry.count

    async def get(self, key: str) -> int:
        now = time.monotonic()
        entry = self._entries.get(key)
        if entry is None or entry.expires_at <= now:
            return 0
        return entry.count

    async def reset(self, key: str) -> None:
        self._entries.pop(key, None)


class RedisRateLimitStore:
    """Redis-backed counter.

    Uses ``INCR`` (atomic) + ``EXPIRE`` (best-effort, only set on first
    increment) — the classic fixed-window-rate-limiter pattern.

    Atomicity: in the race between INCR returning 1 and EXPIRE landing,
    multiple workers might set the TTL. They all set it to the same
    value so the race is benign.
    """

    def __init__(self, redis_client: object, *, key_prefix: str = "theourgia:rl:") -> None:
        self._redis = redis_client
        self._prefix = key_prefix

    def _k(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def incr_and_get(self, key: str, window_seconds: int) -> int:
        full_key = self._k(key)
        count = await _await(self._redis.incr(full_key))
        if count == 1:
            await _await(self._redis.expire(full_key, window_seconds))
        return int(count)

    async def get(self, key: str) -> int:
        value = await _await(self._redis.get(self._k(key)))
        if value is None:
            return 0
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    async def reset(self, key: str) -> None:
        await _await(self._redis.delete(self._k(key)))


async def _await(value: object) -> object:
    """Coerce sync-or-async return into an awaited value."""
    if isinstance(value, Awaitable):
        return await value
    return value
