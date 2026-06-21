"""Initiation / grade tracker.

Per `plan/05-magical-beings.md` §6. The MOST sensitive data in
Theourgia — many initiations are sworn-to-secrecy and exposure
would breach the oath itself. The plan's invariants:

* ``encryption_mode`` defaults to ``sealed`` and **cannot be
  downgraded via the standard API** — a UI hard-prevention pattern
  matches the schema constraint here (the writer-side API refuses
  to set encryption_mode = none for initiation rows).
* Every column except the bare-bones (id, owner, tradition, status)
  goes inside the encrypted payload. The columns the database stores
  in plaintext carry only what the user actively wants visible:
  "I am an initiate of X tradition, status: active." The details
  (which grade, where, from whom, with whom) live in the encrypted
  payload.
* No public render: the UI prevents publishing initiation records;
  the visibility setting is enforced as ``personal`` only.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import EncryptionMode

__all__ = ["Initiation", "InitiationStatus"]


class InitiationStatus(str, enum.Enum):
    ACTIVE = "active"
    LAPSED = "lapsed"
    SUSPENDED = "suspended"
    RESIGNED = "resigned"


class Initiation(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One initiation in the tracker.

    Plaintext columns:
    * ``tradition`` — the broad tradition the user wants visible.
      The user can keep this private by sealing everything (then the
      `tradition` column shows "(sealed)" via the API layer).
    * ``status`` — active / lapsed / suspended / resigned.

    Encrypted payload (in ``encrypted_payload``):
    * grade_or_degree
    * received_at
    * location
    * received_from (initiator name)
    * received_with (other initiates present)
    * experience_notes
    * verifications_received (tokens / names / signs)
    """

    __tablename__ = "initiation"
    __table_args__ = (
        Index("ix_initiation_owner_id", "owner_id"),
        Index("ix_initiation_status", "status"),
    )

    tradition: str = Field(
        sa_column=Column(String(128), nullable=False),
        description=(
            'Tradition tag — "OTO", "Golden Dawn descendants", '
            '"Hellenic mystery", "personal self-initiation", etc. '
            "User-controlled visibility — the user opts into showing "
            "this column."
        ),
    )

    status: InitiationStatus = Field(
        default=InitiationStatus.ACTIVE,
        sa_column=Column(
            SQLEnum(
                InitiationStatus,
                name="initiation_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="active",
        ),
    )

    # Sealed by default and the writer-side API refuses to downgrade.
    encryption_mode: EncryptionMode = Field(
        default=EncryptionMode.SEALED,
        sa_column=Column(
            SQLEnum(
                EncryptionMode,
                name="entry_encryption_mode",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
            server_default="sealed",
        ),
    )

    encrypted_payload: Optional[bytes] = Field(
        default=None,
        sa_column=Column("encrypted_payload", nullable=True),
    )

    # The received_at is denormalised from the encrypted payload only
    # when the user explicitly opts in (e.g. for a public lineage
    # claim where the date is intended to be public). When sealed, the
    # column stays NULL.
    publicly_disclosed_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
        description=(
            "When the user has chosen to publicly disclose the date "
            "of this initiation (typically for a counter-signed "
            "lineage attestation). NULL otherwise."
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
