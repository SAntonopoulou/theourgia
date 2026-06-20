"""Tests for the storage service."""

from __future__ import annotations

import pytest

from theourgia.core.storage.backends.null import NullStorageBackend
from theourgia.core.storage.service import StorageService
from theourgia.core.storage.validators import ValidationError


@pytest.fixture
def backend() -> NullStorageBackend:
    return NullStorageBackend()


@pytest.fixture
def service(backend: NullStorageBackend) -> StorageService:
    return StorageService(backend=backend, max_upload_size=1024)


@pytest.mark.asyncio
async def test_put_stores_via_backend(
    service: StorageService, backend: NullStorageBackend
) -> None:
    obj = await service.put(
        key="k", content=b"hello", content_type="text/plain"
    )
    assert obj.key == "k"
    assert backend.stored["k"].size == 5


@pytest.mark.asyncio
async def test_put_validates_size(
    service: StorageService,
) -> None:
    with pytest.raises(ValidationError, match="exceeds"):
        await service.put(
            key="big", content=b"x" * 2048, content_type="text/plain"
        )


@pytest.mark.asyncio
async def test_get_reads_from_backend(
    service: StorageService, backend: NullStorageBackend
) -> None:
    await backend.put("k", b"hi", content_type="text/plain")
    assert await service.get("k") == b"hi"


@pytest.mark.asyncio
async def test_delete_removes(
    service: StorageService, backend: NullStorageBackend
) -> None:
    await backend.put("k", b"v", content_type="text/plain")
    await service.delete("k")
    assert "k" not in backend.stored


@pytest.mark.asyncio
async def test_exists_forwards(
    service: StorageService, backend: NullStorageBackend
) -> None:
    assert not await service.exists("k")
    await backend.put("k", b"v", content_type="text/plain")
    assert await service.exists("k")


@pytest.mark.asyncio
async def test_presigned_get_url_forwards(
    service: StorageService, backend: NullStorageBackend
) -> None:
    url = await service.presigned_get_url("k", expires_in=300)
    assert "300" in url
    assert "k" in url
    assert backend.presigned_get_calls == ["k"]


@pytest.mark.asyncio
async def test_presigned_put_url_caps_at_service_max(
    backend: NullStorageBackend,
) -> None:
    service = StorageService(backend=backend, max_upload_size=1024)
    url = await service.presigned_put_url(
        key="k", content_type="image/png", max_size=10_000_000
    )
    # The service caps max_size to its configured upload limit
    assert "1024" in url


@pytest.mark.asyncio
async def test_presigned_put_url_uses_service_default_when_unspecified(
    backend: NullStorageBackend,
) -> None:
    service = StorageService(backend=backend, max_upload_size=2048)
    url = await service.presigned_put_url(
        key="k", content_type="image/png"
    )
    assert "2048" in url


def test_service_exposes_backend_name(
    service: StorageService,
) -> None:
    assert service.backend_name == "null"


def test_service_exposes_max_size(
    service: StorageService,
) -> None:
    assert service.max_upload_size == 1024
