"""Construct a :class:`StorageService` from settings."""

from __future__ import annotations

from pathlib import Path

from theourgia.core.storage.backends.base import StorageBackend
from theourgia.core.storage.backends.local import LocalFSBackend
from theourgia.core.storage.backends.null import NullStorageBackend
from theourgia.core.storage.backends.s3 import S3CompatibleBackend, S3Config
from theourgia.core.storage.service import StorageService
from theourgia.core.storage.validators import DEFAULT_MAX_SIZE

__all__ = ["build_backend_from_settings", "build_storage_service"]


def build_backend_from_settings(settings: object) -> StorageBackend:
    name = (getattr(settings, "storage_backend", None) or "local").lower()

    if name == "null":
        return NullStorageBackend()

    if name == "local":
        path = getattr(settings, "storage_local_path", None) or Path("/var/lib/theourgia/storage")
        return LocalFSBackend(root_path=Path(path))

    if name == "s3":
        bucket = getattr(settings, "storage_s3_bucket", "") or ""
        endpoint = getattr(settings, "storage_s3_endpoint", "") or ""
        if not bucket or not endpoint:
            msg = (
                "THEOURGIA_STORAGE_S3_BUCKET and "
                "THEOURGIA_STORAGE_S3_ENDPOINT required when "
                "storage_backend=s3"
            )
            raise ValueError(msg)
        return S3CompatibleBackend(
            S3Config(
                bucket=bucket,
                endpoint_url=endpoint,
                region=getattr(settings, "storage_s3_region", None) or "auto",
                access_key_id=_secret(
                    getattr(settings, "storage_s3_access_key", None)
                ),
                secret_access_key=_secret(
                    getattr(settings, "storage_s3_secret_key", None)
                ),
                use_ssl=bool(getattr(settings, "storage_s3_use_ssl", True)),
            )
        )

    msg = (
        f"unknown storage backend: {name!r}. "
        "Set THEOURGIA_STORAGE_BACKEND to one of: local, s3, null"
    )
    raise ValueError(msg)


def build_storage_service(settings: object) -> StorageService:
    backend = build_backend_from_settings(settings)
    max_size = int(
        getattr(settings, "storage_max_upload_size", None) or DEFAULT_MAX_SIZE
    )
    return StorageService(backend=backend, max_upload_size=max_size)


def _secret(value: object) -> str:
    if value is None:
        return ""
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value() or ""
    return str(value)
