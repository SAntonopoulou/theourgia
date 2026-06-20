"""Tests for HTTP message signatures (focused RFC 9421 subset)."""

from __future__ import annotations

import time

import pytest

from theourgia.core.federation.http_signatures import (
    DEFAULT_COMPONENTS,
    HTTPSignatureError,
    SignedRequestComponents,
    build_signature_base,
    content_digest_header,
    sign_request,
    verify_request,
)
from theourgia.core.federation.keys import generate_keypair


_KEYID = "did:theourgia:theourgia.com"


def _basic_components() -> SignedRequestComponents:
    return SignedRequestComponents(
        method="GET",
        path="/api/v1/meta",
        headers={"Host": "theourgia.com"},
        components=DEFAULT_COMPONENTS,
    )


def test_sign_and_verify_round_trip() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    created = int(time.time())
    signed = sign_request(
        private_key=kp.private_key, keyid=_KEYID, components=comps, created=created
    )

    # The verifier needs the request's headers + signature headers
    headers = {**comps.headers, **signed}
    verify_request(
        public_key=kp.public_key,
        method=comps.method,
        path=comps.path,
        headers=headers,
        now=created,
    )


def test_sign_emits_signature_input_and_signature() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    assert "Signature-Input" in signed
    assert "Signature" in signed
    assert signed["Signature-Input"].startswith("sig=(")
    assert signed["Signature"].startswith("sig=:") and signed["Signature"].endswith(":")
    assert _KEYID in signed["Signature-Input"]
    assert 'alg="ed25519"' in signed["Signature-Input"]


def test_sign_adds_date_header_if_absent() -> None:
    kp = generate_keypair()
    comps = SignedRequestComponents(
        method="GET",
        path="/healthz",
        headers={"Host": "theourgia.com"},
        components=DEFAULT_COMPONENTS,
    )
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    assert "Date" in signed


def test_verify_rejects_tampered_path() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="did not verify"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path="/api/v1/something-else",  # tampered
            headers=headers,
        )


def test_verify_rejects_tampered_method() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="did not verify"):
        verify_request(
            public_key=kp.public_key,
            method="POST",
            path=comps.path,
            headers=headers,
        )


def test_verify_rejects_tampered_host() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}
    headers["Host"] = "evil.example.com"

    with pytest.raises(HTTPSignatureError, match="did not verify"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
        )


def test_verify_rejects_wrong_public_key() -> None:
    kp_a = generate_keypair()
    kp_b = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp_a.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="did not verify"):
        verify_request(
            public_key=kp_b.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
        )


def test_verify_rejects_unsupported_algorithm() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}
    # Replace alg in the Signature-Input
    headers["Signature-Input"] = headers["Signature-Input"].replace(
        'alg="ed25519"', 'alg="rsa-pss-sha512"'
    )

    with pytest.raises(HTTPSignatureError, match="unsupported algorithm"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
        )


def test_verify_rejects_too_old_signature() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    old_created = int(time.time()) - 3600  # 1 hour ago
    signed = sign_request(
        private_key=kp.private_key, keyid=_KEYID, components=comps, created=old_created
    )
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="too old"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
        )


def test_verify_rejects_future_signature() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    future_created = int(time.time()) + 600  # 10 min in future
    signed = sign_request(
        private_key=kp.private_key, keyid=_KEYID, components=comps, created=future_created
    )
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="too far in the future"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
        )


def test_verify_keyid_mismatch_raises() -> None:
    kp = generate_keypair()
    comps = _basic_components()
    signed = sign_request(private_key=kp.private_key, keyid=_KEYID, components=comps)
    headers = {**comps.headers, **signed}

    with pytest.raises(HTTPSignatureError, match="keyid mismatch"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=headers,
            expected_keyid="did:theourgia:other.example.com",
        )


def test_verify_missing_signature_headers_raises() -> None:
    kp = generate_keypair()
    with pytest.raises(HTTPSignatureError, match="missing"):
        verify_request(
            public_key=kp.public_key,
            method="GET",
            path="/x",
            headers={"Host": "theourgia.com"},  # no signature headers
        )


def test_verify_malformed_signature_input_raises() -> None:
    kp = generate_keypair()
    with pytest.raises(HTTPSignatureError, match="malformed"):
        verify_request(
            public_key=kp.public_key,
            method="GET",
            path="/x",
            headers={
                "Host": "theourgia.com",
                "Signature-Input": "this is not the right shape",
                "Signature": "sig=:Zm9v:",
            },
        )


def test_signature_base_includes_all_components() -> None:
    base = build_signature_base(
        method="POST",
        path="/api/v1/foo",
        headers={"host": "theourgia.com", "date": "Sat, 20 Jun 2026 12:00:00 GMT"},
        components=("@method", "@path", "host", "date"),
        created=1_700_000_000,
        keyid=_KEYID,
    )
    text = base.decode("ascii")
    assert '"@method": POST' in text
    assert '"@path": /api/v1/foo' in text
    assert '"host": theourgia.com' in text
    assert '"date": Sat, 20 Jun 2026 12:00:00 GMT' in text
    assert '"@signature-params":' in text
    assert "keyid=" in text
    assert "alg=" in text


def test_signature_base_rejects_unsupported_derived_component() -> None:
    with pytest.raises(HTTPSignatureError, match="unsupported derived component"):
        build_signature_base(
            method="GET",
            path="/x",
            headers={},
            components=("@authority",),
            created=1,
            keyid=_KEYID,
        )


def test_signature_base_requires_referenced_header() -> None:
    with pytest.raises(HTTPSignatureError, match="missing required header"):
        build_signature_base(
            method="GET",
            path="/x",
            headers={"host": "theourgia.com"},  # missing 'date'
            components=("@method", "host", "date"),
            created=1,
            keyid=_KEYID,
        )


def test_content_digest_round_trip() -> None:
    """Body bytes → SHA-256 → base64-wrapped header form."""
    body = b"some body content"
    header = content_digest_header(body)
    assert header.startswith("sha-256=:")
    assert header.endswith(":")
    # Idempotent
    assert content_digest_header(body) == header


def test_body_signature_round_trip_with_content_digest() -> None:
    kp = generate_keypair()
    body = b'{"hello": "world"}'
    digest = content_digest_header(body)
    headers = {"Host": "theourgia.com", "Content-Digest": digest}
    comps = SignedRequestComponents(
        method="POST",
        path="/api/v1/echo",
        headers=headers,
        components=("@method", "@path", "host", "date", "content-digest"),
    )
    created = int(time.time())
    signed = sign_request(
        private_key=kp.private_key, keyid=_KEYID, components=comps, created=created
    )
    full_headers = {**headers, **signed}

    verify_request(
        public_key=kp.public_key,
        method=comps.method,
        path=comps.path,
        headers=full_headers,
        now=created,
    )

    # Tampering with the body would change Content-Digest and break verification
    bad_digest = content_digest_header(b'{"tampered": true}')
    full_headers["Content-Digest"] = bad_digest
    with pytest.raises(HTTPSignatureError, match="did not verify"):
        verify_request(
            public_key=kp.public_key,
            method=comps.method,
            path=comps.path,
            headers=full_headers,
            now=created,
        )
