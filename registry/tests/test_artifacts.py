"""Release artifact hosting tests — v1-032.

Upload/download round-trip at the handler level with the suite's
DB-less fake-session style (queue-backed results; each ``execute``
pops the next). Covers:

  · upload records the server-computed sha256 + the author's artifact
    signature; the signature is verified against the registered key
  · bad / missing artifact signature → 400
  · over the 10 MB cap → 413 naming the limit
  · immutability → 409 on re-upload
  · DID auth required → 401 without signing headers
  · download serves the exact bytes + sha/signature/author-key headers
  · tombstoned plugin → 410 with the author's reason
  · withdrawn version → 410
  · non-accepted version → 404
"""

from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)
from httpx import ASGITransport, AsyncClient

from theourgia_registry.api.app import create_app
from theourgia_registry.api.deps import get_current_author, get_db_session
from theourgia_registry.models.artifact import (
    MAX_ARTIFACT_BYTES,
    artifact_signing_payload,
)
from theourgia_registry.models.plugin import PluginTier, VersionStatus

# ── fakes ───────────────────────────────────────────────────────────


class _Result:
    def __init__(
        self,
        *,
        scalar: Any = None,
        rows: list[Any] | None = None,
    ) -> None:
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> _Result:
        return self

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        return None

    async def refresh(self, row: Any) -> None:
        return None


# ── fixtures / helpers ──────────────────────────────────────────────


def _keypair() -> tuple[Ed25519PrivateKey, str]:
    private = Ed25519PrivateKey.generate()
    pem = (
        private.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )
    return private, pem


def _author(pem: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        did="did:theourgia:hearth/aspasia",
        display_name="Aspasia",
        public_key_pem=pem,
    )


def _plugin(author: SimpleNamespace, **overrides: Any) -> SimpleNamespace:
    row = SimpleNamespace(
        id=uuid4(),
        author_id=author.id,
        name="example-cipher",
        description="",
        homepage=None,
        tier=PluginTier.COMMUNITY,
        tombstoned_at=None,
        tombstone_reason=None,
        updated_at=datetime.now(tz=UTC),
        created_at=datetime.now(tz=UTC),
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


def _version(plugin: SimpleNamespace, **overrides: Any) -> SimpleNamespace:
    row = SimpleNamespace(
        id=uuid4(),
        plugin_id=plugin.id,
        version="0.1.0",
        license_spdx="AGPL-3.0-only",
        status=VersionStatus.ACCEPTED_COMMUNITY,
        created_at=datetime.now(tz=UTC),
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


def _sign_artifact(
    private: Ed25519PrivateKey, *, slug: str, version: str, content: bytes,
) -> str:
    payload = artifact_signing_payload(
        slug=slug,
        version=version,
        sha256_hex=hashlib.sha256(content).hexdigest(),
    )
    return base64.b64encode(private.sign(payload)).decode("ascii")


def _app_with(
    db: _FakeSession, author: SimpleNamespace | None = None,
):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    if author is not None:
        app.dependency_overrides[get_current_author] = lambda: author
    return app


ARCHIVE = b"\x1f\x8b" + b"fake-tar-gz-bytes-for-round-trip" * 8


# ── upload ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_artifact_upload_records_sha_and_signature() -> None:
    private, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    signature = _sign_artifact(
        private, slug=plugin.name, version=version.version, content=ARCHIVE,
    )
    db = _FakeSession([
        _Result(scalar=plugin),
        _Result(scalar=version),
        _Result(scalar=None),  # no existing artifact
    ])
    app = _app_with(db, author)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            f"/api/v1/author/plugins/{plugin.name}/releases/{version.version}/artifact",
            content=ARCHIVE,
            headers={
                "Content-Type": "application/gzip",
                "X-Artifact-Signature": signature,
            },
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["sha256"] == hashlib.sha256(ARCHIVE).hexdigest()
    assert body["signature_base64"] == signature
    assert body["size_bytes"] == len(ARCHIVE)
    assert db.commits == 1
    stored = db.added[0]
    assert stored.content == ARCHIVE
    assert stored.sha256 == body["sha256"]
    assert stored.signature_base64 == signature
    assert stored.uploaded_by_author_id == author.id


@pytest.mark.asyncio
async def test_artifact_upload_rejects_bad_signature() -> None:
    _private, pem = _keypair()
    other_private, _ = _keypair()  # signature from the WRONG key
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    bad_signature = _sign_artifact(
        other_private, slug=plugin.name, version=version.version,
        content=ARCHIVE,
    )
    db = _FakeSession([
        _Result(scalar=plugin),
        _Result(scalar=version),
        _Result(scalar=None),
    ])
    app = _app_with(db, author)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            f"/api/v1/author/plugins/{plugin.name}/releases/{version.version}/artifact",
            content=ARCHIVE,
            headers={"X-Artifact-Signature": bad_signature},
        )
    assert response.status_code == 400
    assert "does not verify" in response.json()["detail"]
    assert db.added == []


@pytest.mark.asyncio
async def test_artifact_upload_requires_signature_header() -> None:
    _, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    db = _FakeSession([
        _Result(scalar=plugin),
        _Result(scalar=version),
        _Result(scalar=None),
    ])
    app = _app_with(db, author)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            f"/api/v1/author/plugins/{plugin.name}/releases/{version.version}/artifact",
            content=ARCHIVE,
        )
    assert response.status_code == 400
    assert "X-Artifact-Signature" in response.json()["detail"]


@pytest.mark.asyncio
async def test_artifact_upload_over_cap_is_413_naming_limit() -> None:
    private, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    oversized = b"\x00" * (MAX_ARTIFACT_BYTES + 1)
    signature = _sign_artifact(
        private, slug=plugin.name, version=version.version, content=oversized,
    )
    db = _FakeSession([
        _Result(scalar=plugin),
        _Result(scalar=version),
        _Result(scalar=None),
    ])
    app = _app_with(db, author)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            f"/api/v1/author/plugins/{plugin.name}/releases/{version.version}/artifact",
            content=oversized,
            headers={"X-Artifact-Signature": signature},
        )
    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


@pytest.mark.asyncio
async def test_artifact_upload_duplicate_is_409() -> None:
    private, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    signature = _sign_artifact(
        private, slug=plugin.name, version=version.version, content=ARCHIVE,
    )
    db = _FakeSession([
        _Result(scalar=plugin),
        _Result(scalar=version),
        _Result(scalar=SimpleNamespace(id=uuid4())),  # artifact exists
    ])
    app = _app_with(db, author)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            f"/api/v1/author/plugins/{plugin.name}/releases/{version.version}/artifact",
            content=ARCHIVE,
            headers={"X-Artifact-Signature": signature},
        )
    assert response.status_code == 409
    assert "immutable" in response.json()["detail"]


@pytest.mark.asyncio
async def test_artifact_upload_requires_did_auth() -> None:
    """No signing headers → 401 from the real auth dependency."""
    db = _FakeSession([])
    app = _app_with(db)  # no author override — real DID auth runs
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/api/v1/author/plugins/example-cipher/releases/0.1.0/artifact",
            content=ARCHIVE,
        )
    assert response.status_code == 401


# ── download ────────────────────────────────────────────────────────


def _stored_artifact(
    version: SimpleNamespace, signature: str,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        plugin_version_id=version.id,
        content=ARCHIVE,
        size_bytes=len(ARCHIVE),
        sha256=hashlib.sha256(ARCHIVE).hexdigest(),
        signature_base64=signature,
        content_type="application/gzip",
    )


@pytest.mark.asyncio
async def test_download_round_trip_serves_bytes_and_verifiable_headers() -> None:
    private, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin)
    signature = _sign_artifact(
        private, slug=plugin.name, version=version.version, content=ARCHIVE,
    )
    artifact = _stored_artifact(version, signature)
    db = _FakeSession([
        _Result(rows=[(plugin, author)]),
        _Result(scalar=version),
        _Result(scalar=artifact),
    ])
    app = _app_with(db)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get(
            f"/api/v1/plugins/{plugin.name}/releases/{version.version}/download",
        )

    assert response.status_code == 200
    assert response.content == ARCHIVE
    assert response.headers["X-Artifact-Sha256"] == artifact.sha256
    assert response.headers["X-Artifact-Signature"] == signature
    assert response.headers["X-Author-Did"] == author.did

    # The pinned key in the header must verify the artifact signature —
    # exactly what an installing vault does.
    from cryptography.hazmat.primitives.asymmetric.ed25519 import (
        Ed25519PublicKey,
    )

    raw_key = base64.b64decode(response.headers["X-Author-Public-Key"])
    key = Ed25519PublicKey.from_public_bytes(raw_key)
    payload = artifact_signing_payload(
        slug=plugin.name,
        version=version.version,
        sha256_hex=hashlib.sha256(response.content).hexdigest(),
    )
    key.verify(base64.b64decode(signature), payload)  # raises on failure


@pytest.mark.asyncio
async def test_download_tombstoned_plugin_is_410_with_reason() -> None:
    _, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(
        author,
        tombstoned_at=datetime(2026, 7, 1, tzinfo=UTC),
        tombstone_reason="Superseded by example-cipher-ng.",
    )
    db = _FakeSession([_Result(rows=[(plugin, author)])])
    app = _app_with(db)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get(
            f"/api/v1/plugins/{plugin.name}/releases/0.1.0/download",
        )
    assert response.status_code == 410
    detail = response.json()["detail"]
    assert detail["error"] == "tombstoned"
    assert detail["reason"] == "Superseded by example-cipher-ng."


@pytest.mark.asyncio
async def test_download_withdrawn_version_is_410() -> None:
    _, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin, status=VersionStatus.WITHDRAWN)
    db = _FakeSession([
        _Result(rows=[(plugin, author)]),
        _Result(scalar=version),
    ])
    app = _app_with(db)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get(
            f"/api/v1/plugins/{plugin.name}/releases/0.1.0/download",
        )
    assert response.status_code == 410
    assert response.json()["detail"]["error"] == "version_withdrawn"


@pytest.mark.asyncio
async def test_download_pending_version_is_404() -> None:
    _, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    version = _version(plugin, status=VersionStatus.PENDING_REVIEW)
    db = _FakeSession([
        _Result(rows=[(plugin, author)]),
        _Result(scalar=version),
    ])
    app = _app_with(db)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get(
            f"/api/v1/plugins/{plugin.name}/releases/0.1.0/download",
        )
    assert response.status_code == 404
    assert "only accepted releases" in response.json()["detail"]


@pytest.mark.asyncio
async def test_releases_listing_reports_artifact_presence() -> None:
    _, pem = _keypair()
    author = _author(pem)
    plugin = _plugin(author)
    with_artifact = _version(plugin)
    without_artifact = _version(plugin, version="0.2.0", id=uuid4())
    artifact = _stored_artifact(with_artifact, "c2ln")
    db = _FakeSession([
        _Result(rows=[(plugin, author)]),
        _Result(rows=[with_artifact, without_artifact]),
        _Result(rows=[artifact]),
    ])
    app = _app_with(db)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get(f"/api/v1/plugins/{plugin.name}/releases")
    assert response.status_code == 200
    body = response.json()
    assert body["plugin_name"] == plugin.name
    assert body["author_did"] == author.did
    by_version = {r["version"]: r for r in body["releases"]}
    assert by_version["0.1.0"]["has_artifact"] is True
    assert by_version["0.1.0"]["sha256"] == artifact.sha256
    assert by_version["0.2.0"]["has_artifact"] is False
    assert by_version["0.2.0"]["sha256"] is None
