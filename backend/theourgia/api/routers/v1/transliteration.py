"""Transliteration scheme reference endpoints (B113).

Per ``plan/08-batches-backend.md`` § B113.

``GET /api/v1/transliteration/schemes``         — list (filterable)
``GET /api/v1/transliteration/schemes/{slug}``  — full mapping

No write routes — schemes ship as Python constants and update only
with a migration when a new authoritative scheme is added.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict

from theourgia.core.linguistic.transliteration_schemes import (
    BUNDLED_SCHEMES,
    scheme_by_slug,
)

__all__ = ["router"]

router = APIRouter()


class SchemeSummary(BaseModel):
    """Lightweight summary — list view omits the full mapping."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    source_script: str
    direction: str
    citation: str
    round_trip_status: str


class SchemeRead(BaseModel):
    """Full mapping — detail view."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    source_script: str
    direction: str
    citation: str
    round_trip_status: str
    mapping: dict[str, str]
    notes: str


@router.get(
    "/transliteration/schemes",
    response_model=list[SchemeSummary],
    tags=["transliteration"],
)
async def list_schemes(
    source_script: str | None = None,
) -> list[SchemeSummary]:
    """Return summaries of every bundled scheme. Optionally narrow
    by source script (greek/hebrew/sanskrit/arabic/coptic)."""
    schemes = list(BUNDLED_SCHEMES)
    if source_script is not None:
        schemes = [s for s in schemes if s.source_script == source_script]
    return [
        SchemeSummary(
            slug=s.slug,
            name=s.name,
            source_script=s.source_script,
            direction=s.direction,
            citation=s.citation,
            round_trip_status=s.round_trip_status,
        )
        for s in schemes
    ]


@router.get(
    "/transliteration/schemes/{slug}",
    response_model=SchemeRead,
    tags=["transliteration"],
)
async def get_scheme(slug: str) -> SchemeRead:
    s = scheme_by_slug(slug)
    if s is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Scheme {slug!r} not found."
        )
    return SchemeRead(
        slug=s.slug,
        name=s.name,
        source_script=s.source_script,
        direction=s.direction,
        citation=s.citation,
        round_trip_status=s.round_trip_status,
        mapping=dict(s.mapping),
        notes=s.notes,
    )
