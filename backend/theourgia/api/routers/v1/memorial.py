"""Memorial mode / digital inheritance endpoints — b108-2hg.

FEATURES §18 · Digital inheritance / memorial mode. v1 covers the
per-user config, the manual check-in mechanic, and manual
memorial-mode trigger + reactivate.

Endpoints (all authenticated, owner-scoped):

- GET   /api/v1/memorial/config       — read config (creates default if missing)
- PATCH /api/v1/memorial/config       — update settings
- POST  /api/v1/memorial/check-in     — record a check-in (bumps last_check_in_at)
- POST  /api/v1/memorial/trigger      — enter memorial mode (destructive)
- POST  /api/v1/memorial/reactivate   — bring vault back from memorial mode

The state (active / warning / memorial_pending / memorialized) is
computed on read from the timestamps so it's always consistent.

**No automatic time-based trigger yet.** A Celery-beat task that
transitions the vault to memorial mode when the check-in window has
expired lands in a follow-up batch — it needs a threat-model review
(what does the executor cryptographically hold?).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.memorial import MemorialConfig

__all__ = ["router"]

router = APIRouter()


MemorialState = Literal[
    "active",
    "warning",
    "memorial_pending",
    "memorialized",
]


class MemorialConfigRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    owner_id: str
    check_in_cadence_days: int
    warning_window_days: int
    last_check_in_at: datetime | None
    executor_name: str | None
    executor_email: str | None
    memorial_message: str | None
    posthumous_publications_enabled: bool
    memorialized_at: datetime | None
    # Computed
    state: MemorialState
    days_until_warning: int | None
    days_until_pending: int | None


class MemorialConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    check_in_cadence_days: int | None = Field(default=None, ge=0, le=3650)
    warning_window_days: int | None = Field(default=None, ge=0, le=3650)
    executor_name: str | None = Field(default=None, max_length=240)
    executor_email: EmailStr | None = None
    memorial_message: str | None = None
    posthumous_publications_enabled: bool | None = None


def _compute_state(row: MemorialConfig) -> MemorialState:
    if row.memorialized_at is not None:
        return "memorialized"
    if row.check_in_cadence_days <= 0:
        # 0 disables expiry entirely.
        return "active"
    now = datetime.now(tz=timezone.utc)
    last = row.last_check_in_at or row.created_at
    days_since_check_in = (now - last).days
    if days_since_check_in <= row.check_in_cadence_days:
        return "active"
    if days_since_check_in <= row.check_in_cadence_days + row.warning_window_days:
        return "warning"
    return "memorial_pending"


def _days_until_warning(row: MemorialConfig) -> int | None:
    if row.memorialized_at is not None or row.check_in_cadence_days <= 0:
        return None
    now = datetime.now(tz=timezone.utc)
    last = row.last_check_in_at or row.created_at
    days_since = (now - last).days
    remaining = row.check_in_cadence_days - days_since
    return remaining


def _days_until_pending(row: MemorialConfig) -> int | None:
    if row.memorialized_at is not None or row.check_in_cadence_days <= 0:
        return None
    now = datetime.now(tz=timezone.utc)
    last = row.last_check_in_at or row.created_at
    days_since = (now - last).days
    limit = row.check_in_cadence_days + row.warning_window_days
    remaining = limit - days_since
    return remaining


def _to_read(row: MemorialConfig) -> MemorialConfigRead:
    return MemorialConfigRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        check_in_cadence_days=row.check_in_cadence_days,
        warning_window_days=row.warning_window_days,
        last_check_in_at=row.last_check_in_at,
        executor_name=row.executor_name,
        executor_email=row.executor_email,
        memorial_message=row.memorial_message,
        posthumous_publications_enabled=row.posthumous_publications_enabled,
        memorialized_at=row.memorialized_at,
        state=_compute_state(row),
        days_until_warning=_days_until_warning(row),
        days_until_pending=_days_until_pending(row),
    )


async def _get_or_create_config(
    db: AsyncSession, owner_id: UUID,
) -> MemorialConfig:
    stmt = select(MemorialConfig).where(MemorialConfig.owner_id == owner_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        row = MemorialConfig(owner_id=owner_id)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get(
    "/memorial/config",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def get_config(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    row = await _get_or_create_config(db, current_user.id)
    return _to_read(row)


@router.patch(
    "/memorial/config",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def update_config(
    payload: MemorialConfigUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    row = await _get_or_create_config(db, current_user.id)
    if row.memorialized_at is not None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "The vault is in memorial mode; settings cannot be changed. "
            "Reactivate the vault first.",
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/check-in",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def check_in(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Record a check-in. Bumps ``last_check_in_at`` to now.

    Even a memorialized vault accepts check-ins; if the operator
    signs in from beyond the veil, they may want to reactivate.
    """
    row = await _get_or_create_config(db, current_user.id)
    row.last_check_in_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/trigger",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def trigger_memorial(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Enter memorial mode manually. Destructive: private writes are
    frozen; the vault becomes a read-only in-memoriam surface until
    a subsequent /reactivate call.
    """
    row = await _get_or_create_config(db, current_user.id)
    if row.memorialized_at is not None:
        return _to_read(row)  # idempotent
    row.memorialized_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/reactivate",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def reactivate(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Bring a memorialized vault back. Bumps last_check_in_at too so
    the state immediately returns to `active`."""
    row = await _get_or_create_config(db, current_user.id)
    row.memorialized_at = None
    row.last_check_in_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)
