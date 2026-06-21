"""Scheduled-publication admin view.

``GET /api/v1/schedule/upcoming`` — entries with ``scheduled_publish_at``
in the future, ordered by date. The admin UI surfaces this as
"What's queued" per `plan/04-journaling.md` §14.

``DELETE /api/v1/schedule/{entry_id}`` — cancel a scheduled release
(sets ``scheduled_publish_at = NULL`` without changing visibility).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.api.routers.v1.entries import EntryRead, _to_read
from theourgia.models.entries import Entry

__all__ = ["router"]

router = APIRouter()


class UpcomingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upcoming: list[EntryRead]


@router.get(
    "/schedule/upcoming",
    response_model=UpcomingResponse,
    tags=["schedule"],
)
async def upcoming_releases(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> UpcomingResponse:
    """Entries with a future ``scheduled_publish_at`` — what the
    scheduler will promote on its next ticks.

    Scoped to the caller's own entries. Public visibility into
    anyone-else's scheduled releases isn't appropriate.
    """
    now = datetime.now(tz=UTC)
    stmt = (
        select(Entry)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.scheduled_publish_at.is_not(None))
        .where(Entry.scheduled_publish_at > now)
        .order_by(Entry.scheduled_publish_at.asc())
    )
    if current_user is not None:
        stmt = stmt.where(Entry.owner_id == current_user.id)
    else:
        # Anonymous callers see nothing.
        return UpcomingResponse(upcoming=[])

    rows = (await session.execute(stmt)).scalars().all()
    return UpcomingResponse(upcoming=[_to_read(row) for row in rows])


@router.delete(
    "/schedule/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["schedule"],
)
async def cancel_scheduled_release(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
):
    from fastapi import Response

    row = await session.get(Entry, entry_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entry not found.")
    if current_user is None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorised.")
    if row.scheduled_publish_at is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Entry is not scheduled.")
    row.scheduled_publish_at = None
    session.add(row)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
