"""iCal feed settings + delivery endpoints (B135).

Per ``plan/11-batches-backend.md`` § B135.

Settings (per-vault, owner-only):
``GET    /api/v1/ical-feed``                — caller's settings (auto-create on first GET)
``PATCH  /api/v1/ical-feed``                — update toggles + visibility
``POST   /api/v1/ical-feed/regenerate``     — rotate url_token

Feed delivery (unversioned, stable URL for subscribers):
``GET    /ical/v1/{token}.ics``             — RFC 5545 VCALENDAR text

Honesty rules:

  * Private feeds require auth — anonymous GET returns 401.
  * Sealed entries are NEVER serialized as their own VEVENT. The
    serializer takes ``SealedDayMarker`` records (count + date) and
    emits ONE all-day VEVENT per sealed day with summary
    ``"{N} sealed entries today"``.
  * Sealed pilgrimage anniversaries are excluded ENTIRELY (no
    count-only fallback).
  * Tokens are 32-byte URL-safe random strings. /regenerate rotates
    them; old URLs stop working immediately.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, OptionalCookieUser, get_db_session
from theourgia.core.calendar import build_vcalendar, walk_feed_data
from theourgia.models.ical_feed import ICalFeed

__all__ = [
    "router",
    "feed_router",
    "ALLOWED_VISIBILITIES",
    "ICalFeedRead",
    "ICalFeedUpdate",
    "TOKEN_BYTES",
]


router = APIRouter()
feed_router = APIRouter()


TOKEN_BYTES = 32
ALLOWED_VISIBILITIES = frozenset({"private", "public"})


def _new_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


# ── Schemas ─────────────────────────────────────────────────────


class ICalFeedRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    name: str
    include_resh: bool
    include_workings: bool
    include_pilgrimage_anniversaries: bool
    include_lunar_events: bool
    include_planetary_hours: bool
    include_custom: bool
    custom_cron: str | None
    visibility: str
    feed_url_path: str
    last_regenerated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ICalFeedUpdate(BaseModel):
    """PATCH shape. URL token + last_regenerated_at + connected_count
    are server-only and NOT exposed."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    include_resh: bool | None = None
    include_workings: bool | None = None
    include_pilgrimage_anniversaries: bool | None = None
    include_lunar_events: bool | None = None
    include_planetary_hours: bool | None = None
    include_custom: bool | None = None
    custom_cron: str | None = Field(default=None, max_length=120)
    visibility: str | None = Field(default=None, max_length=16)


class RegenerateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feed_url_path: str
    last_regenerated_at: datetime


# ── Helpers ─────────────────────────────────────────────────────


def _to_read(row: ICalFeed) -> ICalFeedRead:
    return ICalFeedRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        name=row.name,
        include_resh=row.include_resh,
        include_workings=row.include_workings,
        include_pilgrimage_anniversaries=row.include_pilgrimage_anniversaries,
        include_lunar_events=row.include_lunar_events,
        include_planetary_hours=row.include_planetary_hours,
        include_custom=row.include_custom,
        custom_cron=row.custom_cron,
        visibility=row.visibility,
        feed_url_path=f"/ical/v1/{row.url_token}.ics",
        last_regenerated_at=row.last_regenerated_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _get_or_create_feed(
    db: AsyncSession, owner_id: UUID,
) -> ICalFeed:
    row = (
        await db.execute(
            select(ICalFeed).where(ICalFeed.owner_id == owner_id)
        )
    ).scalars().first()
    if row is not None:
        return row
    row = ICalFeed(
        owner_id=owner_id,
        url_token=_new_token(),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


# ── Settings endpoints ──────────────────────────────────────────


@router.get(
    "/ical-feed",
    response_model=ICalFeedRead,
    tags=["ical"],
)
async def get_feed(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ICalFeedRead:
    row = await _get_or_create_feed(db, current_user.id)
    return _to_read(row)


@router.patch(
    "/ical-feed",
    response_model=ICalFeedRead,
    tags=["ical"],
)
async def update_feed(
    payload: ICalFeedUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ICalFeedRead:
    row = await _get_or_create_feed(db, current_user.id)

    data = payload.model_dump(exclude_unset=True)
    if "visibility" in data and data["visibility"] not in ALLOWED_VISIBILITIES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                f"visibility must be one of "
                f"{sorted(ALLOWED_VISIBILITIES)!r}; got "
                f"{data['visibility']!r}."
            ),
        )

    for field in (
        "name",
        "include_resh",
        "include_workings",
        "include_pilgrimage_anniversaries",
        "include_lunar_events",
        "include_planetary_hours",
        "include_custom",
        "custom_cron",
        "visibility",
    ):
        if field in data:
            setattr(row, field, data[field])

    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/ical-feed/regenerate",
    response_model=RegenerateResponse,
    tags=["ical"],
)
async def regenerate_feed_token(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RegenerateResponse:
    """Rotate the url_token. The OLD URL stops working immediately."""
    row = await _get_or_create_feed(db, current_user.id)
    row.url_token = _new_token()
    row.last_regenerated_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return RegenerateResponse(
        feed_url_path=f"/ical/v1/{row.url_token}.ics",
        last_regenerated_at=row.last_regenerated_at,
    )


# ── Feed delivery ──────────────────────────────────────────────


@feed_router.get(
    "/ical/v1/{token}.ics",
    tags=["ical"],
)
async def serve_feed(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    """Deliver the VCALENDAR file. Private feeds require the caller's
    auth cookie (401 otherwise). Public feeds skip auth.

    Live data walking is NOT in scope for B135 — that's an integration
    surface in B136. For now the feed always emits a minimal
    VCALENDAR shell so subscribers' clients don't error out."""
    row = (
        await db.execute(
            select(ICalFeed).where(ICalFeed.url_token == token)
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feed not found.")

    if row.visibility == "private":
        if current_user is None or current_user.id != row.owner_id:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "This feed is private; auth required.",
            )

    # Walk live data per the enabled include_* toggles. The
    # sealed-day collapse is enforced inside the walker — the
    # serializer NEVER sees sealed Entry titles.
    walk = await walk_feed_data(db, row)
    body = build_vcalendar(
        events=walk.events,
        sealed_markers=walk.sealed_markers,
        feed_name=row.name,
    )
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
    )
