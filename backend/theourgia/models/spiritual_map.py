"""Spiritual maps — the correspondence charts, brought over from the phone.

Sophia, 15 August 2026: *"we need to add the correspondances charts to the web
app … the mobile application being the source of truth."*

⚠ **The model is the PHONE's**, deliberately and almost verbatim. It is at
`practiseapp/lib/domain/spiritual_map.dart`, it is older and better thought
through than anything here, and the whole point of the convergence is that
these two stop disagreeing. Inventing a second shape on this side would be the
drift the exercise exists to prevent.

## ⚠ The load-bearing decision, inherited: a correspondence is not a property

From the Dart, and it is why this table has a JSONB document rather than a
nest of joined tables:

> *a correspondence attaches to whatever **carries** it — a node, an edge, a
> line, a shape, or a group. A model that hung correspondences on nodes could
> not say that a triangle is Fire, or that a row is a world.*

So a map arrives whole. `document` holds the nodes, edges, lines, shapes,
groups, ascent and words exactly as the pack shipped them, and the columns
beside it are only what a list needs in order to be a list: what it is called,
whose tradition it belongs to, and how big it is.

⚠ **Not shredded into rows.** A relational decomposition here would have to
decide, for every one of those five carriers, which of its fields are worth
columns — and would then have to be migrated every time the phone learns a new
one. The phone is the source of truth; this side stores what it was given and
reads it back unchanged.

## ⚠ A correspondence carries its own standing

Each one is `{kind, value, detail, provenance, standing}`. `provenance` says
whether it is **attested** or somebody's extension; `standing` says whether it
is **locked** or open to revision. Neither is decoration — a chart that showed
an attested Fire and an inferred one identically would be making a claim the
sources do not support, which is the same failure a Rodden rating exists to
prevent elsewhere in this estate.

Both travel inside `document` and neither is invented here.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["SpiritualMap"]


class SpiritualMap(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One correspondence chart, as its pack published it."""

    __tablename__ = "spiritual_map"
    __table_args__ = (
        # ⚠ One map per (owner, slug). Importing the same pack twice updates
        # rather than accumulates — a practitioner who reinstalls their order's
        # calendar should not end up with two Tetraktyses.
        UniqueConstraint("owner_id", "slug", name="uq_spiritual_map_owner_slug"),
        Index("ix_spiritual_map_owner", "owner_id", "deleted_at"),
        Index("ix_spiritual_map_tradition", "tradition"),
    )

    owner_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
    )

    #: The pack-local ref, kebabed. ⚠ Stable across reimports, which is what
    #: makes the unique constraint above a merge rather than a collision.
    slug: str = Field(sa_column=Column(String(128), nullable=False))

    name: str = Field(sa_column=Column(String(256), nullable=False))

    #: Whose practice this is — "The Keybearers". ⚠ Not a free-text note: a
    #: map read outside the tradition that drew it is a different claim, and
    #: the chart says so where a reader can see it.
    tradition: str = Field(
        default="", sa_column=Column(String(256), nullable=False, server_default="")
    )

    summary: str = Field(default="", sa_column=Column(Text, nullable=False, server_default=""))

    #: The whole map: nodes, edges, lines, shapes, groups, ascent, words.
    #:
    #: ⚠ Stored as the pack shipped it. See the module note — this is not
    #: laziness, it is the decision that keeps the two products from drifting.
    document: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))

    #: What the map is made of, so a directory can say so without opening the
    #: document. ⚠ Derived at import, never authored.
    node_count: int = Field(
        default=0, sa_column=Column(Integer, nullable=False, server_default="0")
    )
    correspondence_count: int = Field(
        default=0, sa_column=Column(Integer, nullable=False, server_default="0")
    )

    #: Which bundle it arrived in, so provenance survives the import.
    source_slug: str = Field(
        default="", sa_column=Column(String(128), nullable=False, server_default="")
    )
