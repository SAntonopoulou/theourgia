"""Closed-tradition endpoints (v1-001).

``GET /api/v1/traditions/closed-slugs`` — the operator-curated
closed-tradition slug list, so clients can warn before a
public-visibility toggle round-trips to a 403. See
:mod:`theourgia.core.traditions` for the respect-source rule.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.traditions import get_closed_tradition_slugs

__all__ = ["router"]

router = APIRouter()


class ClosedSlugsRead(BaseModel):
    """Response of ``GET /api/v1/traditions/closed-slugs``."""

    model_config = ConfigDict(extra="forbid")

    slugs: list[str]


@router.get(
    "/traditions/closed-slugs",
    summary="List closed-tradition slugs",
    description=(
        "Returns the operator-curated closed-tradition slugs, sorted. "
        "Content whose tradition_tags match any of them is refused on "
        "every public visibility path."
    ),
    response_model=ClosedSlugsRead,
)
async def get_closed_slugs(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ClosedSlugsRead:
    closed = await get_closed_tradition_slugs(session)
    return ClosedSlugsRead(slugs=sorted(closed))
