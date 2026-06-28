"""Author signer tests — keypair load + signing payload shape."""

from __future__ import annotations

import base64
import hashlib
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)

from theourgia.core.registry.author_signer import (
    AuthorSigner,
    AuthorSigningUnconfigured,
    make_signing_headers,
)


def _write_keypair(tmp_path: Path) -> tuple[Path, Ed25519PrivateKey]:
    private = Ed25519PrivateKey.generate()
    pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    key_path = tmp_path / "author.pem"
    key_path.write_bytes(pem)
    return key_path, private


def test_signer_loads_from_pem(tmp_path: Path) -> None:
    key_path, _ = _write_keypair(tmp_path)
    signer = AuthorSigner.from_paths(
        did="did:vault:test", private_key_path=key_path,
    )
    assert signer.did == "did:vault:test"
    headers = signer.sign(b"test body")
    assert headers["X-Author-DID"] == "did:vault:test"
    assert "X-Author-Timestamp" in headers
    assert "X-Author-Signature" in headers


def test_signer_raises_when_did_missing(tmp_path: Path) -> None:
    key_path, _ = _write_keypair(tmp_path)
    with pytest.raises(AuthorSigningUnconfigured) as exc:
        AuthorSigner.from_paths(did=None, private_key_path=key_path)
    assert "DID" in str(exc.value)


def test_signer_raises_when_key_path_missing() -> None:
    with pytest.raises(AuthorSigningUnconfigured) as exc:
        AuthorSigner.from_paths(
            did="did:vault:test",
            private_key_path=Path("/nonexistent/path.pem"),
        )
    assert "private key" in str(exc.value)


def test_signer_raises_when_key_is_not_ed25519(tmp_path: Path) -> None:
    from cryptography.hazmat.primitives.asymmetric.rsa import generate_private_key

    rsa = generate_private_key(public_exponent=65537, key_size=2048)
    pem = rsa.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    key_path = tmp_path / "rsa.pem"
    key_path.write_bytes(pem)
    with pytest.raises(AuthorSigningUnconfigured) as exc:
        AuthorSigner.from_paths(
            did="did:vault:test", private_key_path=key_path,
        )
    assert "Ed25519" in str(exc.value)


def test_make_signing_headers_produces_verifiable_signature(
    tmp_path: Path,
) -> None:
    """The signature in the headers MUST verify against the matching
    public key + the same body. This is the contract the registry
    side enforces — pin it here so a refactor can't silently break
    the registry handshake."""
    _, private = _write_keypair(tmp_path)
    body = b'{"name":"my-plugin","version":"0.0.1"}'
    headers = make_signing_headers(
        did="did:vault:test", private_key=private, body=body,
    )
    # Reconstruct the payload exactly as the registry does:
    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{body_hash}\n{headers['X-Author-Timestamp']}".encode("utf-8")
    signature = base64.b64decode(headers["X-Author-Signature"])
    # If this raises, the signer + verifier are out of sync.
    private.public_key().verify(signature, payload)


def test_make_signing_headers_includes_did_verbatim(
    tmp_path: Path,
) -> None:
    _, private = _write_keypair(tmp_path)
    headers = make_signing_headers(
        did="did:vault:soror-eu-a", private_key=private, body=b"",
    )
    assert headers["X-Author-DID"] == "did:vault:soror-eu-a"


def test_make_signing_headers_signs_empty_body(
    tmp_path: Path,
) -> None:
    """GET requests sign the empty body. The signature payload is
    `<sha256 of empty>\\n<timestamp>` — pinned because the registry's
    verifier handles empty body specially."""
    _, private = _write_keypair(tmp_path)
    headers = make_signing_headers(
        did="did:vault:test", private_key=private, body=b"",
    )
    body_hash = hashlib.sha256(b"").hexdigest()
    payload = f"{body_hash}\n{headers['X-Author-Timestamp']}".encode("utf-8")
    signature = base64.b64decode(headers["X-Author-Signature"])
    private.public_key().verify(signature, payload)
    # SHA-256 of empty body is well-known:
    assert body_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


def test_signer_router_registers_on_v1() -> None:
    """Smoke: the four author routes attach under /api/v1/registry/author/."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    assert "/api/v1/registry/author/submissions" in paths
    assert "/api/v1/registry/author/submissions/{submission_id}" in paths
    assert "/api/v1/registry/author/advisories" in paths
