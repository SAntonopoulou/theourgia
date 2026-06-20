"""Tests for the WebAuthn challenge store implementations."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

import pytest

from theourgia.core.auth.challenges import (
    DEFAULT_CHALLENGE_TTL_SECONDS,
    ChallengeStore,
    InMemoryChallengeStore,
    RedisChallengeStore,
)


def test_default_ttl_is_five_minutes() -> None:
    assert DEFAULT_CHALLENGE_TTL_SECONDS == 300


@pytest.mark.asyncio
async def test_in_memory_store_round_trip() -> None:
    store = InMemoryChallengeStore()
    await store.put("k1", b"challenge-bytes", ttl=60)
    value = await store.take("k1")
    assert value == b"challenge-bytes"


@pytest.mark.asyncio
async def test_in_memory_store_take_is_single_use() -> None:
    """A successful take must consume the entry — replays return None."""
    store = InMemoryChallengeStore()
    await store.put("k1", b"x", ttl=60)
    assert await store.take("k1") == b"x"
    assert await store.take("k1") is None


@pytest.mark.asyncio
async def test_in_memory_store_missing_key_returns_none() -> None:
    store = InMemoryChallengeStore()
    assert await store.take("never-put") is None


@pytest.mark.asyncio
async def test_in_memory_store_honors_ttl() -> None:
    store = InMemoryChallengeStore()
    await store.put("k1", b"x", ttl=0)
    # Even at ttl=0 the entry may briefly exist; sleep a tick to ensure expiry.
    await asyncio.sleep(0.01)
    assert await store.take("k1") is None


@pytest.mark.asyncio
async def test_in_memory_store_implements_protocol() -> None:
    """The Protocol is runtime-checkable; the in-memory store satisfies it."""
    store: ChallengeStore = InMemoryChallengeStore()
    assert isinstance(store, ChallengeStore)


@pytest.mark.asyncio
async def test_redis_store_uses_setex_with_ttl() -> None:
    """The Redis store must call SET with EX=<ttl> so Redis itself
    enforces expiry."""

    captured: dict[str, Any] = {}

    class _FakeRedis:
        async def set(self, key: str, value: bytes, ex: int) -> None:
            captured["set"] = (key, value, ex)

        async def getdel(self, key: str) -> bytes | None:
            captured["getdel"] = key
            return b"value-here"

    store = RedisChallengeStore(_FakeRedis())
    await store.put("k1", b"challenge", ttl=60)
    assert captured["set"][0].endswith(":k1")
    assert captured["set"][1] == b"challenge"
    assert captured["set"][2] == 60

    value = await store.take("k1")
    assert value == b"value-here"
    assert captured["getdel"].endswith(":k1")


@pytest.mark.asyncio
async def test_redis_store_take_returns_none_for_missing() -> None:
    class _FakeRedis:
        async def set(self, key: str, value: bytes, ex: int) -> None:
            pass

        async def getdel(self, key: str) -> bytes | None:
            return None

    store = RedisChallengeStore(_FakeRedis())
    assert await store.take("missing") is None


@pytest.mark.asyncio
async def test_redis_store_decodes_str_results() -> None:
    """Some redis clients return str when decode_responses=True is set;
    the store must still return bytes."""

    class _FakeRedis:
        async def set(self, key: str, value: Any, ex: int) -> None:
            pass

        async def getdel(self, key: str) -> str:
            return "challenge-as-str"

    store = RedisChallengeStore(_FakeRedis())
    value = await store.take("k1")
    assert value == b"challenge-as-str"


@pytest.mark.asyncio
async def test_redis_store_works_with_sync_client() -> None:
    """Redis stores may return non-awaitable values when used with the
    sync client. The store must handle both."""

    class _SyncRedis:
        def set(self, key: str, value: bytes, ex: int) -> None:
            return None

        def getdel(self, key: str) -> bytes:
            return b"sync-value"

    store = RedisChallengeStore(_SyncRedis())
    await store.put("k1", b"x", ttl=60)
    value = await store.take("k1")
    assert value == b"sync-value"


@pytest.mark.asyncio
async def test_redis_store_custom_prefix() -> None:
    captured: dict[str, str] = {}

    class _FakeRedis:
        async def set(self, key: str, value: bytes, ex: int) -> None:
            captured["key"] = key

        async def getdel(self, key: str) -> bytes:
            return b""

    store = RedisChallengeStore(_FakeRedis(), key_prefix="custom:")
    await store.put("k1", b"x", ttl=60)
    assert captured["key"] == "custom:k1"
