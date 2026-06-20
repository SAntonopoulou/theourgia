"""S3-compatible storage backend — production.

Works against any S3-compatible service: AWS S3, Cloudflare R2,
Backblaze B2, Hetzner Object Storage, MinIO, etc. Operator picks via
``THEOURGIA_STORAGE_BACKEND=s3`` and configures endpoint + creds via
``THEOURGIA_S3_*`` env vars.

Requires ``boto3``, lazy-imported. Operators install via the
``[storage-s3]`` extra; default install is local-FS only.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Final

from theourgia.core.storage.backends.base import (
    StorageDeliveryError,
    StorageObject,
)

__all__ = ["S3CompatibleBackend", "S3Config"]


@dataclass(frozen=True, slots=True)
class S3Config:
    """Connection parameters for an S3-compatible bucket."""

    bucket: str
    endpoint_url: str
    """Provider URL — ``https://<account>.r2.cloudflarestorage.com``,
    ``https://s3.eu-central-2.hetznerobjects.com``, etc."""
    region: str = "auto"
    access_key_id: str = ""
    secret_access_key: str = ""
    use_ssl: bool = True


_DEFAULT_PRESIGN_EXPIRY: Final[int] = 3600


class S3CompatibleBackend:
    """Storage via the S3 API."""

    name = "s3"

    def __init__(self, config: S3Config) -> None:
        if not config.bucket:
            raise ValueError("S3Config.bucket must not be empty")
        if not config.endpoint_url:
            raise ValueError("S3Config.endpoint_url must not be empty")
        self._config = config
        # Defer client construction until first use so import-time
        # doesn't require boto3.
        self._client = None
        self._client_lock = asyncio.Lock()

    async def _get_client(self):
        if self._client is not None:
            return self._client
        async with self._client_lock:
            if self._client is not None:
                return self._client
            try:
                import boto3  # noqa: PLC0415
            except ImportError as exc:
                raise StorageDeliveryError(
                    "S3CompatibleBackend requires the 'boto3' package; "
                    "install with `pip install theourgia[storage-s3]`",
                    backend=self.name,
                    provider_error="import failed",
                ) from exc
            self._client = boto3.client(
                "s3",
                endpoint_url=self._config.endpoint_url,
                region_name=self._config.region,
                aws_access_key_id=self._config.access_key_id or None,
                aws_secret_access_key=self._config.secret_access_key or None,
                use_ssl=self._config.use_ssl,
            )
            return self._client

    async def put(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str,
        metadata: dict[str, str] | None = None,
    ) -> StorageObject:
        client = await self._get_client()

        def _put_sync() -> dict:
            kwargs = {
                "Bucket": self._config.bucket,
                "Key": key,
                "Body": content,
                "ContentType": content_type,
            }
            if metadata:
                kwargs["Metadata"] = metadata
            return client.put_object(**kwargs)

        try:
            response = await asyncio.to_thread(_put_sync)
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"S3 put failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc

        etag = str(response.get("ETag", "")).strip('"')
        return StorageObject(
            key=key,
            size=len(content),
            content_type=content_type,
            etag=etag,
            backend=self.name,
            metadata=dict(metadata or {}),
        )

    async def get(self, key: str) -> bytes:
        client = await self._get_client()
        try:
            response = await asyncio.to_thread(
                client.get_object,
                Bucket=self._config.bucket,
                Key=key,
            )
            body = await asyncio.to_thread(response["Body"].read)
            return body
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"S3 get failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc

    async def delete(self, key: str) -> None:
        client = await self._get_client()
        try:
            await asyncio.to_thread(
                client.delete_object,
                Bucket=self._config.bucket,
                Key=key,
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"S3 delete failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc

    async def exists(self, key: str) -> bool:
        client = await self._get_client()
        try:
            await asyncio.to_thread(
                client.head_object,
                Bucket=self._config.bucket,
                Key=key,
            )
            return True
        except Exception:  # noqa: BLE001 — any failure means "no"
            return False

    async def stat(self, key: str) -> StorageObject:
        client = await self._get_client()
        try:
            response = await asyncio.to_thread(
                client.head_object,
                Bucket=self._config.bucket,
                Key=key,
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"S3 head failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc
        return StorageObject(
            key=key,
            size=int(response.get("ContentLength", 0)),
            content_type=str(response.get("ContentType", "application/octet-stream")),
            etag=str(response.get("ETag", "")).strip('"'),
            backend=self.name,
            metadata=dict(response.get("Metadata", {})),
        )

    async def presigned_get_url(
        self, key: str, *, expires_in: int = _DEFAULT_PRESIGN_EXPIRY
    ) -> str:
        client = await self._get_client()
        try:
            return await asyncio.to_thread(
                client.generate_presigned_url,
                "get_object",
                Params={"Bucket": self._config.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"presigned get URL generation failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc

    async def presigned_put_url(
        self,
        key: str,
        *,
        content_type: str,
        expires_in: int = _DEFAULT_PRESIGN_EXPIRY,
        max_size: int | None = None,
    ) -> str:
        client = await self._get_client()
        params: dict[str, object] = {
            "Bucket": self._config.bucket,
            "Key": key,
            "ContentType": content_type,
        }
        try:
            return await asyncio.to_thread(
                client.generate_presigned_url,
                "put_object",
                Params=params,
                ExpiresIn=expires_in,
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageDeliveryError(
                f"presigned put URL generation failed: {exc.__class__.__name__}",
                backend=self.name,
                provider_error=str(exc),
            ) from exc
