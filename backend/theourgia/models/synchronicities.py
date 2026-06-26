"""Synchronicity model (B120).

Per ``plan/09-batches-backend.md`` § B120.

A ``Synchronicity`` records a meaningful coincidence the practitioner
notices — a number sequence, a name occurrence, an animal omen, etc.
On save, the route auto-tags the row with the astrological + calendar
context at ``occurred_at`` plus optional weather + location data
(respecting the per-vault location-precision floor).

Honesty rules:
  * Auto-tagged snapshots carry a ``source: "auto"`` marker; user
    edits replace the snapshot with one tagged ``source: "manual"``.
  * Location precision honours the per-vault floor (same substrate
    as the Pilgrimage Map's recorded_precision).
  * The 10 categories are a closed enum; ``custom`` is the escape
    hatch with free-form ``structured_data``.
  * Sealed entries cannot be linked; the API layer rejects sealed
    entry_ids in ``linked_entry_ids``.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Synchronicity", "SynchronicityCategory"]


class SynchronicityCategory(str, enum.Enum):
    """The 10 closed-enum categories. ``custom`` is the escape hatch."""

    NUMBER_SEQUENCE = "number_sequence"
    NAME_OCCURRENCE = "name_occurrence"
    DREAM_SPILLOVER = "dream_spillover"
    ANIMAL_OMEN = "animal_omen"
    SONG_LYRIC = "song_lyric"
    OVERHEARD_SPEECH = "overheard_speech"
    WEATHER = "weather"
    OBJECT_ENCOUNTER = "object_encounter"
    ELECTROMAGNETIC = "electromagnetic"
    CUSTOM = "custom"


class Synchronicity(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One meaningful coincidence."""

    __tablename__ = "synchronicity"
    __table_args__ = (
        Index("ix_sync_owner", "owner_id"),
        Index("ix_sync_occurred_at", "occurred_at"),
        Index("ix_sync_category", "category"),
        Index("ix_sync_owner_occurred", "owner_id", "occurred_at"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    occurred_at: datetime = Field(nullable=False)
    description: str = Field(sa_column=Column(Text, nullable=False))

    category: SynchronicityCategory = Field(
        sa_column=Column(
            SQLEnum(
                SynchronicityCategory,
                name="synchronicity_category",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    intensity: int = Field(ge=1, le=10, nullable=False, default=5)

    # Per-category structured payload. For number_sequence:
    # { "number": "1111", "noticed_via": "clock" }; for animal_omen:
    # { "species": "raven", "count": 3 }. Schema-by-convention; the
    # API layer doesn't enforce a strict shape here.
    structured_data: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    # Auto-tagged on save. Each carries a `source` marker that
    # tells the frontend whether the snapshot was computed
    # automatically or supplied by the practitioner.
    astro_snapshot: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB),
    )
    calendar_stamp: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB),
    )
    weather_snapshot: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB),
    )

    # Location: same precision substrate as Pilgrimage Map.
    location_lat: Optional[float] = Field(default=None)
    location_lng: Optional[float] = Field(default=None)
    # "exact" / "1km" / "10km" / "country" / "hidden"
    location_precision: str = Field(default="hidden", max_length=16)

    # Cross-references — all owner-scoped at the API layer.
    linked_entry_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    linked_entity_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    linked_working_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
