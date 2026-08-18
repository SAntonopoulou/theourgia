"""The record sync protocol — push whole rows up, pull arrivals down.

::

  PUT /api/v1/record/entries          a device pushes its changed rows
  GET /api/v1/record/entries?since=N  a device pulls what it has not seen

Why the store is shaped the way it is — documents, LWW on the device's
clock, a server sequence for cursors — is argued in
:mod:`theourgia.models.record_entry`. This module is the two verbs over
it, and the invariants live here:

## ⚠ Idempotent by construction

A push only lands where the incoming ``updated_at_utc`` is strictly
newer than the stored one. Replaying yesterday's batch changes nothing
and reports itself as stale rather than failing — a device that crashed
mid-sync simply pushes again.

## ⚠ The server is a shelf, not an author

No merging, no field-level cleverness, no rewriting documents. The row
that wins is stored exactly as sent; the row that loses is reported in
``stale`` and the device can pull the winner and see for itself.

## ⚠ Pull is cursor-complete

``since`` is a ``synced_seq`` position. Every accepted write bumps the
sequence (inserts by default, updates by hand below), so "everything
after N, in order" misses nothing and never repeats — the two failures
a time-based cursor invites.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from theourgia.api.deps import CurrentUser, DBSession
from theourgia.core.astro.day_frames import frame_boundaries
from theourgia.models.record_entry import RECORD_ENTRY_SEQ, RecordEntry

__all__ = ["router"]

router = APIRouter()


MAX_BATCH = 500
"""Per request, both directions. A first sync of years of practice is
several requests, not one giant one that times out and teaches the
device that syncing fails."""


# ── Schemas ─────────────────────────────────────────────────────────


class EntryIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    kind: str = Field(min_length=1, max_length=64)
    doc: dict[str, Any]
    updated_at_utc: datetime
    deleted_at_utc: datetime | None = None


class PushPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[EntryIn] = Field(max_length=MAX_BATCH)


class PushResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accepted: int
    stale: int
    latest_seq: int
    """The sequence high-water mark after this push — a device that pulls
    from its OLD cursor next will see its own rows come back, which is
    harmless; one that trusts this can skip them."""


class EntryOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    kind: str
    doc: dict[str, Any]
    updated_at_utc: datetime
    deleted_at_utc: datetime | None
    seq: int


class PullResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[EntryOut]
    next_since: int
    more: bool


# ── Endpoints ───────────────────────────────────────────────────────


@router.put(
    "/record/entries",
    summary="Push record rows from a device",
    description=(
        "Upsert a batch of the caller's record rows. Last writer wins per "
        "row, judged by the device timestamp; stale rows are counted, not "
        "errors."
    ),
    response_model=PushResult,
)
async def push(
    payload: PushPayload,
    user: CurrentUser,
    db: DBSession,
) -> PushResult:
    accepted = 0
    stale = 0

    for entry in payload.entries:
        existing = (
            await db.execute(
                select(RecordEntry).where(
                    RecordEntry.owner_id == user.id,
                    RecordEntry.id == entry.id,
                )
            )
        ).scalar_one_or_none()

        if existing is None:
            db.add(
                RecordEntry(
                    owner_id=user.id,
                    id=entry.id,
                    kind=entry.kind,
                    doc=entry.doc,
                    updated_at_utc=entry.updated_at_utc,
                    deleted_at_utc=entry.deleted_at_utc,
                )
            )
            accepted += 1
        elif entry.updated_at_utc > existing.updated_at_utc:
            existing.kind = entry.kind
            existing.doc = entry.doc
            existing.updated_at_utc = entry.updated_at_utc
            existing.deleted_at_utc = entry.deleted_at_utc
            # ⚠ The sequence default only fires on INSERT. An update must
            # bump by hand or pulls would never see edited rows.
            existing.synced_seq = (
                await db.execute(select(func.nextval(RECORD_ENTRY_SEQ)))
            ).scalar_one()
            db.add(existing)
            accepted += 1
        else:
            # ⚠ Not an error. An equal timestamp is a replay of what is
            # already held; an older one is a device that has not pulled
            # yet. Both resolve themselves.
            stale += 1

    await db.commit()

    latest = (
        await db.execute(
            select(func.coalesce(func.max(RecordEntry.synced_seq), 0)).where(
                RecordEntry.owner_id == user.id
            )
        )
    ).scalar_one()

    return PushResult(accepted=accepted, stale=stale, latest_seq=latest)


@router.get(
    "/record/entries",
    summary="Pull record rows this device has not seen",
    description=(
        "Everything of the caller's after the given sequence position, in "
        "arrival order. Tombstoned rows are included — a deletion is news."
    ),
    response_model=PullResult,
)
async def pull(
    user: CurrentUser,
    db: DBSession,
    since: int = Query(default=0, ge=0),
    limit: int = Query(default=MAX_BATCH, ge=1, le=MAX_BATCH),
) -> PullResult:
    rows = (
        (
            await db.execute(
                select(RecordEntry)
                .where(
                    RecordEntry.owner_id == user.id,
                    RecordEntry.synced_seq > since,
                )
                .order_by(RecordEntry.synced_seq)
                .limit(limit + 1)
            )
        )
        .scalars()
        .all()
    )

    more = len(rows) > limit
    page = rows[:limit]
    if page and page[-1].synced_seq is None:  # pragma: no cover - paranoia
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="sequence missing on stored row",
        )

    return PullResult(
        entries=[
            EntryOut(
                id=row.id,
                kind=row.kind,
                doc=row.doc,
                updated_at_utc=row.updated_at_utc,
                deleted_at_utc=row.deleted_at_utc,
                seq=row.synced_seq,
            )
            for row in page
        ],
        next_since=page[-1].synced_seq if page else since,
        more=more,
    )


class DayFramesOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    boundaries: list[datetime]


@router.get(
    "/record/day-frames",
    summary="Day boundaries for a chosen frame",
    description=(
        "The rises of the frame's body across the span, so the record can "
        "be grouped into the practitioner's own days — moonrise to "
        "moonrise, or sunrise to sunrise — rather than the calendar's. "
        "Computed with this server's ephemeris; a keeping within a minute "
        "of a boundary can sit on a different day here than in the app."
    ),
    response_model=DayFramesOut,
)
async def day_frames(
    user: CurrentUser,  # noqa: ARG001 — the dependency IS the authentication
    frame: Annotated[str, Query(pattern="^(sunrise|moonrise)$")],
    start: Annotated[datetime, Query(alias="from")],
    end: Annotated[datetime, Query(alias="to")],
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
) -> DayFramesOut:
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="to must be after from",
        )
    if end - start > timedelta(days=400):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="the span is capped at 400 days",
        )
    return DayFramesOut(
        boundaries=frame_boundaries(frame, start, end, latitude, longitude)
    )
