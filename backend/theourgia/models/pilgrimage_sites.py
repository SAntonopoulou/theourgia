"""Pilgrimage site model (B134).

Per ``plan/11-batches-backend.md`` § B134.

Stores sites the practitioner records on the H07 Pilgrimage Map.
The defining rule is the precision floor: the lat/lng stored on
the row are ALREADY quantized to ``stored_precision``. Finer
precision is irreversibly lost the moment a site is saved (or
re-quantized).

The re-quantize endpoint is one-way: lower precision is allowed,
finer is rejected.

Sealed sites stay on the map as a count-only badge (the
``sealed-cluster`` endpoint) — they are NEVER plotted with
coordinates on the public map data.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "PilgrimageSite",
    "SiteKind",
    "PRECISION_RANK",
    "is_lower_or_equal_precision",
]


class SiteKind(str, enum.Enum):
    SACRED = "sacred"
    ANCESTRAL = "ancestral"
    WORKING = "working"
    PILGRIMAGE = "pilgrimage"
    OTHER = "other"


# Precision rank: lower rank = finer precision. The /requantize
# endpoint REJECTS a transition where the new rank is LOWER than
# the current rank — i.e., you can't go finer.
#
# Values are aligned with the B120 autotag helper's
# ``_PRECISION_DECIMALS`` so the same ``apply_precision_floor`` does
# the actual rounding.
PRECISION_RANK = {
    "exact": 0,
    "1km": 1,
    "10km": 2,
    "country": 3,
    "hidden": 4,
}


def is_lower_or_equal_precision(current: str, target: str) -> bool:
    """Return True iff ``target`` is the SAME or LOWER precision
    than ``current``. Equal is allowed (idempotent no-op
    re-quantize); finer is rejected upstream."""
    if current not in PRECISION_RANK or target not in PRECISION_RANK:
        return False
    return PRECISION_RANK[target] >= PRECISION_RANK[current]


class PilgrimageSite(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One pilgrimage / sacred / working / ancestral / other site."""

    __tablename__ = "pilgrimage_site"
    __table_args__ = (
        Index("ix_pilgrimage_owner", "owner_id"),
        Index("ix_pilgrimage_owner_kind", "owner_id", "kind"),
        Index("ix_pilgrimage_owner_sealed", "owner_id", "sealed"),
        CheckConstraint(
            "(location_lat IS NULL AND location_lng IS NULL) "
            "OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)",
            name="ck_pilgrimage_lat_lng_paired",
        ),
        CheckConstraint(
            "stored_precision IN ('exact', '1km', '10km', "
            "'country', 'hidden')",
            name="ck_pilgrimage_precision",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    kind: SiteKind = Field(
        sa_column=Column(
            SQLEnum(
                SiteKind,
                name="pilgrimage_site_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    name: str = Field(max_length=240, nullable=False)
    story: Optional[str] = Field(default=None, sa_column=Column(Text))

    # The lat/lng AS STORED — already quantized to ``stored_precision``.
    # Finer precision is irreversibly lost.
    location_lat: Optional[float] = Field(default=None)
    location_lng: Optional[float] = Field(default=None)
    stored_precision: str = Field(default="hidden", max_length=16)

    sealed: bool = Field(default=False, nullable=False)

    # JSONB list of Entry IDs (UUID strings). Validated for owner
    # match at write time.
    linked_working_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
