"""Tests for the storage factory."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import SecretStr

from theourgia.core.storage.backends.local import LocalFSBackend
from theourgia.core.storage.backends.null import NullStorageBackend
from theourgia.core.storage.backends.s3 import S3CompatibleBackend
from theourgia.core.storage.factory import (
    build_backend_from_settings,
    build_storage_service,
)


def _settings(**overrides: Any) -> SimpleNamespace:
    defaults = dict(
        storage_backend="local",
        storage_local_path=Path("/tmp/test-storage"),
        storage_max_upload_size=1024,
        storage_s3_bucket="",
        storage_s3_endpoint="",
        storage_s3_region="auto",
        storage_s3_access_key=None,
        storage_s3_secret_key=None,
        storage_s3_use_ssl=True,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_local_backend_default(tmp_path: Path) -> None:
    backend = build_backend_from_settings(
        _settings(storage_local_path=tmp_path)
    )
    assert isinstance(backend, LocalFSBackend)


def test_null_backend_selected() -> None:
    backend = build_backend_from_settings(_settings(storage_backend="null"))
    assert isinstance(backend, NullStorageBackend)


def test_s3_requires_bucket_and_endpoint() -> None:
    with pytest.raises(ValueError, match="BUCKET"):
        build_backend_from_settings(
            _settings(
                storage_backend="s3", storage_s3_bucket="", storage_s3_endpoint=""
            )
        )


def test_s3_backend_constructed_with_creds() -> None:
    backend = build_backend_from_settings(
        _settings(
            storage_backend="s3",
            storage_s3_bucket="my-bucket",
            storage_s3_endpoint="https://r2.example/account",
            storage_s3_access_key=SecretStr("ak"),
            storage_s3_secret_key=SecretStr("sk"),
        )
    )
    assert isinstance(backend, S3CompatibleBackend)


def test_unknown_backend_raises() -> None:
    with pytest.raises(ValueError, match="unknown storage backend"):
        build_backend_from_settings(_settings(storage_backend="alien"))


def test_build_storage_service_uses_settings_max_size(tmp_path: Path) -> None:
    service = build_storage_service(
        _settings(
            storage_local_path=tmp_path,
            storage_max_upload_size=2048,
        )
    )
    assert service.max_upload_size == 2048
