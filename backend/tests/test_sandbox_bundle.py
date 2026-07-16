"""Sandbox .mbf path — v1-011 (ADR-0011 sandbox-before-commit).

``POST /sandbox/import`` accepts a multipart ``.mbf`` upload for
kind=bundle: bytes go to the storage substrate, the manifest is
stashed on the row, and NO content is materialized. Promote reads the
bytes back and runs the real import. The historical JSON body and the
30-day / promote / discard semantics stay untouched.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException

from tests.mbf_fixtures import (
    _FakeSession,
    _FakeUpload,
    _Result,
    _user,
    make_bundle,
)
from theourgia.api.routers.v1.sandbox import (
    discard_sandbox,
    import_into_sandbox,
    promote_sandbox,
    set_bundle_storage,
)
from theourgia.core.bundles.container import read_mbf
from theourgia.core.storage import NullStorageBackend, StorageService
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entities import Entity
from theourgia.models.sandbox import Sandbox, SandboxKind


class _FakeRequest:
    """Duck-typed starlette Request: JSON or multipart form."""

    def __init__(
        self,
        *,
        json_body: dict[str, Any] | None = None,
        form_body: dict[str, Any] | None = None,
    ) -> None:
        self._json = json_body
        self._form = form_body
        if form_body is not None:
            self.headers = {
                "content-type": "multipart/form-data; boundary=xyz",
            }
        else:
            self.headers = {"content-type": "application/json"}

    async def json(self) -> Any:
        return self._json

    async def form(self) -> Any:
        return self._form


def _vault() -> Any:
    return SimpleNamespace(id=uuid4(), display_name="Soror Test")


@pytest.fixture
def storage() -> Any:
    backend = NullStorageBackend()
    service = StorageService(backend=backend)
    set_bundle_storage(service)
    yield backend
    set_bundle_storage(None)


# ── Import: multipart .mbf upload ─────────────────────────────────


async def test_bundle_upload_stores_bytes_without_materializing(
    storage: NullStorageBackend,
) -> None:
    data = make_bundle()
    session = _FakeSession([_Result(rows=[_vault()])])
    request = _FakeRequest(
        form_body={"kind": "bundle", "file": _FakeUpload(data)},
    )
    read = await import_into_sandbox(
        request,  # type: ignore[arg-type]
        _user(),
        session,  # type: ignore[arg-type]
    )
    assert read.kind == "bundle"
    # Label + source default from the manifest.
    assert read.label == "Test Pantheon"
    assert read.source == "test-pantheon@1.0.0"

    sandboxes = [r for r in session.added if isinstance(r, Sandbox)]
    assert len(sandboxes) == 1
    sandbox = sandboxes[0]
    assert sandbox.bundle_manifest is not None
    assert sandbox.bundle_manifest["slug"] == "test-pantheon"
    assert sandbox.bundle_file_key in storage.stored
    assert await StorageService(backend=storage).get(
        sandbox.bundle_file_key
    ) == data

    # Structural isolation: NO content rows were materialized.
    assert not any(isinstance(r, Entity) for r in session.added)
    assert not any(isinstance(r, InstalledBundle) for r in session.added)
    assert session.commits == 1


async def test_bundle_upload_refuses_garbage(
    storage: NullStorageBackend,
) -> None:
    request = _FakeRequest(
        form_body={"kind": "bundle", "file": _FakeUpload(b"not a zip")},
    )
    with pytest.raises(HTTPException) as excinfo:
        await import_into_sandbox(
            request,  # type: ignore[arg-type]
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
        )
    assert excinfo.value.status_code == 400
    assert storage.stored == {}


async def test_file_upload_for_plugin_kind_rejected(
    storage: NullStorageBackend,
) -> None:
    request = _FakeRequest(
        form_body={"kind": "plugin", "file": _FakeUpload(make_bundle())},
    )
    with pytest.raises(HTTPException) as excinfo:
        await import_into_sandbox(
            request,  # type: ignore[arg-type]
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
        )
    assert excinfo.value.status_code == 422


async def test_json_import_path_unchanged() -> None:
    """The historical JSON body still works and touches no storage."""
    session = _FakeSession([_Result(rows=[_vault()])])
    request = _FakeRequest(
        json_body={
            "kind": "plugin",
            "label": "Geomancy Workbench",
            "source": "did:theourgia:terra.example:agrippa-tools",
        },
    )
    read = await import_into_sandbox(
        request,  # type: ignore[arg-type]
        _user(),
        session,  # type: ignore[arg-type]
    )
    assert read.kind == "plugin"
    sandbox = next(r for r in session.added if isinstance(r, Sandbox))
    assert sandbox.bundle_manifest is None
    assert sandbox.bundle_file_key is None


async def test_json_import_validation_still_strict() -> None:
    request = _FakeRequest(json_body={"kind": "random", "label": "x"})
    with pytest.raises(HTTPException) as excinfo:
        await import_into_sandbox(
            request,  # type: ignore[arg-type]
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
        )
    assert excinfo.value.status_code == 422


# ── Promote runs the real import ──────────────────────────────────


def _bundle_sandbox(owner_id: Any, key: str) -> Sandbox:
    return Sandbox(
        owner_id=owner_id,
        vault_id=uuid4(),
        kind=SandboxKind.BUNDLE,
        label="Test Pantheon",
        source="test-pantheon@1.0.0",
        notes="",
        expires_at=datetime.now(tz=UTC) + timedelta(days=30),
        bundle_manifest={"slug": "test-pantheon"},
        bundle_file_key=key,
    )


async def test_promote_bundle_sandbox_runs_real_import(
    storage: NullStorageBackend,
) -> None:
    data = make_bundle()
    user = _user()
    key = f"vaults/{uuid4()}/sandbox-bundles/{uuid4()}.mbf"
    await storage.put(key, data, content_type="application/zip")
    sandbox = _bundle_sandbox(user.id, key)
    session = _FakeSession([_Result(rows=[sandbox])])

    read = await promote_sandbox(
        sandbox.id,
        user,
        session,  # type: ignore[arg-type]
    )
    assert read.id == str(sandbox.id)
    assert sandbox.promoted_at is not None

    entities = [r for r in session.added if isinstance(r, Entity)]
    assert sorted(e.name for e in entities) == ["Hekate", "Hermes"]
    assert all(e.owner_id == user.id for e in entities)
    installs = [r for r in session.added if isinstance(r, InstalledBundle)]
    assert len(installs) == 1
    assert installs[0].imported_item_count == 2
    assert installs[0].source_file_key == key
    assert installs[0].attribution
    assert session.commits == 1

    # The stored manifest matches what got imported.
    assert read_mbf(data).manifest.slug == installs[0].slug


async def test_promote_aborts_and_keeps_sandbox_when_bytes_missing(
    storage: NullStorageBackend,
) -> None:
    user = _user()
    sandbox = _bundle_sandbox(user.id, "vaults/gone/sandbox-bundles/x.mbf")
    session = _FakeSession([_Result(rows=[sandbox])])
    with pytest.raises(HTTPException) as excinfo:
        await promote_sandbox(
            sandbox.id,
            user,
            session,  # type: ignore[arg-type]
        )
    assert excinfo.value.status_code == 409
    assert sandbox.promoted_at is None
    assert session.commits == 0


async def test_promote_plugin_sandbox_untouched(
    storage: NullStorageBackend,
) -> None:
    user = _user()
    sandbox = Sandbox(
        owner_id=user.id,
        vault_id=uuid4(),
        kind=SandboxKind.PLUGIN,
        label="Plugin",
        source="registry",
        notes="",
        expires_at=datetime.now(tz=UTC) + timedelta(days=30),
    )
    session = _FakeSession([_Result(rows=[sandbox])])
    await promote_sandbox(
        sandbox.id,
        user,
        session,  # type: ignore[arg-type]
    )
    assert sandbox.promoted_at is not None
    assert not any(isinstance(r, InstalledBundle) for r in session.added)


async def test_discard_semantics_untouched() -> None:
    user = _user()
    sandbox = _bundle_sandbox(user.id, "vaults/x/sandbox-bundles/y.mbf")
    session = _FakeSession([_Result(rows=[sandbox])])
    await discard_sandbox(
        sandbox.id,
        user,
        session,  # type: ignore[arg-type]
    )
    assert sandbox.discarded_at is not None
    assert sandbox.promoted_at is None
