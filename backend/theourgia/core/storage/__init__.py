"""Object storage substrate — user uploads.

Avatars, sigil images, ritual photos, audio recordings, divination
screenshots, and every other user-uploaded blob goes through this
package. Provider is operator-chosen at deploy time — same R2 / S3 /
B2 / Hetzner / MinIO mechanics as the Restic backup substrate, but a
separate keyspace.

Canonical call point::

    upload_record = await storage_service.put(
        key=f"users/{user.id}/avatar.png",
        content=raw_bytes,
        content_type="image/png",
        owner_id=user.id,
    )

The service records every upload in :class:`Upload` for audit / quota
tracking / orphan detection. The backend is pluggable; tests use the
:class:`NullStorageBackend`.

For large files, prefer the presigned-URL flow:

    url = await storage_service.presigned_put_url(
        key=f"vaults/{vault_id}/audio/$id.opus",
        content_type="audio/opus",
        max_size=50 * 1024 * 1024,
    )

The client PUTs directly to the storage provider; on completion they
call the registration endpoint which records the :class:`Upload` row.
"""

from __future__ import annotations

from theourgia.core.storage.backends.base import (
    StorageBackend,
    StorageDeliveryError,
    StorageObject,
)
from theourgia.core.storage.backends.local import LocalFSBackend
from theourgia.core.storage.backends.null import NullStorageBackend
from theourgia.core.storage.backends.s3 import S3CompatibleBackend
from theourgia.core.storage.factory import build_storage_service
from theourgia.core.storage.service import StorageService
from theourgia.core.storage.validators import (
    ValidationError,
    detect_content_type,
    validate_size,
)

__all__ = [
    "LocalFSBackend",
    "NullStorageBackend",
    "S3CompatibleBackend",
    "StorageBackend",
    "StorageDeliveryError",
    "StorageObject",
    "StorageService",
    "ValidationError",
    "build_storage_service",
    "detect_content_type",
    "validate_size",
]
