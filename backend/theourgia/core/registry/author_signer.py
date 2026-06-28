"""Server-side author signer for the registry bridge.

The registry expects every author-protected request to carry
`X-Author-DID`, `X-Author-Timestamp`, `X-Author-Signature` headers
matching the SHA-256(body) + `\n` + timestamp payload.

For v1 single-tenant prod, the vault has ONE author keypair —
configured via `THEOURGIA_AUTHOR_DID` + `THEOURGIA_AUTHOR_PRIVATE_KEY_PATH`.
When unset, the signer raises `AuthorSigningUnconfigured` and the
A-cluster routes return 503 with the verbatim "author identity
not configured" copy.

Multi-tenant deployments will lift this to per-user storage; the
:class:`AuthorSigner` abstraction lets the bridge swap
implementations without touching the routes.
"""

from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)


__all__ = [
    "AuthorSigner",
    "AuthorSigningUnconfigured",
    "make_signing_headers",
]


class AuthorSigningUnconfigured(Exception):
    """`THEOURGIA_AUTHOR_DID` or the private-key path isn't configured."""


@dataclass(slots=True)
class AuthorSigner:
    """Signs registry-bound requests with the configured author key.

    Constructed at app startup with the operator's DID + private key;
    held on the FastAPI app state. Used by the registry bridge for
    author-protected endpoints (submissions, advisories)."""

    did: str
    private_key: Ed25519PrivateKey

    def sign(self, body: bytes) -> dict[str, str]:
        """Return the three headers the registry expects."""
        return make_signing_headers(
            did=self.did, private_key=self.private_key, body=body,
        )

    @classmethod
    def from_paths(
        cls, *, did: str | None, private_key_path: Path | None,
    ) -> "AuthorSigner":
        """Load from disk. Raises AuthorSigningUnconfigured on any
        missing/unreadable input."""
        if not did:
            raise AuthorSigningUnconfigured(
                "THEOURGIA_AUTHOR_DID not set",
            )
        if private_key_path is None or not private_key_path.exists():
            raise AuthorSigningUnconfigured(
                f"author private key not found at "
                f"{private_key_path or '<unset>'}",
            )
        try:
            pem = private_key_path.read_bytes()
            private_key = serialization.load_pem_private_key(
                pem, password=None,
            )
        except Exception as exc:
            raise AuthorSigningUnconfigured(
                f"author private key unreadable: {exc}",
            ) from exc
        if not isinstance(private_key, Ed25519PrivateKey):
            raise AuthorSigningUnconfigured(
                "author key is not Ed25519",
            )
        return cls(did=did, private_key=private_key)


def make_signing_headers(
    *,
    did: str,
    private_key: Ed25519PrivateKey,
    body: bytes,
) -> dict[str, str]:
    """Build the three headers (DID + Timestamp + Signature).

    Mirrors the verifier in
    `registry/theourgia_registry/core/did_auth.py`:
      payload = sha256(body).hex() + "\n" + iso_timestamp
      signature = Ed25519.sign(payload)
    Replay window enforced server-side (±5 min)."""
    timestamp = datetime.now(tz=UTC).isoformat()
    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{body_hash}\n{timestamp}".encode("utf-8")
    signature = private_key.sign(payload)
    return {
        "X-Author-DID": did,
        "X-Author-Timestamp": timestamp,
        "X-Author-Signature": base64.b64encode(signature).decode("ascii"),
    }
