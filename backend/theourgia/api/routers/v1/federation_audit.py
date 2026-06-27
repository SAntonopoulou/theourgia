"""Federation audit-log query + CSV export — Phase 12 B140.

Per ``plan/12-batches-backend.md`` § B140.

Reuses the existing ``audit_event`` table from Phase 01 — no
new migration. The H08 FederationAuditLog surface (frontend
surface 14) consumes the JSON listing; the CSV export is a
forensic artefact.

::

  GET /api/v1/hubs/{hub_id}/audit       JSON listing (filterable)
  GET /api/v1/hubs/{hub_id}/audit.csv   CSV of signed envelopes (forensic)

Honesty rules wired:

  · Append-only at the source — this surface NEVER offers
    edit / delete affordances. The router has no DELETE handler.
  · Requires VIEW_AUDIT_LOG capability — 403 otherwise.
  · CSV is the same row set as the JSON, in the same filter
    order. Forensic artefact, not summary.
  · Timestamps render in UTC — surface 14 handles local-zone
    display.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.audit import AuditEvent
from theourgia.models.hub_capability import HubCapability, HubRoleCapability
from theourgia.models.identity import Hub, Membership

__all__ = ["router"]


router = APIRouter()


_DEFAULT_LIMIT = 100
_MAX_LIMIT = 500


# ── Schemas ─────────────────────────────────────────────────────────


class AuditEventRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: str
    action: str
    actor_id: str | None
    hub_id: str | None
    outcome: str
    detail: dict
    created_at: datetime


class AuditListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[AuditEventRead]
    total: int


# ── Helpers ────────────────────────────────────────────────────────


async def _require_audit_view(
    db: AsyncSession, hub_id: UUID, user_id: UUID,
) -> Hub:
    hub = (
        await db.execute(
            select(Hub).where(
                Hub.id == hub_id, Hub.deleted_at.is_(None),
            )
        )
    ).scalars().first()
    if hub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hub not found.",
        )
    if hub.owner_id == user_id:
        return hub
    membership = (
        await db.execute(
            select(Membership).where(
                Membership.hub_id == hub.id,
                Membership.user_id == user_id,
            )
        )
    ).scalars().first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this hub.",
        )
    grant = (
        await db.execute(
            select(HubRoleCapability).where(
                HubRoleCapability.hub_id == hub.id,
                HubRoleCapability.role == membership.role,
                HubRoleCapability.capability
                == HubCapability.VIEW_AUDIT_LOG,
            )
        )
    ).scalars().first()
    if grant is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot do this because you lack permission "
                "view_audit_log."
            ),
        )
    return hub


TimeRange = Literal[
    "last_7_days",
    "last_30_days",
    "last_90_days",
    "all_time",
]


def _time_floor(time_range: TimeRange) -> datetime | None:
    if time_range == "all_time":
        return None
    days = {
        "last_7_days": 7,
        "last_30_days": 30,
        "last_90_days": 90,
    }[time_range]
    return datetime.now(tz=UTC) - timedelta(days=days)


async def _query_rows(
    db: AsyncSession,
    *,
    hub_id: UUID,
    actor: str | None,
    event: str | None,
    time_range: TimeRange,
    limit: int,
    offset: int,
) -> list[AuditEvent]:
    stmt = select(AuditEvent).where(AuditEvent.hub_id == hub_id)
    if actor and actor != "all":
        try:
            stmt = stmt.where(AuditEvent.actor_id == UUID(actor))
        except ValueError:
            return []
    if event and event != "all":
        stmt = stmt.where(AuditEvent.action == event)
    floor = _time_floor(time_range)
    if floor is not None:
        stmt = stmt.where(AuditEvent.created_at >= floor)
    stmt = (
        stmt.order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(
        (await db.execute(stmt)).scalars().all()
    )


def _to_read(row: AuditEvent) -> AuditEventRead:
    return AuditEventRead(
        id=str(row.id),
        kind=row.kind.value,
        action=row.action,
        actor_id=str(row.actor_id) if row.actor_id else None,
        hub_id=str(row.hub_id) if row.hub_id else None,
        outcome=row.outcome.value,
        detail=dict(row.detail or {}),
        created_at=row.created_at,
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.get(
    "/hubs/{hub_id}/audit",
    response_model=AuditListResponse,
)
async def list_audit(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    actor: str | None = None,
    event: str | None = None,
    time_range: TimeRange = "last_7_days",
    limit: int = _DEFAULT_LIMIT,
    offset: int = 0,
) -> AuditListResponse:
    await _require_audit_view(db, hub_id, user.id)
    limit = min(max(1, limit), _MAX_LIMIT)
    rows = await _query_rows(
        db,
        hub_id=hub_id,
        actor=actor,
        event=event,
        time_range=time_range,
        limit=limit,
        offset=offset,
    )
    return AuditListResponse(
        events=[_to_read(r) for r in rows],
        total=len(rows),
    )


@router.get("/hubs/{hub_id}/audit.csv")
async def export_audit_csv(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    actor: str | None = None,
    event: str | None = None,
    time_range: TimeRange = "last_7_days",
) -> Response:
    """CSV of signed envelopes. Forensic artefact — never an
    abridged summary."""
    await _require_audit_view(db, hub_id, user.id)
    # CSV export reads the FULL filtered slice (no pagination)
    # — forensic artefacts must be complete. Cap at the
    # operator-friendly max.
    rows = await _query_rows(
        db,
        hub_id=hub_id,
        actor=actor,
        event=event,
        time_range=time_range,
        limit=10_000,
        offset=0,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id", "created_at", "kind", "action",
            "actor_id", "hub_id", "outcome", "detail_json",
        ]
    )
    for r in rows:
        writer.writerow(
            [
                str(r.id),
                r.created_at.isoformat(),
                r.kind.value,
                r.action,
                str(r.actor_id) if r.actor_id else "",
                str(r.hub_id) if r.hub_id else "",
                r.outcome.value,
                json.dumps(dict(r.detail or {}), separators=(",", ":")),
            ]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="hub-{hub_id}-audit.csv"'
            ),
        },
    )
