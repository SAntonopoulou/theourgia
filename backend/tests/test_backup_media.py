"""Media rides the restic backup.

The pre-launch audit found object-store media had no backup — restic only
snapshotted local paths. The scheduled backup now folds the store into the
spool so uploads are captured in the same encrypted, versioned repository as
the database dump. These tests pin that fold: a no-op under local storage, a
real download under S3/R2, and idempotence (unchanged objects are not
re-fetched).
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest

from theourgia.core.config import reset_settings_cache
from theourgia.core.tasks import backup as backup_mod


def _install_fake_boto3(
    monkeypatch: pytest.MonkeyPatch, objects: list[tuple[str, int]]
) -> list[str]:
    """Patch in a fake boto3 whose client lists ``objects`` and writes a
    file of the declared size on download. Returns the list that records
    which keys were actually downloaded."""
    sizes = dict(objects)
    downloads: list[str] = []

    class _Paginator:
        def paginate(self, **_kwargs: object):
            yield {"Contents": [{"Key": k, "Size": s} for k, s in objects]}

    class _Client:
        def get_paginator(self, name: str) -> _Paginator:
            assert name == "list_objects_v2"
            return _Paginator()

        def download_file(self, _bucket: str, key: str, dest: str) -> None:
            downloads.append(key)
            Path(dest).write_bytes(b"x" * sizes[key])

    fake = types.ModuleType("boto3")
    fake.client = lambda *a, **k: _Client()  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "boto3", fake)
    return downloads


async def test_no_op_when_storage_is_local(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("THEOURGIA_STORAGE_BACKEND", "local")
    reset_settings_cache()
    try:
        assert await backup_mod._sync_media_into_spool(tmp_path) == 0
    finally:
        reset_settings_cache()


async def test_folds_s3_media_into_the_spool(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("THEOURGIA_STORAGE_BACKEND", "s3")
    monkeypatch.setenv("THEOURGIA_STORAGE_S3_BUCKET", "theourgia-media")
    monkeypatch.setenv("THEOURGIA_STORAGE_S3_ENDPOINT", "https://example.r2")
    reset_settings_cache()
    downloads = _install_fake_boto3(monkeypatch, [("a.jpg", 3), ("sub/b.png", 5)])
    try:
        count = await backup_mod._sync_media_into_spool(tmp_path)
        assert count == 2
        # Nested keys become nested dirs under the spool's media/.
        assert (tmp_path / "media" / "a.jpg").read_bytes() == b"xxx"
        assert (tmp_path / "media" / "sub" / "b.png").stat().st_size == 5
        assert sorted(downloads) == ["a.jpg", "sub/b.png"]

        # Idempotent: a second pass finds both at the same size and skips the
        # download, but still counts them as present.
        downloads.clear()
        assert await backup_mod._sync_media_into_spool(tmp_path) == 2
        assert downloads == []
    finally:
        reset_settings_cache()


async def test_s3_configured_but_bucket_unset_is_a_noop(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("THEOURGIA_STORAGE_BACKEND", "s3")
    monkeypatch.delenv("THEOURGIA_STORAGE_S3_BUCKET", raising=False)
    monkeypatch.delenv("THEOURGIA_STORAGE_S3_ENDPOINT", raising=False)
    reset_settings_cache()
    try:
        assert await backup_mod._sync_media_into_spool(tmp_path) == 0
    finally:
        reset_settings_cache()
