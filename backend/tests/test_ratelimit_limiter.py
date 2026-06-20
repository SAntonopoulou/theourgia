"""Tests for the rate limiter."""

from __future__ import annotations

import asyncio

import pytest

from theourgia.core.ratelimit.limiter import (
    RateLimit,
    RateLimiter,
    RateLimitExceeded,
)
from theourgia.core.ratelimit.stores import InMemoryRateLimitStore


def test_ratelimit_validates_inputs() -> None:
    with pytest.raises(ValueError, match="name"):
        RateLimit(name="", count=10, window_seconds=60)
    with pytest.raises(ValueError, match="count"):
        RateLimit(name="x", count=0, window_seconds=60)
    with pytest.raises(ValueError, match="window_seconds"):
        RateLimit(name="x", count=10, window_seconds=0)


def test_ratelimit_is_frozen() -> None:
    rl = RateLimit(name="x", count=10, window_seconds=60)
    with pytest.raises(Exception):  # FrozenInstanceError
        rl.count = 20  # type: ignore[misc]


@pytest.mark.asyncio
async def test_limiter_allows_under_cap() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=3, window_seconds=60)
    for _ in range(3):
        await limiter.check(limit, identity="alice")


@pytest.mark.asyncio
async def test_limiter_raises_over_cap() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=2, window_seconds=60)
    await limiter.check(limit, identity="alice")
    await limiter.check(limit, identity="alice")
    with pytest.raises(RateLimitExceeded) as exc_info:
        await limiter.check(limit, identity="alice")
    assert exc_info.value.limit is limit
    assert exc_info.value.retry_after_seconds >= 1


@pytest.mark.asyncio
async def test_limiter_separates_identities() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=2, window_seconds=60)
    # Alice exhausts hers
    await limiter.check(limit, identity="alice")
    await limiter.check(limit, identity="alice")
    # Bob is fresh
    await limiter.check(limit, identity="bob")
    await limiter.check(limit, identity="bob")


@pytest.mark.asyncio
async def test_limiter_separates_limit_names() -> None:
    """Same identity, different limits — independent counters."""
    limiter = RateLimiter(InMemoryRateLimitStore())
    write = RateLimit(name="entry.write", count=1, window_seconds=60)
    read = RateLimit(name="entry.read", count=1, window_seconds=60)
    await limiter.check(write, identity="alice")
    # Different limit doesn't get blocked
    await limiter.check(read, identity="alice")


@pytest.mark.asyncio
async def test_window_resets_after_expiry() -> None:
    """In-memory store uses real time; we use a 0-second window via a
    direct store interaction for the test."""
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=1, window_seconds=1)
    await limiter.check(limit, identity="alice")
    with pytest.raises(RateLimitExceeded):
        await limiter.check(limit, identity="alice")
    # Wait past the window
    await asyncio.sleep(1.05)
    await limiter.check(limit, identity="alice")


@pytest.mark.asyncio
async def test_peek_returns_current_count_without_incrementing() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=5, window_seconds=60)
    await limiter.check(limit, identity="alice")
    assert await limiter.peek(limit, identity="alice") == 1
    # Peek doesn't increment
    assert await limiter.peek(limit, identity="alice") == 1


@pytest.mark.asyncio
async def test_reset_clears_counter() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=1, window_seconds=60)
    await limiter.check(limit, identity="alice")
    await limiter.reset(limit, identity="alice")
    # After reset, can check again without raising
    await limiter.check(limit, identity="alice")


@pytest.mark.asyncio
async def test_unknown_identity_starts_fresh() -> None:
    limiter = RateLimiter(InMemoryRateLimitStore())
    limit = RateLimit(name="x", count=5, window_seconds=60)
    assert await limiter.peek(limit, identity="never-used") == 0
