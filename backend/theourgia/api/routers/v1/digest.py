"""Digest HTTP endpoints (B124).

Per ``plan/09-batches-backend.md`` § B124.

``GET    /api/v1/digest/weekly``                       — latest week
``GET    /api/v1/digest/weekly/{period_start}``        — specific week
``PATCH  /api/v1/digest/items/{id}``                   — set dismissed
``POST   /api/v1/digest/rebuild``                      — force rebuild

Honesty rules wired:
  * Headlines NEVER use modal language — the builder's
    ``assert_clean_headline`` runs on every item before commit.
  * Snapshot is built from B123 aggregates; sealed entries' body
    text never enters a tier-2 / tier-3 surfaced item.
  * PATCH /items/{id} accepts ONLY the ``dismissed`` field — the
    schema enforces this; ``results`` / ``headline`` / ``body``
    are immutable history.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.analytics.aggregates import compute_today
from theourgia.core.analytics.digest_builder import (
    AnalyticsSnapshot,
    build_digest,
)
from theourgia.core.analytics.digest_precompute import (
    precompute_category_frequencies,
    precompute_intensity_weekday_correlation,
)
from theourgia.models.digest import Digest, DigestItem

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────


class DigestItemRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    digest_id: str
    kind: str
    headline: str
    body: str | None
    structured: dict
    sample_size: int
    confidence: float | None
    dismissed: bool
    created_at: datetime
    updated_at: datetime


class DigestRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    period_start: datetime
    period_end: datetime
    summary: dict
    items: list[DigestItemRead]
    created_at: datetime
    updated_at: datetime


class DigestItemUpdate(BaseModel):
    """Only ``dismissed`` is editable on a digest item."""

    model_config = ConfigDict(extra="forbid")

    dismissed: bool | None = None


# ── Helpers ──────────────────────────────────────────────────────


def _to_item_read(row: DigestItem) -> DigestItemRead:
    return DigestItemRead(
        id=str(row.id),
        digest_id=str(row.digest_id),
        kind=row.kind,
        headline=row.headline,
        body=row.body,
        structured=dict(row.structured or {}),
        sample_size=row.sample_size,
        confidence=row.confidence,
        dismissed=row.dismissed,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _digest_with_items(
    db: AsyncSession, digest_row: Digest,
) -> DigestRead:
    items_stmt = (
        select(DigestItem)
        .where(DigestItem.digest_id == digest_row.id)
        .order_by(DigestItem.created_at.asc())
    )
    items = (await db.execute(items_stmt)).scalars().all()
    return DigestRead(
        id=str(digest_row.id),
        owner_id=str(digest_row.owner_id),
        period_start=digest_row.period_start,
        period_end=digest_row.period_end,
        summary=dict(digest_row.summary or {}),
        items=[_to_item_read(i) for i in items],
        created_at=digest_row.created_at,
        updated_at=digest_row.updated_at,
    )


def _week_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    """The current week's [period_start, period_end). Monday 00:00
    UTC is the boundary."""
    n = now or datetime.now(tz=timezone.utc)
    days_since_monday = n.weekday()
    period_start = (n - timedelta(days=days_since_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    period_end = period_start + timedelta(days=7)
    return period_start, period_end


async def _build_and_persist_digest(
    *,
    db: AsyncSession,
    owner_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> Digest:
    """Compute the snapshot via B123 aggregates, build, and upsert
    the resulting Digest + items. If a digest for this owner+period
    already exists we delete it (cascade clears items) and replace —
    so /rebuild is idempotent."""
    today = await compute_today(db=db, owner_id=owner_id)

    # Tier-2 / tier-3 candidate pre-compute. Each helper returns an
    # empty list when there's no data; the builder's threshold gate
    # silently drops anything below the minimum sample size, so
    # surfacing zero tier-2/3 candidates is the safe default.
    category_frequencies = await precompute_category_frequencies(
        db=db,
        owner_id=owner_id,
        period_start=period_start,
        period_end=period_end,
    )
    intensity_correlation = await precompute_intensity_weekday_correlation(
        db=db,
        owner_id=owner_id,
        period_start=period_start,
        period_end=period_end,
    )

    snapshot = AnalyticsSnapshot(
        entries_count=today.entries_today,
        workings_count=today.workings_today,
        syncs_count=today.syncs_today,
        # saturn_hour_workings stays empty — that example needs an
        # outcome field on the working entry which the schema does
        # not carry today. The other candidate sources are wired.
        saturn_hour_workings=[],
        category_frequencies=category_frequencies,
        correlations=intensity_correlation,
    )
    summary, drafts = build_digest(
        period_start=period_start,
        period_end=period_end,
        snapshot=snapshot,
    )

    # Replace any existing digest for this period.
    existing_stmt = (
        select(Digest)
        .where(Digest.owner_id == owner_id)
        .where(Digest.period_start == period_start)
    )
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing is not None:
        await db.delete(existing)
        await db.flush()

    digest = Digest(
        owner_id=owner_id,
        period_start=period_start,
        period_end=period_end,
        summary=summary,
    )
    db.add(digest)
    await db.flush()

    for d in drafts:
        item = DigestItem(
            digest_id=digest.id,
            kind=d.kind,
            headline=d.headline,
            body=d.body,
            structured=dict(d.structured),
            sample_size=d.sample_size,
            confidence=d.confidence,
        )
        db.add(item)
    await db.commit()
    await db.refresh(digest)
    return digest


# ── Routes ──────────────────────────────────────────────────────


@router.get(
    "/digest/weekly",
    response_model=DigestRead,
    tags=["digest"],
)
async def get_weekly_digest(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> DigestRead:
    """Return the most-recent week's digest. Builds + persists one
    if none exists yet."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    period_start, period_end = _week_window()
    stmt = (
        select(Digest)
        .where(Digest.owner_id == current_user.id)
        .where(Digest.period_start == period_start)
    )
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        row = await _build_and_persist_digest(
            db=db,
            owner_id=current_user.id,
            period_start=period_start,
            period_end=period_end,
        )
    return await _digest_with_items(db, row)


@router.get(
    "/digest/weekly/{period_start}",
    response_model=DigestRead,
    tags=["digest"],
)
async def get_digest_for_week(
    period_start: datetime,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> DigestRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    stmt = (
        select(Digest)
        .where(Digest.owner_id == current_user.id)
        .where(Digest.period_start == period_start)
    )
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Digest for that week not found.",
        )
    return await _digest_with_items(db, row)


@router.patch(
    "/digest/items/{item_id}",
    response_model=DigestItemRead,
    tags=["digest"],
)
async def update_digest_item(
    item_id: UUID,
    payload: DigestItemUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> DigestItemRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(DigestItem, item_id)
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Digest item not found.",
        )
    parent = await db.get(Digest, row.digest_id)
    if parent is None or parent.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Digest item not found.",
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_item_read(row)


@router.post(
    "/digest/rebuild",
    response_model=DigestRead,
    status_code=status.HTTP_201_CREATED,
    tags=["digest"],
)
async def rebuild_weekly_digest(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> DigestRead:
    """Force a rebuild of the current-week digest.

    Replaces the existing digest for the current week (cascading
    delete to its items). Other weeks' history is preserved.
    """
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    period_start, period_end = _week_window()
    digest = await _build_and_persist_digest(
        db=db,
        owner_id=current_user.id,
        period_start=period_start,
        period_end=period_end,
    )
    return await _digest_with_items(db, digest)
