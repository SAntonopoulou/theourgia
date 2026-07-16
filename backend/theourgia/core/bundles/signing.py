"""MBF signing + verification — ADR-0011 ``signature.json``.

The signature is Ed25519 over the SHA-256 of the canonical JSON
(sorted keys, no whitespace) of ``digest_manifest`` — the map of
every non-signature file in the container to its sha256.

Verification recomputes every file digest, compares to
``digest_manifest``, verifies the Ed25519 signature, then compares
the signing key against the manifest author's key when one is
declared. Every outcome is a verdict:

- ``verified`` — coverage complete, digests match, signature valid
- ``unsigned`` — no ``signature.json``; import proceeds with a
  visible warning (FEATURES §11: warn, don't block) — NEVER an
  exception
- ``failed`` — anything else, with a human-readable reason

Crypto primitives come from the federation substrate — no duplicate
Ed25519 code paths.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import io
import zipfile
from dataclasses import dataclass

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from theourgia.core.bundles.canonical import canonical_json_bytes, sha256_hex
from theourgia.core.bundles.container import (
    SIGNATURE_PATH,
    ParsedBundle,
)
from theourgia.core.federation.keys import (
    deserialize_public_key,
    serialize_public_key,
)
from theourgia.core.federation.signing import sign_bytes, verify_signature

__all__ = [
    "VERDICT_FAILED",
    "VERDICT_UNSIGNED",
    "VERDICT_VERIFIED",
    "BundleVerification",
    "sign_container",
    "verify_container",
]


VERDICT_VERIFIED = "verified"
VERDICT_UNSIGNED = "unsigned"
VERDICT_FAILED = "failed"


@dataclass(frozen=True, slots=True)
class BundleVerification:
    """The signature verdict for one container."""

    verdict: str
    reason: str = ""


def _b64decode_any(value: str) -> bytes:
    """Decode standard or URL-safe base64, padded or not.

    ``urlsafe_b64decode`` only *translates* ``-_`` to ``+/`` before
    decoding, so both alphabets pass through one call once padding is
    restored.
    """
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def sign_container(data: bytes, private_key: Ed25519PrivateKey) -> bytes:
    """Return a signed copy of the ``.mbf`` container.

    Any existing ``signature.json`` is replaced. The digest manifest
    covers every other file in the container.
    """
    source = zipfile.ZipFile(io.BytesIO(data))
    digest_manifest: dict[str, str] = {}
    members: list[tuple[str, bytes]] = []
    with source:
        for name in source.namelist():
            if name == SIGNATURE_PATH or name.endswith("/"):
                continue
            raw = source.read(name)
            digest_manifest[name] = sha256_hex(raw)
            members.append((name, raw))

    message = hashlib.sha256(canonical_json_bytes(digest_manifest)).digest()
    signature = sign_bytes(private_key, message)
    block = {
        "algorithm": "ed25519",
        "public_key": serialize_public_key(private_key.public_key()),
        "signed_digest": base64.b64encode(signature).decode("ascii"),
        "digest_manifest": digest_manifest,
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, raw in members:
            archive.writestr(name, raw)
        archive.writestr(SIGNATURE_PATH, canonical_json_bytes(block))
    return buffer.getvalue()


def verify_container(parsed: ParsedBundle) -> BundleVerification:
    """Verify a parsed container's signature. Never raises."""
    signature = parsed.signature
    if signature is None:
        return BundleVerification(
            verdict=VERDICT_UNSIGNED,
            reason="no signature.json in container",
        )

    if set(signature.digest_manifest) != set(parsed.file_digests):
        return BundleVerification(
            verdict=VERDICT_FAILED,
            reason="signature does not cover exactly the container's files",
        )
    for name, digest in signature.digest_manifest.items():
        if parsed.file_digests[name] != digest:
            return BundleVerification(
                verdict=VERDICT_FAILED,
                reason=f"digest mismatch for {name}",
            )

    try:
        public_key = deserialize_public_key(signature.public_key)
        raw_signature = _b64decode_any(signature.signed_digest)
    except (ValueError, binascii.Error):
        return BundleVerification(
            verdict=VERDICT_FAILED,
            reason="malformed public key or signature encoding",
        )

    message = hashlib.sha256(
        canonical_json_bytes(signature.digest_manifest)
    ).digest()
    if not verify_signature(public_key, message, raw_signature):
        return BundleVerification(
            verdict=VERDICT_FAILED,
            reason="Ed25519 signature verification failed",
        )

    author_key = parsed.manifest.author.public_key
    if author_key:
        try:
            author_raw = deserialize_public_key(author_key).public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw,
            )
        except (ValueError, binascii.Error):
            return BundleVerification(
                verdict=VERDICT_FAILED,
                reason="manifest author public key is malformed",
            )
        signer_raw = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        if author_raw != signer_raw:
            return BundleVerification(
                verdict=VERDICT_FAILED,
                reason="signing key does not match the manifest author key",
            )

    return BundleVerification(verdict=VERDICT_VERIFIED)
