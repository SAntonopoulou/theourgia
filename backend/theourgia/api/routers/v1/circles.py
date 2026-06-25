"""Magical Circle HTTP endpoints.

``GET    /api/v1/circles/presets``        — preset library (public)
``GET    /api/v1/circles``                — list
``POST   /api/v1/circles``                — create
``GET    /api/v1/circles/{id}``           — detail
``PATCH  /api/v1/circles/{id}``           — update (any except parent_circle_id)
``DELETE /api/v1/circles/{id}``           — soft delete
``POST   /api/v1/circles/{id}/fork``      — fork (sets parent_circle_id)

Honesty rules (H05):
  · Rings array must have 1-6 entries.
  · Centre-element ``sigil_id`` / ``square_id`` (when present) must
    reference rows in the same vault, or — for ``square_id`` — be
    one of the seven planetary fixtures (``saturn``, ``jupiter``,
    ``mars``, ``sun``, ``venus``, ``mercury``, ``moon``).
  · ``parent_circle_id`` is set only by ``/fork`` — never via PATCH.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.workshop.planetary_squares import PLANETARY_SQUARES
from theourgia.core.workshop.preset_circles import PRESET_CIRCLES
from theourgia.models.circles import Circle, CompassTradition
from theourgia.models.magic_squares import MagicSquare
from theourgia.models.sigils import Sigil

__all__ = ["router"]

router = APIRouter()


_VALID_RING_KINDS = {
    "inscription",
    "glyph_row",
    "image",
    "blank",
    "multi_glyph",
}
_VALID_CENTRE_KINDS = {
    "pentagram",
    "hexagram",
    "unicursal",
    "solomonic_seal",
    "sigil",
    "kamea_trace",
    "blank",
}
_PLANETARY_SQUARE_SLUGS = frozenset(s.planet for s in PLANETARY_SQUARES)


# ── Schemas ──────────────────────────────────────────────────────────


class CircleRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    purpose: str
    diameter_m: float
    rings: list[dict[str, Any]]
    compass_tradition: str
    compass_points: dict[str, Any]
    centre_element: dict[str, Any]
    citation: str | None
    parent_circle_id: str | None
    created_at: datetime
    updated_at: datetime


class CircleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    purpose: str = Field(min_length=1)
    diameter_m: float = Field(gt=0, le=20, default=2.0)
    rings: list[dict[str, Any]] = Field(min_length=1, max_length=6)
    compass_tradition: CompassTradition
    compass_points: dict[str, Any]
    centre_element: dict[str, Any]
    citation: str | None = Field(default=None, max_length=480)


class CircleUpdate(BaseModel):
    """Any field except ``parent_circle_id`` (set only by /fork)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    purpose: str | None = Field(default=None, min_length=1)
    diameter_m: float | None = Field(default=None, gt=0, le=20)
    rings: list[dict[str, Any]] | None = Field(
        default=None, min_length=1, max_length=6,
    )
    compass_tradition: CompassTradition | None = None
    compass_points: dict[str, Any] | None = None
    centre_element: dict[str, Any] | None = None
    citation: str | None = Field(default=None, max_length=480)


class CircleForkPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)


class PresetCircleRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    purpose: str
    diameter_m: float
    rings: list[dict[str, Any]]
    compass_tradition: str
    compass_points: dict[str, str]
    centre_element: dict[str, Any]
    citation: str


# ── Helpers ──────────────────────────────────────────────────────────


def _validate_rings(rings: list[dict[str, Any]]) -> None:
    for i, ring in enumerate(rings):
        kind = ring.get("kind")
        if kind not in _VALID_RING_KINDS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                (
                    f"rings[{i}].kind must be one of "
                    f"{sorted(_VALID_RING_KINDS)}; got {kind!r}."
                ),
            )


def _validate_centre_kind(centre: dict[str, Any]) -> None:
    kind = centre.get("kind")
    if kind not in _VALID_CENTRE_KINDS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                f"centre_element.kind must be one of "
                f"{sorted(_VALID_CENTRE_KINDS)}; got {kind!r}."
            ),
        )


async def _validate_centre_refs(
    centre: dict[str, Any],
    db: AsyncSession,
    owner_id: UUID | None,
) -> None:
    """Centre-element sigil_id / square_id, when present, must
    reference vault rows (or a planetary slug for square_id)."""
    sigil_id = centre.get("sigil_id")
    if sigil_id:
        try:
            sigil_uuid = UUID(str(sigil_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "centre_element.sigil_id must be a UUID.",
            )
        stmt = select(Sigil).where(Sigil.id == sigil_uuid)
        if owner_id is not None:
            stmt = stmt.where(Sigil.owner_id == owner_id)
        row = (await db.execute(stmt)).scalars().first()
        if row is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "centre_element.sigil_id is not in your vault.",
            )

    square_id = centre.get("square_id")
    if square_id:
        # Planetary slug is acceptable without DB lookup.
        if isinstance(square_id, str) and square_id in _PLANETARY_SQUARE_SLUGS:
            return
        try:
            square_uuid = UUID(str(square_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                (
                    "centre_element.square_id must be a UUID or one of "
                    f"{sorted(_PLANETARY_SQUARE_SLUGS)}."
                ),
            )
        stmt = select(MagicSquare).where(MagicSquare.id == square_uuid)
        if owner_id is not None:
            stmt = stmt.where(MagicSquare.owner_id == owner_id)
        row = (await db.execute(stmt)).scalars().first()
        if row is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "centre_element.square_id is not in your vault.",
            )


def _to_read(row: Circle) -> CircleRead:
    return CircleRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        purpose=row.purpose,
        diameter_m=row.diameter_m,
        rings=list(row.rings or []),
        compass_tradition=row.compass_tradition.value,
        compass_points=dict(row.compass_points or {}),
        centre_element=dict(row.centre_element or {}),
        citation=row.citation,
        parent_circle_id=(
            str(row.parent_circle_id) if row.parent_circle_id else None
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _owner_check(row: Circle, current_user_id: UUID | None) -> None:
    if (
        current_user_id is not None
        and row.owner_id is not None
        and row.owner_id != current_user_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Circle not found.")


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/circles/presets",
    response_model=list[PresetCircleRead],
    tags=["circles"],
)
async def list_preset_circles() -> list[PresetCircleRead]:
    """Return the preset library — PD templates the practitioner can
    fork from. No auth scoping; presets are reference material."""
    return [
        PresetCircleRead(
            slug=p.slug,
            name=p.name,
            purpose=p.purpose,
            diameter_m=p.diameter_m,
            rings=list(p.rings),
            compass_tradition=p.compass_tradition,
            compass_points=dict(p.compass_points),
            centre_element=dict(p.centre_element),
            citation=p.citation,
        )
        for p in PRESET_CIRCLES
    ]


@router.get(
    "/circles", response_model=list[CircleRead], tags=["circles"],
)
async def list_circles(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    limit: int = 100,
) -> list[CircleRead]:
    stmt = select(Circle).where(Circle.deleted_at.is_(None))
    if current_user is not None:
        stmt = stmt.where(Circle.owner_id == current_user.id)
    stmt = stmt.order_by(Circle.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/circles",
    response_model=CircleRead,
    status_code=status.HTTP_201_CREATED,
    tags=["circles"],
)
async def create_circle(
    payload: CircleCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CircleRead:
    _validate_rings(payload.rings)
    _validate_centre_kind(payload.centre_element)
    owner_id = current_user.id if current_user is not None else None
    await _validate_centre_refs(payload.centre_element, db, owner_id)

    row = Circle(
        owner_id=owner_id,
        name=payload.name,
        purpose=payload.purpose,
        diameter_m=payload.diameter_m,
        rings=payload.rings,
        compass_tradition=payload.compass_tradition,
        compass_points=payload.compass_points,
        centre_element=payload.centre_element,
        citation=payload.citation,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/circles/{circle_id}", response_model=CircleRead, tags=["circles"],
)
async def get_circle(
    circle_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CircleRead:
    row = await db.get(Circle, circle_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Circle not found.")
    _owner_check(row, current_user.id if current_user else None)
    return _to_read(row)


@router.patch(
    "/circles/{circle_id}", response_model=CircleRead, tags=["circles"],
)
async def update_circle(
    circle_id: UUID,
    payload: CircleUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CircleRead:
    row = await db.get(Circle, circle_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Circle not found.")
    _owner_check(row, current_user.id if current_user else None)

    data = payload.model_dump(exclude_unset=True)
    if "rings" in data and data["rings"] is not None:
        _validate_rings(data["rings"])
    if "centre_element" in data and data["centre_element"] is not None:
        _validate_centre_kind(data["centre_element"])
        await _validate_centre_refs(data["centre_element"], db, row.owner_id)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/circles/{circle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["circles"],
)
async def delete_circle(
    circle_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await db.get(Circle, circle_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Circle not found.")
    _owner_check(row, current_user.id if current_user else None)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/circles/{circle_id}/fork",
    response_model=CircleRead,
    status_code=status.HTTP_201_CREATED,
    tags=["circles"],
)
async def fork_circle(
    circle_id: UUID,
    payload: CircleForkPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CircleRead:
    parent = await db.get(Circle, circle_id)
    if parent is None or parent.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Circle not found.")
    _owner_check(parent, current_user.id if current_user else None)

    name = payload.name or f"{parent.name} — new version"
    child = Circle(
        owner_id=current_user.id if current_user is not None else None,
        name=name,
        purpose=parent.purpose,
        diameter_m=parent.diameter_m,
        rings=list(parent.rings or []),
        compass_tradition=parent.compass_tradition,
        compass_points=dict(parent.compass_points or {}),
        centre_element=dict(parent.centre_element or {}),
        citation=parent.citation,
        parent_circle_id=parent.id,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return _to_read(child)
