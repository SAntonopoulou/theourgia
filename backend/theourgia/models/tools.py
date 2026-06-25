"""Tool + Altar models (B106).

Per `plan/07-workshop.md` § Tool & Altar Registry and the H05 designer
handoff. A ``Tool`` is one consecrated implement (athame · wand ·
chalice · …); an ``Altar`` is a named arrangement of tools.

Honesty rule (H05): ``consecration_date`` and
``consecration_working_entry_id`` cannot be set directly via PATCH.
They are set together, atomically, by the
``POST /tools/{id}/consecrate`` sub-resource — which requires a
real working entry. The API layer enforces this; the model permits
the columns to be nullable so the sub-resource flow can update them.
"""

from __future__ import annotations

import enum
from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Tool", "ToolKind", "Altar"]


class ToolKind(str, enum.Enum):
    """The fourteen tool kinds the H05 spec accepts.

    ``OTHER`` lets the practitioner record an implement whose name
    doesn't fit the conventional categories.
    """

    ATHAME = "athame"
    WAND = "wand"
    CHALICE = "chalice"
    PENTACLE = "pentacle"
    CENSER = "censer"
    BELL = "bell"
    SWORD = "sword"
    LAMP = "lamp"
    MIRROR = "mirror"
    BOWL = "bowl"
    STATUE = "statue"
    ROBE = "robe"
    CINGULUM = "cingulum"
    OTHER = "other"


class Tool(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One consecrated (or unconsecrated) implement in the
    practitioner's vault."""

    __tablename__ = "tool"
    __table_args__ = (
        Index("ix_tool_owner", "owner_id"),
        Index("ix_tool_kind", "kind"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    kind: ToolKind = Field(
        sa_column=Column(
            SQLEnum(
                ToolKind,
                name="tool_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    # materials = ["beech wood", "copper inlay", ...]
    materials: list[str] = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # dimensions = { length_cm?, width_cm?, height_cm?, weight_g? }
    dimensions: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    # photo_upload_ids = [<upload.id>, ...]
    photo_upload_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    provenance: Optional[str] = Field(default=None, sa_column=Column(Text))
    acquisition_date: Optional[date] = Field(default=None)

    # Consecration — set only by /tools/{id}/consecrate.
    consecration_date: Optional[date] = Field(default=None)
    consecration_working_entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    current_location: Optional[str] = Field(default=None, max_length=480)


class Altar(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A named arrangement of tools."""

    __tablename__ = "altar"
    __table_args__ = (Index("ix_altar_owner", "owner_id"),)

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    # tool_ids = [<tool.id>, ...] — order is render order on the diagram
    tool_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    arrangement_diagram_svg: Optional[str] = Field(
        default=None, sa_column=Column(Text),
    )
    photo_upload_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    is_permanent: bool = Field(default=False, nullable=False)
    linked_working_entry_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
