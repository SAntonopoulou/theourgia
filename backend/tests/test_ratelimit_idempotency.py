"""Tests for the idempotency substrate."""

from __future__ import annotations

import asyncio
import time

import pytest

from theourgia.core.ratelimit.idempotency import (
    IdempotencyRecord,
    IdempotencyStore,
    InMemoryIdempotencyStore,
    RedisIdempotencyStore,
    compute_request_fingerprint,
)


def _record(
    *,
    key: str = "test-key",
    fingerprint: str = "fp",
    status_code: int = 200,
    body: bytes = b'{"ok": true}',
    content_type: str = "application/json",
) -> IdempotencyRecord:
    return IdempotencyRecord(
        key=key,
        fingerprint=fingerprint,
        status_code=status_code,
        body=body,
        content_type=content_type,
        created_at=time.monotonic(),
    )


# ── Fingerprinting ───────────────────────────────────────────────────


def test_fingerprint_is_stable() -> None:
    fp1 = compute_request_fingerprint(
        method="POST", path="/api/x", body=b'{"a": 1}'
    )
    fp2 = compute_request_fingerprint(
        method="POST", path="/api/x", body=b'{"a": 1}'
    )
    assert fp1 == fp2


def test_fingerprint_differs_by_method() -> None:
    fp_post = compute_request_fingerprint(
        method="POST", path="/x", body=b""
    )
    fp_put = compute_request_fingerprint(
        method="PUT", path="/x", body=b""
    )
    assert fp_post != fp_put


def test_fingerprint_differs_by_path() -> None:
    fp_a = compute_request_fingerprint(method="POST", path="/a", body=b"")
    fp_b = compute_request_fingerprint(method="POST", path="/b", body=b"")
    assert fp_a != fp_b


def test_fingerprint_differs_by_body() -> None:
    fp_1 = compute_request_fingerprint(
        method="POST", path="/x", body=b'{"a": 1}'
    )
    fp_2 = compute_request_fingerprint(
        method="POST", path="/x", body=b'{"a": 2}'
    )
    assert fp_1 != fp_2


def test_fingerprint_method_is_case_normalized() -> None:
    fp_upper = compute_request_fingerprint(method="POST", path="/x", body=b"")
    fp_lower = compute_request_fingerprint(method="post", path="/x", body=b"")
    assert fp_upper == fp_lower


# ── InMemory store ───────────────────────────────────────────────────


def test_in_memory_store_satisfies_protocol() -> None:
    store: IdempotencyStore = InMemoryIdempotencyStore()
    assert isinstance(store, IdempotencyStore)


@pytest.mark.asyncio
async def test_in_memory_round_trip() -> None:
    store = InMemoryIdempotencyStore()
    record = _record()
    await store.put(record, ttl_seconds=60)
    retrieved = await store.get("test-key")
    assert retrieved is not None
    assert retrieved.fingerprint == "fp"
    assert retrieved.body == b'{"ok": true}'


@pytest.mark.asyncio
async def test_in_memory_missing_key_returns_none() -> None:
    store = InMemoryIdempotencyStore()
    assert await store.get("never-stored") is None


@pytest.mark.asyncio
async def test_in_memory_honors_ttl() -> None:
    store = InMemoryIdempotencyStore()
    await store.put(_record(), ttl_seconds=1)
    assert await store.get("test-key") is not None
    await asyncio.sleep(1.05)
    assert await store.get("test-key") is None


# ── Redis store ──────────────────────────────────────────────────────


class _FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, bytes] = {}
        self.last_ex: int | None = None

    async def set(self, key: str, value: bytes, ex: int | None = None) -> bool:
        self.storage[key] = value
        self.last_ex = ex
        return True

    async def get(self, key: str) -> bytes | None:
        return self.storage.get(key)


@pytest.mark.asyncio
async def test_redis_round_trip() -> None:
    store = RedisIdempotencyStore(_FakeRedis())
    record = _record(body=b"<html>hello</html>", content_type="text/html")
    await store.put(record, ttl_seconds=60)
    retrieved = await store.get("test-key")
    assert retrieved is not None
    assert retrieved.body == b"<html>hello</html>"
    assert retrieved.content_type == "text/html"
    assert retrieved.fingerprint == "fp"


@pytest.mark.asyncio
async def test_redis_missing_key_returns_none() -> None:
    store = RedisIdempotencyStore(_FakeRedis())
    assert await store.get("nope") is None


@pytest.mark.asyncio
async def test_redis_uses_prefix() -> None:
    fake = _FakeRedis()
    store = RedisIdempotencyStore(fake, key_prefix="custom:")
    await store.put(_record(), ttl_seconds=60)
    assert "custom:test-key" in fake.storage


@pytest.mark.asyncio
async def test_redis_handles_body_with_pipe_characters() -> None:
    """The pipe-delimited encoding must survive bodies containing pipes —
    we split on the first 4 pipes only."""
    store = RedisIdempotencyStore(_FakeRedis())
    record = _record(body=b"a|b|c|d|e|f")
    await store.put(record, ttl_seconds=60)
    retrieved = await store.get("test-key")
    assert retrieved is not None
    assert retrieved.body == b"a|b|c|d|e|f"
