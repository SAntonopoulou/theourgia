"""Canonical JSON + digest helpers for MBF containers.

ADR-0011: the bundle signature is Ed25519 over the SHA-256 of the
canonical JSON (sorted keys, no whitespace) of ``digest_manifest``,
and every payload file is written in canonical form so its digest is
reproducible.

The canonicalizer is the one federation attestation signing already
uses — the ADR's "one canonicalizer, property-tested" discipline
means this module delegates rather than re-implements.
"""

from __future__ import annotations

import hashlib
from typing import Any

from theourgia.core.federation.signing import canonical_attestation_bytes

__all__ = ["canonical_json_bytes", "sha256_hex"]


def canonical_json_bytes(doc: Any) -> bytes:
    """Render ``doc`` to canonical JSON bytes.

    Sorted keys, no extraneous whitespace, ``ensure_ascii=False`` so
    Unicode passes through cleanly — byte-identical with the
    federation attestation canonicalizer, to which this delegates.
    """
    return canonical_attestation_bytes(doc)


def sha256_hex(data: bytes) -> str:
    """Hex-encoded SHA-256 of ``data`` — the digest format used in
    ``manifest.json`` payload/asset entries and ``signature.json``."""
    return hashlib.sha256(data).hexdigest()
