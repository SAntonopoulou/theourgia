"""Local filesystem storage backend — development.

Stores objects under a root directory. Useful for dev and for
self-hosted instances that don't want any external object storage at
all.

Limitations:

- Presigned URLs are not real S3-style presigned URLs (the LocalFS
  backend has no signing infrastructure). They return a local
  ``file://`` URL plus a one-time signed token; the API serves the
  bytes itself when the token is presented. Wiring of that
  download endpoint lands in Phase 02; for now ``presigned_get_url``
  returns a placeholder URL and ``presigned_put_url`` raises
  :class:`StorageDeliveryError` (presigned uploads require the
  presigned-PUT endpoint that local FS doesn't provide).
"""

from __future__ import annotations

import asyncio
import hashlib
import shutil
from pathlib import Path

from theourgia.core.storage.backends.base import (
    StorageDeliveryError,
    StorageObject,
)

__all__ = ["LocalFSBackend"]


class LocalFSBackend:
    """Stores objects under ``root_path``.

    Keys may contain slashes — they become subdirectories on disk.
    """

    name = "local"

    def __init__(self, root_path: Path) -> None:
        if not root_path:
            raise ValueError("LocalFSBackend.root_path must not be empty")
        self._root = Path(root_path).expanduser().resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, key: str) -> Path:
        """Resolve ``key`` to a filesystem path strictly under root.

        Refuses traversal (``..``), absolute paths, and any resolution
        that lands outside the root directory."""
        if not key or key.startswith("/") or ".." in key.split("/"):
            raise StorageDeliveryError(
                f"invalid key: {key!r}", backend=self.name
            )
        target = (self._root / key).resolve()
        try:
            target.relative_to(self._root)
        except ValueError as exc:
            raise StorageDeliveryError(
                f"key resolves outside root: {key!r}", backend=self.name
            ) from exc
        return target

    async def put(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str,
        metadata: dict[str, str] | None = None,
    ) -> StorageObject:
        path = self._safe_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Write via to_thread so we don't block the event loop on disk I/O.
        await asyncio.to_thread(path.write_bytes, content)
        etag = hashlib.sha256(content).hexdigest()
        return StorageObject(
            key=key,
            size=len(content),
            content_type=content_type,
            etag=etag,
            backend=self.name,
            metadata=dict(metadata or {}),
        )

    async def get(self, key: str) -> bytes:
        path = self._safe_path(key)
        if not path.exists():
            raise StorageDeliveryError(
                f"object not found: {key!r}", backend=self.name
            )
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, key: str) -> None:
        path = self._safe_path(key)
        if path.exists():
            await asyncio.to_thread(path.unlink)

    async def exists(self, key: str) -> bool:
        return self._safe_path(key).exists()

    async def stat(self, key: str) -> StorageObject:
        path = self._safe_path(key)
        if not path.exists():
            raise StorageDeliveryError(
                f"object not found: {key!r}", backend=self.name
            )
        content = await asyncio.to_thread(path.read_bytes)
        return StorageObject(
            key=key,
            size=len(content),
            content_type="application/octet-stream",
            etag=hashlib.sha256(content).hexdigest(),
            backend=self.name,
        )

    async def presigned_get_url(self, key: str, *, expires_in: int = 3600) -> str:
        # Placeholder — the API serves these via a download endpoint
        # whose wiring lands with the first feature that needs it.
        return f"/api/storage/local/{key}"

    async def presigned_put_url(
        self,
        key: str,
        *,
        content_type: str,
        expires_in: int = 3600,
        max_size: int | None = None,
    ) -> str:
        raise StorageDeliveryError(
            "local backend does not support presigned PUT urls; "
            "use put() directly or configure an S3-compatible backend",
            backend=self.name,
        )

    def clear(self) -> None:
        """Wipe the root directory. Tests use this for cleanup; never
        call from production code."""
        if self._root.exists():
            shutil.rmtree(self._root)
            self._root.mkdir(parents=True, exist_ok=True)
