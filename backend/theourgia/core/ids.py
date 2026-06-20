"""Identifier helpers.

Theourgia uses UUIDv7 for primary keys: time-ordered, monotonically
increasing within a single source, and globally unique. The time-ordering
property makes them friendlier to B-tree indexes than UUIDv4 while
preserving the privacy of not encoding monotonic counters.

Python's standard library doesn't yet include UUIDv7 (only v1, v3, v4, v5),
so we implement it here per RFC 9562. When the stdlib adds v7 we will
delete this module and switch.
"""

from __future__ import annotations

import os
import time
from uuid import UUID

__all__ = ["uuid7"]


def uuid7() -> UUID:
    """Generate a UUIDv7 per RFC 9562.

    Layout (128 bits, big-endian):
        - 48 bits: Unix timestamp in milliseconds (`unix_ts_ms`)
        - 4 bits:  version (0b0111 = 7)
        - 12 bits: random sub-millisecond precision (`rand_a`)
        - 2 bits:  variant (0b10)
        - 62 bits: random tail (`rand_b`)
    """
    ts_ms = int(time.time() * 1000) & 0xFFFFFFFFFFFF  # 48 bits
    rand_bytes = os.urandom(10)  # 80 bits of entropy
    rand_a = int.from_bytes(rand_bytes[:2], "big") & 0x0FFF  # 12 bits
    rand_b = int.from_bytes(rand_bytes[2:], "big") & 0x3FFFFFFFFFFFFFFF  # 62 bits

    value = (
        (ts_ms << 80)
        | (0x7 << 76)  # version 7
        | (rand_a << 64)
        | (0x2 << 62)  # variant 0b10
        | rand_b
    )
    return UUID(int=value)
