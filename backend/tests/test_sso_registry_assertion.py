"""Registry SSO assertion minting — v1-032.

The vault half of the SSO bridge: ``POST /api/v1/sso/registry-assertion``
mints a federation-key-signed assertion the registry's
``/api/v1/auth/sso-session`` verifies. Covers:

  · the signature verifies against the instance's published federation
    public key over the canonical assertion bytes (the exact check the
    registry performs);
  · assertion shape (kind / issuer / subject / audience / expiry) and
    the author public key bootstrap field;
  · 503 honesty when the registry URL or author identity is
    unconfigured.
"""

from __future__ import annotations

import base64
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)
from httpx import ASGITransport, AsyncClient

from theourgia.core.federation.signing import canonical_attestation_bytes


class _Result:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        return self._rows[0] if self._rows else None


class _FakeSession:
    def __init__(self, results: list[_Result] | None = None):
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1


def _configure(monkeypatch, tmp_path, *, with_author_key: bool = True) -> None:
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    monkeypatch.setenv("THEOURGIA_BASE_URL", "https://theourgia.com")
    monkeypatch.setenv("THEOURGIA_REGISTRY_URL", "https://plugins.theourgia.com")
    monkeypatch.setenv("THEOURGIA_AUTHOR_DID", "did:theourgia:theourgia.com")
    monkeypatch.setenv(
        "THEOURGIA_FEDERATION_PRIVATE_KEY_PATH", str(tmp_path / "fed.key"),
    )
    monkeypatch.setenv(
        "THEOURGIA_FEDERATION_PUBLIC_KEY_PATH", str(tmp_path / "fed.pub"),
    )
    if with_author_key:
        author_key = Ed25519PrivateKey.generate()
        pem = author_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        key_path = tmp_path / "author.key"
        key_path.write_bytes(pem)
        monkeypatch.setenv(
            "THEOURGIA_AUTHOR_PRIVATE_KEY_PATH", str(key_path),
        )


def _make_app(db):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user, get_db_session

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=uuid4(),
    )
    return app


async def _post(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post("/api/v1/sso/registry-assertion")


async def test_assertion_signature_verifies_against_federation_key(
    monkeypatch, reset_settings, tmp_path,
) -> None:
    _ = reset_settings
    _configure(monkeypatch, tmp_path)
    vault = SimpleNamespace(display_name="Aspasia of the Hearth")
    db = _FakeSession([_Result([vault])])

    response = await _post(_make_app(db))

    assert response.status_code == 201, response.text
    body = response.json()
    assertion = body["assertion"]
    assert assertion["kind"] == "registry-sso"
    assert assertion["issuer_host"] == "theourgia.com"
    assert assertion["subject_did"] == "did:theourgia:theourgia.com"
    assert assertion["display_name"] == "Aspasia of the Hearth"
    assert assertion["audience"] == "plugins.theourgia.com"
    expires_at = datetime.fromisoformat(assertion["expires_at"])
    assert expires_at > datetime.now(tz=UTC)
    assert "BEGIN PUBLIC KEY" in assertion["public_key_pem"]
    assert body["registry_sso_url"] == (
        "https://plugins.theourgia.com/api/v1/auth/sso-session"
    )

    # Verify EXACTLY as the registry does: the published federation
    # public key over the canonical assertion bytes.
    public_key = serialization.load_pem_public_key(
        (tmp_path / "fed.pub").read_bytes(),
    )
    public_key.verify(
        base64.b64decode(body["signature_b64"]),
        canonical_attestation_bytes(assertion),
    )  # raises on failure

    # Audit row emitted.
    assert any(
        getattr(r, "action", "") == "sso.registry_assertion"
        for r in db.added
    )
    assert db.commits == 1


async def test_registry_unconfigured_is_503(
    monkeypatch, reset_settings, tmp_path,
) -> None:
    _ = reset_settings
    _configure(monkeypatch, tmp_path)
    monkeypatch.delenv("THEOURGIA_REGISTRY_URL")
    db = _FakeSession([])

    response = await _post(_make_app(db))

    assert response.status_code == 503
    assert "registry not configured" in response.json()["detail"].lower()


async def test_author_identity_unconfigured_is_503(
    monkeypatch, reset_settings, tmp_path,
) -> None:
    _ = reset_settings
    _configure(monkeypatch, tmp_path)
    monkeypatch.delenv("THEOURGIA_AUTHOR_DID")
    db = _FakeSession([])

    response = await _post(_make_app(db))

    assert response.status_code == 503
    assert "author identity" in response.json()["detail"]


async def test_assertion_without_author_key_omits_pem(
    monkeypatch, reset_settings, tmp_path,
) -> None:
    """No configured author signing key → the assertion simply doesn't
    carry public_key_pem (SSO still works; key bootstrap is skipped)."""
    _ = reset_settings
    _configure(monkeypatch, tmp_path, with_author_key=False)
    db = _FakeSession([_Result([])])  # user owns no vault yet

    response = await _post(_make_app(db))

    assert response.status_code == 201, response.text
    assertion = response.json()["assertion"]
    assert "public_key_pem" not in assertion
    # display_name falls back to the author DID when no vault exists.
    assert assertion["display_name"] == "did:theourgia:theourgia.com"
