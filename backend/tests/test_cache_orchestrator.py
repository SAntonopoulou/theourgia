"""Tests for the Cache orchestrator."""

from __future__ import annotations

import asyncio

import pytest

from theourgia.core.cache.backends.base import CacheBackendError
from theourgia.core.cache.backends.memory import InMemoryCacheBackend
from theourgia.core.cache.cache import Cache, CacheMiss


@pytest.fixture
def cache() -> Cache:
    return Cache(InMemoryCacheBackend())


# ── Raw bytes API ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_and_get(cache: Cache) -> None:
    await cache.set("k", b"v", ttl_seconds=60)
    assert await cache.get("k") == b"v"


@pytest.mark.asyncio
async def test_get_returns_none_on_miss(cache: Cache) -> None:
    assert await cache.get("never") is None


@pytest.mark.asyncio
async def test_delete_invalidates(cache: Cache) -> None:
    await cache.set("k", b"v", ttl_seconds=60)
    await cache.delete("k")
    assert await cache.get("k") is None


# ── get_or_set ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_or_set_runs_loader_on_miss(cache: Cache) -> None:
    call_count = 0

    async def loader() -> bytes:
        nonlocal call_count
        call_count += 1
        return b"loaded"

    value = await cache.get_or_set(key="k", loader=loader, ttl_seconds=60)
    assert value == b"loaded"
    assert call_count == 1


@pytest.mark.asyncio
async def test_get_or_set_returns_cached_on_hit(cache: Cache) -> None:
    await cache.set("k", b"cached", ttl_seconds=60)
    call_count = 0

    async def loader() -> bytes:
        nonlocal call_count
        call_count += 1
        return b"loaded"

    value = await cache.get_or_set(key="k", loader=loader, ttl_seconds=60)
    assert value == b"cached"
    assert call_count == 0


@pytest.mark.asyncio
async def test_get_or_set_stampede_protection() -> None:
    """When 10 callers race on the same key, the loader runs ONCE.
    Others wait on the per-key lock and read the cached result."""
    cache = Cache(InMemoryCacheBackend())
    call_count = 0

    async def loader() -> bytes:
        nonlocal call_count
        call_count += 1
        # Simulate slow computation
        await asyncio.sleep(0.05)
        return b"value"

    # Race 10 concurrent get_or_set calls
    results = await asyncio.gather(
        *[
            cache.get_or_set(key="k", loader=loader, ttl_seconds=60)
            for _ in range(10)
        ]
    )
    assert all(r == b"value" for r in results)
    assert call_count == 1


# ── get_or_set_json ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_or_set_json_round_trip(cache: Cache) -> None:
    async def loader() -> dict:
        return {"alpha": 1, "omega": [2, 3]}

    result = await cache.get_or_set_json(key="k", loader=loader, ttl_seconds=60)
    assert result == {"alpha": 1, "omega": [2, 3]}

    # Second call returns from cache
    async def boom() -> dict:
        raise RuntimeError("should not be called")

    result2 = await cache.get_or_set_json(key="k", loader=boom, ttl_seconds=60)
    assert result2 == {"alpha": 1, "omega": [2, 3]}


@pytest.mark.asyncio
async def test_get_or_set_json_corrupt_value_falls_through(cache: Cache) -> None:
    """If somehow the stored value isn't valid JSON, the loader runs
    again rather than crashing."""
    await cache.set("k", b"not-json", ttl_seconds=60)
    call_count = 0

    async def loader() -> dict:
        nonlocal call_count
        call_count += 1
        return {"ok": True}

    result = await cache.get_or_set_json(key="k", loader=loader, ttl_seconds=60)
    assert result == {"ok": True}
    assert call_count == 1


# ── clear_namespace ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_clear_namespace(cache: Cache) -> None:
    await cache.set("ns1:a", b"1", ttl_seconds=60)
    await cache.set("ns1:b", b"2", ttl_seconds=60)
    await cache.set("ns2:c", b"3", ttl_seconds=60)
    cleared = await cache.clear_namespace("ns1:")
    assert cleared == 2
    assert await cache.get("ns1:a") is None
    assert await cache.get("ns2:c") == b"3"


# ── Backend failure graceful degradation ─────────────────────────────


class _FlakyBackend:
    name = "flaky"

    async def get(self, key: str) -> bytes | None:
        raise CacheBackendError("simulated outage")

    async def set(self, key: str, value: bytes, *, ttl_seconds: int) -> None:
        raise CacheBackendError("simulated outage")

    async def delete(self, key: str) -> None:
        raise CacheBackendError("simulated outage")

    async def clear_namespace(self, prefix: str) -> int:
        raise CacheBackendError("simulated outage")


@pytest.mark.asyncio
async def test_get_returns_none_on_backend_failure() -> None:
    """A flaky cache must NEVER crash a feature."""
    cache = Cache(_FlakyBackend())
    assert await cache.get("k") is None


@pytest.mark.asyncio
async def test_set_swallows_backend_failure() -> None:
    cache = Cache(_FlakyBackend())
    await cache.set("k", b"v", ttl_seconds=60)  # should not raise


@pytest.mark.asyncio
async def test_get_or_set_falls_through_to_loader_on_flaky_backend() -> None:
    """When the backend is failing, the loader still runs — cache
    degrades to no-cache, not to broken-feature."""
    cache = Cache(_FlakyBackend())
    call_count = 0

    async def loader() -> bytes:
        nonlocal call_count
        call_count += 1
        return b"loaded"

    value = await cache.get_or_set(key="k", loader=loader, ttl_seconds=60)
    assert value == b"loaded"
    assert call_count == 1


# ── get_strict ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_strict_raises_on_miss(cache: Cache) -> None:
    with pytest.raises(CacheMiss):
        await cache.get_strict("never")


@pytest.mark.asyncio
async def test_get_strict_returns_value_on_hit(cache: Cache) -> None:
    await cache.set("k", b"v", ttl_seconds=60)
    assert await cache.get_strict("k") == b"v"


# ── Backend name introspection ───────────────────────────────────────


def test_backend_name_property(cache: Cache) -> None:
    assert cache.backend_name == "memory"
