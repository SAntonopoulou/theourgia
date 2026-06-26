"""Transliteration scheme reference (B113).

Per ``plan/08-batches-backend.md`` § B113.

Transliteration itself is client-side per the H06 spec; the server
stores the canonical reference tables so the client can verify its
output against them. Schemes are world-readable reference material.

Honesty rules (H06):
  * Every scheme carries a PD or open-standard citation.
  * The ``round_trip_status`` flag tells the practitioner whether
    the scheme is information-preserving:
        "lossless"   — round-trip exact
        "normalises" — strips or normalises some diacritics
        "lossy"      — diacritic / phonemic info is dropped
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["SchemeDirection", "TransliterationScheme"]


class SchemeDirection(str, enum.Enum):
    """Direction the scheme runs in."""

    SCRIPT_TO_LATIN = "script_to_latin"
    LATIN_TO_SCRIPT = "latin_to_script"


class TransliterationScheme(IDMixin, TimestampMixin, table=True):
    """A canonical transliteration mapping table."""

    __tablename__ = "transliteration_scheme"
    __table_args__ = (
        Index("ix_translit_scheme_slug", "slug", unique=True),
        Index("ix_translit_scheme_source_script", "source_script"),
    )

    # Stable slug (e.g., "greek-beta-code", "iast", "sbl-hebrew").
    slug: str = Field(max_length=120, nullable=False)
    name: str = Field(max_length=240, nullable=False)
    # one of greek / hebrew / sanskrit / arabic / coptic
    source_script: str = Field(max_length=40, nullable=False)
    direction: SchemeDirection = Field(
        sa_column=Column(
            SQLEnum(
                SchemeDirection,
                name="scheme_direction",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    mapping: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    source_citation: str = Field(max_length=480, nullable=False)
    # "lossless" / "normalises" / "lossy"
    round_trip_status: str = Field(max_length=16, nullable=False)
