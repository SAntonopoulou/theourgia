"""Magical Circle model (B105).

Per `plan/07-workshop.md` § Magical Circles and the H05 designer
handoff (`agent_data_and_components_H05.md` § Circle). A
``Circle`` is the practitioner's saved circle composition — diameter,
ordered rings (inscriptions / glyph rows / sigils / blank /
multi-glyph), compass tradition (four-archangel · four-greek-winds ·
four-watchtowers · vedic-dikpalas · custom), and centre element.

Composition shape follows the H05 worked example. Each ring is a
dict; their order in the array is render order (outermost first).
Centre element references a sigil or magic square id when the kind
is ``sigil`` or ``kamea_trace``.

Preset circles ship as Python constants in
:mod:`theourgia.core.workshop.preset_circles` — the practitioner
loads one via POST and the row is created without a
``parent_circle_id`` (presets are templates, not parents).

Honesty rules (H05):
  · Rings array must have 1-6 entries.
  · Centre-element ``sigil_id`` / ``square_id`` must reference rows
    in the same vault (or be one of the seven planetary fixtures).
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

__all__ = ["Circle", "CompassTradition"]


class CompassTradition(str, enum.Enum):
    """The five compass-point traditions the H05 spec accepts."""

    ARCHANGELS = "archangels"          # Raphael / Michael / Gabriel / Uriel
    GREEK_WINDS = "greek_winds"        # Boreas / Notos / Euros / Zephyros
    WATCHTOWERS = "watchtowers"        # Enochian Air / Fire / Water / Earth
    VEDIC_DIKPALAS = "vedic_dikpalas"  # Kubera / Yama / Indra / Varuna
    CUSTOM = "custom"                  # free-text fields


class Circle(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One saved magical circle in the practitioner's vault."""

    __tablename__ = "circle"
    __table_args__ = (
        Index("ix_circle_owner", "owner_id"),
        Index("ix_circle_parent", "parent_circle_id"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    purpose: str = Field(sa_column=Column(Text, nullable=False))
    diameter_m: float = Field(default=2.0, nullable=False)
    # rings = [{ kind: 'inscription'|'glyph_row'|'image'|'blank'|'multi_glyph',
    #            content, direction?, rotation_deg?, ... }, ... ]
    rings: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    compass_tradition: CompassTradition = Field(
        sa_column=Column(
            SQLEnum(
                CompassTradition,
                name="compass_tradition",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    # compass_points = { N: '...', E: '...', S: '...', W: '...' } plus
    # optional NE/SE/SW/NW for traditions that use eight quarters.
    compass_points: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    # centre_element = { kind: 'pentagram'|'hexagram'|'unicursal'|
    #                          'solomonic_seal'|'sigil'|'kamea_trace'|'blank',
    #                    sigil_id?, square_id?, ... }
    centre_element: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    # Provenance for forked-from-preset circles.
    citation: Optional[str] = Field(default=None, max_length=480)

    parent_circle_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("circle.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
