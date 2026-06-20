"""Redis-backed cache.

Uses ``SET key value EX ttl`` for atomic write-with-TTL and ``GET`` /
``DEL`` for read / invalidate. Namespace clear uses ``SCAN`` (not
``KEYS`` — ``KEYS`` blocks the Redis event loop on large keyspaces).
"""

from __future__ import annotations

from collections.abc import Awaitable

from theourgia.core.cache.backends.base import CacheBackendError

__all__ = ["RedisCacheBackend"]


class RedisCacheBackend:
    """Cache backed by Redis."""

    name = "redis"

    def __init__(
        self, redis_client: object, *, key_prefix: str = "theourgia:cache:"
    ) -> None:
        self._redis = redis_client
        self._prefix = key_prefix

    def _k(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def get(self, key: str) -> bytes | None:
        try:
            raw = await _await(self._redis.get(self._k(key)))
        except Exception as exc:  # noqa: BLE001 — cache failures must not crash
            raise CacheBackendError(f"redis GET failed: {exc}") from exc
        if raw is None:
            return None
        if isinstance(raw, str):
            return raw.encode("utf-8")
        return bytes(raw)

    async def set(self, key: str, value: bytes, *, ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            return
        try:
            await _await(self._redis.set(self._k(key), value, ex=ttl_seconds))
        except Exception as exc:  # noqa: BLE001
            raise CacheBackendError(f"redis SET failed: {exc}") from exc

    async def delete(self, key: str) -> None:
        try:
            await _await(self._redis.delete(self._k(key)))
        except Exception as exc:  # noqa: BLE001
            raise CacheBackendError(f"redis DEL failed: {exc}") from exc

    async def clear_namespace(self, prefix: str) -> int:
        """Delete every key under ``prefix`` using SCAN.

        Implementation note — we delete in batches of up to 500 per
        DEL call to balance round-trips against pipeline size.
        """
        full_prefix = self._k(prefix)
        deleted = 0
        try:
            cursor = 0
            while True:
                cursor, batch = await _await(
                    self._redis.scan(
                        cursor=cursor, match=f"{full_prefix}*", count=500
                    )
                )
                if batch:
                    await _await(self._redis.delete(*batch))
                    deleted += len(batch)
                if cursor == 0:
                    break
        except Exception as exc:  # noqa: BLE001
            raise CacheBackendError(
                f"redis namespace clear failed: {exc}"
            ) from exc
        return deleted


async def _await(value: object) -> object:
    """Coerce sync-or-async return into an awaited value."""
    if isinstance(value, Awaitable):
        return await value
    return value
