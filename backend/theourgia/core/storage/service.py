"""Storage service — orchestrates uploads + audit.

Features call into :class:`StorageService`; the service wraps the
backend's I/O with validation and (when a DB session is supplied)
persists an :class:`Upload` row for audit / quota tracking.

The service is intentionally thin — most logic lives in the backend
or the validators. It exists so features have one call point
(`storage_service.put`) instead of three (validate + backend.put +
persist).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING
from uuid import UUID

from theourgia.core.storage.backends.base import (
    StorageBackend,
    StorageDeliveryError,
    StorageObject,
)
from theourgia.core.storage.validators import (
    DEFAULT_MAX_SIZE,
    validate_size,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["StorageService"]

_log = logging.getLogger(__name__)


class StorageService:
    """Validates + dispatches uploads + audits.

    Constructed once at app start by :func:`build_storage_service` and
    injected via a FastAPI dependency. Tests construct directly with a
    :class:`NullStorageBackend`.
    """

    def __init__(
        self,
        *,
        backend: StorageBackend,
        max_upload_size: int = DEFAULT_MAX_SIZE,
    ) -> None:
        self._backend = backend
        self._max_size = max_upload_size

    @property
    def backend_name(self) -> str:
        return self._backend.name

    @property
    def max_upload_size(self) -> int:
        return self._max_size

    # ── put / get / delete ───────────────────────────────────────────

    async def put(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str,
        owner_id: UUID | None = None,
        metadata: dict[str, str] | None = None,
        db_session: "AsyncSession | None" = None,
    ) -> StorageObject:
        """Validate, store, and (optionally) audit the upload."""
        validate_size(len(content), max_size=self._max_size)

        try:
            obj = await self._backend.put(
                key,
                content,
                content_type=content_type,
                metadata=metadata,
            )
        except StorageDeliveryError:
            await self._persist(db_session, key, content_type, len(content), owner_id, error=True)
            raise

        await self._persist(
            db_session,
            key,
            content_type,
            obj.size,
            owner_id,
            etag=obj.etag,
            error=False,
        )
        return obj

    async def get(self, key: str) -> bytes:
        return await self._backend.get(key)

    async def delete(
        self,
        key: str,
        *,
        db_session: "AsyncSession | None" = None,
    ) -> None:
        await self._backend.delete(key)
        if db_session is not None:
            await self._mark_deleted(db_session, key)

    async def exists(self, key: str) -> bool:
        return await self._backend.exists(key)

    async def stat(self, key: str) -> StorageObject:
        return await self._backend.stat(key)

    # ── Presigned URLs ───────────────────────────────────────────────

    async def presigned_get_url(
        self, key: str, *, expires_in: int = 3600
    ) -> str:
        return await self._backend.presigned_get_url(key, expires_in=expires_in)

    async def presigned_put_url(
        self,
        *,
        key: str,
        content_type: str,
        expires_in: int = 3600,
        max_size: int | None = None,
    ) -> str:
        effective_max = max_size if max_size is not None else self._max_size
        if effective_max > self._max_size:
            effective_max = self._max_size
        return await self._backend.presigned_put_url(
            key,
            content_type=content_type,
            expires_in=expires_in,
            max_size=effective_max,
        )

    # ── Audit ────────────────────────────────────────────────────────

    async def _persist(
        self,
        db_session: "AsyncSession | None",
        key: str,
        content_type: str,
        size: int,
        owner_id: UUID | None,
        *,
        etag: str = "",
        error: bool = False,
    ) -> None:
        if db_session is None:
            return
        from theourgia.models.uploads import Upload, UploadStatus

        row = Upload(
            storage_key=key,
            content_type=content_type,
            size_bytes=size,
            etag=etag,
            backend=self._backend.name,
            status=UploadStatus.FAILED if error else UploadStatus.ACTIVE,
            owner_id=owner_id,
        )
        db_session.add(row)

    async def _mark_deleted(
        self, db_session: "AsyncSession", key: str
    ) -> None:
        """Best-effort: flip the row status to DELETED. Caller commits."""
        from sqlalchemy import select

        from theourgia.models.uploads import Upload, UploadStatus

        result = await db_session.execute(
            select(Upload).where(Upload.storage_key == key)
        )
        row = result.scalar_one_or_none()
        if row is not None:
            row.status = UploadStatus.DELETED
