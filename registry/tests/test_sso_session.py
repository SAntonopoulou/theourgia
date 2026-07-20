"""SSO bridge tests — v1-032.

The registry trusts a vault-signed assertion. Covers the verification
chain (trusted host → audience → expiry → signature), the author
upsert semantics (first-key caching, never overwrite), and the session
token round trip.
"""

from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta
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
from theourgia_registry.api.deps import get_db_session
from theourgia_registry.api.routers.sso import get_actor_fetcher
from theourgia_registry.core.config import get_settings
from theourgia_registry.core.sso import (
    SsoVerificationError,
    canonical_assertion_bytes,
    mint_session_token,
    verify_session_token,
)

# ── fakes ───────────────────────────────────────────────────────────


class _Result:
    def __init__(self, *, scalar: Any = None) -> None:
        self._scalar = scalar

    def scalar_one_or_none(self) -> Any:
        return self._scalar


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


def _vault_keypair() -> tuple[Ed25519PrivateKey, str]:
    """A federation keypair + the actor-doc public_key form (URL-safe
    base64, no padding — matching the vault's serialize_public_key)."""
    private = Ed25519PrivateKey.generate()
    raw = private.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    return private, b64


def _assertion(**overrides: Any) -> dict[str, Any]:
    settings = get_settings()
    assertion: dict[str, Any] = {
        "kind": "registry-sso",
        "issuer_host": settings.trusted_vault_hosts[0],
        "subject_did": "did:theourgia:hearth/aspasia",
        "display_name": "Soror A.",
        "audience": settings.instance_id,
        "expires_at": (
            datetime.now(tz=UTC) + timedelta(minutes=15)
        ).isoformat(),
    }
    assertion.update(overrides)
    return assertion


def _sign(private: Ed25519PrivateKey, assertion: dict[str, Any]) -> str:
    signature = private.sign(canonical_assertion_bytes(assertion))
    return base64.b64encode(signature).decode("ascii")


def _app_with(
    db: _FakeSession,
    *,
    actor_key_b64: str | None,
    fetch_calls: list[str] | None = None,
):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db

    async def _fetch(host: str) -> dict[str, Any]:
        if fetch_calls is not None:
            fetch_calls.append(host)
        return {"public_key": actor_key_b64 or ""}

    app.dependency_overrides[get_actor_fetcher] = lambda: _fetch
    return app


async def _post(app, assertion: dict[str, Any], signature_b64: str):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post(
            "/api/v1/auth/sso-session",
            json={"assertion": assertion, "signature_b64": signature_b64},
        )


# ── endpoint ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_valid_assertion_creates_author_and_session() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion(public_key_pem="-----BEGIN PUBLIC KEY-----\nMCow...\n-----END PUBLIC KEY-----")
    db = _FakeSession([_Result(scalar=None)])  # author unknown → create
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, _sign(private, assertion))

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["author_did"] == assertion["subject_did"]
    assert body["display_name"] == "Soror A."
    assert db.commits == 1
    created = db.added[0]
    assert created.did == assertion["subject_did"]
    assert created.public_key_pem is not None

    # The returned token verifies with the registry's own secret.
    payload = verify_session_token(
        secret=get_settings().session_secret.get_secret_value(),
        token=body["session_token"],
    )
    assert payload["did"] == assertion["subject_did"]


@pytest.mark.asyncio
async def test_bad_signature_is_401() -> None:
    _private, actor_key = _vault_keypair()
    other_private, _ = _vault_keypair()
    assertion = _assertion()
    db = _FakeSession([])
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, _sign(other_private, assertion))

    assert response.status_code == 401
    assert "signature" in response.json()["detail"]
    assert db.added == []


@pytest.mark.asyncio
async def test_tampered_assertion_is_401() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion()
    signature = _sign(private, assertion)
    assertion["subject_did"] = "did:theourgia:hearth/mallory"
    db = _FakeSession([])
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, signature)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_untrusted_issuer_is_403_and_never_fetched() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion(issuer_host="evil.example.com")
    fetch_calls: list[str] = []
    db = _FakeSession([])
    app = _app_with(db, actor_key_b64=actor_key, fetch_calls=fetch_calls)

    response = await _post(app, assertion, _sign(private, assertion))

    assert response.status_code == 403
    assert fetch_calls == [], "untrusted issuer must not trigger a fetch"


@pytest.mark.asyncio
async def test_expired_assertion_is_401() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion(
        expires_at=(datetime.now(tz=UTC) - timedelta(minutes=1)).isoformat(),
    )
    db = _FakeSession([])
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, _sign(private, assertion))

    assert response.status_code == 401
    assert "expired" in response.json()["detail"]


@pytest.mark.asyncio
async def test_wrong_audience_is_401() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion(audience="some-other-registry.example.com")
    db = _FakeSession([])
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, _sign(private, assertion))

    assert response.status_code == 401
    assert "audience" in response.json()["detail"]


@pytest.mark.asyncio
async def test_existing_author_key_is_never_overwritten() -> None:
    private, actor_key = _vault_keypair()
    assertion = _assertion(
        public_key_pem="-----BEGIN PUBLIC KEY-----\nnew\n-----END PUBLIC KEY-----",
    )
    existing = SimpleNamespace(
        id=uuid4(),
        did=assertion["subject_did"],
        display_name="Aspasia",
        public_key_pem="-----BEGIN PUBLIC KEY-----\noriginal\n-----END PUBLIC KEY-----",
    )
    db = _FakeSession([_Result(scalar=existing)])
    app = _app_with(db, actor_key_b64=actor_key)

    response = await _post(app, assertion, _sign(private, assertion))

    assert response.status_code == 201
    assert "original" in existing.public_key_pem
    assert db.added == []  # no re-add — key untouched


# ── token unit tests ────────────────────────────────────────────────


def test_session_token_round_trip() -> None:
    token, expires_at = mint_session_token(
        secret="s3cret", author_did="did:theourgia:x", ttl=timedelta(hours=1),
    )
    payload = verify_session_token(secret="s3cret", token=token)
    assert payload["did"] == "did:theourgia:x"
    assert expires_at > datetime.now(tz=UTC)


def test_session_token_tamper_is_rejected() -> None:
    token, _ = mint_session_token(
        secret="s3cret", author_did="did:theourgia:x", ttl=timedelta(hours=1),
    )
    body, mac = token.rsplit(".", 1)
    forged = body + "x." + mac
    with pytest.raises(SsoVerificationError):
        verify_session_token(secret="s3cret", token=forged)


def test_session_token_wrong_secret_is_rejected() -> None:
    token, _ = mint_session_token(
        secret="s3cret", author_did="did:theourgia:x", ttl=timedelta(hours=1),
    )
    with pytest.raises(SsoVerificationError):
        verify_session_token(secret="other", token=token)


def test_session_token_expiry_is_enforced() -> None:
    token, _ = mint_session_token(
        secret="s3cret",
        author_did="did:theourgia:x",
        ttl=timedelta(hours=1),
        now=datetime(2026, 7, 20, 12, 0, tzinfo=UTC),
    )
    with pytest.raises(SsoVerificationError):
        verify_session_token(
            secret="s3cret",
            token=token,
            now=datetime(2026, 7, 20, 14, 0, tzinfo=UTC),
        )
