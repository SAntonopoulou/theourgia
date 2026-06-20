"""Tests for the in-memory cache backend."""

from __future__ import annotations

import asyncio

import pytest

from theourgia.core.cache.backends.base import CacheBackend
from theourgia.core.cache.backends.memory import InMemoryCacheBackend


def test_backend_satisfies_protocol() -> None:
    backend: CacheBackend = InMemoryCacheBackend()
    assert backend.name == "memory"


@pytest.mark.asyncio
async def test_get_returns_none_when_absent() -> None:
    backend = InMemoryCacheBackend()
    assert await backend.get("k") is None


@pytest.mark.asyncio
async def test_round_trip() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"v", ttl_seconds=60)
    assert await backend.get("k") == b"v"


@pytest.mark.asyncio
async def test_set_overwrites() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"first", ttl_seconds=60)
    await backend.set("k", b"second", ttl_seconds=60)
    assert await backend.get("k") == b"second"


@pytest.mark.asyncio
async def test_delete() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"v", ttl_seconds=60)
    await backend.delete("k")
    assert await backend.get("k") is None


@pytest.mark.asyncio
async def test_delete_missing_key_noop() -> None:
    backend = InMemoryCacheBackend()
    await backend.delete("never")  # should not raise


@pytest.mark.asyncio
async def test_ttl_expires() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"v", ttl_seconds=1)
    assert await backend.get("k") == b"v"
    await asyncio.sleep(1.05)
    assert await backend.get("k") is None


@pytest.mark.asyncio
async def test_zero_or_negative_ttl_does_not_store() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"v", ttl_seconds=0)
    assert await backend.get("k") is None
    await backend.set("k", b"v", ttl_seconds=-1)
    assert await backend.get("k") is None


@pytest.mark.asyncio
async def test_clear_namespace_removes_matching_keys() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("astrology:a", b"1", ttl_seconds=60)
    await backend.set("astrology:b", b"2", ttl_seconds=60)
    await backend.set("gematria:x", b"3", ttl_seconds=60)
    removed = await backend.clear_namespace("astrology:")
    assert removed == 2
    assert await backend.get("astrology:a") is None
    assert await backend.get("astrology:b") is None
    assert await backend.get("gematria:x") == b"3"


@pytest.mark.asyncio
async def test_clear_namespace_with_no_matches_returns_zero() -> None:
    backend = InMemoryCacheBackend()
    await backend.set("k", b"v", ttl_seconds=60)
    removed = await backend.clear_namespace("nothing:")
    assert removed == 0


def test_size_helper() -> None:
    backend = InMemoryCacheBackend()
    asyncio.run(backend.set("a", b"1", ttl_seconds=60))
    asyncio.run(backend.set("b", b"2", ttl_seconds=60))
    assert backend.size() == 2
    backend.reset()
    assert backend.size() == 0
