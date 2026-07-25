"""Tetraktys ladder curriculum models (Sprint I-B, Domain 3).

The operator climbs the tetraktys as a serpent walk over the ten
spheres — 10→9→8→7→4→5→6→3→2→1 — each sphere carrying a curriculum
(readings, practices, deliverables) and a gate that must be passed to
move on. Spheres later in the walk are *locked*: their curriculum is
returned only as counts (sealed) until the walk reaches them.

* :class:`LadderSphere` — the ten spheres of the ladder itself. A
  global, migration-seeded catalog: both the sphere **number** (its
  place in the tetraktys figure) and its **walk position** (its place
  in the serpent order) are stored, because the walk interleaves the
  rows of the figure.
* :class:`CurriculumItem` — one owner-scoped item of a sphere's
  curriculum.
* :class:`SphereGate` — the owner's gate record per sphere:
  requirements prose, the pass stamp, an optional preceptor
  countersign, and an optional sealed link to an initiation record.

Current position is **derived**, never stored: the first sphere in
walk order whose gate isn't passed.
"""

from __future__ import annotations

import enum
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
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import Entry  # noqa: F401 — FK target registration
from theourgia.models.initiations import Initiation  # noqa: F401 — FK target registration

__all__ = [
    "SERPENT_WALK",
    "SPHERE_NAMES",
    "CurriculumItem",
    "CurriculumItemKind",
    "LadderSphere",
    "SphereGate",
]


# The fixed serpent walk (H12 SERPENT_ORDER — interleaves the rows of
# the tetraktys figure). Index = walk_position - 1.
SERPENT_WALK: tuple[int, ...] = (10, 9, 8, 7, 4, 5, 6, 3, 2, 1)

# The operator's Greek names per sphere number. 10 is Hekate's — the
# Decad; the rest carry the Pythagorean number names.
SPHERE_NAMES: dict[int, str] = {
    10: "Hekate / Decad",
    9: "Ennead",
    8: "Ogdoad",
    7: "Hebdomad",
    6: "Hexad",
    5: "Pentad",
    4: "Tetrad",
    3: "Triad",
    2: "Dyad",
    1: "Monad",
}


class CurriculumItemKind(str, enum.Enum):
    READING = "reading"
    PRACTICE = "practice"
    DELIVERABLE = "deliverable"


class LadderSphere(IDMixin, TimestampMixin, table=True):
    """One sphere of the ladder. Global catalog, seeded by migration."""

    __tablename__ = "ladder_sphere"
    __table_args__ = (
        UniqueConstraint("number", name="uq_ladder_sphere_number"),
        UniqueConstraint("walk_position", name="uq_ladder_sphere_walk_position"),
    )

    number: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Sphere number in the tetraktys figure (1–10).",
    )

    name: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="Greek name — Monad … Ennead, Hekate / Decad.",
    )

    walk_position: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="1-based position in the serpent walk 10→9→8→7→4→5→6→3→2→1.",
    )


class CurriculumItem(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One item of a sphere's curriculum, owned by the operator."""

    __tablename__ = "curriculum_item"
    __table_args__ = (
        Index("ix_curriculum_item_sphere_id", "sphere_id"),
        Index("ix_curriculum_item_owner_id", "owner_id"),
    )

    sphere_id: UUID = Field(
        sa_column=Column(
            ForeignKey("ladder_sphere.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )

    kind: CurriculumItemKind = Field(
        sa_column=Column(
            SQLEnum(
                CurriculumItemKind,
                name="curriculum_item_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    title: str = Field(sa_column=Column(String(256), nullable=False))

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    required_for_gate: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
        description="Gate-blocking: the sphere's gate cannot pass until done.",
    )

    completed_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    evidence_entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Dated evidence — the journal entry that proves the work.",
    )


class SphereGate(IDMixin, TimestampMixin, table=True):
    """The owner's gate record for one sphere. Lazily created."""

    __tablename__ = "sphere_gate"
    __table_args__ = (
        UniqueConstraint(
            "owner_id", "sphere_id", name="uq_sphere_gate_owner_sphere",
        ),
        Index("ix_sphere_gate_sphere_id", "sphere_id"),
        Index("ix_sphere_gate_owner_id", "owner_id"),
    )

    sphere_id: UUID = Field(
        sa_column=Column(
            ForeignKey("ladder_sphere.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )

    requirements: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="What the gate demands, in the operator's words.",
    )

    passed_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    countersign: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description="Preceptor countersign, when one was given.",
    )

    initiation_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("initiation.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Sealed oath / initiation record linked to this gate.",
    )
