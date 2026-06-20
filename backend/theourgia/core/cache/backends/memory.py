"""In-memory cache backend — tests + single-process dev.

Process-local. Honors TTL via a lazy expiry check on read. Not safe
across multiple workers — each worker has its own cache. Production
uses :class:`RedisCacheBackend`.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

__all__ = ["InMemoryCacheBackend"]


@dataclass
class _Entry:
    value: bytes
    expires_at: float


@dataclass
class InMemoryCacheBackend:
    """Process-local cache backend."""

    name: str = "memory"
    _entries: dict[str, _Entry] = field(default_factory=dict)

    async def get(self, key: str) -> bytes | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if time.monotonic() >= entry.expires_at:
            self._entries.pop(key, None)
            return None
        return entry.value

    async def set(self, key: str, value: bytes, *, ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            # A zero/negative TTL means "don't cache" — treat as a no-op
            # rather than storing a pre-expired entry.
            return
        self._entries[key] = _Entry(
            value=value, expires_at=time.monotonic() + ttl_seconds
        )

    async def delete(self, key: str) -> None:
        self._entries.pop(key, None)

    async def clear_namespace(self, prefix: str) -> int:
        matched = [k for k in self._entries if k.startswith(prefix)]
        for k in matched:
            del self._entries[k]
        return len(matched)

    # ── Test helpers (not part of the Protocol) ──────────────────────

    def size(self) -> int:
        return len(self._entries)

    def reset(self) -> None:
        """Wipe the cache. Tests use this between scenarios."""
        self._entries.clear()
