"""DID + Ed25519 signature verification.

The registry trusts any vault DID — there is no centralized account
system. An author registers their DID + Ed25519 public key once
(POST /authors/register); subsequent requests carry:

  * `X-Author-DID`: the author's DID string
  * `X-Author-Timestamp`: ISO-8601 UTC timestamp (replay window)
  * `X-Author-Signature`: base64(Ed25519(canonical_body || timestamp))

Verification:

  1. Resolve DID → Author row (404 if unknown)
  2. Decode public key from PEM stored on the Author row
  3. Reconstruct the signed message: `<canonical-body>\n<timestamp>`
  4. Verify signature; on failure return 401

The canonical body is the SHA-256 of the request body bytes — the
client doesn't need to canonicalise JSON because the bytes are already
opaque. Empty body → empty bytes; GETs sign the timestamp alone.

Replay window: ±5 minutes from server clock. Outside window → 401.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime, timedelta
from dataclasses import dataclass

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PublicKey,
)


__all__ = [
    "REPLAY_WINDOW",
    "AuthFailure",
    "verify_request_signature",
    "canonicalise_body",
    "make_signing_payload",
]


REPLAY_WINDOW = timedelta(minutes=5)


class AuthFailure(Exception):
    """Verification failed. Carries the HTTP status code the route
    should return (always 401 in current shape; reserved for future
    differentiation like 403)."""

    def __init__(self, *, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


def canonicalise_body(body: bytes) -> str:
    """SHA-256 hex of the body bytes. Empty body → hex of empty."""
    return hashlib.sha256(body).hexdigest()


def make_signing_payload(*, body: bytes, timestamp: str) -> bytes:
    """The exact bytes the author must sign. Format: `<body-hash>\n<ts>`."""
    return f"{canonicalise_body(body)}\n{timestamp}".encode("utf-8")


def _parse_iso8601(value: str) -> datetime:
    """Parse strict ISO-8601 UTC. Accepts trailing 'Z' as +00:00."""
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def verify_request_signature(
    *,
    did: str,
    timestamp: str,
    signature_b64: str,
    body: bytes,
    public_key_pem: str,
    now: datetime | None = None,
) -> None:
    """Verify the signature or raise :class:`AuthFailure`."""
    if not did:
        raise AuthFailure(status_code=401, message="X-Author-DID required")
    if not timestamp:
        raise AuthFailure(
            status_code=401, message="X-Author-Timestamp required",
        )
    if not signature_b64:
        raise AuthFailure(
            status_code=401, message="X-Author-Signature required",
        )

    try:
        ts = _parse_iso8601(timestamp)
    except ValueError as exc:
        raise AuthFailure(
            status_code=401,
            message="X-Author-Timestamp must be ISO-8601 UTC",
        ) from exc

    if ts.tzinfo is None:
        raise AuthFailure(
            status_code=401,
            message="X-Author-Timestamp must include a UTC offset",
        )

    server_now = now or datetime.now(tz=UTC)
    if abs(server_now - ts) > REPLAY_WINDOW:
        raise AuthFailure(
            status_code=401,
            message=(
                "X-Author-Timestamp outside replay window "
                f"(±{int(REPLAY_WINDOW.total_seconds() / 60)} min)"
            ),
        )

    try:
        signature = base64.b64decode(signature_b64)
    except ValueError as exc:
        raise AuthFailure(
            status_code=401, message="signature is not valid base64",
        ) from exc

    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode("utf-8"),
        )
    except (ValueError, TypeError) as exc:
        raise AuthFailure(
            status_code=401,
            message="author public key is unreadable",
        ) from exc

    if not isinstance(public_key, Ed25519PublicKey):
        raise AuthFailure(
            status_code=401,
            message="author key is not Ed25519",
        )

    payload = make_signing_payload(body=body, timestamp=timestamp)
    try:
        public_key.verify(signature, payload)
    except InvalidSignature as exc:
        raise AuthFailure(
            status_code=401, message="signature verification failed",
        ) from exc


@dataclass(slots=True, frozen=True)
class IncomingSignature:
    """Parsed signature headers from a request."""

    did: str
    timestamp: str
    signature_b64: str

    @classmethod
    def from_headers(
        cls,
        *,
        did: str | None,
        timestamp: str | None,
        signature_b64: str | None,
    ) -> "IncomingSignature":
        return cls(
            did=did or "",
            timestamp=timestamp or "",
            signature_b64=signature_b64 or "",
        )
