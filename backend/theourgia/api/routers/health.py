"""Liveness and readiness endpoints.

- ``/healthz`` — alive? Returns 200 if the process is responsive. Does
  not check dependencies; cheap by design (kubelet / Docker
  health-check style).
- ``/readyz`` — ready to serve? Verifies database connectivity (and
  Redis once that integration lands). Returns 503 with a
  :class:`Problem` if any dependency is down.

These endpoints intentionally bypass authentication so external probes
can monitor them. Both return RFC 7807 ``Problem`` payloads on failure.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.api.errors import ServiceUnavailableError

__all__ = ["router"]

_log = logging.getLogger(__name__)

router = APIRouter()


class HealthStatus(BaseModel):
    """Response from ``/healthz`` and ``/readyz`` on success."""

    status: str = Field(description="'ok' when serving normally")
    checks: dict[str, str] = Field(
        default_factory=dict,
        description="Per-dependency status (only populated on /readyz)",
    )


@router.get(
    "/healthz",
    summary="Liveness check",
    description="Returns 200 if the process is alive. Does not check dependencies.",
    response_model=HealthStatus,
    response_model_exclude_defaults=False,
    include_in_schema=False,
)
async def healthz() -> HealthStatus:
    return HealthStatus(status="ok")


@router.get(
    "/readyz",
    summary="Readiness check",
    description=(
        "Returns 200 if the process is ready to serve requests "
        "(database reachable). Returns 503 if any dependency is unavailable."
    ),
    response_model=HealthStatus,
    response_model_exclude_defaults=False,
    include_in_schema=False,
)
async def readyz(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> HealthStatus:
    checks: dict[str, str] = {}

    try:
        result = await session.execute(text("SELECT 1"))
        result.scalar_one()
        checks["database"] = "ok"
    except Exception as exc:
        _log.warning("readyz: database check failed: %s", exc)
        checks["database"] = "unavailable"

    if any(v != "ok" for v in checks.values()):
        # Surface a Problem; the handler in errors.py turns this into 503.
        raise ServiceUnavailableError(
            detail="; ".join(f"{k}={v}" for k, v in checks.items() if v != "ok"),
        )

    return HealthStatus(status="ok", checks=checks)
