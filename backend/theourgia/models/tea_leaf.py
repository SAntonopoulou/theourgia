"""Tea-leaf (tasseography) reading log.

b108-2hj · FEATURES §13 (reference plugin: tea-leaf reading log).

One row per reading. Tasseography is non-mechanical — the practitioner
identifies symbols in the settled leaves and interprets them. Each
reading records the question, the symbols observed, an interpretation,
and any intuitive/emotional overlay that arose during the reading.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["TeaLeafReading"]


class TeaLeafReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One tasseography reading."""

    __tablename__ = "tea_leaf_reading"
    __table_args__ = (
        Index("ix_tea_leaf_owner", "owner_id"),
        Index("ix_tea_leaf_occurred_at", "occurred_at"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    tea_variety: Optional[str] = Field(
        default=None,
        sa_column=Column(String(120), nullable=True),
        description="e.g. Ceylon loose leaf, Lapsang Souchong, English breakfast.",
    )

    # List of {"key": "acorn", "position": "rim|middle|bottom|handle",
    #          "orientation": "upright|inverted", "notes": "..."} entries.
    symbols_observed: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Book-derived interpretation of the symbols.",
    )

    intuitive_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "The reader's intuitive / emotional overlay. Non-mechanical "
            "divination lives here — this is where the reading breathes."
        ),
    )

    occurred_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )
