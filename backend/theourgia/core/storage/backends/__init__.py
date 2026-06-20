"""Storage backend implementations."""

from __future__ import annotations

from theourgia.core.storage.backends.base import (
    StorageBackend,
    StorageDeliveryError,
    StorageObject,
)
from theourgia.core.storage.backends.local import LocalFSBackend
from theourgia.core.storage.backends.null import NullStorageBackend
from theourgia.core.storage.backends.s3 import S3CompatibleBackend

__all__ = [
    "LocalFSBackend",
    "NullStorageBackend",
    "S3CompatibleBackend",
    "StorageBackend",
    "StorageDeliveryError",
    "StorageObject",
]
