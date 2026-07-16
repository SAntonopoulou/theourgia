"""MBF signing + verification verdicts — v1-011.

ADR-0011 / FEATURES §11: sign → verify round-trips; tampering →
verdict ``failed``; absent signature → verdict ``unsigned`` and the
preview still succeeds (the warn-not-block regression guard).
"""

from __future__ import annotations

import io
import json
import zipfile

from tests.mbf_fixtures import _FakeSession, _FakeUpload, _Result, _user, make_bundle
from theourgia.api.routers.v1.bundles import preview_bundle
from theourgia.core.bundles.canonical import canonical_json_bytes, sha256_hex
from theourgia.core.bundles.container import (
    MANIFEST_PATH,
    SIGNATURE_PATH,
    read_mbf,
)
from theourgia.core.bundles.signing import (
    VERDICT_FAILED,
    VERDICT_UNSIGNED,
    VERDICT_VERIFIED,
    sign_container,
    verify_container,
)
from theourgia.core.federation.keys import (
    generate_keypair,
    serialize_public_key,
)


def test_sign_then_verify_ok() -> None:
    keypair = generate_keypair()
    signed = sign_container(make_bundle(), keypair.private_key)
    parsed = read_mbf(signed)
    assert parsed.signature is not None
    verdict = verify_container(parsed)
    assert verdict.verdict == VERDICT_VERIFIED
    assert verdict.reason == ""


def test_unsigned_is_a_verdict_not_an_exception() -> None:
    parsed = read_mbf(make_bundle())
    verdict = verify_container(parsed)
    assert verdict.verdict == VERDICT_UNSIGNED
    assert "signature.json" in verdict.reason


def test_tampered_payload_fails_verification() -> None:
    """Tamper the payload AND keep the manifest consistent (so the
    container reads cleanly) — only the signature can catch it."""
    keypair = generate_keypair()
    signed = sign_container(make_bundle(), keypair.private_key)

    source = zipfile.ZipFile(io.BytesIO(signed))
    with source:
        manifest = json.loads(source.read(MANIFEST_PATH))
        members = {n: source.read(n) for n in source.namelist()}

    tampered_payload = canonical_json_bytes(
        {"kind": "entities", "items": [{"ref": "mallory", "name": "Mallory"}]}
    )
    manifest["payloads"][0]["sha256"] = sha256_hex(tampered_payload)
    manifest["payloads"][0]["count"] = 1
    members["payloads/entities.json"] = tampered_payload
    members[MANIFEST_PATH] = canonical_json_bytes(manifest)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as out:
        for name, raw in members.items():
            out.writestr(name, raw)

    parsed = read_mbf(buffer.getvalue())
    verdict = verify_container(parsed)
    assert verdict.verdict == VERDICT_FAILED
    assert "digest mismatch" in verdict.reason


def test_signature_must_cover_every_file() -> None:
    keypair = generate_keypair()
    signed = sign_container(make_bundle(), keypair.private_key)

    source = zipfile.ZipFile(io.BytesIO(signed))
    with source:
        signature = json.loads(source.read(SIGNATURE_PATH))
        members = {n: source.read(n) for n in source.namelist()}
    del signature["digest_manifest"]["payloads/entities.json"]
    members[SIGNATURE_PATH] = canonical_json_bytes(signature)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as out:
        for name, raw in members.items():
            out.writestr(name, raw)

    verdict = verify_container(read_mbf(buffer.getvalue()))
    assert verdict.verdict == VERDICT_FAILED
    assert "cover" in verdict.reason


def test_author_key_mismatch_fails() -> None:
    signer = generate_keypair()
    other = generate_keypair()
    data = make_bundle(
        manifest_over={
            "author": {
                "name": "Soror Test",
                "public_key": serialize_public_key(other.public_key),
            },
        },
    )
    signed = sign_container(data, signer.private_key)
    verdict = verify_container(read_mbf(signed))
    assert verdict.verdict == VERDICT_FAILED
    assert "author key" in verdict.reason


def test_author_key_match_verifies() -> None:
    keypair = generate_keypair()
    data = make_bundle(
        manifest_over={
            "author": {
                "name": "Soror Test",
                "public_key": serialize_public_key(keypair.public_key),
            },
        },
    )
    signed = sign_container(data, keypair.private_key)
    assert verify_container(read_mbf(signed)).verdict == VERDICT_VERIFIED


def test_resigning_replaces_existing_signature() -> None:
    first = generate_keypair()
    second = generate_keypair()
    signed_twice = sign_container(
        sign_container(make_bundle(), first.private_key),
        second.private_key,
    )
    with zipfile.ZipFile(io.BytesIO(signed_twice)) as archive:
        assert archive.namelist().count(SIGNATURE_PATH) == 1
    assert verify_container(read_mbf(signed_twice)).verdict == VERDICT_VERIFIED


# ── Warn-not-block regression guard ───────────────────────────────


async def test_preview_succeeds_for_unsigned_bundle() -> None:
    """FEATURES §11: unsigned bundles warn, never block. The preview
    handler must complete and carry the visible warning."""
    session = _FakeSession(
        [
            _Result(scalar=None),  # closed-tradition setting
            _Result(rows=[]),  # entity name conflicts
            _Result(rows=[]),  # installed bundle by slug
        ]
    )
    response = await preview_bundle(
        _user(),
        session,  # type: ignore[arg-type]
        _FakeUpload(make_bundle()),  # type: ignore[arg-type]
    )
    assert response.signature.verdict == VERDICT_UNSIGNED
    assert response.unsigned_warning is not None
    assert "never blocked" in response.unsigned_warning
    assert [item.ref for item in response.items] == ["hekate", "hermes"]
