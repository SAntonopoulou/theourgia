"""Astragaloi cast history model.

One row per throw of the five knucklebones. The resolved reading —
god, verses, valence, tetraktys channel — is **denormalised onto the
row at cast time** so the operator's history survives later corpus
edits (Nollé collation will change verses; recorded readings must
show what was actually read).

Rule 67: a cast whose faces were generated server-side is marked
``simulated`` forever — there is no API path that clears the flag.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import Entry  # noqa: F401 — FK target registration

__all__ = ["AstragaloiCast", "AstragaloiOctave", "AstragaloiValence"]


class AstragaloiValence(str, enum.Enum):
    """The castsheet legend's three keys (✓ / ⏳ / ✗)."""

    FAVOURABLE = "favourable"
    CAUTIONARY = "cautionary"
    UNFAVOURABLE = "unfavourable"


class AstragaloiOctave(str, enum.Enum):
    """Tetraktys overlay octave band (sum ≤10 / 11–20 / 21–30)."""

    LUMINOUS = "luminous"
    EMBODIED = "embodied"
    CHTHONIC = "chthonic"


_valence_enum = SQLEnum(
    AstragaloiValence,
    name="astragaloi_valence",
    values_callable=lambda obj: [m.value for m in obj],
)
_octave_enum = SQLEnum(
    AstragaloiOctave,
    name="astragaloi_octave",
    values_callable=lambda obj: [m.value for m in obj],
)


class AstragaloiCast(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A recorded throw of the five astragaloi."""

    __tablename__ = "astragaloi_cast"
    __table_args__ = (
        Index("ix_astragaloi_cast_owner_id", "owner_id"),
        Index("ix_astragaloi_cast_cast_at", "cast_at"),
        Index("ix_astragaloi_cast_valence", "valence"),
        Index("ix_astragaloi_cast_sphere", "sphere"),
        Index("ix_astragaloi_cast_simulated", "simulated"),
    )

    # — The throw ————————————————————————————————————
    faces: list[int] = Field(
        sa_column=Column(JSONB, nullable=False),
        description="Five faces, stored sorted ascending; each ∈ {1,3,4,6}.",
    )

    cast_sum: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Sum of the faces (5–30; 6 and 29 impossible).",
    )

    simulated: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
        description=(
            "True when the faces were generated server-side (RNG). "
            "Rule 67: FOREVER — no update path clears this."
        ),
    )

    cast_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
        description="When the bones were thrown (or the RNG rolled).",
    )

    # — The asking ———————————————————————————————————
    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="The question / context the operator brought to the throw.",
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description="Optional linked journal entry (e.g. the working asked about).",
    )

    declared_intent: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Optional declared-intent text carried with the cast — the "
            "covenant wording as it stood when the bones were thrown."
        ),
    )

    # — Resolved reading snapshot (denormalised) ————————————
    oracle_number: str = Field(
        sa_column=Column(String(8), nullable=False),
        description="Roman numeral of the corpus row (I–LVI).",
    )

    god_greek: str = Field(sa_column=Column(String(128), nullable=False))
    god_english: str = Field(sa_column=Column(String(128), nullable=False))

    verse_greek: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Heinevetter Greek at cast time; NULL where not preserved.",
    )

    verse_english: str = Field(
        sa_column=Column(Text, nullable=False),
        description="The English rendering as it stood at cast time.",
    )

    valence: AstragaloiValence = Field(
        sa_column=Column(_valence_enum, nullable=False),
    )

    sphere: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Tetraktys sphere 1–10 (sum mod 10, 0→10).",
    )

    octave: AstragaloiOctave = Field(
        sa_column=Column(_octave_enum, nullable=False),
    )

    ground_element: str = Field(
        sa_column=Column(String(16), nullable=False),
        description="Scheme A ground element of the sphere row.",
    )

    # — The operator's own reading ————————————————————
    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="The operator's own interpretation — never generated.",
    )

    # — Ownership ————————————————————————————————————
    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )
