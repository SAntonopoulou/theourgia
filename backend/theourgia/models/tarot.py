"""Tarot — deck, card, spread, reading.

Per `plan/06-divination-and-practice.md` §1. The Tarot ledger is the
anchor for Phase 06 divination: every reading is a first-class
record with full context (question, querent state, drawn cards
including reversals, position-level interpretation, overall
interpretation, retrospective outcome rating).

Design decisions baked into the schema here:

* **Deterministic draws.** A reading carries the ``seed`` it was
  drawn with so the sequence is reproducible. The engine in
  :mod:`theourgia.core.divination.tarot` is pure; same deck + same
  seed + same spread = same cards.
* **Stable card identity per deck.** ``Card.position`` is the
  sequence number within the deck (0..77 for a standard 78-card
  deck). Position is what the engine references; the per-card
  ``slug`` is the human identifier.
* **User-editable meanings.** Each card carries the traditional
  meanings (immutable, from the bundle) AND per-user overrides via
  the optional ``CardUserNote`` model — Phase 06 follow-up batch.
  This shape ships the immutable bundle columns now; per-user
  meanings are a separate row to keep deck distribution clean.
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
    "Card",
    "CardOrientation",
    "Deck",
    "DeckTradition",
    "DrawMethod",
    "Reading",
    "Spread",
    "SpreadKind",
    "Suit",
]


# ───── Enums ──────────────────────────────────────────────────────────


class DeckTradition(str, enum.Enum):
    """Bundled / known traditions. ``other`` for custom + user decks."""

    MARSEILLE = "marseille"
    RIDER_WAITE = "rider_waite"
    THOTH = "thoth"
    ETTEILLA = "etteilla"
    SOLA_BUSCA = "sola_busca"
    ORACLE = "oracle"
    CUSTOM = "custom"
    OTHER = "other"


class Suit(str, enum.Enum):
    """The four suits + the special ``major`` indicator for arcana
    cards that aren't part of a suit.

    Names are tradition-neutral; per-tradition labels (Wands /
    Batons / Bâtons / Clubs) live in ``Card.name_translations`` for
    the bundles that need them.
    """

    MAJOR = "major"
    WANDS = "wands"
    CUPS = "cups"
    SWORDS = "swords"
    PENTACLES = "pentacles"


class CardOrientation(str, enum.Enum):
    """How a drawn card sat in the spread."""

    UPRIGHT = "upright"
    REVERSED = "reversed"


class SpreadKind(str, enum.Enum):
    """Built-in spread shapes. Custom spreads are stored as ``custom``
    with their layout in :attr:`Spread.layout_json`.
    """

    SINGLE = "single"
    THREE_CARD = "three_card"
    HORSESHOE = "horseshoe"
    CELTIC_CROSS = "celtic_cross"
    TREE_OF_LIFE = "tree_of_life"
    YEAR_AHEAD = "year_ahead"
    RELATIONSHIP = "relationship"
    CUSTOM = "custom"


class DrawMethod(str, enum.Enum):
    """How the cards were drawn for this reading."""

    BROWSER_RNG = "browser_rng"
    PHYSICAL = "physical"  # User shuffled in real life and entered the cards.
    HASH_OF_QUESTION = "hash_of_question"  # Deterministic on the question text.
    MENTAL = "mental"  # User chose by intuition without shuffling.


# ───── Deck ───────────────────────────────────────────────────────────


class Deck(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One tarot deck — built-in (PD bundle) or user-created."""

    __tablename__ = "deck"
    __table_args__ = (
        Index("ix_deck_owner_id", "owner_id"),
        Index("ix_deck_tradition", "tradition"),
        Index("ix_deck_is_builtin", "is_builtin"),
    )

    name: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    slug: str = Field(
        sa_column=Column(String(128), nullable=False),
        description=(
            "Stable identifier for built-in decks ('rider-waite-smith', "
            "'marseille-conver'). User decks get a UUID-derived slug."
        ),
    )

    creator: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description="Deck creator / artist credit.",
    )

    license: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description="SPDX-style identifier or free-form: 'CC0', 'public-domain', 'CC-BY-4.0'.",
    )

    language: str = Field(
        default="en",
        sa_column=Column(String(16), nullable=False, server_default="en"),
        description="BCP-47 tag for the primary language of the card names + meanings.",
    )

    tradition: DeckTradition = Field(
        default=DeckTradition.OTHER,
        sa_column=Column(
            SQLEnum(
                DeckTradition,
                name="deck_tradition",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="other",
        ),
    )

    reversal_convention: bool = Field(
        default=True,
        sa_column=Column("reversal_convention", nullable=False, server_default="true"),
        description=(
            "Whether this deck treats reversed cards as meaningful. "
            "Marseille decks traditionally do not; Rider-Waite-Smith does."
        ),
    )

    art_set: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Art set identifier — bundled decks may ship multiple art "
            "sets per tradition (e.g. 'rwsmith-1909' vs 'rwsmith-cs')."
        ),
    )

    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    is_builtin: bool = Field(
        default=False,
        sa_column=Column("is_builtin", nullable=False, server_default="false"),
        description=(
            "True for decks bundled with the application. Built-in decks "
            "are immutable from the user perspective; user decks have "
            "owner_id set and are editable by the owner."
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


# ───── Card ──────────────────────────────────────────────────────────


class Card(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One card within a deck."""

    __tablename__ = "card"
    __table_args__ = (
        Index("ix_card_deck_id", "deck_id"),
        Index("ix_card_position", "deck_id", "position"),
        UniqueConstraint("deck_id", "position", name="uq_card_deck_position"),
    )

    deck_id: UUID = Field(
        sa_column=Column(
            ForeignKey("deck.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    position: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Zero-based sequence number within the deck. Stable.",
    )

    slug: str = Field(
        sa_column=Column(String(128), nullable=False),
        description=(
            "Per-card slug ('the-fool', 'ace-of-cups'). Stable across "
            "deck editions for cards with equivalent identity."
        ),
    )

    name: str = Field(
        sa_column=Column(String(128), nullable=False),
    )

    suit: Suit = Field(
        default=Suit.MAJOR,
        sa_column=Column(
            SQLEnum(
                Suit,
                name="card_suit",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="major",
        ),
    )

    arcana_number: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description=(
            "Major arcana number 0..21 for major cards; minor arcana "
            "rank 1..14 (ace through king) for minor cards. Distinct "
            "from `position` because some decks omit majors / number "
            "differently across editions."
        ),
    )

    upright_meaning: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    reversed_meaning: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    correspondences: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Free-form correspondence dict — planetary, elemental, "
            "decan, hebrew_letter, tree_of_life_path, color, etc. "
            "Tradition-specific keys allowed."
        ),
    )

    name_translations: dict[str, str] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "BCP-47 -> localised name. Empty for English-only bundles."
        ),
    )

    image_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


# ───── Spread ────────────────────────────────────────────────────────


class Spread(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A spread template — built-in or user-designed.

    Built-in spreads (``is_builtin=True``, ``owner_id=NULL``) are
    immutable; user spreads (``kind=CUSTOM``, ``owner_id`` set) carry
    their layout in :attr:`layout_json`.
    """

    __tablename__ = "spread"
    __table_args__ = (
        Index("ix_spread_owner_id", "owner_id"),
        Index("ix_spread_kind", "kind"),
        Index("ix_spread_is_builtin", "is_builtin"),
    )

    name: str = Field(
        sa_column=Column(String(128), nullable=False),
    )

    slug: str = Field(
        sa_column=Column(String(128), nullable=False),
        description="Stable identifier — 'celtic-cross', 'three-card-past-present-future'.",
    )

    kind: SpreadKind = Field(
        default=SpreadKind.CUSTOM,
        sa_column=Column(
            SQLEnum(
                SpreadKind,
                name="spread_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="custom",
        ),
    )

    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    positions: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Ordered position list. Each item: { index, name, "
            "meaning, x?, y?, rotation? }. Coordinates only matter "
            "for custom spreads with a designed canvas."
        ),
    )

    layout_json: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Free-form layout payload — canvas size, background, "
            "additional decorations for custom spreads."
        ),
    )

    is_builtin: bool = Field(
        default=False,
        sa_column=Column("is_builtin", nullable=False, server_default="false"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


# ───── Reading ────────────────────────────────────────────────────────


class Reading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One Tarot reading session."""

    __tablename__ = "tarot_reading"
    __table_args__ = (
        Index("ix_tarot_reading_owner_id", "owner_id"),
        Index("ix_tarot_reading_drawn_at", "drawn_at"),
        Index("ix_tarot_reading_entity_id", "entity_id"),
    )

    deck_id: UUID = Field(
        sa_column=Column(
            ForeignKey("deck.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
    )

    spread_id: UUID = Field(
        sa_column=Column(
            ForeignKey("spread.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    querent: str = Field(
        default="self",
        sa_column=Column(String(64), nullable=False, server_default="self"),
        description='"self" / "other" / free-form named querent.',
    )

    draw_method: DrawMethod = Field(
        default=DrawMethod.BROWSER_RNG,
        sa_column=Column(
            SQLEnum(
                DrawMethod,
                name="tarot_draw_method",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="browser_rng",
        ),
    )

    seed: str = Field(
        sa_column=Column(String(256), nullable=False),
        description=(
            "The shuffle seed used to produce ``drawn_cards`` from this "
            "deck. With deck + spread + seed, the engine reproduces the "
            "exact card sequence. For ``physical`` draws this is the "
            "user-supplied label / timestamp; for ``browser_rng`` it's "
            "the RNG seed."
        ),
    )

    drawn_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    drawn_cards: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Ordered list, one entry per spread position. Each item: "
            "{ position_index, card_position (int), orientation, "
            "interpretation? }. position_index references the "
            "Spread.positions index; card_position references the "
            "Card.position within the deck."
        ),
    )

    overall_interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    retrospective_rating: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description=(
            "1..5 retrospective accuracy rating from the user. Updated "
            "later when the user can evaluate the reading against "
            "actual outcomes."
        ),
    )

    retrospective_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # Links into the wider corpus.
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
