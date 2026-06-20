"""Short-lived challenge storage for WebAuthn ceremonies.

WebAuthn registration and authentication both begin with the server
issuing a one-time random challenge, and finish with the server
verifying that the authenticator signed exactly that challenge.
Challenges must:

- be unguessable (cryptographic random; we use what the underlying
  library generates),
- be single-use (verified once, then deleted to prevent replay),
- expire on a short timeline (we default to 5 minutes — long enough for
  a user to fumble with their key, short enough to bound replay risk).

This module defines a :class:`ChallengeStore` Protocol with two
implementations: an in-memory store for tests / development, and a
Redis-backed store for production. The service layer talks to the
Protocol, not the implementations.

Keys are namespaced by ceremony kind (``reg:<user_id>`` for
registration, ``auth:<session_id>`` for authentication) so a stolen
registration challenge can't be replayed as an authentication.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

__all__ = [
    "ChallengeStore",
    "InMemoryChallengeStore",
    "RedisChallengeStore",
    "DEFAULT_CHALLENGE_TTL_SECONDS",
]


DEFAULT_CHALLENGE_TTL_SECONDS: int = 300
"""5 minutes — long enough for a human + authenticator round trip, short
enough to bound replay risk."""


@runtime_checkable
class ChallengeStore(Protocol):
    """Storage for one-time WebAuthn challenges.

    Implementations MUST honor the TTL passed to :meth:`put` and MUST
    delete the challenge atomically on :meth:`take` so a leaked
    challenge can't be replayed.
    """

    async def put(self, key: str, challenge: bytes, ttl: int) -> None:
        """Store a challenge under ``key`` with the given TTL in seconds."""
        ...

    async def take(self, key: str) -> bytes | None:
        """Atomically read-and-delete the challenge at ``key``.

        Returns ``None`` if the key does not exist, has expired, or was
        already taken (preventing replay)."""
        ...


@dataclass
class _Entry:
    challenge: bytes
    expires_at: float


@dataclass
class InMemoryChallengeStore:
    """Process-local challenge store. Suitable for tests and single-process
    development. **Not** suitable for production where the API runs in
    multiple workers / processes — use :class:`RedisChallengeStore`.

    Expired entries are reaped lazily on access; for long-running
    processes that never call :meth:`take`, this means dead entries can
    accumulate. In test scope that's fine; in any other scope, prefer
    the Redis-backed store.
    """

    _entries: dict[str, _Entry] = field(default_factory=dict)

    async def put(self, key: str, challenge: bytes, ttl: int) -> None:
        self._entries[key] = _Entry(
            challenge=challenge,
            expires_at=time.monotonic() + ttl,
        )

    async def take(self, key: str) -> bytes | None:
        entry = self._entries.pop(key, None)
        if entry is None:
            return None
        if time.monotonic() >= entry.expires_at:
            return None
        return entry.challenge

    # Test helper — not part of the Protocol.
    def _size(self) -> int:
        return len(self._entries)


class RedisChallengeStore:
    """Redis-backed challenge store, using SETEX + GETDEL for atomic
    write-with-ttl and read-and-delete semantics.

    Takes a connected ``redis.asyncio.Redis`` client (the project uses
    aioredis via the ``redis`` package). The client is injected rather
    than constructed here so connection pooling / shutdown stays under
    application control.
    """

    def __init__(self, redis_client: object, *, key_prefix: str = "theourgia:wa:") -> None:
        self._redis = redis_client
        self._prefix = key_prefix

    def _k(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def put(self, key: str, challenge: bytes, ttl: int) -> None:
        # SET <key> <value> EX <ttl> — atomic write-with-ttl.
        result = self._redis.set(self._k(key), challenge, ex=ttl)
        if isinstance(result, Awaitable):
            await result

    async def take(self, key: str) -> bytes | None:
        # GETDEL is atomic; returns the value or nil and deletes the key
        # in one round trip. Available in Redis 6.2+.
        result = self._redis.getdel(self._k(key))
        if isinstance(result, Awaitable):
            value = await result
        else:
            value = result
        if value is None:
            return None
        if isinstance(value, str):
            return value.encode("utf-8")
        return bytes(value)
