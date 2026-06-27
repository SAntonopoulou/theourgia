"""Schema-level unit tests for the private viewer grant router (B138b).

The H08 honesty rules covered:

  · Default scope_kind is TAG — NEVER FULL — at the schema level.
  · Default delivery is SIGNED_LINK.
  · extra="forbid" rejects unknown fields.
  · plaintext_credential is part of the response shape (returned
    ONCE) but NOT part of the read shape (never returned in list
    or revoke responses).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.private_viewer_grants import (
    PrivateViewerGrantCreate,
    PrivateViewerGrantIssued,
    PrivateViewerGrantRead,
)
from theourgia.models.private_viewer_grant import (
    PrivateViewerDelivery,
    PrivateViewerScopeKind,
)


def test_create_default_scope_is_tag_not_full() -> None:
    """Restrictive defaults (H08 rule 11) — never FULL by default."""
    payload = PrivateViewerGrantCreate(
        label="Student", email_or_handle="x@example.com",
    )
    assert payload.scope_kind is PrivateViewerScopeKind.TAG


def test_create_default_delivery_is_signed_link() -> None:
    payload = PrivateViewerGrantCreate(
        label="Student", email_or_handle="x@example.com",
    )
    assert payload.delivery is PrivateViewerDelivery.SIGNED_LINK


def test_create_rejects_empty_label() -> None:
    with pytest.raises(ValidationError):
        PrivateViewerGrantCreate(
            label="", email_or_handle="x@example.com",
        )


def test_create_rejects_empty_email() -> None:
    with pytest.raises(ValidationError):
        PrivateViewerGrantCreate(label="Student", email_or_handle="")


def test_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PrivateViewerGrantCreate(  # type: ignore[call-arg]
            label="x",
            email_or_handle="x@example.com",
            sneaky=True,
        )


def test_read_extra_forbidden() -> None:
    """The list endpoint's read shape rejects unknown fields —
    defence in depth against accidental field leaks."""
    with pytest.raises(ValidationError):
        PrivateViewerGrantRead(  # type: ignore[call-arg]
            id="x",
            label="x",
            email_or_handle="x@example.com",
            scope_kind=PrivateViewerScopeKind.TAG,
            scope_payload={},
            delivery=PrivateViewerDelivery.SIGNED_LINK,
            last_used_at=None,
            revoked_at=None,
            created_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            plaintext_credential="leak",
        )


def test_read_shape_does_not_include_plaintext() -> None:
    """The read shape must NOT carry plaintext_credential —
    that field is exclusive to PrivateViewerGrantIssued."""
    read_fields = set(PrivateViewerGrantRead.model_fields.keys())
    assert "plaintext_credential" not in read_fields
    assert "credential_hash" not in read_fields
    assert "credential_salt" not in read_fields


def test_issued_shape_includes_plaintext_exactly_once() -> None:
    """PrivateViewerGrantIssued is the one-time-return shape."""
    issued_fields = set(PrivateViewerGrantIssued.model_fields.keys())
    assert "plaintext_credential" in issued_fields
    assert "grant" in issued_fields


def test_create_accepts_all_scope_kinds_when_explicit() -> None:
    for scope in PrivateViewerScopeKind:
        payload = PrivateViewerGrantCreate(
            label="x",
            email_or_handle="x@example.com",
            scope_kind=scope,
        )
        assert payload.scope_kind is scope


def test_create_scope_payload_defaults_to_empty_dict() -> None:
    payload = PrivateViewerGrantCreate(
        label="x", email_or_handle="x@example.com",
    )
    assert payload.scope_payload == {}
