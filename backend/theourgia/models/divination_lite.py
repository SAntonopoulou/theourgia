"""Lightweight Phase 06 divination models — Pendulum, Bibliomancy,
Horary, Scrying.

These four kinds share the "capture + interpret" shape rather than
the "shuffle + draw" shape used by Tarot / I Ching / Geomancy /
Runes. Bundled together for migration economy; the API routers are
still per-kind for clarity.

Per ``plan/06-divination-and-practice.md`` §§5-8.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "BibliomancyReading",
    "BibliomancyPassageKind",
    "HoraryReading",
    "PendulumOutcome",
    "PendulumReading",
    "ScryingMode",
    "ScryingSession",
]


# ───── Pendulum ──────────────────────────────────────────────────────


class PendulumOutcome(str, enum.Enum):
    """The four canonical pendulum outcomes.

    ``no_response`` is its own value — distinct from a "no" — and
    indicates the pendulum failed to indicate clearly.
    """

    YES = "yes"
    NO = "no"
    MAYBE = "maybe"
    NO_RESPONSE = "no_response"


class PendulumReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One pendulum consultation."""

    __tablename__ = "pendulum_reading"
    __table_args__ = (
        Index("ix_pendulum_reading_owner_id", "owner_id"),
        Index("ix_pendulum_reading_asked_at", "asked_at"),
    )

    question: str = Field(sa_column=Column(Text, nullable=False))

    asked_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    outcome: PendulumOutcome = Field(
        sa_column=Column(
            SQLEnum(
                PendulumOutcome,
                name="pendulum_outcome",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    confidence: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description="1..5 — how confident the practitioner was in the read.",
    )

    board_image_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional pendulum-board image the user uploaded.",
    )

    board_landing: Optional[dict[str, object]] = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
        description=(
            "When using board mode: { x, y, label?, sector? } "
            "describing where the pendulum landed."
        ),
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # Calibration: when the practitioner can later verify the outcome
    # against reality, they mark the reading correct / incorrect /
    # ambiguous. Powers the per-user accuracy log.
    calibration: Optional[str] = Field(
        default=None,
        sa_column=Column(String(32), nullable=True),
        description='"correct" / "incorrect" / "ambiguous" / NULL.',
    )

    calibration_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
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

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


# ───── Bibliomancy ───────────────────────────────────────────────────


class BibliomancyPassageKind(str, enum.Enum):
    LINE = "line"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"


class BibliomancyReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One bibliomancy consultation."""

    __tablename__ = "bibliomancy_reading"
    __table_args__ = (
        Index("ix_bibliomancy_reading_owner_id", "owner_id"),
        Index("ix_bibliomancy_reading_drawn_at", "drawn_at"),
        Index("ix_bibliomancy_reading_book_id", "book_id"),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    book_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("book.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Source book, when the text came from the catalog.",
    )

    source_label: str = Field(
        sa_column=Column(String(512), nullable=False),
        description=(
            'Human label for the source — book title + edition or '
            '"User-supplied text". The full text is NOT persisted '
            "by default; only the drawn passage."
        ),
    )

    passage_kind: BibliomancyPassageKind = Field(
        default=BibliomancyPassageKind.PARAGRAPH,
        sa_column=Column(
            SQLEnum(
                BibliomancyPassageKind,
                name="bibliomancy_passage_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="paragraph",
        ),
    )

    seed: str = Field(sa_column=Column(String(256), nullable=False))

    drawn_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    drawn_passage: str = Field(sa_column=Column(Text, nullable=False))

    start_offset: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Character offset of the passage in the source text.",
    )

    passage_index: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="0-based index of the drawn passage among all passages of this kind.",
    )

    total_passages: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Total passages of this kind in the source.",
    )

    interpretation: Optional[str] = Field(
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

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


# ───── Horary ────────────────────────────────────────────────────────


class HoraryReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """Horary chart — astrology cast at the moment of question.

    Composes the Phase 03 chart engine. The chart itself isn't
    persisted in detail (the engine is deterministic from the
    asked_at + location); we store the inputs + a compact summary
    that the API rederives on read.
    """

    __tablename__ = "horary_reading"
    __table_args__ = (
        Index("ix_horary_reading_owner_id", "owner_id"),
        Index("ix_horary_reading_asked_at", "asked_at"),
    )

    question: str = Field(sa_column=Column(Text, nullable=False))

    asked_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
        description="The chart instant — moment the question was conceived.",
    )

    latitude: float = Field(sa_column=Column(Float, nullable=False))
    longitude: float = Field(sa_column=Column(Float, nullable=False))

    location_label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description="Human label for the location (city / shrine name).",
    )

    chart_snapshot: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Compact JSON projection of the chart at asked_at — "
            "ascendant, midheaven, planet positions + houses + "
            "aspects. Snapshot for fast read; the engine can "
            "rederive from asked_at + lat/lon if needed."
        ),
    )

    significator_querent: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description="Body assigned as the querent's significator (e.g. Ascendant ruler).",
    )

    significator_quesited: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description="Body assigned as the matter's significator.",
    )

    perfection_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Notes on perfection conditions — by application, "
            "translation of light, collection of light, etc."
        ),
    )

    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    retrospective_rating: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
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

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


# ───── Scrying ───────────────────────────────────────────────────────


class ScryingMode(str, enum.Enum):
    """Scrying medium."""

    WATER_BOWL = "water_bowl"
    BLACK_MIRROR = "black_mirror"
    CRYSTAL = "crystal"
    FIRE = "fire"
    SMOKE = "smoke"
    INK_IN_WATER = "ink_in_water"
    CANDLE_FLAME = "candle_flame"
    OTHER = "other"


class ScryingSession(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One scrying session.

    Composes the public-site trance-mode UI. The admin captures the
    session metadata + post-session notes + symbols + optional sketch.
    """

    __tablename__ = "scrying_session"
    __table_args__ = (
        Index("ix_scrying_session_owner_id", "owner_id"),
        Index("ix_scrying_session_started_at", "started_at"),
        Index("ix_scrying_session_mode", "mode"),
    )

    mode: ScryingMode = Field(
        sa_column=Column(
            SQLEnum(
                ScryingMode,
                name="scrying_mode",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    started_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    ended_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
        description="NULL while the session is in progress.",
    )

    intention: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    preparation_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Ambient conditions, preparatory rite, light level, sound.",
    )

    entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="The entity invoked / consulted, when applicable.",
    )

    vision_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Post-session free-form vision notes.",
    )

    symbols: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Extracted symbols — feed the dream-symbol-style cross-"
            "session index. Plain string tags."
        ),
    )

    sketch_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    voice_memo_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    planetary_hour: Optional[str] = Field(
        default=None,
        sa_column=Column(String(32), nullable=True),
        description="Snapshot of the planetary hour at start (composes Phase 03).",
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional link to a scrying-kind entry if the user wrote one up.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
