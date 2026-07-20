"""Install-from-registry bridge tests — v1-032.

Builds a REAL signed artifact in-test from the repo's example-cipher
plugin directory (tar.gz → sha256 → Ed25519 signature with a test
key), serves it through an httpx.MockTransport-backed RegistryClient,
and exercises ``POST /api/v1/plugins/install-from-registry`` end to
end with the suite's DB-less fake-session style.

Covers: happy path (verified + unpacked + recorded with sha/signature
+ capability intersection) · tampered artifact → 400 · unsigned → 400
· wrong-key signature → 400 · version auto-resolution via the release
listing · unknown capability string → 400 before any network call ·
verification unit paths in ``core/plugins/install.py``.
"""

from __future__ import annotations

import base64
import hashlib
import io
import tarfile
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)
from httpx import ASGITransport, AsyncClient

from theourgia.core.plugins.install import (
    ArtifactVerificationError,
    PluginArchiveError,
    artifact_signing_payload,
    unpack_plugin_archive,
    verify_release_artifact,
)
from theourgia.core.plugins.state import PluginState
from theourgia.core.registry.client import RegistryClient

_REPO_ROOT = Path(__file__).resolve().parents[2]
_PLUGIN_DIR = _REPO_ROOT / "plugins" / "theourgia-plugin-example-cipher"

SLUG = "theourgia-plugin-example-cipher"
VERSION = "0.1.0"


# ── artifact building ───────────────────────────────────────────────


def _exclude_caches(info: tarfile.TarInfo) -> tarfile.TarInfo | None:
    if "__pycache__" in info.name or info.name.endswith(".pyc"):
        return None
    return info


def build_archive() -> bytes:
    """tar.gz the real example plugin directory (GitHub-release layout:
    one top-level directory). Symlinks are dereferenced — the installer
    refuses links, so packaging must resolve them (the tutorial's
    ``tar czhf`` step)."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz", dereference=True) as tar:
        tar.add(_PLUGIN_DIR, arcname=SLUG, filter=_exclude_caches)
    return buf.getvalue()


def make_keypair() -> tuple[Ed25519PrivateKey, str]:
    private = Ed25519PrivateKey.generate()
    raw = private.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return private, base64.b64encode(raw).decode("ascii")


def sign_archive(private: Ed25519PrivateKey, content: bytes) -> str:
    payload = artifact_signing_payload(
        slug=SLUG,
        version=VERSION,
        sha256_hex=hashlib.sha256(content).hexdigest(),
    )
    return base64.b64encode(private.sign(payload)).decode("ascii")


# ── fakes ───────────────────────────────────────────────────────────


class _Result:
    def __init__(self, *, scalar: Any = None, rows: list[Any] | None = None):
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        if self._scalar is not None:
            return self._scalar
        return self._rows[0] if self._rows else None

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

    async def flush(self) -> None:
        for row in self.added:
            if getattr(row, "id", None) is None:
                row.id = uuid4()

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, row: Any) -> None:
        return None


def _fake_user() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4())


def _fake_vault(user_id) -> SimpleNamespace:
    return SimpleNamespace(id=uuid4(), owner_id=user_id)


def _registry_handler(
    *,
    content: bytes,
    sha256: str,
    signature: str,
    public_key_b64: str,
    releases: list[dict] | None = None,
):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/download"):
            headers = {
                "X-Artifact-Sha256": sha256,
                "X-Artifact-Signature": signature,
                "X-Author-Did": "did:theourgia:hearth/aspasia",
                "X-Author-Public-Key": public_key_b64,
            }
            # drop empty headers to model "unsigned" registries
            headers = {k: v for k, v in headers.items() if v}
            return httpx.Response(
                200, content=content,
                headers={**headers, "Content-Type": "application/gzip"},
            )
        if path.endswith("/releases"):
            return httpx.Response(
                200,
                json={
                    "plugin_name": SLUG,
                    "author_did": "did:theourgia:hearth/aspasia",
                    "tier": "community",
                    "releases": releases
                    if releases is not None
                    else [
                        {
                            "version": VERSION,
                            "status": "accepted_community",
                            "license_spdx": "AGPL-3.0-only",
                            "has_artifact": True,
                            "sha256": sha256,
                            "created_at": "2026-07-20T00:00:00Z",
                        }
                    ],
                },
            )
        return httpx.Response(404, json={"detail": "not found"})

    return handler


@pytest.fixture
def install_env(monkeypatch, reset_settings, tmp_path):
    """Points THEOURGIA_PLUGINS_DIR at a tmp dir + returns it."""
    _ = reset_settings
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    plugins_dir = tmp_path / "plugins"
    monkeypatch.setenv("THEOURGIA_PLUGINS_DIR", str(plugins_dir))
    return plugins_dir


def _make_app(db, user, handler):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user, get_db_session
    from theourgia.api.routers.v1.registry_bridge import get_registry_client

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_registry_client] = lambda: RegistryClient(
        base_url="http://registry.test", http_client=http,
    )
    return app, http


async def _post_install(app, body: dict):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post("/api/v1/plugins/install-from-registry", json=body)


# ── endpoint: happy path ────────────────────────────────────────────


async def test_install_from_registry_happy_path(install_env) -> None:
    plugins_dir = install_env
    content = build_archive()
    private, public_b64 = make_keypair()
    signature = sign_archive(private, content)
    sha256 = hashlib.sha256(content).hexdigest()

    user = _fake_user()
    vault = _fake_vault(user.id)
    db = _FakeSession([
        _Result(rows=[vault]),   # vault lookup
        _Result(scalar=None),    # duplicate check
        _Result(rows=[]),        # grants re-read for response
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=content, sha256=sha256,
            signature=signature, public_key_b64=public_b64,
        ),
    )
    try:
        response = await _post_install(
            app, {"slug": SLUG, "version": VERSION},
        )
    finally:
        await http.aclose()

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == SLUG
    assert body["version"] == VERSION
    assert body["source"] == f"registry:{SLUG}@{VERSION}"
    assert body["state"] == "installed"

    # The package landed where the loader discovers manifests.
    assert (plugins_dir / SLUG / "plugin.toml").exists()
    assert (
        plugins_dir / SLUG / "src" / "theourgia_plugin_example_cipher"
        / "plugin.py"
    ).exists()

    # The install row pins sha + signature + author key.
    install_row = next(
        r for r in db.added if getattr(r, "artifact_sha256", None)
    )
    assert install_row.artifact_sha256 == sha256
    assert install_row.signature == base64.b64decode(signature)
    assert install_row.signature_public_key == base64.b64decode(public_b64)
    assert install_row.state is PluginState.INSTALLED
    assert db.commits == 1

    # Audit event emitted with the sha.
    audit_rows = [r for r in db.added if getattr(r, "action", "") == "plugin.install_from_registry"]
    assert len(audit_rows) == 1
    assert audit_rows[0].detail["artifact_sha256"] == sha256


async def test_install_resolves_latest_version_when_omitted(install_env) -> None:
    content = build_archive()
    private, public_b64 = make_keypair()
    signature = sign_archive(private, content)
    sha256 = hashlib.sha256(content).hexdigest()

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
        _Result(rows=[]),
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=content, sha256=sha256,
            signature=signature, public_key_b64=public_b64,
        ),
    )
    try:
        response = await _post_install(app, {"slug": SLUG})
    finally:
        await http.aclose()

    assert response.status_code == 201, response.text
    assert response.json()["version"] == VERSION


# ── endpoint: refusals ──────────────────────────────────────────────


async def test_tampered_artifact_is_400_and_nothing_unpacked(install_env) -> None:
    plugins_dir = install_env
    content = build_archive()
    private, public_b64 = make_keypair()
    signature = sign_archive(private, content)
    sha256 = hashlib.sha256(content).hexdigest()
    tampered = content + b"\x00evil"

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=tampered, sha256=sha256,  # headers claim ORIGINAL
            signature=signature, public_key_b64=public_b64,
        ),
    )
    try:
        response = await _post_install(
            app, {"slug": SLUG, "version": VERSION},
        )
    finally:
        await http.aclose()

    assert response.status_code == 400
    assert "digest mismatch" in response.json()["detail"]
    assert not (plugins_dir / SLUG).exists()
    assert db.commits == 0


async def test_resigned_tampered_artifact_still_fails_signature(install_env) -> None:
    """Attacker controls the transport: bytes AND sha header are
    swapped, but the author signature covers the original digest."""
    content = build_archive()
    private, public_b64 = make_keypair()
    signature = sign_archive(private, content)
    tampered = content + b"\x00evil"

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=tampered,
            sha256=hashlib.sha256(tampered).hexdigest(),
            signature=signature,
            public_key_b64=public_b64,
        ),
    )
    try:
        response = await _post_install(
            app, {"slug": SLUG, "version": VERSION},
        )
    finally:
        await http.aclose()

    assert response.status_code == 400
    assert "signature" in response.json()["detail"]


async def test_unsigned_release_is_400(install_env) -> None:
    content = build_archive()
    _, public_b64 = make_keypair()
    sha256 = hashlib.sha256(content).hexdigest()

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=content, sha256=sha256,
            signature="",  # registry serves no signature header
            public_key_b64=public_b64,
        ),
    )
    try:
        response = await _post_install(
            app, {"slug": SLUG, "version": VERSION},
        )
    finally:
        await http.aclose()

    assert response.status_code == 400
    assert "unsigned" in response.json()["detail"]


async def test_wrong_key_signature_is_400(install_env) -> None:
    content = build_archive()
    private, _ = make_keypair()
    _, other_public_b64 = make_keypair()  # registry pins a DIFFERENT key
    signature = sign_archive(private, content)

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
    ])
    app, http = _make_app(
        db, user,
        _registry_handler(
            content=content,
            sha256=hashlib.sha256(content).hexdigest(),
            signature=signature,
            public_key_b64=other_public_b64,
        ),
    )
    try:
        response = await _post_install(
            app, {"slug": SLUG, "version": VERSION},
        )
    finally:
        await http.aclose()

    assert response.status_code == 400
    assert "signature" in response.json()["detail"]


async def test_unknown_capability_refused_before_network(install_env) -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(500)

    user = _fake_user()
    db = _FakeSession([
        _Result(rows=[_fake_vault(user.id)]),
        _Result(scalar=None),
    ])
    app, http = _make_app(db, user, handler)
    try:
        response = await _post_install(
            app,
            {
                "slug": SLUG,
                "version": VERSION,
                "approved_capabilities": ["read.everything"],
            },
        )
    finally:
        await http.aclose()

    assert response.status_code == 400
    assert "unknown capability" in response.json()["detail"]
    assert calls == [], "must refuse before dialing the registry"


# ── verification unit paths ─────────────────────────────────────────


def test_verify_release_artifact_round_trip() -> None:
    content = b"archive-bytes"
    private, public_b64 = make_keypair()
    sha = hashlib.sha256(content).hexdigest()
    payload = artifact_signing_payload(
        slug=SLUG, version=VERSION, sha256_hex=sha,
    )
    signature = base64.b64encode(private.sign(payload)).decode("ascii")
    result = verify_release_artifact(
        content,
        slug=SLUG,
        version=VERSION,
        expected_sha256=sha,
        signature_b64=signature,
        author_public_key_b64=public_b64,
    )
    assert result == sha


def test_verify_release_artifact_rejects_version_swap() -> None:
    """A signature for 0.1.0 must not validate a request for 0.2.0 —
    the version is inside the signed payload."""
    content = b"archive-bytes"
    private, public_b64 = make_keypair()
    sha = hashlib.sha256(content).hexdigest()
    payload = artifact_signing_payload(
        slug=SLUG, version="0.1.0", sha256_hex=sha,
    )
    signature = base64.b64encode(private.sign(payload)).decode("ascii")
    with pytest.raises(ArtifactVerificationError):
        verify_release_artifact(
            content,
            slug=SLUG,
            version="0.2.0",
            expected_sha256=sha,
            signature_b64=signature,
            author_public_key_b64=public_b64,
        )


def test_unpack_rejects_path_traversal(tmp_path) -> None:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        info = tarfile.TarInfo("../escape.txt")
        payload = b"evil"
        info.size = len(payload)
        tar.addfile(info, io.BytesIO(payload))
    with pytest.raises(PluginArchiveError, match="escapes"):
        unpack_plugin_archive(
            buf.getvalue(),
            slug=SLUG,
            version=VERSION,
            plugins_dir=tmp_path / "plugins",
        )
    assert not (tmp_path / "plugins").exists()


def test_unpack_rejects_name_mismatch(tmp_path) -> None:
    content = build_archive()
    with pytest.raises(PluginArchiveError, match="does not match"):
        unpack_plugin_archive(
            content,
            slug="some-other-plugin",
            version=VERSION,
            plugins_dir=tmp_path / "plugins",
        )
    assert not (tmp_path / "plugins" / SLUG).exists()


def test_unpack_rejects_missing_manifest(tmp_path) -> None:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        info = tarfile.TarInfo("readme.txt")
        payload = b"no manifest here"
        info.size = len(payload)
        tar.addfile(info, io.BytesIO(payload))
    with pytest.raises(PluginArchiveError, match=r"plugin\.toml"):
        unpack_plugin_archive(
            buf.getvalue(),
            slug=SLUG,
            version=VERSION,
            plugins_dir=tmp_path / "plugins",
        )
