"""Capability tokens — Ed25519-signed JWTs scoped to specific operations.

A capability token says: *"the holder may perform action X against
resource Y until time Z"*. It is the unit of authority federation
peers exchange when granting cross-instance access.

We use JWT format with the ``EdDSA`` algorithm so the token is
interoperable with standard JWT tooling, but the verification logic is
strict about which claims must be present and how they're validated.

Fields:

- ``iss`` — issuing instance DID (``did:theourgia:host``)
- ``sub`` — subject actor DID (vault or hub being granted to)
- ``aud`` — audience instance DID (the recipient)
- ``cap`` — list of capability scope strings
- ``iat`` — issued-at Unix timestamp
- ``nbf`` — not-before timestamp (defaults to iat)
- ``exp`` — expiry Unix timestamp
- ``jti`` — token id (UUID for replay prevention bookkeeping)

This module does not enforce a replay cache; the consumer is expected
to record ``jti`` values it has accepted within the token's lifetime
and reject duplicates. (That bookkeeping lands with federation
operations in Phase 12.)
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from theourgia.core.federation.identity import InvalidDIDError, parse_actor_id
from theourgia.core.ids import uuid7

__all__ = [
    "CapabilityToken",
    "InvalidCapabilityTokenError",
    "issue_capability_token",
    "verify_capability_token",
]

_log = logging.getLogger(__name__)

_ALGORITHM: str = "EdDSA"
DEFAULT_TTL_SECONDS: int = 3600  # 1 hour


class InvalidCapabilityTokenError(Exception):
    """Raised when a capability token fails to verify or parse."""


@dataclass(frozen=True, slots=True)
class CapabilityToken:
    """A decoded capability token's claims."""

    iss: str
    sub: str
    aud: str
    cap: tuple[str, ...]
    iat: int
    nbf: int
    exp: int
    jti: UUID

    @property
    def is_expired(self) -> bool:
        """Whether the token has expired relative to the current time."""
        return time.time() >= self.exp


def issue_capability_token(
    *,
    private_key: Ed25519PrivateKey,
    issuer: str,
    subject: str,
    audience: str,
    capabilities: list[str],
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
    issued_at: int | None = None,
) -> str:
    """Issue a fresh capability token.

    Returns the encoded JWT string. The token is signed with EdDSA
    using the supplied Ed25519 private key.

    Validation done at issuance:
    - ``issuer``, ``subject``, ``audience`` parse as Theourgia DIDs
    - ``capabilities`` is non-empty
    - ``ttl_seconds`` is positive and not absurdly long (≤ 30 days)
    """
    parse_actor_id(issuer)  # raises if invalid
    parse_actor_id(subject)
    parse_actor_id(audience)
    if not capabilities:
        msg = "capabilities list must not be empty"
        raise ValueError(msg)
    if ttl_seconds <= 0:
        msg = "ttl_seconds must be positive"
        raise ValueError(msg)
    if ttl_seconds > 30 * 24 * 3600:
        msg = "ttl_seconds may not exceed 30 days for capability tokens"
        raise ValueError(msg)

    iat = issued_at if issued_at is not None else int(time.time())
    exp = iat + ttl_seconds

    payload: dict[str, Any] = {
        "iss": issuer,
        "sub": subject,
        "aud": audience,
        "cap": list(capabilities),
        "iat": iat,
        "nbf": iat,
        "exp": exp,
        "jti": str(uuid7()),
    }
    return jwt.encode(payload, private_key, algorithm=_ALGORITHM)


def verify_capability_token(
    *,
    token: str,
    public_key: Ed25519PublicKey,
    expected_issuer: str | None = None,
    expected_audience: str | None = None,
    required_capability: str | None = None,
    leeway_seconds: int = 30,
) -> CapabilityToken:
    """Verify and decode a capability token.

    Raises :class:`InvalidCapabilityTokenError` on any of:
    - Bad signature
    - Expired or not-yet-valid token (within leeway)
    - ``iss`` / ``aud`` mismatch when expected values are supplied
    - Missing required claims
    - DIDs that don't parse
    - Missing ``required_capability`` from the ``cap`` array

    Returns the parsed :class:`CapabilityToken`.
    """
    if not token:
        msg = "token must not be empty"
        raise InvalidCapabilityTokenError(msg)

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[_ALGORITHM],
            audience=expected_audience,
            issuer=expected_issuer,
            leeway=leeway_seconds,
            options={
                "require": ["iss", "sub", "aud", "cap", "iat", "nbf", "exp", "jti"],
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "verify_aud": expected_audience is not None,
                "verify_iss": expected_issuer is not None,
            },
        )
    except jwt.ExpiredSignatureError as exc:
        msg = "capability token expired"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.ImmatureSignatureError as exc:
        msg = "capability token not yet valid"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.InvalidAudienceError as exc:
        msg = "capability token audience mismatch"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.InvalidIssuerError as exc:
        msg = "capability token issuer mismatch"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.MissingRequiredClaimError as exc:
        msg = f"capability token missing required claim: {exc}"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.InvalidSignatureError as exc:
        msg = "capability token signature did not verify"
        raise InvalidCapabilityTokenError(msg) from exc
    except jwt.PyJWTError as exc:
        msg = f"capability token failed to decode: {exc}"
        raise InvalidCapabilityTokenError(msg) from exc

    # Validate DID structure of every actor field
    for field_name in ("iss", "sub", "aud"):
        try:
            parse_actor_id(payload[field_name])
        except InvalidDIDError as exc:
            msg = f"capability token {field_name} is not a valid DID"
            raise InvalidCapabilityTokenError(msg) from exc

    caps = payload.get("cap")
    if not isinstance(caps, list) or not all(isinstance(c, str) for c in caps):
        msg = "capability token cap must be a list of strings"
        raise InvalidCapabilityTokenError(msg)

    if required_capability is not None and required_capability not in caps:
        msg = (
            f"capability token lacks required capability: {required_capability!r}"
        )
        raise InvalidCapabilityTokenError(msg)

    try:
        jti = UUID(payload["jti"])
    except (ValueError, TypeError) as exc:
        msg = "capability token jti is not a valid UUID"
        raise InvalidCapabilityTokenError(msg) from exc

    return CapabilityToken(
        iss=payload["iss"],
        sub=payload["sub"],
        aud=payload["aud"],
        cap=tuple(caps),
        iat=int(payload["iat"]),
        nbf=int(payload["nbf"]),
        exp=int(payload["exp"]),
        jti=jti,
    )
