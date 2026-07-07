"""Subscription tier admin endpoints (B128).

Per ``plan/10-batches-backend.md`` § B128.

``GET    /api/v1/subscription-tiers``        — list caller's tiers
``POST   /api/v1/subscription-tiers``        — new tier
``GET    /api/v1/subscription-tiers/{id}``   — read
``PATCH  /api/v1/subscription-tiers/{id}``   — update (NOT amount)
``DELETE /api/v1/subscription-tiers/{id}``   — soft delete

Honesty rule: ``monthly_amount_cents`` is IMMUTABLE. The Update
schema doesn't even declare it; Pydantic extra="forbid" rejects.
To raise a tier price, the publisher creates a new tier (which
gets a fresh Stripe price id) and the H07 surface lets them
migrate subscribers.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.subscription_tier import SubscriptionTier

__all__ = ["router"]

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────


class TierRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    name: str
    description: str | None
    monthly_amount_cents: int
    currency: str
    enabled: bool
    is_primary: bool
    stripe_price_id: str | None
    created_at: datetime
    updated_at: datetime


class TierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    monthly_amount_cents: int = Field(ge=0)
    currency: str = Field(default="usd", max_length=8)
    is_primary: bool = False


class TierUpdate(BaseModel):
    """``monthly_amount_cents`` is intentionally absent — tier
    amounts are IMMUTABLE (Stripe price ids don't change)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    enabled: bool | None = None
    is_primary: bool | None = None


# ── Helpers ────────────────────────────────────────────────────


def _to_tier_read(row: SubscriptionTier) -> TierRead:
    return TierRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        name=row.name,
        description=row.description,
        monthly_amount_cents=row.monthly_amount_cents,
        currency=row.currency,
        enabled=row.enabled,
        is_primary=row.is_primary,
        stripe_price_id=row.stripe_price_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_owned(
    db: AsyncSession, tier_id: UUID, owner_id: UUID,
) -> SubscriptionTier:
    row = await db.get(SubscriptionTier, tier_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != owner_id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Tier not found.",
        )
    return row


# ── Routes ─────────────────────────────────────────────────────


@router.get(
    "/subscription-tiers",
    response_model=list[TierRead],
    tags=["subscription-tiers"],
)
async def list_tiers(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    limit: int = 100,
) -> list[TierRead]:
    stmt = (
        select(SubscriptionTier)
        .where(SubscriptionTier.owner_id == current_user.id)
        .where(SubscriptionTier.deleted_at.is_(None))
        .order_by(SubscriptionTier.created_at.asc())
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_tier_read(r) for r in rows]


@router.post(
    "/subscription-tiers",
    response_model=TierRead,
    status_code=status.HTTP_201_CREATED,
    tags=["subscription-tiers"],
)
async def create_tier(
    payload: TierCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TierRead:
    row = SubscriptionTier(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        monthly_amount_cents=payload.monthly_amount_cents,
        currency=payload.currency,
        is_primary=payload.is_primary,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_tier_read(row)


@router.get(
    "/subscription-tiers/{tier_id}",
    response_model=TierRead,
    tags=["subscription-tiers"],
)
async def get_tier(
    tier_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TierRead:
    row = await _load_owned(db, tier_id, current_user.id)
    return _to_tier_read(row)


@router.patch(
    "/subscription-tiers/{tier_id}",
    response_model=TierRead,
    tags=["subscription-tiers"],
)
async def update_tier(
    tier_id: UUID,
    payload: TierUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TierRead:
    row = await _load_owned(db, tier_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_tier_read(row)


@router.delete(
    "/subscription-tiers/{tier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["subscription-tiers"],
)
async def delete_tier(
    tier_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await _load_owned(db, tier_id, current_user.id)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
