"""Custom magic square model.

Per `plan/07-workshop.md` § Magic squares + the H05 designer handoff.

The **seven Agrippa planetary squares** ship as immutable Python
constants in :mod:`theourgia.core.workshop.planetary_squares` — they
do NOT live in this table. This model only holds **custom user
squares** (the practitioner's own constructions outside the seven
canonical ones).

The H05 honesty rule: custom squares are mutable in Build mode
until saved; the seven planetary squares are immutable. The Build
mode is disabled when the user has a planetary square active.

``is_magic`` is computed at save time by the API layer via
:func:`theourgia.core.workshop.planetary_squares.is_valid_magic_square`
and stored on the row. The Trace UX cares: a non-magic square has
no meaningful traditional planetary sigil to overlay.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["MagicSquare"]


class MagicSquare(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One custom magic square in the practitioner's vault.

    Order is constrained 3-12. ``cells`` is a JSONB 2D array;
    ``is_magic`` is server-computed at save time.
    """

    __tablename__ = "magic_square"
    __table_args__ = (
        Index("ix_magic_square_owner", "owner_id"),
        Index("ix_magic_square_order", "order"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    # Order of the square (n × n). 3-12 enforced at the API layer.
    order: int = Field(ge=3, le=12, nullable=False)
    # 2D int matrix. JSONB so the shape can be a list of lists.
    cells: list[list[int]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # Optional attribution text — free-form for traditions outside
    # the seven planetary (e.g., "Lo Shu", "user's invention",
    # "Picatrix variant").
    attribution: Optional[str] = Field(default=None, max_length=480)
    # Server-computed at save time: do rows + cols + main diagonals
    # all sum to the magic constant? Read-only from the API
    # perspective.
    is_magic: bool = Field(default=False, nullable=False)
