"""Tests for capability tokens (EdDSA-signed JWTs)."""

from __future__ import annotations

import time

import pytest

from theourgia.core.federation.capability_tokens import (
    DEFAULT_TTL_SECONDS,
    CapabilityToken,
    InvalidCapabilityTokenError,
    issue_capability_token,
    verify_capability_token,
)
from theourgia.core.federation.keys import generate_keypair


_ISS = "did:theourgia:theourgia.com"
_SUB = "did:theourgia:theourgia.com:vault:soror-eu-a"
_AUD = "did:theourgia:lodge.example.org"


def test_issue_and_verify_round_trip() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read", "entry.write"],
    )
    decoded = verify_capability_token(token=token, public_key=kp.public_key)
    assert isinstance(decoded, CapabilityToken)
    assert decoded.iss == _ISS
    assert decoded.sub == _SUB
    assert decoded.aud == _AUD
    assert decoded.cap == ("entry.read", "entry.write")
    assert not decoded.is_expired


def test_token_has_jti() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    decoded = verify_capability_token(token=token, public_key=kp.public_key)
    # jti is a UUID; just verify it's set
    assert decoded.jti is not None


def test_each_issue_uses_fresh_jti() -> None:
    kp = generate_keypair()
    t1 = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    t2 = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    d1 = verify_capability_token(token=t1, public_key=kp.public_key)
    d2 = verify_capability_token(token=t2, public_key=kp.public_key)
    assert d1.jti != d2.jti


def test_verify_wrong_public_key_fails() -> None:
    kp_a = generate_keypair()
    kp_b = generate_keypair()
    token = issue_capability_token(
        private_key=kp_a.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    with pytest.raises(InvalidCapabilityTokenError, match="signature did not verify"):
        verify_capability_token(token=token, public_key=kp_b.public_key)


def test_verify_expired_token_fails() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
        ttl_seconds=1,
        issued_at=int(time.time()) - 3600,  # issued 1h ago, exp 1h - 1s ago
    )
    with pytest.raises(InvalidCapabilityTokenError, match="expired"):
        verify_capability_token(token=token, public_key=kp.public_key)


def test_verify_audience_mismatch_fails() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    with pytest.raises(InvalidCapabilityTokenError, match="audience mismatch"):
        verify_capability_token(
            token=token,
            public_key=kp.public_key,
            expected_audience="did:theourgia:other.example.com",
        )


def test_verify_issuer_mismatch_fails() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    with pytest.raises(InvalidCapabilityTokenError, match="issuer mismatch"):
        verify_capability_token(
            token=token,
            public_key=kp.public_key,
            expected_issuer="did:theourgia:elsewhere.example.org",
        )


def test_verify_required_capability_present() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read", "entry.write"],
    )
    # Both present → ok
    verify_capability_token(
        token=token, public_key=kp.public_key, required_capability="entry.read"
    )
    verify_capability_token(
        token=token, public_key=kp.public_key, required_capability="entry.write"
    )


def test_verify_required_capability_missing_fails() -> None:
    kp = generate_keypair()
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
    )
    with pytest.raises(InvalidCapabilityTokenError, match="lacks required capability"):
        verify_capability_token(
            token=token,
            public_key=kp.public_key,
            required_capability="entry.delete",
        )


def test_issue_rejects_empty_capabilities() -> None:
    kp = generate_keypair()
    with pytest.raises(ValueError, match="capabilities list must not be empty"):
        issue_capability_token(
            private_key=kp.private_key,
            issuer=_ISS,
            subject=_SUB,
            audience=_AUD,
            capabilities=[],
        )


def test_issue_rejects_zero_or_negative_ttl() -> None:
    kp = generate_keypair()
    for ttl in (0, -1):
        with pytest.raises(ValueError, match="positive"):
            issue_capability_token(
                private_key=kp.private_key,
                issuer=_ISS,
                subject=_SUB,
                audience=_AUD,
                capabilities=["entry.read"],
                ttl_seconds=ttl,
            )


def test_issue_rejects_absurd_ttl() -> None:
    kp = generate_keypair()
    with pytest.raises(ValueError, match="30 days"):
        issue_capability_token(
            private_key=kp.private_key,
            issuer=_ISS,
            subject=_SUB,
            audience=_AUD,
            capabilities=["entry.read"],
            ttl_seconds=60 * 60 * 24 * 31,
        )


def test_issue_rejects_invalid_did_issuer() -> None:
    kp = generate_keypair()
    with pytest.raises(Exception):
        issue_capability_token(
            private_key=kp.private_key,
            issuer="not-a-did",
            subject=_SUB,
            audience=_AUD,
            capabilities=["entry.read"],
        )


def test_default_ttl_is_one_hour() -> None:
    assert DEFAULT_TTL_SECONDS == 3600


def test_verify_empty_token_fails() -> None:
    kp = generate_keypair()
    with pytest.raises(InvalidCapabilityTokenError, match="must not be empty"):
        verify_capability_token(token="", public_key=kp.public_key)


def test_token_carries_iat_nbf_exp_relationship() -> None:
    kp = generate_keypair()
    now = int(time.time())
    token = issue_capability_token(
        private_key=kp.private_key,
        issuer=_ISS,
        subject=_SUB,
        audience=_AUD,
        capabilities=["entry.read"],
        ttl_seconds=600,
        issued_at=now,
    )
    decoded = verify_capability_token(token=token, public_key=kp.public_key)
    assert decoded.iat == now
    assert decoded.nbf == now
    assert decoded.exp == now + 600
