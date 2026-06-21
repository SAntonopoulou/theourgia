"""Oath ledger.

Per `plan/05-magical-beings.md` §5. An `Oath` is a vow the
practitioner has taken — to self, tradition, body / order, deity,
partner, community.

Privacy defaults to SEALED (Mode B zero-knowledge encryption) per
the plan. The data layer here ships the schema; the actual
client-side encryption happens at the API boundary when sealed mode
is active (same pattern as :class:`Entry.encrypted_payload`).
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import EncryptionMode

__all__ = ["Oath", "OathKind", "OathStatus"]


class OathKind(str, enum.Enum):
    SELF = "self"
    TRADITION = "tradition"
    ORDER = "order"
    DEITY = "deity"
    PARTNER = "partner"
    COMMUNITY = "community"
    OTHER = "other"


class OathStatus(str, enum.Enum):
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    BROKEN = "broken"
    RENOUNCED = "renounced"
    LAPSED = "lapsed"


class Oath(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A vow recorded in the ledger.

    Default ``encryption_mode = sealed`` because most oaths are
    explicitly secret; the API layer can downgrade per-row when the
    user opts in.
    """

    __tablename__ = "oath"
    __table_args__ = (
        Index("ix_oath_owner_id", "owner_id"),
        Index("ix_oath_kind", "kind"),
        Index("ix_oath_status", "status"),
    )

    kind: OathKind = Field(
        sa_column=Column(
            SQLEnum(
                OathKind,
                name="oath_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    recipient_entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="The entity (deity / spirit / etc.) the oath is sworn to, if applicable.",
    )

    recipient_text: Optional[str] = Field(
        default=None,
        sa_column=Column(String(512), nullable=True),
        description=(
            'Free-text recipient when not an entity — "OTO Minerval '
            'initiation", "my marriage", "my future children".'
        ),
    )

    text: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "The full text of the oath. NULL when sealed and the body "
            "lives in encrypted_payload."
        ),
    )

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

    taken_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    expires_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    renewal_cadence: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            "Renewal cadence string ('yearly', 'every-equinox') — same "
            "vocabulary as RecurringOffering. NULL = no renewal expected."
        ),
    )

    status: OathStatus = Field(
        default=OathStatus.ACTIVE,
        sa_column=Column(
            SQLEnum(
                OathStatus,
                name="oath_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="active",
        ),
    )

    accountability_checkpoints: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Self-review checkpoints. Each item: { due_at, "
            "reflection_text?, completed_at?, reflection_entry_id? }. "
            "The scheduler creates a reminder per checkpoint."
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
