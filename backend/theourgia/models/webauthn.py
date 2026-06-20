"""WebAuthn / passkey credentials.

One row per registered authenticator per user. A user may have many —
their YubiKey at home, their phone's platform authenticator, their
laptop's TPM-backed key, an offline backup key in a safe.

Sign-count tracking: every authenticator returns a strictly-increasing
counter on each use. We store the last value we saw; on the next
authentication we verify the reported count is strictly greater. A
regression indicates a cloned authenticator and the credential is
revoked.

What we do *not* store: attestation statements (we use
``AttestationConveyancePreference.NONE`` at registration to avoid
collecting attestation that practitioners might consider intrusive).
The ``aaguid`` and ``attestation_format`` columns are recorded only
because the underlying library returns them; treating them as
informational is correct.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
)
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["WebauthnCredential"]


class WebauthnCredential(IDMixin, TimestampMixin, table=True):
    """A registered WebAuthn / passkey credential."""

    __tablename__ = "webauthn_credential"
    __table_args__ = (
        Index("ix_webauthn_credential_user", "user_id"),
        Index(
            "uq_webauthn_credential_id",
            "credential_id",
            unique=True,
        ),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    credential_id: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="Authenticator-assigned credential identifier (raw bytes)",
    )

    public_key: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="COSE-encoded public key returned by the authenticator",
    )

    sign_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
        description=(
            "Last observed authenticator sign counter. Strictly "
            "increasing on each authentication; a regression indicates "
            "the authenticator may be cloned."
        ),
    )

    transports_csv: str = Field(
        default="",
        sa_column=Column(String(200), nullable=False, server_default=""),
        description="Comma-separated transports hint (usb,nfc,ble,internal,hybrid)",
    )

    aaguid: Optional[str] = Field(
        default=None,
        sa_column=Column(String(36), nullable=True),
        description="Authenticator AAGUID, when present (informational)",
    )

    attestation_format: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Attestation format the authenticator used (informational; "
            "we request 'none' so this is usually 'none')."
        ),
    )

    credential_device_type: Optional[str] = Field(
        default=None,
        sa_column=Column(String(32), nullable=True),
        description="single_device | multi_device (passkey indicator)",
    )

    credential_backed_up: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
        description="True iff this credential is a multi-device passkey",
    )

    label: str = Field(
        default="",
        sa_column=Column(String(120), nullable=False, server_default=""),
        description="User-friendly name (e.g., 'YubiKey 5', 'Phone passkey')",
    )

    last_used_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description=(
            "When the credential was revoked (lost device, sign-count "
            "regression detected, user-initiated removal). Revoked "
            "credentials are kept for audit but cannot authenticate."
        ),
    )
