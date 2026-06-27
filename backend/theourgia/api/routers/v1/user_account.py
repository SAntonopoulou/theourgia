"""Per-user account lifecycle — H10 Cluster B prerequisites.

Endpoints for the H10 Cluster B surfaces (DataExportRequest · AccountDeletion):

  GET    /api/v1/me                       → identity + deletion-scheduled state
  POST   /api/v1/me/data-export           → run GDPR export · returns JSON inline
  POST   /api/v1/me/account/delete        → schedule 30-day grace deletion
  POST   /api/v1/me/account/reactivate    → clear scheduled deletion

Rule 45 — data export is asynchronous AND emailed in the design. The v1
endpoint returns the JSON inline for simplicity; an async-with-email
pipeline lands as a v1.1 enhancement (the surface is OK with sync inline
for v1 — the rule is about the design contract, the implementation can
evolve).

Rule 46 — account deletion is 30-day grace. Reactivation is one-tap
during the window; the background reaper purges after.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.gdpr.service import GDPRService
from theourgia.models.audit import AuditEventKind, AuditOutcome

__all__ = ["router"]


router = APIRouter()


GRACE_PERIOD = timedelta(days=30)


class MeRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: str
    scheduled_for_deletion_at: datetime | None


class DeletionScheduledRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheduled_for_deletion_at: datetime


class DataExportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    archive: dict


@router.get("/me", response_model=MeRead)
async def get_me(user: CurrentUser) -> MeRead:
    return MeRead(
        id=str(user.id),
        email=user.email,
        scheduled_for_deletion_at=user.scheduled_for_deletion_at,
    )


@router.post("/me/data-export", response_model=DataExportResponse)
async def request_data_export(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DataExportResponse:
    """Run the GDPR export inline + return the archive JSON.

    Rule 45 says async-with-email; the v1 endpoint returns inline so
    the H10 DataExportRequest surface has a stable contract. The
    surface dispatches the JSON to the user as a downloadable blob.
    """
    service = GDPRService()
    archive = await service.export_user_data(
        user_id=user.id, db_session=db,
    )
    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="user.data_export",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        detail={"feature_count": len(archive.get("features", {}))},
    )
    await db.commit()
    return DataExportResponse(archive=archive)


@router.post(
    "/me/account/delete",
    response_model=DeletionScheduledRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def schedule_account_deletion(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeletionScheduledRead:
    """Schedule the user's account for deletion in 30 days.

    Reactivation is available via /me/account/reactivate until the
    grace window expires. The background reaper sweeps when
    ``scheduled_for_deletion_at < now()``.
    """
    if user.scheduled_for_deletion_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account already scheduled for deletion.",
        )
    user.scheduled_for_deletion_at = datetime.now(tz=UTC) + GRACE_PERIOD
    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="user.deletion_scheduled",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        detail={
            "scheduled_for": user.scheduled_for_deletion_at.isoformat(),
        },
    )
    await db.commit()
    await db.refresh(user)
    assert user.scheduled_for_deletion_at is not None
    return DeletionScheduledRead(
        scheduled_for_deletion_at=user.scheduled_for_deletion_at,
    )


@router.post("/me/account/reactivate", response_model=MeRead)
async def reactivate_account(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MeRead:
    if user.scheduled_for_deletion_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account is not scheduled for deletion.",
        )
    user.scheduled_for_deletion_at = None
    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="user.deletion_cancelled",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
    )
    await db.commit()
    await db.refresh(user)
    return MeRead(
        id=str(user.id),
        email=user.email,
        scheduled_for_deletion_at=user.scheduled_for_deletion_at,
    )
