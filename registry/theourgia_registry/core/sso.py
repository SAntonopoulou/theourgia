"""SSO bridge verification — the registry trusts a vault-signed assertion.

Trust model (v1-032, minimal single-trusted-host v1):

  1. The magician authenticates against their own vault (theourgia.com).
  2. The vault mints a short-lived **registry SSO assertion** — a JSON
     payload signed with the vault's *federation* Ed25519 keypair (the
     same key it publishes at ``/.well-known/theourgia/actor``).
  3. The registry accepts the assertion only when:
       * the ``issuer_host`` is on the configured trusted-host list,
       * the ``audience`` names THIS registry instance,
       * the assertion has not expired,
       * the Ed25519 signature verifies against the public key fetched
         from the issuer's well-known actor document.
  4. On success the registry maps the assertion's ``subject_did`` to an
     Author row (creating it on first sight) and issues an HMAC-signed
     session token bound to that DID.

The canonical byte form is compact JSON with sorted keys — identical
to the vault's ``canonical_attestation_bytes`` — so both sides sign
and verify the same bytes without a canonicalisation library.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

__all__ = [
    "ASSERTION_KIND",
    "SsoVerificationError",
    "canonical_assertion_bytes",
    "decode_actor_public_key",
    "mint_session_token",
    "verify_session_token",
    "verify_sso_assertion",
]


ASSERTION_KIND = "registry-sso"

_REQUIRED_FIELDS = ("kind", "issuer_host", "subject_did", "audience", "expires_at")


class SsoVerificationError(Exception):
    """Assertion failed verification. Carries the HTTP status code."""

    def __init__(self, *, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


def canonical_assertion_bytes(assertion: dict[str, Any]) -> bytes:
    """Compact sorted-key JSON bytes — matches the vault's
    ``canonical_attestation_bytes``."""
    return json.dumps(
        assertion,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def decode_actor_public_key(value: str) -> Ed25519PublicKey:
    """Decode the actor document's ``public_key`` field.

    The vault publishes the raw 32-byte Ed25519 key as URL-safe base64
    without padding. Raises :class:`SsoVerificationError` on garbage.
    """
    try:
        padded = value + "=" * (-len(value) % 4)
        raw = base64.urlsafe_b64decode(padded)
        return Ed25519PublicKey.from_public_bytes(raw)
    except Exception as exc:
        raise SsoVerificationError(
            status_code=502,
            message="issuer actor document carries an unreadable public key",
        ) from exc


def _parse_iso8601(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def verify_sso_assertion(
    *,
    assertion: dict[str, Any],
    signature_b64: str,
    issuer_public_key: Ed25519PublicKey,
    trusted_hosts: list[str],
    expected_audience: str,
    now: datetime | None = None,
) -> None:
    """Verify a vault-signed SSO assertion or raise SsoVerificationError.

    Checks, in order: shape → trusted issuer → audience → expiry →
    signature. The issuer/audience checks run BEFORE the signature so a
    valid signature from an untrusted host still reads as 403.
    """
    for field in _REQUIRED_FIELDS:
        if not assertion.get(field):
            raise SsoVerificationError(
                status_code=400,
                message=f"assertion is missing required field {field!r}",
            )

    if assertion["kind"] != ASSERTION_KIND:
        raise SsoVerificationError(
            status_code=400,
            message=f"assertion kind must be {ASSERTION_KIND!r}",
        )

    if assertion["issuer_host"] not in trusted_hosts:
        raise SsoVerificationError(
            status_code=403,
            message=(
                f"issuer {assertion['issuer_host']!r} is not on this "
                "registry's trusted vault-host list"
            ),
        )

    if assertion["audience"] != expected_audience:
        raise SsoVerificationError(
            status_code=401,
            message="assertion audience does not name this registry",
        )

    try:
        expires_at = _parse_iso8601(str(assertion["expires_at"]))
    except ValueError as exc:
        raise SsoVerificationError(
            status_code=400,
            message="expires_at must be ISO-8601",
        ) from exc
    if expires_at.tzinfo is None:
        raise SsoVerificationError(
            status_code=400,
            message="expires_at must carry a UTC offset",
        )
    server_now = now or datetime.now(tz=UTC)
    if expires_at <= server_now:
        raise SsoVerificationError(
            status_code=401, message="assertion has expired",
        )

    try:
        signature = base64.b64decode(signature_b64)
    except Exception as exc:
        raise SsoVerificationError(
            status_code=401, message="signature is not valid base64",
        ) from exc

    try:
        issuer_public_key.verify(signature, canonical_assertion_bytes(assertion))
    except Exception as exc:
        raise SsoVerificationError(
            status_code=401, message="assertion signature verification failed",
        ) from exc


# ── Session tokens ──────────────────────────────────────────────────
#
# Format: base64url(payload-json) + "." + hex(hmac-sha256(secret, b64)).
# Stateless — nothing to store; revocation happens by rotating the
# session secret (acceptable for the v1 author-session scope).


def mint_session_token(
    *,
    secret: str,
    author_did: str,
    ttl: timedelta,
    now: datetime | None = None,
) -> tuple[str, datetime]:
    """Return ``(token, expires_at)`` for an authorized author session."""
    issued = now or datetime.now(tz=UTC)
    expires_at = issued + ttl
    payload = {
        "did": author_did,
        "iat": issued.isoformat(),
        "exp": expires_at.isoformat(),
    }
    body = base64.urlsafe_b64encode(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8"),
    ).decode("ascii").rstrip("=")
    mac = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256)
    return f"{body}.{mac.hexdigest()}", expires_at


def verify_session_token(
    *,
    secret: str,
    token: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return the payload of a valid session token or raise
    :class:`SsoVerificationError` (401)."""
    try:
        body, mac_hex = token.rsplit(".", 1)
    except ValueError as exc:
        raise SsoVerificationError(
            status_code=401, message="malformed session token",
        ) from exc
    expected = hmac.new(
        secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, mac_hex):
        raise SsoVerificationError(
            status_code=401, message="session token signature mismatch",
        )
    try:
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        expires_at = _parse_iso8601(str(payload["exp"]))
    except Exception as exc:
        raise SsoVerificationError(
            status_code=401, message="session token payload unreadable",
        ) from exc
    if expires_at <= (now or datetime.now(tz=UTC)):
        raise SsoVerificationError(
            status_code=401, message="session token expired",
        )
    return payload
