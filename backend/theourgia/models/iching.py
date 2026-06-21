"""I Ching — hexagrams + reading log.

Per `plan/06-divination-and-practice.md` §2. Two tables:

* ``hexagram`` — the 64 King Wen hexagrams as catalog data. Bundled
  text (judgment + image + per-line text + trigram metadata) lives in
  these rows. User-editable per-hexagram interpretation notes go in
  a separate row (`hexagram_user_note` — follow-up batch) so the
  bundle stays immutable.
* ``iching_reading`` — one cast: method, seed, drawn lines, primary
  + transformation numbers, interpretation, retrospective rating.

The engine is deterministic from the seed; the persistence layer
just stores the inputs + the resulting lines.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "Hexagram",
    "IChingCastMethod",
    "IChingReading",
    "Trigram",
]


class Trigram(str, enum.Enum):
    """The eight trigrams (bagua). Stored on the Hexagram row for fast
    upper / lower lookup and filtering."""

    QIAN = "qian"  # ☰ Heaven — yang yang yang
    DUI = "dui"  # ☱ Lake — yin yang yang (top down) / yang yang yin (bottom up)
    LI = "li"  # ☲ Fire — yin yang (top down) → yang yin yang (bottom up)
    ZHEN = "zhen"  # ☳ Thunder — yin yin yang (bottom up)
    XUN = "xun"  # ☴ Wind — yang yang yin (bottom up)
    KAN = "kan"  # ☵ Water — yin yang yin (bottom up)
    GEN = "gen"  # ☶ Mountain — yin yin yang (bottom up)
    KUN = "kun"  # ☷ Earth — yin yin yin


class IChingCastMethod(str, enum.Enum):
    THREE_COINS = "three_coins"
    YARROW_STALKS = "yarrow_stalks"


class Hexagram(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One of the 64 King Wen hexagrams (bundled data)."""

    __tablename__ = "hexagram"
    __table_args__ = (
        Index("ix_hexagram_number", "number"),
        Index("ix_hexagram_lower_trigram", "lower_trigram"),
        Index("ix_hexagram_upper_trigram", "upper_trigram"),
        UniqueConstraint("number", name="uq_hexagram_number"),
    )

    number: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="King Wen sequence number, 1..64. Stable.",
    )

    name_pinyin: str = Field(
        sa_column=Column(String(64), nullable=False),
        description='Pinyin name — "Qián", "Kūn".',
    )

    name_english: str = Field(
        sa_column=Column(String(128), nullable=False),
        description='Conventional English name — "The Creative", "The Receptive".',
    )

    binary_pattern: str = Field(
        sa_column=Column(String(6), nullable=False),
        description=(
            "Six characters, each '1' (yang / solid) or '0' (yin / "
            "broken). Bottom-up: position 0 is line 1, position 5 is "
            "line 6."
        ),
    )

    lower_trigram: Trigram = Field(
        sa_column=Column(
            SQLEnum(
                Trigram,
                name="trigram",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    upper_trigram: Trigram = Field(
        sa_column=Column(
            SQLEnum(
                Trigram,
                name="trigram",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
    )

    judgment: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Bundled judgment text (PD source).",
    )

    image: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Bundled 'image' / structural commentary text (PD source).",
    )

    line_texts: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Six line texts, bottom-up. Each is the canonical "
            "interpretation of a changing line in that position. "
            "Empty list when bundle data not yet seeded."
        ),
    )

    correspondences: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Free-form correspondences — season, direction, family "
            "relation, element. Tradition-specific keys allowed."
        ),
    )


class IChingReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One I Ching reading."""

    __tablename__ = "iching_reading"
    __table_args__ = (
        Index("ix_iching_reading_owner_id", "owner_id"),
        Index("ix_iching_reading_drawn_at", "drawn_at"),
        Index("ix_iching_reading_primary", "primary_hexagram_number"),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    method: IChingCastMethod = Field(
        default=IChingCastMethod.THREE_COINS,
        sa_column=Column(
            SQLEnum(
                IChingCastMethod,
                name="iching_cast_method",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="three_coins",
        ),
    )

    seed: str = Field(
        sa_column=Column(String(256), nullable=False),
        description="Cast seed; same seed + same method = same six lines.",
    )

    drawn_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    # The six lines stored as a JSON array of four allowed strings.
    # The engine returns a tuple of LineKind values; the persistence
    # layer normalises to .value strings.
    lines: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Six entries, bottom-up. Each is one of 'old_yin' / "
            "'young_yang' / 'young_yin' / 'old_yang'."
        ),
    )

    primary_hexagram_number: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="King Wen number 1..64 of the drawn hexagram.",
    )

    transformation_hexagram_number: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description=(
            "King Wen number 1..64 of the transformation hexagram "
            "(after changing-line flips). NULL when no lines changed."
        ),
    )

    changing_line_indices: list[int] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="1-based indices, bottom-up.",
    )

    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    retrospective_rating: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description="1..5 retrospective accuracy rating.",
    )

    retrospective_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    working_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
