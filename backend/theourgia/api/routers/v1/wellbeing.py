"""Wellbeing endpoints — the opt-in crisis-aware nudge (v1-010).

Routes
------
``GET  /api/v1/wellbeing/nudge``          → current nudge state
``PUT  /api/v1/wellbeing/nudge``          → set the opt-in flag
``POST /api/v1/wellbeing/nudge/dismiss``  → mute (ISO date or forever)

All routes require auth. The GET honors the privacy contract from
:mod:`theourgia.core.wellbeing.service`: when the setting is off the
response is ``{"enabled": false, "show": false, "resources": []}`` and
the user's mood data is never queried.

The PUT exists because the settings toggle needs a server-side save
path (the AccessibilityAndMotion route previously persisted to
localStorage only). Enabling clears any mute horizon — see
:func:`theourgia.core.wellbeing.service.set_crisis_nudge_enabled`.

Nothing in this module is user-visible copy; the designer owns every
visible string of the wellbeing feature. The resources list is API
data pending maintainer review (Sacred Well Directory placeholder
rule — see :mod:`theourgia.core.wellbeing.resources`).
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

# FastAPI resolves these annotations at runtime for dependency
# injection — they must stay importable outside TYPE_CHECKING.
from uuid import UUID  # noqa: TC003

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: TC002

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.wellbeing.resources import resources_payload
from theourgia.core.wellbeing.service import (
    MUTED_FOREVER,
    evaluate_nudge,
    set_crisis_nudge_enabled,
    set_muted_until,
)

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class CrisisResourceRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    region: str
    name: str
    url: str


class NudgeRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    show: bool
    resources: list[CrisisResourceRead]


class NudgeSettingWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class NudgeDismiss(BaseModel):
    model_config = ConfigDict(extra="forbid")

    until: str = MUTED_FOREVER
    """Mute horizon: ``"forever"`` (default — the user can mute
    indefinitely and is never nagged) or an ISO date, muted through
    that day inclusive."""

    @field_validator("until")
    @classmethod
    def _forever_or_iso_date(cls, value: str) -> str:
        if value == MUTED_FOREVER:
            return value
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                "until must be 'forever' or an ISO date (YYYY-MM-DD)"
            ) from exc
        return value


# ── Helpers ──────────────────────────────────────────────────────────


async def _nudge_read(db: AsyncSession, user_id: UUID) -> NudgeRead:
    state = await evaluate_nudge(db, user_id)
    resources = (
        [CrisisResourceRead(**r) for r in resources_payload()]
        if state.enabled
        else []
    )
    return NudgeRead(
        enabled=state.enabled, show=state.show, resources=resources
    )


# ── Routes ───────────────────────────────────────────────────────────


@router.get(
    "/wellbeing/nudge",
    summary="Current crisis-aware-nudge state",
    description=(
        "Returns whether the opt-in nudge is enabled, whether it "
        "should show right now, and the support-resource starter "
        "list. Opted-out users get enabled=false, show=false, "
        "resources=[] — and their mood data is never queried."
    ),
    response_model=NudgeRead,
)
async def get_nudge(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NudgeRead:
    return await _nudge_read(db, current_user.id)


@router.put(
    "/wellbeing/nudge",
    summary="Set the crisis-aware-nudge opt-in",
    description=(
        "Persists the a11y.crisis_nudge user setting. Enabling also "
        "clears any mute horizon."
    ),
    response_model=NudgeRead,
)
async def put_nudge(
    payload: NudgeSettingWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NudgeRead:
    await set_crisis_nudge_enabled(
        db, current_user.id, enabled=payload.enabled
    )
    await db.commit()
    return await _nudge_read(db, current_user.id)


@router.post(
    "/wellbeing/nudge/dismiss",
    summary="Mute the crisis-aware nudge",
    description=(
        "Sets a11y.crisis_nudge_muted_until to an ISO date or "
        "'forever' (the default). While muted, GET returns "
        "show=false and no trigger evaluation happens."
    ),
    response_model=NudgeRead,
)
async def dismiss_nudge(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    payload: NudgeDismiss | None = None,
) -> NudgeRead:
    until = payload.until if payload is not None else MUTED_FOREVER
    await set_muted_until(db, current_user.id, until)
    await db.commit()
    return await _nudge_read(db, current_user.id)
