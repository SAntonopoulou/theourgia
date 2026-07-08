"""Recipe — incense, oil, wash, philtre.

b108-2gy · FEATURES §10 · "Recipe builder".

A named preparation with a list of ingredients, method steps, and
optional correspondences (planetary, elemental, decan) that inform
the timing + consecration.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin


__all__ = ["Recipe", "RecipeKind"]


class RecipeKind(str, enum.Enum):
    INCENSE = "incense"
    OIL = "oil"
    WASH = "wash"
    PHILTRE = "philtre"
    OTHER = "other"


class Recipe(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "recipe"
    __table_args__ = (
        Index("ix_recipe_owner", "owner_id"),
        Index("ix_recipe_owner_kind", "owner_id", "kind"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    kind: RecipeKind = Field(
        sa_column=Column(
            SQLEnum(
                RecipeKind,
                name="recipe_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    name: str = Field(max_length=240, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    # ingredients: [{ "name": str, "amount": str, "notes": str? }, ...]
    ingredients: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # steps: [{ "text": str, "duration_minutes": int? }, ...]
    steps: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # Correspondences shine here — planetary/elemental/decan/other are
    # a free-form dict of key: value pairs.
    correspondences: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    # Optional links to source library rows and entity/deity rows.
    library_source_ids: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    entity_ids: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # visibility mirrors Publication / Entry visibility — for now
    # everything defaults to "personal" and there's no export path;
    # the frontend still surfaces the picker so downstream federation
    # gets the metadata for free.
    visibility: str = Field(
        default="personal", max_length=16, nullable=False
    )
