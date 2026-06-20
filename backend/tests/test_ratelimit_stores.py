"""Tests for the rate-limit store implementations."""

from __future__ import annotations

from typing import Any

import pytest

from theourgia.core.ratelimit.stores import (
    InMemoryRateLimitStore,
    RateLimitStore,
    RedisRateLimitStore,
)


# ── InMemory store ───────────────────────────────────────────────────


def test_in_memory_store_satisfies_protocol() -> None:
    store: RateLimitStore = InMemoryRateLimitStore()
    assert isinstance(store, RateLimitStore)


@pytest.mark.asyncio
async def test_in_memory_incr_returns_running_total() -> None:
    store = InMemoryRateLimitStore()
    assert await store.incr_and_get("k", 60) == 1
    assert await store.incr_and_get("k", 60) == 2
    assert await store.incr_and_get("k", 60) == 3


@pytest.mark.asyncio
async def test_in_memory_get_returns_zero_for_absent() -> None:
    store = InMemoryRateLimitStore()
    assert await store.get("never-set") == 0


@pytest.mark.asyncio
async def test_in_memory_reset_clears() -> None:
    store = InMemoryRateLimitStore()
    await store.incr_and_get("k", 60)
    await store.reset("k")
    assert await store.get("k") == 0


# ── Redis store ──────────────────────────────────────────────────────


class _FakeRedis:
    def __init__(self) -> None:
        self.calls: list[tuple[str, Any, ...]] = []
        self._values: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.calls.append(("incr", key))
        self._values[key] = self._values.get(key, 0) + 1
        return self._values[key]

    async def expire(self, key: str, seconds: int) -> int:
        self.calls.append(("expire", key, seconds))
        return 1

    async def get(self, key: str) -> str | None:
        self.calls.append(("get", key))
        v = self._values.get(key)
        return str(v) if v is not None else None

    async def delete(self, key: str) -> int:
        self.calls.append(("delete", key))
        return 1 if self._values.pop(key, None) is not None else 0


@pytest.mark.asyncio
async def test_redis_store_incrs_and_expires_on_first_increment() -> None:
    fake = _FakeRedis()
    store = RedisRateLimitStore(fake)
    count = await store.incr_and_get("k", 60)
    assert count == 1
    # First increment ⇒ expire was called
    calls_kind = [c[0] for c in fake.calls]
    assert "incr" in calls_kind
    assert "expire" in calls_kind


@pytest.mark.asyncio
async def test_redis_store_does_not_expire_on_subsequent_incrs() -> None:
    fake = _FakeRedis()
    store = RedisRateLimitStore(fake)
    await store.incr_and_get("k", 60)
    fake.calls.clear()
    await store.incr_and_get("k", 60)
    calls_kind = [c[0] for c in fake.calls]
    assert "incr" in calls_kind
    assert "expire" not in calls_kind


@pytest.mark.asyncio
async def test_redis_store_get_returns_int_or_zero() -> None:
    fake = _FakeRedis()
    store = RedisRateLimitStore(fake)
    assert await store.get("never") == 0
    await store.incr_and_get("k", 60)
    await store.incr_and_get("k", 60)
    assert await store.get("k") == 2


@pytest.mark.asyncio
async def test_redis_store_reset_calls_delete() -> None:
    fake = _FakeRedis()
    store = RedisRateLimitStore(fake)
    await store.incr_and_get("k", 60)
    await store.reset("k")
    calls_kind = [c[0] for c in fake.calls]
    assert "delete" in calls_kind


@pytest.mark.asyncio
async def test_redis_store_uses_prefix() -> None:
    fake = _FakeRedis()
    store = RedisRateLimitStore(fake, key_prefix="custom:")
    await store.incr_and_get("k", 60)
    assert fake.calls[0] == ("incr", "custom:k")


@pytest.mark.asyncio
async def test_redis_store_handles_sync_client() -> None:
    """Some redis clients are sync; the store wrapper must handle both."""

    class _SyncRedis:
        def __init__(self) -> None:
            self.value = 0

        def incr(self, key: str) -> int:
            self.value += 1
            return self.value

        def expire(self, key: str, seconds: int) -> int:
            return 1

        def get(self, key: str) -> str | None:
            return str(self.value) if self.value else None

        def delete(self, key: str) -> int:
            self.value = 0
            return 1

    store = RedisRateLimitStore(_SyncRedis())
    count = await store.incr_and_get("k", 60)
    assert count == 1
    assert await store.get("k") == 1
