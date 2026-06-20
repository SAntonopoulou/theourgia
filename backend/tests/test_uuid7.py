"""Tests for the UUIDv7 helper.

UUIDv7 is the project's primary key format (see :mod:`theourgia.core.ids`).
These tests verify the version + variant bits and the time-ordering
property that makes v7 friendly to B-tree indexes.
"""

from __future__ import annotations

import time
from uuid import UUID

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.ids import uuid7


def test_uuid7_returns_uuid_instance() -> None:
    assert isinstance(uuid7(), UUID)


def test_uuid7_version_bits_are_7() -> None:
    """Version field (bits 48–51) must be 0b0111 = 7."""
    u = uuid7()
    assert u.version == 7


def test_uuid7_variant_bits_are_rfc4122() -> None:
    """Variant field (bits 64–65) must be 0b10 (RFC 4122 / 9562 variant)."""
    u = uuid7()
    # uuid.variant returns 'specified in RFC 4122' for the 0b10 bit pattern.
    assert u.variant == "specified in RFC 4122"


def test_uuid7_uniqueness_in_tight_loop() -> None:
    """Generating many UUIDs in quick succession yields no duplicates."""
    seen = {uuid7() for _ in range(10_000)}
    assert len(seen) == 10_000


def test_uuid7_is_time_ordered() -> None:
    """UUIDs generated later have larger 128-bit integer values.

    Allowing for sub-millisecond ties: within a millisecond, ordering may
    invert due to random rand_a/rand_b bits. Cross-millisecond ordering
    is monotonic.
    """
    earlier = uuid7()
    time.sleep(0.002)  # > 1 ms
    later = uuid7()
    assert later.int > earlier.int


def test_uuid7_timestamp_is_recent() -> None:
    """The 48-bit timestamp prefix decodes to a millisecond close to now."""
    u = uuid7()
    ts_ms = u.int >> 80
    now_ms = int(time.time() * 1000)
    # within 5 seconds of "now" — generous for slow CI
    assert abs(now_ms - ts_ms) < 5000


@given(st.integers(min_value=1, max_value=200))
@settings(max_examples=20, deadline=None)
def test_uuid7_batch_uniqueness_property(n: int) -> None:
    """Property: any batch of N UUIDs (1 ≤ N ≤ 200) has no duplicates."""
    assert len({uuid7() for _ in range(n)}) == n
