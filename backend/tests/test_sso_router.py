"""Schema-level + helper tests for the SSO router (B141).

Honesty invariants:

  · ASSERTION_TTL is exactly 24 hours per H08 brief.
  · Authorize payload rejects empty target_did + extra fields.
  · Read shape carries the signature_b64 field (nullable) so
    the surface can render the assertion's signed/unsigned state.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.sso import (
    ASSERTION_TTL,
    SsoAssertionRead,
    SsoAuthorizePayload,
)


def test_assertion_ttl_is_24_hours() -> None:
    """H08 brief: assertion expires in 24 hours. Document the
    invariant so a future widening is intentional."""
    assert ASSERTION_TTL == timedelta(hours=24)


def test_authorize_payload_rejects_empty_target_did() -> None:
    with pytest.raises(ValidationError):
        SsoAuthorizePayload(target_did="")


def test_authorize_payload_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SsoAuthorizePayload(  # type: ignore[call-arg]
            target_did="did:theourgia:aurora.example:coven",
            sneaky=True,
        )


def test_authorize_default_scope_is_empty_dict() -> None:
    payload = SsoAuthorizePayload(
        target_did="did:theourgia:aurora.example:coven",
    )
    assert payload.scope_payload == {}


def test_read_shape_includes_signature_field() -> None:
    """The surface renders the signed/unsigned state — the
    signature_b64 column lives in the read shape, NULL until
    the wire protocol fills it."""
    assert "signature_b64" in SsoAssertionRead.model_fields


def test_read_shape_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SsoAssertionRead(  # type: ignore[call-arg]
            id="x",
            target_did="x",
            scope_payload={},
            expires_at_utc="2026-06-28T00:00:00Z",
            revoked_at=None,
            signature_b64=None,
            created_at="2026-06-27T00:00:00Z",
            sneaky=True,
        )
