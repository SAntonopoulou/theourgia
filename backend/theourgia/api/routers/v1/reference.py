"""Reference-data endpoints — b108-2hh.

FEATURES §13 · reference plugins. Rather than shipping these as
runtime-installed plugins, the reference data is bundled directly
into the backend so it's available without installation friction.
Users querying via the API get authoritative Golden Dawn /
Egyptian data without needing to manage a plugin lifecycle.

Endpoints (all authenticated):

- GET /api/v1/reference/egyptian-decans        — 36 decans of the Egyptian zodiac
- GET /api/v1/reference/egyptian-decans/{index}
- GET /api/v1/reference/correspondences-777    — 32 rows of Liber 777
- GET /api/v1/reference/correspondences-777/{key_scale}

Two-decade tradition tables — read-only.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.reference.correspondences_777 import (
    CORRESPONDENCES_777,
    Correspondence777Row,
)
from theourgia.core.reference.decans import EGYPTIAN_DECANS, Decan

__all__ = ["router"]

router = APIRouter()


# ── Egyptian decans ──────────────────────────────────────────────


class DecanRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    index: int
    sign: str
    position: int
    name: str
    ruler: str
    signification: str
    pgm_reference: str | None


def _decan_to_read(row: Decan) -> DecanRead:
    return DecanRead(
        index=row.index,
        sign=row.sign,
        position=row.position,
        name=row.name,
        ruler=row.ruler,
        signification=row.signification,
        pgm_reference=row.pgm_reference,
    )


@router.get(
    "/reference/egyptian-decans",
    response_model=list[DecanRead],
    tags=["reference"],
    summary="All 36 Egyptian decans (10° arcs)",
)
async def list_decans(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[DecanRead]:
    return [_decan_to_read(d) for d in EGYPTIAN_DECANS]


@router.get(
    "/reference/egyptian-decans/{index}",
    response_model=DecanRead,
    tags=["reference"],
)
async def get_decan(
    index: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DecanRead:
    if index < 0 or index >= len(EGYPTIAN_DECANS):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Decan index {index} not found (0..{len(EGYPTIAN_DECANS) - 1}).",
        )
    return _decan_to_read(EGYPTIAN_DECANS[index])


# ── 777 correspondences ──────────────────────────────────────────


class Correspondence777Read(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_scale: int
    row_kind: str
    hebrew_letter: str | None
    name: str
    attribution: str
    divine_name: str
    archangel: str
    order_of_angels: str
    color_king_scale: str


def _777_to_read(row: Correspondence777Row) -> Correspondence777Read:
    return Correspondence777Read(
        key_scale=row.key_scale,
        row_kind=row.row_kind,
        hebrew_letter=row.hebrew_letter,
        name=row.name,
        attribution=row.attribution,
        divine_name=row.divine_name,
        archangel=row.archangel,
        order_of_angels=row.order_of_angels,
        color_king_scale=row.color_king_scale,
    )


@router.get(
    "/reference/correspondences-777",
    response_model=list[Correspondence777Read],
    tags=["reference"],
    summary="Liber 777 — 32 rows (10 sephiroth + 22 paths)",
)
async def list_777(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[Correspondence777Read]:
    return [_777_to_read(r) for r in CORRESPONDENCES_777]


@router.get(
    "/reference/correspondences-777/{key_scale}",
    response_model=Correspondence777Read,
    tags=["reference"],
)
async def get_777(
    key_scale: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Correspondence777Read:
    for row in CORRESPONDENCES_777:
        if row.key_scale == key_scale:
            return _777_to_read(row)
    raise HTTPException(
        status.HTTP_404_NOT_FOUND,
        f"777 row key_scale={key_scale} not found (1..32).",
    )
