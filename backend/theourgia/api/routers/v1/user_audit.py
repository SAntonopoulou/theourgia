"""Per-user audit log — H10 Cluster B4 prerequisite.

The H10 PerUserAuditLog surface (Cluster B4) needs to read every
audit event the user is the actor of. Hub-scoped audit (B137 / H08
surface 14) already exists at ``/api/v1/hubs/{hub_id}/audit``; this
router is its per-user counterpart::

  GET /api/v1/me/audit            JSON listing (filterable)
  GET /api/v1/me/audit.csv        CSV (forensic artefact)

Filters mirror the federation audit log: action filter · event-kind
filter · time range. UUIDs are present in the response but rule 49
says the surface hides them by default — that's the surface's
responsibility, not the API's.

Honesty rules wired:

  · Append-only at the source — no DELETE handler.
  · Per-user means strictly the actor's own events — even if the
    user is a hub admin, this endpoint does NOT include events
    actioned BY OTHERS on the user's content (those live in the
    hub-scoped audit log).
  · CSV export is the same row set as the JSON, in the same filter
    order. Forensic artefact, not summary.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.audit import AuditEvent

__all__ = ["router"]


router = APIRouter()


_DEFAULT_LIMIT = 100
_MAX_LIMIT = 500


class AuditEventRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: str
    action: str
    actor_id: str | None
    hub_id: str | None
    vault_id: str | None
    outcome: str
    detail: dict
    created_at: datetime


class AuditListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[AuditEventRead]
    total: int


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


def _to_read(row: AuditEvent) -> AuditEventRead:
    return AuditEventRead(
        id=str(row.id),
        kind=row.kind.value,
        action=row.action,
        actor_id=str(row.actor_id) if row.actor_id else None,
        hub_id=str(row.hub_id) if row.hub_id else None,
        vault_id=str(row.vault_id) if row.vault_id else None,
        outcome=row.outcome.value,
        detail=dict(row.detail or {}),
        created_at=row.created_at,
    )


async def _query_rows(
    db: AsyncSession,
    *,
    actor_id,  # noqa: ANN001 — typed UUID via FastAPI dep
    kind: str | None,
    action: str | None,
    time_range: TimeRange,
    limit: int,
    offset: int,
) -> list[AuditEvent]:
    stmt = select(AuditEvent).where(AuditEvent.actor_id == actor_id)
    if kind and kind != "all":
        # Match against the enum's value
        stmt = stmt.where(AuditEvent.kind == kind)  # type: ignore[arg-type]
    if action and action != "all":
        stmt = stmt.where(AuditEvent.action == action)
    floor = _time_floor(time_range)
    if floor is not None:
        stmt = stmt.where(AuditEvent.created_at >= floor)
    stmt = (
        stmt.order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list((await db.execute(stmt)).scalars().all())


@router.get("/me/audit", response_model=AuditListResponse)
async def list_my_audit(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: str | None = None,
    action: str | None = None,
    time_range: TimeRange = "last_7_days",
    limit: int = _DEFAULT_LIMIT,
    offset: int = 0,
) -> AuditListResponse:
    limit = min(max(1, limit), _MAX_LIMIT)
    rows = await _query_rows(
        db,
        actor_id=user.id,
        kind=kind,
        action=action,
        time_range=time_range,
        limit=limit,
        offset=offset,
    )
    return AuditListResponse(
        events=[_to_read(r) for r in rows],
        total=len(rows),
    )


@router.get("/me/audit.csv")
async def export_my_audit_csv(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: str | None = None,
    action: str | None = None,
    time_range: TimeRange = "last_7_days",
) -> Response:
    """CSV export of the user's own audit log. Forensic artefact —
    full filtered slice (no pagination), capped at operator-friendly
    max."""
    rows = await _query_rows(
        db,
        actor_id=user.id,
        kind=kind,
        action=action,
        time_range=time_range,
        limit=10_000,
        offset=0,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id", "created_at", "kind", "action",
            "actor_id", "vault_id", "hub_id", "outcome", "detail_json",
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
                str(r.vault_id) if r.vault_id else "",
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
                f'attachment; filename="my-audit-{user.id}.csv"'
            ),
        },
    )
