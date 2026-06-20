"""Null storage backend — tests.

Stores objects in-memory. Tests assert against ``backend.stored`` to
verify what would have been uploaded.
"""

from __future__ import annotations

from theourgia.core.storage.backends.base import (
    StorageBackend,
    StorageDeliveryError,
    StorageObject,
)

__all__ = ["NullStorageBackend"]


class NullStorageBackend:
    """In-memory storage. Process-local; for tests only."""

    name = "null"

    def __init__(self) -> None:
        self.stored: dict[str, StorageObject] = {}
        self._content: dict[str, bytes] = {}
        self.deletions: list[str] = []
        self.presigned_get_calls: list[str] = []
        self.presigned_put_calls: list[str] = []

    async def put(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str,
        metadata: dict[str, str] | None = None,
    ) -> StorageObject:
        obj = StorageObject(
            key=key,
            size=len(content),
            content_type=content_type,
            etag=f"null-{key}-{len(content)}",
            backend=self.name,
            metadata=dict(metadata or {}),
        )
        self.stored[key] = obj
        self._content[key] = content
        return obj

    async def get(self, key: str) -> bytes:
        if key not in self._content:
            raise StorageDeliveryError(
                f"object not found: {key!r}", backend=self.name
            )
        return self._content[key]

    async def delete(self, key: str) -> None:
        self.deletions.append(key)
        self.stored.pop(key, None)
        self._content.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self.stored

    async def stat(self, key: str) -> StorageObject:
        if key not in self.stored:
            raise StorageDeliveryError(
                f"object not found: {key!r}", backend=self.name
            )
        return self.stored[key]

    async def presigned_get_url(self, key: str, *, expires_in: int = 3600) -> str:
        self.presigned_get_calls.append(key)
        return f"https://null.example/get/{key}?ttl={expires_in}"

    async def presigned_put_url(
        self,
        key: str,
        *,
        content_type: str,
        expires_in: int = 3600,
        max_size: int | None = None,
    ) -> str:
        self.presigned_put_calls.append(key)
        suffix = f"&max={max_size}" if max_size else ""
        return f"https://null.example/put/{key}?ttl={expires_in}{suffix}"

    def clear(self) -> None:
        """Reset all state. Tests call between scenarios."""
        self.stored.clear()
        self._content.clear()
        self.deletions.clear()
        self.presigned_get_calls.clear()
        self.presigned_put_calls.clear()
