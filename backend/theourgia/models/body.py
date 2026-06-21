"""Body sensation diagram — snapshot data model.

A `BodySnapshot` is one snapshot of the practitioner's felt
experience after a working: markers placed on body silhouettes with
sensation type, intensity, colour, and per-marker notes. Embedded
into journal entries via the `<sensation>` Tiptap block (Phase 04
Batch 35).

The SVG silhouette art is a **designer hand-off** (see
designer_handoff_02.handoff §7). The data model here is independent
of the art — markers carry their coordinates in normalised
(0..1, 0..1) silhouette space so swapping in new silhouettes
later doesn't invalidate existing snapshots.

Marker shape (JSON):
```
{
  "silhouette": "front" | "back" | "side-left" | "side-right" | "palm" | "sole",
  "x": 0.0..1.0,
  "y": 0.0..1.0,
  "sensation": "warmth" | "pressure" | "vibration" | "tingling"
              | "pulling" | "void" | "electric" | "expansion"
              | "contraction" | "pain" | "pleasure" | "other",
  "intensity": 0..10,
  "color": "#hexrgb",
  "note": "free-form, optional"
}
```

The full markers list is stored as a JSON text column (`markers_json`)
for simple round-trip. A typed Pydantic model lives at the API layer
(:mod:`theourgia.api.routers.v1.body_snapshots` when that router
lands in Phase 04 wiring).
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, String, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["BodySnapshot"]


class BodySnapshot(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One body-sensation snapshot.

    Linked from :class:`theourgia.models.entries.Entry` via
    ``body_snapshot_id`` (the Entry column already exists from
    Batch 28). One entry can reference at most one body_snapshot
    today; richer multi-snapshot composition lands when the journal
    timeline UX is settled.
    """

    __tablename__ = "body_snapshot"
    __table_args__ = (
        Index("ix_body_snapshot_owner_id", "owner_id"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description='Optional caption — "After Beltane working" etc.',
    )

    markers_json: str = Field(
        sa_column=Column(Text, nullable=False, server_default="[]"),
        description=(
            "JSON-serialised list of markers. Each marker has "
            "silhouette / x / y / sensation / intensity / color / note. "
            "Empty list means a snapshot with no marker placed (a "
            "'felt nothing in particular' record)."
        ),
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Free-form notes alongside the markers.",
    )

    body_morphology: str = Field(
        default="default",
        sa_column=Column(String(64), nullable=False, server_default="default"),
        description=(
            "Which silhouette set the markers reference. Plugin "
            "silhouettes can register additional values; the renderer "
            "looks up the SVG by this key. Default 'default' = the "
            "neutral silhouette set."
        ),
    )
