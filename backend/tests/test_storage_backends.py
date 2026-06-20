"""Tests for the storage backend implementations."""

from __future__ import annotations

from pathlib import Path

import pytest

from theourgia.core.storage.backends.base import (
    StorageBackend,
    StorageDeliveryError,
)
from theourgia.core.storage.backends.local import LocalFSBackend
from theourgia.core.storage.backends.null import NullStorageBackend


# ── NullStorageBackend ───────────────────────────────────────────────


def test_null_backend_satisfies_protocol() -> None:
    backend: StorageBackend = NullStorageBackend()
    assert backend.name == "null"


@pytest.mark.asyncio
async def test_null_backend_round_trip() -> None:
    backend = NullStorageBackend()
    obj = await backend.put("test/key", b"hello", content_type="text/plain")
    assert obj.key == "test/key"
    assert obj.size == 5
    assert obj.content_type == "text/plain"
    assert obj.backend == "null"

    fetched = await backend.get("test/key")
    assert fetched == b"hello"


@pytest.mark.asyncio
async def test_null_backend_get_missing_raises() -> None:
    backend = NullStorageBackend()
    with pytest.raises(StorageDeliveryError, match="not found"):
        await backend.get("does/not/exist")


@pytest.mark.asyncio
async def test_null_backend_delete_idempotent() -> None:
    backend = NullStorageBackend()
    await backend.delete("never-existed")  # no error
    await backend.put("k", b"v", content_type="text/plain")
    await backend.delete("k")
    assert "k" in backend.deletions
    assert not await backend.exists("k")


@pytest.mark.asyncio
async def test_null_backend_exists() -> None:
    backend = NullStorageBackend()
    assert not await backend.exists("k")
    await backend.put("k", b"v", content_type="text/plain")
    assert await backend.exists("k")


@pytest.mark.asyncio
async def test_null_backend_stat() -> None:
    backend = NullStorageBackend()
    await backend.put("k", b"hello", content_type="text/plain")
    obj = await backend.stat("k")
    assert obj.size == 5
    assert obj.content_type == "text/plain"


@pytest.mark.asyncio
async def test_null_backend_stat_missing_raises() -> None:
    backend = NullStorageBackend()
    with pytest.raises(StorageDeliveryError, match="not found"):
        await backend.stat("nope")


@pytest.mark.asyncio
async def test_null_backend_presigned_get_records_call() -> None:
    backend = NullStorageBackend()
    url = await backend.presigned_get_url("k", expires_in=120)
    assert "k" in url
    assert "120" in url
    assert backend.presigned_get_calls == ["k"]


@pytest.mark.asyncio
async def test_null_backend_presigned_put_records_call() -> None:
    backend = NullStorageBackend()
    url = await backend.presigned_put_url(
        "k", content_type="image/png", max_size=1024
    )
    assert "1024" in url
    assert backend.presigned_put_calls == ["k"]


# ── LocalFSBackend ───────────────────────────────────────────────────


@pytest.fixture
def local_backend(tmp_path: Path) -> LocalFSBackend:
    return LocalFSBackend(root_path=tmp_path / "storage")


@pytest.mark.asyncio
async def test_local_backend_round_trip(local_backend: LocalFSBackend) -> None:
    await local_backend.put("test/key", b"hello", content_type="text/plain")
    assert await local_backend.get("test/key") == b"hello"


@pytest.mark.asyncio
async def test_local_backend_creates_subdirs(
    local_backend: LocalFSBackend, tmp_path: Path
) -> None:
    await local_backend.put("a/b/c/d.txt", b"deep", content_type="text/plain")
    assert (tmp_path / "storage" / "a" / "b" / "c" / "d.txt").exists()


@pytest.mark.asyncio
async def test_local_backend_rejects_path_traversal(
    local_backend: LocalFSBackend,
) -> None:
    with pytest.raises(StorageDeliveryError, match="invalid key"):
        await local_backend.put(
            "../escape.txt", b"x", content_type="text/plain"
        )


@pytest.mark.asyncio
async def test_local_backend_rejects_absolute_paths(
    local_backend: LocalFSBackend,
) -> None:
    with pytest.raises(StorageDeliveryError, match="invalid key"):
        await local_backend.put(
            "/etc/passwd", b"x", content_type="text/plain"
        )


@pytest.mark.asyncio
async def test_local_backend_get_missing_raises(
    local_backend: LocalFSBackend,
) -> None:
    with pytest.raises(StorageDeliveryError, match="not found"):
        await local_backend.get("not/there.txt")


@pytest.mark.asyncio
async def test_local_backend_delete_idempotent(
    local_backend: LocalFSBackend,
) -> None:
    await local_backend.delete("never-existed.txt")  # no error
    await local_backend.put("k.txt", b"v", content_type="text/plain")
    await local_backend.delete("k.txt")
    assert not await local_backend.exists("k.txt")


@pytest.mark.asyncio
async def test_local_backend_etag_is_sha256(
    local_backend: LocalFSBackend,
) -> None:
    import hashlib

    content = b"sha-me"
    obj = await local_backend.put("e.txt", content, content_type="text/plain")
    assert obj.etag == hashlib.sha256(content).hexdigest()


@pytest.mark.asyncio
async def test_local_backend_presigned_put_unsupported(
    local_backend: LocalFSBackend,
) -> None:
    with pytest.raises(StorageDeliveryError, match="presigned PUT"):
        await local_backend.presigned_put_url(
            "k", content_type="image/png"
        )


def test_local_backend_rejects_empty_root() -> None:
    with pytest.raises(ValueError, match="root_path"):
        LocalFSBackend(root_path="")  # type: ignore[arg-type]
