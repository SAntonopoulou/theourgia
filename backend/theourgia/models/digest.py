"""Weekly digest (B124).

Per ``plan/09-batches-backend.md`` § B124.

A ``Digest`` is a frozen weekly summary the practitioner can return
to — counts, surfaced patterns, sample sizes. Each ``DigestItem``
captures one surfaced observation (an above-baseline cell, a
correlation, a streak) so it can be marked dismissed / read
independently.

Honesty rules:
  * Headlines NEVER use modal language ("must" / "will" / "should"
    work). The B124 banned-phrase regex test verifies the actual
    headline templates against this rule.
  * Every tier-2 / tier-3 item carries sample_size + (when
    available) a confidence value. Missing values render as
    "(no CI · small sample)" in the surface — the surface stays
    honest about what it doesn't know.
  * Re-runs build NEW Digest rows for new weeks; the uniqueness
    constraint on (owner_id, period_start) prevents duplicate
    weeks. Past digests are immutable history.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["Digest", "DigestItem"]


class Digest(IDMixin, TimestampMixin, table=True):
    """One frozen week of analytics for one owner."""

    __tablename__ = "digest"
    __table_args__ = (
        Index("ix_digest_owner_period", "owner_id", "period_start"),
        UniqueConstraint(
            "owner_id", "period_start", name="uq_digest_owner_period",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    period_start: datetime = Field(nullable=False)
    period_end: datetime = Field(nullable=False)

    # Aggregate snapshot (counts, tier-1 metrics, builder version).
    summary: dict = Field(
        sa_column=Column(JSONB, nullable=False),
    )


class DigestItem(IDMixin, TimestampMixin, table=True):
    """One surfaced pattern inside a digest."""

    __tablename__ = "digest_item"
    __table_args__ = (
        Index("ix_digest_item_digest", "digest_id"),
    )

    digest_id: UUID = Field(
        sa_column=Column(
            ForeignKey("digest.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    # Stable slug ("tier1-counts", "tier2-saturn-hour", ...).
    kind: str = Field(max_length=64, nullable=False)
    headline: str = Field(max_length=240, nullable=False)
    body: Optional[str] = Field(default=None, sa_column=Column(Text))
    structured: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    sample_size: int = Field(nullable=False, default=0)
    confidence: Optional[float] = Field(default=None)
    dismissed: bool = Field(default=False, nullable=False)
