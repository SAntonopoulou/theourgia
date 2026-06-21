"""Contracts / pacts — what the practitioner has agreed to.

Per `plan/05-magical-beings.md` §3. A `Contract` row records a pact
between the practitioner and an entity (or, for multi-party
agreements, with witness entities). Each side has structured
obligations with per-obligation status tracking.

The data model is intentionally explicit: obligations are
first-class items, not buried in rich text, so the obligation
reminder system (Celery task — Batch 33's scheduler architecture
extends here) can find overdue items deterministically.
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

__all__ = [
    "BindingKind",
    "Contract",
    "ContractStatus",
    "ObligationStatus",
]


class BindingKind(str, enum.Enum):
    """How the contract is bound — the magickal mechanism."""

    VERBAL = "verbal"
    WRITTEN = "written"
    BLOOD = "blood"
    BREATH = "breath"
    ITEM_BOUND = "item-bound"
    NAME_BOUND = "name-bound"
    OTHER = "other"


class ContractStatus(str, enum.Enum):
    """Where the contract stands."""

    DRAFT = "draft"
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    EXPIRED = "expired"
    DISSOLVED = "dissolved"
    BREACHED = "breached"


class ObligationStatus(str, enum.Enum):
    """Per-obligation status. Stored within the JSON payload."""

    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    FULFILLED = "fulfilled"
    OVERDUE = "overdue"
    WAIVED = "waived"


class Contract(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One contract / pact with an entity."""

    __tablename__ = "contract"
    __table_args__ = (
        Index("ix_contract_owner_id", "owner_id"),
        Index("ix_contract_entity_id", "entity_id"),
        Index("ix_contract_status", "status"),
        Index("ix_contract_expires_at", "expires_at"),
    )

    entity_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    title: str = Field(
        sa_column=Column(String(256), nullable=False),
        description='Short label — "Pact with Hekate, Beltane 2026".',
    )

    terms: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Rich text — the agreed terms in full.",
    )

    our_obligations: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Structured list of what the practitioner owes. Each item: "
            "{ id, description, status (ObligationStatus), due_at?, "
            "fulfilled_at?, notes? }. Status is one of the "
            ":class:`ObligationStatus` values."
        ),
    )

    their_obligations: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="What the entity owes; same shape as our_obligations.",
    )

    status: ContractStatus = Field(
        default=ContractStatus.DRAFT,
        sa_column=Column(
            SQLEnum(
                ContractStatus,
                name="contract_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="draft",
        ),
    )

    effective_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    expires_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    renewable: bool = Field(
        default=False,
        sa_column=Column(
            "renewable",
            nullable=False,
            server_default="false",
        ),
    )

    binding_kind: BindingKind = Field(
        default=BindingKind.VERBAL,
        sa_column=Column(
            SQLEnum(
                BindingKind,
                name="contract_binding_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="verbal",
        ),
    )

    witness_entity_ids: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Other entities invoked as witnesses (as a JSON array of entity_ids).",
    )

    dissolution_ritual_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Reference to the entry documenting the dissolution rite, if any.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
