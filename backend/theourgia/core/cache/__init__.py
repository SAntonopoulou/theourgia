"""Caching substrate.

Pluggable read-through cache for expensive computations and frequent
lookups. Replaces ad-hoc Redis calls or per-feature dict memoization
with one canonical pattern features depend on.

Canonical call point::

    cached_chart = await cache.get_or_set(
        key=f"astrology:chart:{ephe_hash}:{lat}:{lon}:{when_iso}",
        loader=lambda: compute_natal_chart(...),
        ttl_seconds=86400,
    )

The loader is invoked only on cache miss. Cache hits are returned
without re-running the computation. Backends are pluggable: Redis in
production, in-memory for tests + single-process dev.

**Namespacing:** features prefix their keys (``"astrology:chart:..."``,
``"gematria:lookup:..."``, ``"federation:peer:..."``). The substrate
doesn't enforce a particular scheme — it's the feature's
responsibility — but a project-wide convention prevents collisions.

**Serialization:** the substrate stores bytes. Features that cache
structured data serialize themselves (JSON, msgpack, pickle within a
single-process Redis where appropriate). Two helpers are provided for
the common JSON-roundtrip case (:meth:`Cache.get_or_set_json`).
"""

from __future__ import annotations

from theourgia.core.cache.backends.base import (
    CacheBackend,
    CacheBackendError,
)
from theourgia.core.cache.backends.memory import InMemoryCacheBackend
from theourgia.core.cache.backends.redis import RedisCacheBackend
from theourgia.core.cache.cache import Cache, CacheMiss
from theourgia.core.cache.factory import build_cache

__all__ = [
    "Cache",
    "CacheBackend",
    "CacheBackendError",
    "CacheMiss",
    "InMemoryCacheBackend",
    "RedisCacheBackend",
    "build_cache",
]
