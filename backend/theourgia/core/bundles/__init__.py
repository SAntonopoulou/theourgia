"""Magickal Bundle Format (MBF) v1 — ADR-0011.

The single typed envelope for sharing magickal knowledge between
magicians, hubs, and the public registry (FEATURES §11). A bundle is
a ZIP container (extension ``.mbf``) holding:

- ``manifest.json`` — the envelope (type, name, author, license,
  provenance, closed-tradition declaration, payload + asset digests)
- ``payloads/*.json`` — typed payload documents, one per kind
- ``assets/**`` — optional binary files referenced by relative path
- ``signature.json`` — optional detached Ed25519 signature block

Modules:

- :mod:`manifest` — strict pydantic schemas for the envelope
- :mod:`canonical` — canonical JSON + sha256 helpers
- :mod:`container` — build / read the ZIP container with digest
  verification and hard limits
- :mod:`signing` — sign / verify (unsigned is a verdict, never an
  exception — FEATURES §11: warn, don't block)
- :mod:`importer` — per-kind import into the vault
- :mod:`exporter` — per-kind export builders from vault content
- :mod:`bundled_content` — the seven bundled content packages
  (public-domain diligenced), built into real ``.mbf`` containers at
  runtime

The format reference for bundle authors lives in
``docs/developer/mbf.md``.
"""

from __future__ import annotations

from theourgia.core.bundles.bundled_content import (
    BUNDLED_CONTENT,
    BundledContent,
    build_bundled_mbf,
    bundled_by_slug,
)
from theourgia.core.bundles.canonical import canonical_json_bytes, sha256_hex
from theourgia.core.bundles.container import (
    MAX_CONTAINER_BYTES,
    MAX_TOTAL_ITEMS,
    BundleError,
    BundleFormatError,
    BundleTooLargeError,
    DigestMismatchError,
    ParsedBundle,
    TooManyItemsError,
    build_mbf,
    read_mbf,
)
from theourgia.core.bundles.manifest import (
    MAGICKAL_LICENSE_TAGS,
    MBF_VERSION,
    TYPE_CATALOG,
    BundleManifest,
    BundleSignature,
    PayloadDocument,
    build_attribution,
)
from theourgia.core.bundles.signing import (
    VERDICT_FAILED,
    VERDICT_UNSIGNED,
    VERDICT_VERIFIED,
    BundleVerification,
    sign_container,
    verify_container,
)

__all__ = [
    "BUNDLED_CONTENT",
    "MAGICKAL_LICENSE_TAGS",
    "MAX_CONTAINER_BYTES",
    "MAX_TOTAL_ITEMS",
    "MBF_VERSION",
    "TYPE_CATALOG",
    "VERDICT_FAILED",
    "VERDICT_UNSIGNED",
    "VERDICT_VERIFIED",
    "BundleError",
    "BundleFormatError",
    "BundleManifest",
    "BundleSignature",
    "BundleTooLargeError",
    "BundleVerification",
    "BundledContent",
    "DigestMismatchError",
    "ParsedBundle",
    "PayloadDocument",
    "TooManyItemsError",
    "build_attribution",
    "build_bundled_mbf",
    "build_mbf",
    "bundled_by_slug",
    "canonical_json_bytes",
    "read_mbf",
    "sha256_hex",
    "sign_container",
    "verify_container",
]
