"""Tarot HTTP endpoints.

``GET    /api/v1/tarot/decks``                   — list decks (filter ``?tradition=`` / ``?is_builtin=``)
``GET    /api/v1/tarot/decks/{id}``              — fetch one deck with its cards
``POST   /api/v1/tarot/decks``                   — create a user deck (auto seeds card rows from ``cards`` payload)
``PATCH  /api/v1/tarot/decks/{id}``              — update user deck metadata
``DELETE /api/v1/tarot/decks/{id}``              — soft delete user deck

``GET    /api/v1/tarot/spreads``                 — list spreads (filter ``?is_builtin=``)
``POST   /api/v1/tarot/spreads``                 — create custom spread
``DELETE /api/v1/tarot/spreads/{id}``            — soft delete user spread

``POST   /api/v1/tarot/cast``                    — deterministic cast (engine + persisted Reading)
``GET    /api/v1/tarot/readings``                — list readings
``GET    /api/v1/tarot/readings/{id}``           — fetch one
``PATCH  /api/v1/tarot/readings/{id}``           — update interpretation / retrospective rating
``DELETE /api/v1/tarot/readings/{id}``           — soft delete

Per ``plan/06-divination-and-practice.md`` §1.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.divination.tarot import (
    DrawnCard,
    make_seed,
    tarot_cast,
)
from theourgia.models.tarot import (
    Card,
    Deck,
    DeckTradition,
    DrawMethod,
    Reading,
    Spread,
    SpreadKind,
    Suit,
)

__all__ = ["router"]

router = APIRouter()


DeckTraditionLiteral = Literal[
    "marseille", "rider_waite", "thoth", "etteilla",
    "sola_busca", "oracle", "custom", "other",
]
SuitLiteral = Literal["major", "wands", "cups", "swords", "pentacles"]
SpreadKindLiteral = Literal[
    "single", "three_card", "horseshoe", "celtic_cross",
    "tree_of_life", "year_ahead", "relationship", "custom",
]
DrawMethodLiteral = Literal[
    "browser_rng", "physical", "hash_of_question", "mental",
]


# ───── Cards (read-only via deck) ─────────────────────────────────────


class CardRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    position: int
    slug: str
    name: str
    suit: SuitLiteral
    arcana_number: int | None
    upright_meaning: str | None
    reversed_meaning: str | None
    correspondences: dict[str, object]
    name_translations: dict[str, str]
    image_upload_id: str | None


def _card_to_read(row: Card) -> CardRead:
    return CardRead(
        id=str(row.id),
        position=row.position,
        slug=row.slug,
        name=row.name,
        suit=row.suit.value,
        arcana_number=row.arcana_number,
        upright_meaning=row.upright_meaning,
        reversed_meaning=row.reversed_meaning,
        correspondences=dict(row.correspondences) if row.correspondences else {},
        name_translations=(
            dict(row.name_translations) if row.name_translations else {}
        ),
        image_upload_id=str(row.image_upload_id) if row.image_upload_id else None,
    )


# ───── Deck ──────────────────────────────────────────────────────────


class DeckRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    slug: str
    creator: str | None
    license: str | None
    language: str
    tradition: DeckTraditionLiteral
    reversal_convention: bool
    art_set: str | None
    description: str | None
    is_builtin: bool
    owner_id: str | None
    created_at: datetime
    updated_at: datetime
    card_count: int


class DeckDetail(DeckRead):
    cards: list[CardRead]


class CardCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position: int = Field(ge=0)
    slug: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=128)
    suit: SuitLiteral = "major"
    arcana_number: int | None = None
    upright_meaning: str | None = None
    reversed_meaning: str | None = None
    correspondences: dict[str, object] = Field(default_factory=dict)
    name_translations: dict[str, str] = Field(default_factory=dict)


class DeckCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    slug: str = Field(min_length=1, max_length=128)
    creator: str | None = Field(default=None, max_length=256)
    license: str | None = Field(default=None, max_length=128)
    language: str = Field(default="en", max_length=16)
    tradition: DeckTraditionLiteral = "custom"
    reversal_convention: bool = True
    art_set: str | None = Field(default=None, max_length=64)
    description: str | None = None
    cards: list[CardCreate] = Field(min_length=1)


class DeckUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    creator: str | None = Field(default=None, max_length=256)
    license: str | None = Field(default=None, max_length=128)
    language: str | None = Field(default=None, max_length=16)
    reversal_convention: bool | None = None
    art_set: str | None = Field(default=None, max_length=64)
    description: str | None = None


def _deck_to_read(row: Deck, card_count: int) -> DeckRead:
    return DeckRead(
        id=str(row.id),
        name=row.name,
        slug=row.slug,
        creator=row.creator,
        license=row.license,
        language=row.language,
        tradition=row.tradition.value,
        reversal_convention=row.reversal_convention,
        art_set=row.art_set,
        description=row.description,
        is_builtin=row.is_builtin,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
        card_count=card_count,
    )


async def _count_cards(db: AsyncSession, deck_id: UUID) -> int:
    stmt = select(Card).where(Card.deck_id == deck_id, Card.deleted_at.is_(None))
    return len((await db.execute(stmt)).scalars().all())


async def _load_cards(db: AsyncSession, deck_id: UUID) -> list[Card]:
    stmt = (
        select(Card)
        .where(Card.deck_id == deck_id, Card.deleted_at.is_(None))
        .order_by(Card.position.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


@router.get("/tarot/decks", response_model=list[DeckRead], tags=["tarot"])
async def list_decks(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    tradition: DeckTraditionLiteral | None = None,
    is_builtin: bool | None = None,
) -> list[DeckRead]:
    stmt = select(Deck).where(Deck.deleted_at.is_(None))
    if tradition is not None:
        stmt = stmt.where(Deck.tradition == DeckTradition(tradition))
    if is_builtin is not None:
        stmt = stmt.where(Deck.is_builtin == is_builtin)
    stmt = stmt.order_by(Deck.name.asc())
    rows = (await db.execute(stmt)).scalars().all()
    out: list[DeckRead] = []
    for row in rows:
        out.append(_deck_to_read(row, await _count_cards(db, row.id)))
    return out


@router.get("/tarot/decks/{deck_id}", response_model=DeckDetail, tags=["tarot"])
async def get_deck(
    deck_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeckDetail:
    row = await db.get(Deck, deck_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    cards = await _load_cards(db, row.id)
    return DeckDetail(
        **_deck_to_read(row, len(cards)).model_dump(),
        cards=[_card_to_read(c) for c in cards],
    )


@router.post(
    "/tarot/decks",
    response_model=DeckDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["tarot"],
)
async def create_deck(
    payload: DeckCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> DeckDetail:
    positions = [c.position for c in payload.cards]
    if len(set(positions)) != len(positions):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Card positions must be unique within a deck.",
        )

    deck = Deck(
        name=payload.name,
        slug=payload.slug,
        creator=payload.creator,
        license=payload.license,
        language=payload.language,
        tradition=DeckTradition(payload.tradition),
        reversal_convention=payload.reversal_convention,
        art_set=payload.art_set,
        description=payload.description,
        is_builtin=False,  # user decks are never built-in
        owner_id=current_user.id,
    )
    db.add(deck)
    await db.flush()

    cards: list[Card] = []
    for c in payload.cards:
        card = Card(
            deck_id=deck.id,
            position=c.position,
            slug=c.slug,
            name=c.name,
            suit=Suit(c.suit),
            arcana_number=c.arcana_number,
            upright_meaning=c.upright_meaning,
            reversed_meaning=c.reversed_meaning,
            correspondences=c.correspondences,
            name_translations=c.name_translations,
        )
        db.add(card)
        cards.append(card)

    await db.commit()
    await db.refresh(deck)
    refreshed_cards = await _load_cards(db, deck.id)
    return DeckDetail(
        **_deck_to_read(deck, len(refreshed_cards)).model_dump(),
        cards=[_card_to_read(c) for c in refreshed_cards],
    )


@router.patch("/tarot/decks/{deck_id}", response_model=DeckRead, tags=["tarot"])
async def update_deck(
    deck_id: UUID,
    payload: DeckUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> DeckRead:
    row = await db.get(Deck, deck_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    if row.is_builtin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Built-in decks cannot be edited.",
        )
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _deck_to_read(row, await _count_cards(db, row.id))


@router.delete(
    "/tarot/decks/{deck_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tarot"],
)
async def delete_deck(
    deck_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Deck, deck_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    if row.is_builtin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Built-in decks cannot be deleted.",
        )
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Spread ────────────────────────────────────────────────────────


class SpreadRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    slug: str
    kind: SpreadKindLiteral
    description: str | None
    positions: list[dict[str, object]]
    layout_json: dict[str, object]
    is_builtin: bool
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class SpreadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=128)
    slug: str = Field(min_length=1, max_length=128)
    kind: SpreadKindLiteral = "custom"
    description: str | None = None
    positions: list[dict[str, object]] = Field(min_length=1)
    layout_json: dict[str, object] = Field(default_factory=dict)


def _spread_to_read(row: Spread) -> SpreadRead:
    return SpreadRead(
        id=str(row.id),
        name=row.name,
        slug=row.slug,
        kind=row.kind.value,
        description=row.description,
        positions=list(row.positions) if row.positions else [],
        layout_json=dict(row.layout_json) if row.layout_json else {},
        is_builtin=row.is_builtin,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/tarot/spreads", response_model=list[SpreadRead], tags=["tarot"])
async def list_spreads(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    is_builtin: bool | None = None,
) -> list[SpreadRead]:
    stmt = select(Spread).where(Spread.deleted_at.is_(None))
    if is_builtin is not None:
        stmt = stmt.where(Spread.is_builtin == is_builtin)
    stmt = stmt.order_by(Spread.name.asc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_spread_to_read(row) for row in rows]


@router.post(
    "/tarot/spreads",
    response_model=SpreadRead,
    status_code=status.HTTP_201_CREATED,
    tags=["tarot"],
)
async def create_spread(
    payload: SpreadCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SpreadRead:
    row = Spread(
        name=payload.name,
        slug=payload.slug,
        kind=SpreadKind(payload.kind),
        description=payload.description,
        positions=payload.positions,
        layout_json=payload.layout_json,
        is_builtin=False,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _spread_to_read(row)


@router.delete(
    "/tarot/spreads/{spread_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tarot"],
)
async def delete_spread(
    spread_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Spread, spread_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Spread not found.")
    if row.is_builtin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Built-in spreads cannot be deleted.",
        )
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Spread not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Cast (the main event) ──────────────────────────────────────────


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deck_id: UUID
    spread_id: UUID
    question: str | None = None
    querent: str = Field(default="self", max_length=64)
    draw_method: DrawMethodLiteral = "browser_rng"
    seed: str | None = Field(
        default=None,
        description=(
            "Explicit seed. If omitted, derived from the request: "
            "for hash_of_question, SHA-256 of (timestamp + question); "
            "for browser_rng, a random UUID is used."
        ),
    )
    entity_id: UUID | None = None
    working_id: UUID | None = None


class DrawnCardRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position_index: int
    card_position: int
    orientation: Literal["upright", "reversed"]
    card: CardRead | None = None
    spread_position: dict[str, object] | None = None
    interpretation: str | None = None


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    deck_id: str
    spread_id: str
    question: str | None
    querent: str
    draw_method: DrawMethodLiteral
    seed: str
    drawn_at: datetime
    drawn_cards: list[DrawnCardRead]
    overall_interpretation: str | None
    retrospective_rating: int | None
    retrospective_notes: str | None
    entry_id: str | None
    entity_id: str | None
    working_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    drawn_cards: list[dict[str, object]] | None = None
    overall_interpretation: str | None = None
    retrospective_rating: int | None = Field(default=None, ge=1, le=5)
    retrospective_notes: str | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


def _expand_drawn_cards(
    drawn: list[DrawnCard],
    cards_by_position: dict[int, Card],
    spread_positions: list[dict[str, object]],
) -> list[DrawnCardRead]:
    spread_by_index = {int(p.get("index", -1)): p for p in spread_positions}
    out: list[DrawnCardRead] = []
    for d in drawn:
        card_row = cards_by_position.get(d.card_position)
        out.append(
            DrawnCardRead(
                position_index=d.position_index,
                card_position=d.card_position,
                orientation="reversed" if d.reversed else "upright",
                card=_card_to_read(card_row) if card_row else None,
                spread_position=spread_by_index.get(d.position_index),
            )
        )
    return out


def _reading_to_read(row: Reading, drawn_cards: list[DrawnCardRead]) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        deck_id=str(row.deck_id),
        spread_id=str(row.spread_id),
        question=row.question,
        querent=row.querent,
        draw_method=row.draw_method.value,
        seed=row.seed,
        drawn_at=row.drawn_at,
        drawn_cards=drawn_cards,
        overall_interpretation=row.overall_interpretation,
        retrospective_rating=row.retrospective_rating,
        retrospective_notes=row.retrospective_notes,
        entry_id=str(row.entry_id) if row.entry_id else None,
        entity_id=str(row.entity_id) if row.entity_id else None,
        working_id=str(row.working_id) if row.working_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _materialise_drawn(drawn: list[DrawnCard]) -> list[dict[str, object]]:
    """Convert the engine's :class:`DrawnCard` results to the JSON shape
    persisted in :attr:`Reading.drawn_cards`."""
    return [
        {
            "position_index": d.position_index,
            "card_position": d.card_position,
            "orientation": "reversed" if d.reversed else "upright",
        }
        for d in drawn
    ]


@router.post(
    "/tarot/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["tarot"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    deck = await db.get(Deck, payload.deck_id)
    if deck is None or deck.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found.")
    spread = await db.get(Spread, payload.spread_id)
    if spread is None or spread.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Spread not found.")

    cards = await _load_cards(db, deck.id)
    if not cards:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Deck has no cards.",
        )
    spread_positions = list(spread.positions or [])
    if not spread_positions:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Spread has no positions.",
        )
    if len(spread_positions) > len(cards):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Spread requires {len(spread_positions)} cards but the deck has only "
            f"{len(cards)}.",
        )

    now = datetime.now(tz=UTC)
    seed = payload.seed
    if seed is None:
        if payload.draw_method == "hash_of_question":
            seed = make_seed(now.isoformat(), payload.question or "")
        else:
            from uuid import uuid4
            seed = uuid4().hex

    drawn = tarot_cast(
        deck_size=len(cards),
        position_count=len(spread_positions),
        seed=seed,
        reversals=deck.reversal_convention,
    )

    reading = Reading(
        deck_id=deck.id,
        spread_id=spread.id,
        question=payload.question,
        querent=payload.querent,
        draw_method=DrawMethod(payload.draw_method),
        seed=seed,
        drawn_at=now,
        drawn_cards=_materialise_drawn(drawn),
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        owner_id=current_user.id,
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)

    cards_by_position = {c.position: c for c in cards}
    return _reading_to_read(
        reading,
        _expand_drawn_cards(drawn, cards_by_position, spread_positions),
    )


# ───── Reading read/update/delete ─────────────────────────────────────


async def _expand_for_persisted(
    db: AsyncSession, row: Reading,
) -> list[DrawnCardRead]:
    cards = await _load_cards(db, row.deck_id)
    cards_by_position = {c.position: c for c in cards}
    spread = await db.get(Spread, row.spread_id)
    spread_positions = list(spread.positions or []) if spread else []
    spread_by_index = {int(p.get("index", -1)): p for p in spread_positions}
    out: list[DrawnCardRead] = []
    for entry in row.drawn_cards or []:
        position_index = int(entry.get("position_index", -1))
        card_position = int(entry.get("card_position", -1))
        orientation = str(entry.get("orientation", "upright"))
        card_row = cards_by_position.get(card_position)
        out.append(
            DrawnCardRead(
                position_index=position_index,
                card_position=card_position,
                orientation="reversed" if orientation == "reversed" else "upright",
                card=_card_to_read(card_row) if card_row else None,
                spread_position=spread_by_index.get(position_index),
                interpretation=entry.get("interpretation"),  # type: ignore[arg-type]
            )
        )
    return out


@router.get("/tarot/readings", response_model=list[ReadingRead], tags=["tarot"])
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    entity_id: UUID | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(Reading).where(
        Reading.deleted_at.is_(None),
        Reading.owner_id == current_user.id,
    )
    if entity_id is not None:
        stmt = stmt.where(Reading.entity_id == entity_id)
    stmt = stmt.order_by(Reading.drawn_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    out: list[ReadingRead] = []
    for row in rows:
        out.append(_reading_to_read(row, await _expand_for_persisted(db, row)))
    return out


@router.get("/tarot/readings/{reading_id}", response_model=ReadingRead, tags=["tarot"])
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(Reading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _reading_to_read(row, await _expand_for_persisted(db, row))


@router.patch("/tarot/readings/{reading_id}", response_model=ReadingRead, tags=["tarot"])
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(Reading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row, await _expand_for_persisted(db, row))


@router.delete(
    "/tarot/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tarot"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Reading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
