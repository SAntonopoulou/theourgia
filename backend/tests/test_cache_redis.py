"""Tests for the Redis cache backend (stubbed client)."""

from __future__ import annotations

from typing import Any

import pytest

from theourgia.core.cache.backends.base import CacheBackendError
from theourgia.core.cache.backends.redis import RedisCacheBackend


class _FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, bytes] = {}
        self.last_ex: int | None = None
        self.fail_on: str | None = None
        self.calls: list[tuple[str, Any]] = []

    async def get(self, key: str) -> bytes | None:
        if self.fail_on == "get":
            raise RuntimeError("simulated GET failure")
        self.calls.append(("get", key))
        return self.storage.get(key)

    async def set(self, key: str, value: bytes, ex: int | None = None) -> bool:
        if self.fail_on == "set":
            raise RuntimeError("simulated SET failure")
        self.storage[key] = value if isinstance(value, bytes) else bytes(value)
        self.last_ex = ex
        self.calls.append(("set", key, ex))
        return True

    async def delete(self, *keys: str) -> int:
        if self.fail_on == "delete":
            raise RuntimeError("simulated DEL failure")
        count = 0
        for key in keys:
            if key in self.storage:
                del self.storage[key]
                count += 1
        self.calls.append(("delete", keys))
        return count

    async def scan(
        self, cursor: int = 0, match: str | None = None, count: int = 10
    ) -> tuple[int, list[str]]:
        # Naive SCAN — returns everything matching in one pass and ends.
        matched = []
        if match:
            prefix = match.rstrip("*")
            matched = [k for k in self.storage if k.startswith(prefix)]
        return 0, matched


@pytest.mark.asyncio
async def test_round_trip() -> None:
    fake = _FakeRedis()
    backend = RedisCacheBackend(fake)
    await backend.set("k", b"v", ttl_seconds=60)
    assert await backend.get("k") == b"v"
    assert fake.last_ex == 60


@pytest.mark.asyncio
async def test_missing_key_returns_none() -> None:
    backend = RedisCacheBackend(_FakeRedis())
    assert await backend.get("never") is None


@pytest.mark.asyncio
async def test_key_prefix_applied() -> None:
    fake = _FakeRedis()
    backend = RedisCacheBackend(fake, key_prefix="custom:")
    await backend.set("k", b"v", ttl_seconds=60)
    assert "custom:k" in fake.storage


@pytest.mark.asyncio
async def test_zero_ttl_does_not_call_redis() -> None:
    fake = _FakeRedis()
    backend = RedisCacheBackend(fake)
    await backend.set("k", b"v", ttl_seconds=0)
    assert "k" not in fake.storage
    assert not any(c[0] == "set" for c in fake.calls)


@pytest.mark.asyncio
async def test_delete_calls_redis() -> None:
    fake = _FakeRedis()
    backend = RedisCacheBackend(fake)
    await backend.set("k", b"v", ttl_seconds=60)
    await backend.delete("k")
    assert "theourgia:cache:k" not in fake.storage


@pytest.mark.asyncio
async def test_clear_namespace_uses_scan() -> None:
    fake = _FakeRedis()
    backend = RedisCacheBackend(fake)
    await backend.set("astrology:a", b"1", ttl_seconds=60)
    await backend.set("astrology:b", b"2", ttl_seconds=60)
    await backend.set("gematria:x", b"3", ttl_seconds=60)
    removed = await backend.clear_namespace("astrology:")
    assert removed == 2
    assert "theourgia:cache:gematria:x" in fake.storage


@pytest.mark.asyncio
async def test_get_wraps_backend_failure() -> None:
    fake = _FakeRedis()
    fake.fail_on = "get"
    backend = RedisCacheBackend(fake)
    with pytest.raises(CacheBackendError, match="redis GET failed"):
        await backend.get("k")


@pytest.mark.asyncio
async def test_set_wraps_backend_failure() -> None:
    fake = _FakeRedis()
    fake.fail_on = "set"
    backend = RedisCacheBackend(fake)
    with pytest.raises(CacheBackendError, match="redis SET failed"):
        await backend.set("k", b"v", ttl_seconds=60)


@pytest.mark.asyncio
async def test_str_value_decoded_to_bytes() -> None:
    """Some Redis clients return str when decode_responses=True. The
    backend must always return bytes."""

    class _StrRedis:
        async def get(self, key: str) -> str:
            return "hello"

        async def set(self, key, value, ex=None) -> bool:
            return True

    backend = RedisCacheBackend(_StrRedis())
    value = await backend.get("k")
    assert value == b"hello"


@pytest.mark.asyncio
async def test_sync_client_supported() -> None:
    """Backend accepts both sync and async Redis clients."""

    class _SyncRedis:
        def __init__(self) -> None:
            self.values: dict[str, bytes] = {}

        def get(self, key: str) -> bytes | None:
            return self.values.get(key)

        def set(self, key: str, value: bytes, ex: int | None = None) -> bool:
            self.values[key] = value
            return True

        def delete(self, *keys: str) -> int:
            return sum(1 for k in keys if self.values.pop(k, None) is not None)

        def scan(self, cursor=0, match=None, count=10) -> tuple[int, list[str]]:
            return 0, []

    backend = RedisCacheBackend(_SyncRedis())
    await backend.set("k", b"v", ttl_seconds=60)
    assert await backend.get("k") == b"v"
