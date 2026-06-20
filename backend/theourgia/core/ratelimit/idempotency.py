"""Idempotency-key handling.

Mobile clients and unreliable networks retry. Without idempotency,
retries can double-charge a payment, duplicate a divination log entry,
re-fire a federation broadcast.

The pattern: every write endpoint that may be retried looks for an
``Idempotency-Key`` request header. The :class:`IdempotencyStore`
remembers the response associated with each key for some window;
subsequent requests with the same key inside that window return the
cached response instead of re-executing the handler.

Keys are client-generated (typically UUIDs). The substrate doesn't
enforce a format; it just records (key + request fingerprint →
response). A second request with the same key but a DIFFERENT
fingerprint is treated as a conflict — :class:`IdempotencyConflict`.

Storage is pluggable: in-memory for tests, Redis for production.
"""

from __future__ import annotations

import hashlib
import time
from collections.abc import Awaitable
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

__all__ = [
    "IdempotencyConflict",
    "IdempotencyRecord",
    "IdempotencyStore",
    "InMemoryIdempotencyStore",
    "RedisIdempotencyStore",
    "compute_request_fingerprint",
]


class IdempotencyConflict(Exception):
    """Same idempotency key, different request payload.

    Indicates a client bug (or an attack); the server must refuse.
    """


@dataclass(frozen=True, slots=True)
class IdempotencyRecord:
    """A cached response keyed on an idempotency key + request
    fingerprint.

    Attributes:
        key: The client-supplied ``Idempotency-Key`` value.
        fingerprint: Hash of the request method + path + body. Used to
            distinguish "same idempotency key, same request" (return
            cached) from "same key, different request" (conflict).
        status_code: The original response's status.
        body: The original response body (bytes).
        content_type: The original response's content type.
        created_at: When the record was first written. Used by the
            store for TTL enforcement.
    """

    key: str
    fingerprint: str
    status_code: int
    body: bytes
    content_type: str
    created_at: float


@runtime_checkable
class IdempotencyStore(Protocol):
    """Pluggable storage for idempotency records."""

    async def get(self, key: str) -> IdempotencyRecord | None:
        """Look up a record by key. Returns None if absent or expired."""
        ...

    async def put(self, record: IdempotencyRecord, ttl_seconds: int) -> None:
        """Store a record with TTL."""
        ...


def compute_request_fingerprint(
    *, method: str, path: str, body: bytes
) -> str:
    """SHA-256 hex digest of method + path + body.

    Used to detect "same idempotency key, different request" attacks /
    bugs. Method and path are folded into the hash so a key reused
    across endpoints (a client bug) is also a conflict.
    """
    hasher = hashlib.sha256()
    hasher.update(method.upper().encode("ascii", "replace"))
    hasher.update(b"\x00")
    hasher.update(path.encode("utf-8", "replace"))
    hasher.update(b"\x00")
    hasher.update(body)
    return hasher.hexdigest()


@dataclass
class InMemoryIdempotencyStore:
    """Process-local idempotency store. Tests + single-process dev only."""

    _records: dict[str, tuple[IdempotencyRecord, float]] = field(
        default_factory=dict
    )

    async def get(self, key: str) -> IdempotencyRecord | None:
        entry = self._records.get(key)
        if entry is None:
            return None
        record, expires_at = entry
        if time.monotonic() >= expires_at:
            self._records.pop(key, None)
            return None
        return record

    async def put(self, record: IdempotencyRecord, ttl_seconds: int) -> None:
        self._records[record.key] = (
            record,
            time.monotonic() + ttl_seconds,
        )


class RedisIdempotencyStore:
    """Redis-backed idempotency store.

    Encodes records via a compact JSON+base64 envelope; retrieves via
    ``GET``. Storage atomicity isn't critical here — the worst case
    on a race is a duplicated execution, which is the SAME as not
    having idempotency at all, so we don't pay the cost of a SETNX
    round trip on every write.
    """

    def __init__(
        self, redis_client: object, *, key_prefix: str = "theourgia:idemp:"
    ) -> None:
        self._redis = redis_client
        self._prefix = key_prefix

    def _k(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def get(self, key: str) -> IdempotencyRecord | None:
        raw = await _await(self._redis.get(self._k(key)))
        if raw is None:
            return None
        return _decode(raw, key=key)

    async def put(self, record: IdempotencyRecord, ttl_seconds: int) -> None:
        encoded = _encode(record)
        await _await(self._redis.set(self._k(record.key), encoded, ex=ttl_seconds))


def _encode(record: IdempotencyRecord) -> bytes:
    """Encode a record for Redis storage. Pipe-delimited fields:
    fingerprint|status_code|content_type|created_at|body."""
    head = f"{record.fingerprint}|{record.status_code}|{record.content_type}|{record.created_at}".encode("utf-8")
    return head + b"|" + record.body


def _decode(raw: object, *, key: str) -> IdempotencyRecord | None:
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    if not isinstance(raw, (bytes, bytearray)):
        return None
    parts = bytes(raw).split(b"|", 4)
    if len(parts) != 5:
        return None
    try:
        return IdempotencyRecord(
            key=key,
            fingerprint=parts[0].decode("utf-8"),
            status_code=int(parts[1]),
            content_type=parts[2].decode("utf-8"),
            created_at=float(parts[3]),
            body=parts[4],
        )
    except (ValueError, UnicodeDecodeError):
        return None


async def _await(value: object) -> object:
    if isinstance(value, Awaitable):
        return await value
    return value
