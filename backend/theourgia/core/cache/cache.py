"""The :class:`Cache` orchestrator — what features actually call.

Wraps a :class:`CacheBackend` with the get-or-set memoization pattern
plus JSON serialization helpers and stampede-resistant loading
(under contention, only one caller computes; others wait for the
first to finish).

Backend failures degrade gracefully: a flaky cache must never bring
down a feature. On any backend error, the cache behaves as if the
key were missing (the loader runs).
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from theourgia.core.cache.backends.base import (
    CacheBackend,
    CacheBackendError,
)

__all__ = ["Cache", "CacheMiss"]

_log = logging.getLogger(__name__)
T = TypeVar("T")


class CacheMiss(Exception):
    """Raised by :meth:`Cache.get_strict` when the key is not present.

    The regular :meth:`Cache.get` returns ``None`` on miss — most
    callers want that. ``CacheMiss`` is for callers that need to
    distinguish "missing" from "cached value of None"."""


class Cache:
    """The feature-facing cache.

    Methods:

    - :meth:`get` / :meth:`set` / :meth:`delete` — raw bytes interface.
    - :meth:`get_or_set` — bytes get-or-set with a loader callable.
    - :meth:`get_or_set_json` — JSON-encoded get-or-set for structured
      data (the most common case).
    - :meth:`clear_namespace` — bulk invalidate by prefix.
    """

    def __init__(self, backend: CacheBackend) -> None:
        self._backend = backend
        # Per-key locks for stampede protection. Limits concurrent
        # loads of the same key to 1; other callers wait.
        self._locks: dict[str, asyncio.Lock] = {}

    @property
    def backend_name(self) -> str:
        return self._backend.name

    # ── Raw bytes API ────────────────────────────────────────────────

    async def get(self, key: str) -> bytes | None:
        """Return cached bytes for ``key``, or ``None`` on miss.

        Backend failures are logged at WARNING and treated as misses."""
        try:
            return await self._backend.get(key)
        except CacheBackendError as exc:
            _log.warning(
                "cache.backend_error.get",
                extra={"key": key, "error": str(exc)},
            )
            return None

    async def set(self, key: str, value: bytes, *, ttl_seconds: int) -> None:
        """Store ``value`` under ``key`` with TTL. Failures are logged
        but never raised — a cache write failure isn't worth failing
        the user's request."""
        try:
            await self._backend.set(key, value, ttl_seconds=ttl_seconds)
        except CacheBackendError as exc:
            _log.warning(
                "cache.backend_error.set",
                extra={"key": key, "error": str(exc)},
            )

    async def delete(self, key: str) -> None:
        try:
            await self._backend.delete(key)
        except CacheBackendError as exc:
            _log.warning(
                "cache.backend_error.delete",
                extra={"key": key, "error": str(exc)},
            )

    async def clear_namespace(self, prefix: str) -> int:
        """Drop every key under ``prefix``. Returns count of keys
        cleared (best-effort — backends without efficient prefix scan
        return 0)."""
        try:
            return await self._backend.clear_namespace(prefix)
        except CacheBackendError as exc:
            _log.warning(
                "cache.backend_error.clear_namespace",
                extra={"prefix": prefix, "error": str(exc)},
            )
            return 0

    # ── Get-or-set (memoization) ─────────────────────────────────────

    async def get_or_set(
        self,
        *,
        key: str,
        loader: Callable[[], Awaitable[bytes]],
        ttl_seconds: int,
    ) -> bytes:
        """Return cached value, or run ``loader`` and cache its result.

        Stampede-resistant: under contention only one caller runs the
        loader; others wait on a per-key asyncio Lock and re-check the
        cache before duplicating the work.
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            # Re-check inside the lock — another waiter may have just
            # populated the value.
            cached = await self.get(key)
            if cached is not None:
                return cached

            value = await loader()
            await self.set(key, value, ttl_seconds=ttl_seconds)
            return value

    async def get_or_set_json(
        self,
        *,
        key: str,
        loader: Callable[[], Awaitable[T]],
        ttl_seconds: int,
    ) -> T:
        """JSON-encoded get-or-set.

        The loader returns whatever JSON-serializable shape the
        feature uses; the cache stores the JSON bytes and decodes on
        retrieval. The return type is the loader's return type — Python's
        typing is honest here since ``json.loads`` produces a dict / list
        / scalar matching what was passed in (modulo tuples-becoming-lists).
        """
        cached_bytes = await self.get(key)
        if cached_bytes is not None:
            try:
                return json.loads(cached_bytes)  # type: ignore[no-any-return]
            except json.JSONDecodeError:
                # Corrupt cached value — fall through and reload
                _log.warning(
                    "cache.corrupt_value",
                    extra={"key": key},
                )

        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            cached_bytes = await self.get(key)
            if cached_bytes is not None:
                try:
                    return json.loads(cached_bytes)  # type: ignore[no-any-return]
                except json.JSONDecodeError:
                    pass

            value = await loader()
            encoded = json.dumps(value, default=str).encode("utf-8")
            await self.set(key, encoded, ttl_seconds=ttl_seconds)
            return value

    # ── Strict get ───────────────────────────────────────────────────

    async def get_strict(self, key: str) -> bytes:
        """Like :meth:`get` but raises :class:`CacheMiss` instead of
        returning None. For callers that need to distinguish "missing"
        from "cached value of None / empty bytes"."""
        value = await self.get(key)
        if value is None:
            raise CacheMiss(key)
        return value
