"""Cache backend Protocol and shared types.

The interface is intentionally small — get / set / delete / clear —
so additional backends (memcached, distributed Hazelcast, etc.) are
trivial to add. The :class:`Cache` orchestrator wraps a backend with
the get-or-set memoization pattern that features actually call.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

__all__ = ["CacheBackend", "CacheBackendError"]


class CacheBackendError(Exception):
    """Raised when a backend fails on get / set / delete.

    The :class:`Cache` orchestrator catches these and treats them as
    misses — a flaky cache must never bring down a feature."""


@runtime_checkable
class CacheBackend(Protocol):
    """Pluggable cache interface."""

    name: str

    async def get(self, key: str) -> bytes | None:
        """Return cached bytes for ``key``, or ``None`` on miss."""
        ...

    async def set(self, key: str, value: bytes, *, ttl_seconds: int) -> None:
        """Store ``value`` under ``key`` with TTL. Overwrites any
        existing value for the same key."""
        ...

    async def delete(self, key: str) -> None:
        """Invalidate ``key``. Missing keys are not an error."""
        ...

    async def clear_namespace(self, prefix: str) -> int:
        """Delete every key starting with ``prefix``. Returns the
        number of keys deleted. Used for bulk invalidation when a
        feature changes its schema or wants to flush a group."""
        ...
