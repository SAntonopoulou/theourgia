"""GET /api/v1/admin/health — operator health dashboard (v1-041).

Aggregates cheap per-service probes for the admin Health surface, which
previously showed only database + API live and labelled everything else
"probe pending". Each probe is failure-isolated: a probe that raises is
reported as ``degraded``/``unavailable`` on its own card and never 500s
the whole endpoint. Admin-scoped (same ``admin.observe`` gate as
``/metrics``) — service topology is not public.

The response shape mirrors the frontend ``ServiceProbe`` type so the
surface renders it directly.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session, require_scope
from theourgia.core.config import get_settings
from theourgia.core.authz.scopes import Scope

__all__ = ["router"]

_log = logging.getLogger(__name__)

router = APIRouter()

ServiceStatus = Literal["operational", "degraded", "expiring", "unavailable", "pending"]


class ServiceProbe(BaseModel):
    id: str
    label: str
    status: ServiceStatus
    status_label: str
    detail: str


class HealthSummary(BaseModel):
    probes: list[ServiceProbe]
    live_count: int
    total_count: int


async def _probe_database(session: AsyncSession) -> ServiceProbe:
    try:
        (await session.execute(text("SELECT 1"))).scalar_one()
        return ServiceProbe(
            id="database", label="Database", status="operational",
            status_label="Operational", detail="PostgreSQL reachable",
        )
    except Exception as exc:  # noqa: BLE001
        return ServiceProbe(
            id="database", label="Database", status="unavailable",
            status_label="Unavailable", detail=str(exc)[:200],
        )


async def _probe_migrations(session: AsyncSession) -> ServiceProbe:
    """Compare the applied alembic version to the newest migration file.

    A gap means an operator has pulled code with migrations they have
    not run yet — the single most common cause of a broken deploy.
    """
    try:
        applied = (
            await session.execute(text("SELECT version_num FROM alembic_version"))
        ).scalar_one_or_none()
        # …/backend/theourgia/api/routers/v1/admin_health.py → backend/
        versions_dir = Path(__file__).resolve().parents[4] / "alembic" / "versions"
        nums = [
            p.name.split("_", 1)[0]
            for p in versions_dir.glob("[0-9]*.py")
        ]
        latest = max(nums) if nums else None
        if applied is None:
            return ServiceProbe(
                id="migrations", label="Migrations", status="unavailable",
                status_label="Not stamped", detail="alembic_version empty",
            )
        if latest is not None and applied < latest:
            return ServiceProbe(
                id="migrations", label="Migrations", status="degraded",
                status_label="Pending", detail=f"applied {applied}, latest {latest} — run alembic upgrade head",
            )
        return ServiceProbe(
            id="migrations", label="Migrations", status="operational",
            status_label="Up to date", detail=f"head {applied}",
        )
    except Exception as exc:  # noqa: BLE001
        return ServiceProbe(
            id="migrations", label="Migrations", status="degraded",
            status_label="Unknown", detail=str(exc)[:200],
        )


async def _probe_backups(session: AsyncSession) -> ServiceProbe:
    from datetime import UTC, datetime

    from theourgia.models.backups import BackupRun, BackupRunStatus

    settings = get_settings()
    if not settings.restic_repository:
        return ServiceProbe(
            id="backups", label="Backups", status="pending",
            status_label="Not configured", detail="RESTIC_REPOSITORY unset",
        )
    try:
        row = (
            await session.execute(
                select(BackupRun).order_by(BackupRun.started_at.desc()).limit(1)
            )
        ).scalars().first()
        if row is None:
            return ServiceProbe(
                id="backups", label="Backups", status="degraded",
                status_label="No runs", detail="scheduled but never executed",
            )
        age_h = (datetime.now(tz=UTC) - row.started_at).total_seconds() / 3600
        if row.status != BackupRunStatus.SUCCESS:
            return ServiceProbe(
                id="backups", label="Backups", status="degraded",
                status_label="Last run failed", detail=(row.error_message or "failure")[:160],
            )
        status: ServiceStatus = "operational" if age_h < 30 else "expiring"
        return ServiceProbe(
            id="backups", label="Backups", status=status,
            status_label="Healthy" if status == "operational" else "Stale",
            detail=f"last success {age_h:.0f}h ago · snapshot {row.snapshot_id or '?'}",
        )
    except Exception as exc:  # noqa: BLE001
        return ServiceProbe(
            id="backups", label="Backups", status="degraded",
            status_label="Unknown", detail=str(exc)[:200],
        )


async def _probe_federation(session: AsyncSession) -> ServiceProbe:
    from theourgia.models.federation_peer import FederationPeer

    settings = get_settings()
    if not settings.federation_transport_enabled:
        return ServiceProbe(
            id="federation", label="Federation", status="pending",
            status_label="Disabled", detail="transport off (opt-in)",
        )
    try:
        n = (
            await session.execute(select(func.count()).select_from(FederationPeer))
        ).scalar_one()
        return ServiceProbe(
            id="federation", label="Federation", status="operational",
            status_label="Enabled", detail=f"{n} peer(s) registered",
        )
    except Exception as exc:  # noqa: BLE001
        return ServiceProbe(
            id="federation", label="Federation", status="degraded",
            status_label="Unknown", detail=str(exc)[:200],
        )


async def _probe_plugins(session: AsyncSession) -> ServiceProbe:
    from theourgia.core.plugins.state import PluginState
    from theourgia.models.plugins import PluginInstall

    try:
        n = (
            await session.execute(
                select(func.count())
                .select_from(PluginInstall)
                .where(PluginInstall.state == PluginState.ACTIVE)
            )
        ).scalar_one()
        return ServiceProbe(
            id="plugins", label="Plugins", status="operational",
            status_label="Loaded", detail=f"{n} active",
        )
    except Exception as exc:  # noqa: BLE001
        return ServiceProbe(
            id="plugins", label="Plugins", status="degraded",
            status_label="Unknown", detail=str(exc)[:200],
        )


def _probe_storage() -> ServiceProbe:
    settings = get_settings()
    backend = settings.storage_backend
    return ServiceProbe(
        id="storage", label="Object storage", status="operational",
        status_label=backend.upper() if backend else "LOCAL",
        detail=f"backend={backend or 'local'}",
    )


def _probe_agent_daemon() -> ServiceProbe:
    settings = get_settings()
    if not settings.agent_daemon_url:
        return ServiceProbe(
            id="agents", label="AI agents", status="pending",
            status_label="Disabled", detail="no daemon configured (opt-in)",
        )
    return ServiceProbe(
        id="agents", label="AI agents", status="operational",
        status_label="Configured", detail=f"daemon at {settings.agent_daemon_url}",
    )


@router.get(
    "/admin/health",
    summary="Operator health dashboard (admin-scoped)",
    response_model=HealthSummary,
)
async def admin_health(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    _user: object = Depends(require_scope(Scope.ADMIN_OBSERVE)),  # noqa: B008
) -> HealthSummary:
    probes = [
        await _probe_database(session),
        await _probe_migrations(session),
        await _probe_backups(session),
        await _probe_federation(session),
        await _probe_plugins(session),
        _probe_storage(),
        _probe_agent_daemon(),
    ]
    live = sum(1 for p in probes if p.status not in ("pending",))
    return HealthSummary(probes=probes, live_count=live, total_count=len(probes))
