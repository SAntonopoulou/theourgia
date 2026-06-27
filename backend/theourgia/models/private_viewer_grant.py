"""Private viewer credential grant (B138).

Per ``plan/12-batches-backend.md`` § B138.

The H08 ``Private Viewer Management`` surface (frontend surface
11) issues a one-time credential to an email-or-handle holder
who is NOT a Theourgia user. This is fundamentally different
from the Phase 01 ``PrivateViewer`` model — which binds a
``User`` row to a vault — and so lands as a NEW table rather
than an extension.

The two coexist:

  · ``PrivateViewer`` (Phase 01) — a magician you've onboarded
    as a Theourgia user with vault read scope.
  · ``PrivateViewerGrant`` (B138) — a scoped read credential
    issued to someone WITHOUT a Theourgia account; they redeem
    it via signed-link or passphrase.

Honesty rules wired here:

  · ``revoked_at`` once set is immutable (service-layer guard;
    DB constraint via CHECK that prevents toggling back to NULL
    is enforced at the migration layer).
  · Default ``scope_kind = TAG`` — never ``FULL`` by default.
  · ``credential_hash`` + ``credential_salt`` store a
    PBKDF2-HMAC-SHA256 hash; the plaintext is returned exactly
    ONCE at issue time and never recoverable.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = [
    "PrivateViewerGrant",
    "PrivateViewerScopeKind",
    "PrivateViewerDelivery",
]


class PrivateViewerScopeKind(str, enum.Enum):
    """How the grant scopes the readable content.

    The default is ``TAG`` — never ``FULL`` — per the H08
    surface 11 honesty rule.
    """

    FULL = "full"
    TAG = "tag"
    KIND = "kind"
    SPECIFIC = "specific"


class PrivateViewerDelivery(str, enum.Enum):
    """How the credential reaches the viewer.

    Signed-link is the default; passphrase requires the
    practitioner to convey the plaintext out-of-band.
    """

    SIGNED_LINK = "signed_link"
    PASSPHRASE = "passphrase"


class PrivateViewerGrant(IDMixin, TimestampMixin, table=True):
    """A scoped read credential the practitioner issues to a
    non-Theourgia recipient."""

    __tablename__ = "private_viewer_grant"
    __table_args__ = (
        Index("ix_pvg_owner", "owner_id"),
        Index("ix_pvg_owner_revoked", "owner_id", "revoked_at"),
        CheckConstraint(
            "scope_kind IN ('full', 'tag', 'kind', 'specific')",
            name="ck_pvg_scope_kind",
        ),
        CheckConstraint(
            "delivery IN ('signed_link', 'passphrase')",
            name="ck_pvg_delivery",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    label: str = Field(sa_column=Column(String(240), nullable=False))
    email_or_handle: str = Field(
        sa_column=Column(String(320), nullable=False),
    )

    scope_kind: PrivateViewerScopeKind = Field(
        default=PrivateViewerScopeKind.TAG,
        sa_column=Column(
            SQLEnum(
                PrivateViewerScopeKind,
                name="private_viewer_scope_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=PrivateViewerScopeKind.TAG.value,
        ),
    )
    scope_payload: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    delivery: PrivateViewerDelivery = Field(
        default=PrivateViewerDelivery.SIGNED_LINK,
        sa_column=Column(
            SQLEnum(
                PrivateViewerDelivery,
                name="private_viewer_delivery",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=PrivateViewerDelivery.SIGNED_LINK.value,
        ),
    )

    # PBKDF2-HMAC-SHA256 (100,000 iters; 16-byte salt). Plaintext
    # is returned ONCE at issue time and never recoverable.
    credential_hash: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
    )
    credential_salt: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
    )

    last_used_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
