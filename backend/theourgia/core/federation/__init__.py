"""Theourgia native federation — cryptographic primitives.

This package holds the pieces every federation operation will lean on:

- :mod:`identity` — instance / vault / hub identifier (DID) construction
  and parsing.
- :mod:`keys` — Ed25519 keypair generation, on-disk persistence, and
  serialization to / from the wire formats.
- :mod:`http_signatures` — sign and verify outbound / inbound HTTP
  requests per a focused RFC 9421 subset.
- :mod:`capability_tokens` — issue and verify capability tokens
  (EdDSA-signed JWTs scoped to specific operations).

The high-level federation protocol — Push, Pull, Mirror, Invite,
RitualSchedule, etc. — lands in Phase 12. This batch lands only the
load-bearing crypto so that Phase 12 has reliable primitives to compose.
"""

from __future__ import annotations

from theourgia.core.federation.capability_tokens import (
    CapabilityToken,
    InvalidCapabilityTokenError,
    issue_capability_token,
    verify_capability_token,
)
from theourgia.core.federation.http_signatures import (
    DEFAULT_COMPONENTS,
    HTTPSignatureError,
    SignedRequestComponents,
    sign_request,
    verify_request,
)
from theourgia.core.federation.identity import (
    ActorKind,
    DID_REGEX,
    InvalidDIDError,
    make_actor_id,
    make_instance_id,
    parse_actor_id,
)
from theourgia.core.federation.keys import (
    InstanceKeypair,
    deserialize_public_key,
    generate_keypair,
    load_or_create_keypair,
    serialize_public_key,
)

__all__ = [
    "ActorKind",
    "CapabilityToken",
    "DEFAULT_COMPONENTS",
    "DID_REGEX",
    "HTTPSignatureError",
    "InstanceKeypair",
    "InvalidCapabilityTokenError",
    "InvalidDIDError",
    "SignedRequestComponents",
    "deserialize_public_key",
    "generate_keypair",
    "issue_capability_token",
    "load_or_create_keypair",
    "make_actor_id",
    "make_instance_id",
    "parse_actor_id",
    "serialize_public_key",
    "sign_request",
    "verify_capability_token",
    "verify_request",
]
