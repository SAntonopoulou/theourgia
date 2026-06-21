"""Ed25519 sign / verify helpers used by lineage attestations.

Per ``plan/05-magical-beings.md`` §12. The federation keys module
manages key persistence + (de)serialization; this module wraps the
``cryptography`` primitives in functions tuned for attestation
signing — small inputs, raw 64-byte signatures, no nonces, no
associated data.

Why split this from :mod:`theourgia.core.federation.keys`? That
module is about the instance keypair on disk + ``.well-known``
publication. Attestation signing is a per-content operation that may
use the instance key, a user's per-account key, or an external
authority's key. The lower-level primitives belong together.
"""

from __future__ import annotations

import json
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

__all__ = [
    "canonical_attestation_bytes",
    "sign_bytes",
    "verify_signature",
]


def canonical_attestation_bytes(claim: dict[str, Any]) -> bytes:
    """Render a claim dict to canonical JSON bytes for signing.

    Sorted keys, no extraneous whitespace, ``ensure_ascii=False`` so
    Unicode passes through cleanly. The resulting bytes are what the
    signer signs and what the verifier checks against.
    """
    return json.dumps(
        claim,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def sign_bytes(private_key: Ed25519PrivateKey, message: bytes) -> bytes:
    """Sign ``message`` with the given Ed25519 private key.

    Returns the raw 64-byte signature.
    """
    return private_key.sign(message)


def verify_signature(
    public_key: Ed25519PublicKey,
    message: bytes,
    signature: bytes,
) -> bool:
    """Verify ``signature`` over ``message`` with the given public key.

    Returns ``True`` on a valid signature, ``False`` on any failure
    (wrong key, tampered bytes, malformed signature). Never raises.
    """
    try:
        public_key.verify(signature, message)
    except InvalidSignature:
        return False
    except Exception:
        # Defensive: malformed signature bytes can produce other errors
        # from the underlying library; treat all of them as verification
        # failure so callers don't have to handle multiple exception
        # types.
        return False
    return True
