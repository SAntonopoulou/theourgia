"""Build the process-wide :class:`Cache` from settings."""

from __future__ import annotations

from theourgia.core.cache.backends.base import CacheBackend
from theourgia.core.cache.backends.memory import InMemoryCacheBackend
from theourgia.core.cache.backends.redis import RedisCacheBackend
from theourgia.core.cache.cache import Cache

__all__ = ["build_backend_from_settings", "build_cache"]


def build_backend_from_settings(settings: object) -> CacheBackend:
    """Pick a backend based on ``THEOURGIA_CACHE_BACKEND``."""
    name = (getattr(settings, "cache_backend", None) or "memory").lower()

    if name == "memory":
        return InMemoryCacheBackend()

    if name == "redis":
        # Lazy redis client construction. Production wires this through
        # the same Redis the rest of the app uses.
        try:
            from redis.asyncio import Redis
        except ImportError as exc:
            msg = (
                "RedisCacheBackend requires the 'redis' package "
                "(already in core deps). Was the dependency uninstalled?"
            )
            raise ImportError(msg) from exc

        redis_url = str(getattr(settings, "redis_url", "redis://localhost:6379/0"))
        client = Redis.from_url(redis_url, decode_responses=False)
        return RedisCacheBackend(client)

    msg = (
        f"unknown cache backend: {name!r}. "
        "Set THEOURGIA_CACHE_BACKEND to one of: memory, redis"
    )
    raise ValueError(msg)


def build_cache(settings: object) -> Cache:
    """Construct the process-wide :class:`Cache`."""
    backend = build_backend_from_settings(settings)
    return Cache(backend=backend)
