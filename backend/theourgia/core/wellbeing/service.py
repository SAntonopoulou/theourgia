"""Crisis-aware nudge — DB-facing service.

Loads the opt-in setting, the mute horizon, and (only when both allow
it) the recent mood readings, then applies the pure rule from
:mod:`theourgia.core.wellbeing.trigger`.

Privacy contract (load-bearing, regression-tested)
--------------------------------------------------

* When the user has NOT opted in (``a11y.crisis_nudge`` unset or
  False), :func:`evaluate_nudge` returns immediately — it never
  queries mood data. Not "queries and discards": the ``entry`` table
  is not touched at all for opted-out users.
* While muted (``a11y.crisis_nudge_muted_until`` is ``"forever"`` or a
  present/future ISO date), the mood query is skipped too — ``show``
  is False by definition, so there is nothing to compute.
* Nothing about an evaluation is logged or persisted. The designed
  promise on the Wellbeing surface is literal: "No record is kept of
  what prompted a check-in, or that one happened at all."

Settings persistence uses the ``user_setting`` table directly with the
same row shape as :mod:`theourgia.api.routers.v1.user_settings` — one
JSON-encoded value per (user, key). Both keys are registered in
:mod:`theourgia.core.usersettings.defaults`.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from theourgia.core.clock import now as clock_now
from theourgia.core.wellbeing.trigger import (
    WINDOW_DAYS,
    MoodReading,
    evaluate_sustained_distress,
)
from theourgia.models.entries import Entry
from theourgia.models.usersettings import UserSetting

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "CRISIS_NUDGE_KEY",
    "CRISIS_NUDGE_MUTED_UNTIL_KEY",
    "MUTED_FOREVER",
    "NudgeState",
    "evaluate_nudge",
    "is_muted",
    "load_mood_readings",
    "set_crisis_nudge_enabled",
    "set_muted_until",
]


CRISIS_NUDGE_KEY = "a11y.crisis_nudge"
CRISIS_NUDGE_MUTED_UNTIL_KEY = "a11y.crisis_nudge_muted_until"

#: Sentinel value for an indefinite mute — the user is never nagged.
MUTED_FOREVER = "forever"


@dataclass(frozen=True, slots=True)
class NudgeState:
    """Evaluated nudge state for one user."""

    enabled: bool
    muted: bool
    show: bool


# ── Settings rows (user_setting table) ───────────────────────────────


async def _read_setting(
    session: AsyncSession, user_id: UUID, key: str
) -> Any | None:
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == key
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        return None
    try:
        return json.loads(row.value_json)
    except (TypeError, ValueError):
        return None


async def _write_setting(
    session: AsyncSession, user_id: UUID, key: str, value: Any
) -> None:
    """Upsert one (user, key) row. The caller owns the commit."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == key
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    encoded = json.dumps(value)
    if row is None:
        session.add(
            UserSetting(
                user_id=user_id,
                key=key,
                value_json=encoded,
                schema_version=1,
                source="user",
            )
        )
    else:
        row.value_json = encoded


async def set_crisis_nudge_enabled(
    session: AsyncSession, user_id: UUID, *, enabled: bool
) -> None:
    """Persist the opt-in flag.

    Enabling also clears any mute horizon: re-opting in is an explicit
    request for this care to exist again, and a lingering indefinite
    mute would make the toggle a lie. Disabling leaves the mute row
    alone — it is irrelevant while the feature is off.
    """
    await _write_setting(session, user_id, CRISIS_NUDGE_KEY, enabled)
    if enabled:
        await _write_setting(
            session, user_id, CRISIS_NUDGE_MUTED_UNTIL_KEY, ""
        )


async def set_muted_until(
    session: AsyncSession, user_id: UUID, until: str
) -> None:
    """Persist the mute horizon — an ISO date or :data:`MUTED_FOREVER`.

    Validation of the value happens at the API boundary; this helper
    stores what it is given. The caller owns the commit.
    """
    await _write_setting(
        session, user_id, CRISIS_NUDGE_MUTED_UNTIL_KEY, until
    )


# ── Mute horizon ─────────────────────────────────────────────────────


def is_muted(muted_until: str | None, *, today: date) -> bool:
    """True while the mute horizon covers ``today``.

    ``muted_until`` is ``""``/None (not muted), ``"forever"``, or an
    ISO date — muted through that day inclusive. Unparseable values
    fail open to "not muted" so a corrupt row cannot silence the
    feature forever without the user asking for it.
    """
    if not muted_until:
        return False
    if muted_until == MUTED_FOREVER:
        return True
    try:
        until = date.fromisoformat(muted_until)
    except ValueError:
        return False
    return today <= until


# ── Mood readings ────────────────────────────────────────────────────


async def load_mood_readings(
    session: AsyncSession, user_id: UUID, *, as_of: date
) -> list[MoodReading]:
    """Load the user's mood readings from the trailing window.

    A reading is one non-null ``Entry.mood`` scalar, attributed to the
    calendar day of ``occurred_at`` (falling back to ``created_at``).
    Soft-deleted entries are excluded. The fetch is slightly generous
    (a full extra day at the window floor); the pure rule re-filters
    exactly.
    """
    day_expr = func.coalesce(Entry.occurred_at, Entry.created_at)
    cutoff = datetime.combine(
        as_of - timedelta(days=WINDOW_DAYS), time.min, tzinfo=UTC
    )
    stmt = select(Entry.occurred_at, Entry.created_at, Entry.mood).where(
        Entry.owner_id == user_id,
        Entry.mood.is_not(None),  # type: ignore[union-attr]
        Entry.deleted_at.is_(None),  # type: ignore[union-attr]
        day_expr >= cutoff,
    )
    rows = (await session.execute(stmt)).all()
    readings: list[MoodReading] = []
    for occurred_at, created_at, mood in rows:
        stamp = occurred_at or created_at
        if stamp is None or mood is None:
            continue
        readings.append(MoodReading(day=stamp.date(), mood=int(mood)))
    return readings


# ── Orchestration ────────────────────────────────────────────────────


async def evaluate_nudge(
    session: AsyncSession,
    user_id: UUID,
    *,
    now: datetime | None = None,
) -> NudgeState:
    """Evaluate the nudge for one user, honoring the privacy contract.

    Order matters and is deliberate:

    1. Read ``a11y.crisis_nudge``. Off (or unset) short-circuits —
       no mood data is ever queried for opted-out users.
    2. Read ``a11y.crisis_nudge_muted_until``. Muted short-circuits
       too; ``show`` is False regardless, so the mood query is skipped.
    3. Only then load the mood readings and apply the pure rule.
    """
    raw_enabled = await _read_setting(session, user_id, CRISIS_NUDGE_KEY)
    enabled = raw_enabled is True
    if not enabled:
        return NudgeState(enabled=False, muted=False, show=False)

    today = (now or clock_now()).date()
    raw_muted_until = await _read_setting(
        session, user_id, CRISIS_NUDGE_MUTED_UNTIL_KEY
    )
    muted_until = raw_muted_until if isinstance(raw_muted_until, str) else None
    if is_muted(muted_until, today=today):
        return NudgeState(enabled=True, muted=True, show=False)

    readings = await load_mood_readings(session, user_id, as_of=today)
    show = evaluate_sustained_distress(readings, as_of=today)
    return NudgeState(enabled=True, muted=False, show=show)
