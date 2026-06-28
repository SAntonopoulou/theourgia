"""DID + Ed25519 signature verification tests."""

from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)

from theourgia_registry.core.did_auth import (
    REPLAY_WINDOW,
    AuthFailure,
    canonicalise_body,
    make_signing_payload,
    verify_request_signature,
)


def _make_keypair() -> tuple[Ed25519PrivateKey, str]:
    private = Ed25519PrivateKey.generate()
    public_pem = (
        private.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )
    return private, public_pem


def _sign(private: Ed25519PrivateKey, body: bytes, timestamp: str) -> str:
    payload = make_signing_payload(body=body, timestamp=timestamp)
    return base64.b64encode(private.sign(payload)).decode("ascii")


def test_canonicalise_body_returns_hex_sha256() -> None:
    h = canonicalise_body(b"some body bytes")
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_canonicalise_body_empty_is_well_known() -> None:
    assert canonicalise_body(b"") == (
        "e3b0c44298fc1c149afbf4c8996fb924"
        "27ae41e4649b934ca495991b7852b855"
    )


def test_make_signing_payload_format() -> None:
    payload = make_signing_payload(
        body=b"hello", timestamp="2026-06-28T12:00:00+00:00",
    )
    assert payload.decode("utf-8").endswith("\n2026-06-28T12:00:00+00:00")


def test_verify_round_trip_succeeds() -> None:
    private, public_pem = _make_keypair()
    body = b'{"name":"my-plugin"}'
    ts = "2026-06-28T12:00:00+00:00"
    sig = _sign(private, body, ts)
    verify_request_signature(
        did="did:vault:abc",
        timestamp=ts,
        signature_b64=sig,
        body=body,
        public_key_pem=public_pem,
        now=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
    )


def test_verify_rejects_tampered_body() -> None:
    private, public_pem = _make_keypair()
    body = b"original"
    ts = "2026-06-28T12:00:00+00:00"
    sig = _sign(private, body, ts)
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="did:vault:abc",
            timestamp=ts,
            signature_b64=sig,
            body=b"tampered",
            public_key_pem=public_pem,
            now=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
        )
    assert exc.value.status_code == 401
    assert "signature verification failed" in str(exc.value)


def test_verify_rejects_old_timestamp() -> None:
    private, public_pem = _make_keypair()
    body = b""
    ts = "2026-06-28T12:00:00+00:00"
    sig = _sign(private, body, ts)
    server_now = datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC) + REPLAY_WINDOW + timedelta(seconds=1)
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="did:vault:abc",
            timestamp=ts,
            signature_b64=sig,
            body=body,
            public_key_pem=public_pem,
            now=server_now,
        )
    assert "replay window" in str(exc.value)


def test_verify_rejects_future_timestamp() -> None:
    private, public_pem = _make_keypair()
    body = b""
    ts = "2026-06-28T13:00:00+00:00"  # 1 hour in the future from server now
    sig = _sign(private, body, ts)
    server_now = datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC)
    with pytest.raises(AuthFailure):
        verify_request_signature(
            did="did:vault:abc",
            timestamp=ts,
            signature_b64=sig,
            body=body,
            public_key_pem=public_pem,
            now=server_now,
        )


def test_verify_rejects_missing_did() -> None:
    private, public_pem = _make_keypair()
    body = b""
    ts = "2026-06-28T12:00:00+00:00"
    sig = _sign(private, body, ts)
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="",
            timestamp=ts,
            signature_b64=sig,
            body=body,
            public_key_pem=public_pem,
        )
    assert "X-Author-DID required" in str(exc.value)


def test_verify_rejects_naive_timestamp() -> None:
    private, public_pem = _make_keypair()
    body = b""
    ts = "2026-06-28T12:00:00"  # no offset
    sig = _sign(private, body, ts)
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="did:vault:abc",
            timestamp=ts,
            signature_b64=sig,
            body=body,
            public_key_pem=public_pem,
        )
    assert "UTC offset" in str(exc.value)


def test_verify_rejects_garbled_signature() -> None:
    _, public_pem = _make_keypair()
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="did:vault:abc",
            timestamp="2026-06-28T12:00:00+00:00",
            signature_b64="!!!not-base64!!!",
            body=b"",
            public_key_pem=public_pem,
            now=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
        )
    assert "base64" in str(exc.value)


def test_verify_rejects_garbled_public_key() -> None:
    private = Ed25519PrivateKey.generate()
    body = b""
    ts = "2026-06-28T12:00:00+00:00"
    sig = _sign(private, body, ts)
    with pytest.raises(AuthFailure) as exc:
        verify_request_signature(
            did="did:vault:abc",
            timestamp=ts,
            signature_b64=sig,
            body=body,
            public_key_pem="-----BEGIN PUBLIC KEY-----\nNOT A KEY\n-----END PUBLIC KEY-----",
            now=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
        )
    assert "unreadable" in str(exc.value)


def test_verify_rejects_z_suffix_correctly_parsed() -> None:
    """ISO 'Z' suffix should be accepted (per RFC 3339)."""
    private, public_pem = _make_keypair()
    ts = "2026-06-28T12:00:00Z"
    body = b""
    sig = _sign(private, body, ts)
    verify_request_signature(
        did="did:vault:abc",
        timestamp=ts,
        signature_b64=sig,
        body=body,
        public_key_pem=public_pem,
        now=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
    )
