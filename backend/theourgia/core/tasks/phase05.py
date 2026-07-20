"""Phase 05 reminder tasks.

Periodic Celery beat tasks that walk the Phase 05 ledgers and surface
items that need attention:

* Oath accountability checkpoints — when a checkpoint's ``due_at``
  has fallen due and the checkpoint is not yet ``completed_at``.
* Contract obligations — when an obligation's ``due_at`` has fallen
  due and the obligation status is still ``pending`` / ``in-progress``.
  These are flipped to ``overdue`` in-place so the user's contract
  list shows the state without a full re-render.
* Servitor feeding — when ``last_fed_at + feeding_cadence`` has
  passed (today: simple ``daily`` / ``weekly`` / ``monthly`` parsing
  only; cron / lunar cadences fall through to a follow-up batch).
* Recurring offerings — when ``next_due_at`` has fallen and the
  offering schedule is active.

Each task returns a small status dict — count of items found, count
of items flagged. The actual user-visible reminder lands when the
notification substrate's per-template registrations + the inbox UI
ship; until then these tasks are observability + state-correction
only.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from theourgia.core.tasks.app import celery_app
from theourgia.models.contracts import Contract, ContractStatus, ObligationStatus
from theourgia.models.oaths import Oath, OathStatus
from theourgia.models.offerings import RecurringOffering
from theourgia.models.servitors import Servitor, ServitorStatus

__all__ = [
    "check_oath_checkpoints",
    "check_contract_obligations",
    "check_servitor_feeding",
    "check_recurring_offerings",
    "run_phase05_reminders",
    "_advance_next_due",
    "_feeding_overdue",
]


log = logging.getLogger(__name__)


# ───── Oath checkpoints ────────────────────────────────────────────────


async def check_oath_checkpoints(
    session: AsyncSession, *, now: datetime | None = None,
) -> dict[str, int]:
    """Find oath accountability checkpoints that are now due.

    A checkpoint is due when ``due_at <= now`` and ``completed_at`` is
    absent. The task does not mutate checkpoints (they're per-user
    reflections, completed by the user); it just counts them so the
    reminder layer can surface "you have 3 checkpoints due".
    """
    now = now or datetime.now(tz=UTC)
    stmt = (
        select(Oath)
        .where(Oath.deleted_at.is_(None))
        .where(Oath.status == OathStatus.ACTIVE)
    )
    rows = (await session.execute(stmt)).scalars().all()

    total_due = 0
    oaths_affected = 0
    for oath in rows:
        checkpoints = list(oath.accountability_checkpoints or [])
        oath_due = 0
        for cp in checkpoints:
            due_at_raw = cp.get("due_at")
            if due_at_raw is None or cp.get("completed_at") is not None:
                continue
            try:
                due_at = datetime.fromisoformat(str(due_at_raw))
            except ValueError:
                continue
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=UTC)
            if due_at <= now:
                oath_due += 1
        if oath_due:
            oaths_affected += 1
            total_due += oath_due
            log.info(
                "oath checkpoint due",
                extra={"oath_id": str(oath.id), "due_count": oath_due},
            )
    return {"checkpoints_due": total_due, "oaths_affected": oaths_affected}


# ───── Contract obligations ───────────────────────────────────────────


async def check_contract_obligations(
    session: AsyncSession, *, now: datetime | None = None,
) -> dict[str, int]:
    """Flip overdue obligations to ``overdue`` in place.

    Walks ``our_obligations`` + ``their_obligations`` on every active
    contract. An obligation is overdue when its ``due_at`` has passed
    AND its ``status`` is one of ``pending`` / ``in-progress``.
    """
    now = now or datetime.now(tz=UTC)
    stmt = (
        select(Contract)
        .where(Contract.deleted_at.is_(None))
        .where(Contract.status == ContractStatus.ACTIVE)
    )
    rows = (await session.execute(stmt)).scalars().all()

    flipped = 0
    contracts_affected = 0

    def _walk_side(side_obligations: list[dict[str, object]]) -> int:
        n = 0
        for ob in side_obligations:
            status_raw = ob.get("status")
            if status_raw not in {
                ObligationStatus.PENDING.value,
                ObligationStatus.IN_PROGRESS.value,
            }:
                continue
            due_at_raw = ob.get("due_at")
            if due_at_raw is None:
                continue
            try:
                due_at = datetime.fromisoformat(str(due_at_raw))
            except ValueError:
                continue
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=UTC)
            if due_at <= now:
                ob["status"] = ObligationStatus.OVERDUE.value
                n += 1
        return n

    for contract in rows:
        our = list(contract.our_obligations or [])
        theirs = list(contract.their_obligations or [])
        ours_flipped = _walk_side(our)
        theirs_flipped = _walk_side(theirs)
        if ours_flipped:
            contract.our_obligations = our
            flag_modified(contract, "our_obligations")
        if theirs_flipped:
            contract.their_obligations = theirs
            flag_modified(contract, "their_obligations")
        if ours_flipped or theirs_flipped:
            contracts_affected += 1
            flipped += ours_flipped + theirs_flipped
            log.info(
                "contract obligations flipped overdue",
                extra={
                    "contract_id": str(contract.id),
                    "ours": ours_flipped,
                    "theirs": theirs_flipped,
                },
            )

    if flipped:
        await session.commit()
    return {"obligations_overdue": flipped, "contracts_affected": contracts_affected}


# ───── Servitor feeding ────────────────────────────────────────────────


_CADENCE_DELTAS: dict[str, timedelta] = {
    "daily": timedelta(days=1),
    "weekly": timedelta(days=7),
    "monthly": timedelta(days=30),
}


def _feeding_overdue(
    last_fed_at: datetime | None,
    cadence: str | None,
    now: datetime,
) -> bool:
    """Return True iff a servitor with this last-fed + cadence is due
    for feeding right now.

    Conservative parser: only the named cadences ``daily`` / ``weekly``
    / ``monthly`` count as overdue here. ``cron:...`` / ``lunar:...`` /
    ``as-needed`` fall through to ``False`` and land in a follow-up
    batch alongside the same vocabulary work in the RecurringOffering
    scheduler.
    """
    if cadence is None:
        return False
    delta = _CADENCE_DELTAS.get(cadence.strip().lower())
    if delta is None:
        return False
    if last_fed_at is None:
        # Never fed → due immediately.
        return True
    fed = last_fed_at if last_fed_at.tzinfo is not None else last_fed_at.replace(tzinfo=UTC)
    return fed + delta <= now


async def check_servitor_feeding(
    session: AsyncSession, *, now: datetime | None = None,
) -> dict[str, int]:
    """Count servitors whose feeding cadence has elapsed."""
    now = now or datetime.now(tz=UTC)
    stmt = (
        select(Servitor)
        .where(Servitor.deleted_at.is_(None))
        .where(Servitor.status == ServitorStatus.ACTIVE)
        .where(Servitor.feeding_cadence.is_not(None))
    )
    rows = (await session.execute(stmt)).scalars().all()
    due = 0
    for servitor in rows:
        if _feeding_overdue(servitor.last_fed_at, servitor.feeding_cadence, now):
            due += 1
            log.info(
                "servitor feeding due",
                extra={
                    "servitor_id": str(servitor.id),
                    "cadence": servitor.feeding_cadence,
                },
            )
    return {"servitors_due": due}


# ───── Recurring offerings ─────────────────────────────────────────────


def _advance_next_due(cadence: str | None, current: datetime) -> datetime | None:
    """Compute the next due time for a recurring offering after the
    current occurrence fires.

    Same conservative vocabulary as servitor feeding: only ``daily`` /
    ``weekly`` / ``monthly`` advance deterministically. Other cadences
    return None and leave ``next_due_at`` unchanged (the lunar / cron /
    festival cadences require the Phase 03 ephemeris + calendar
    registry to advance — that wiring is a follow-up).
    """
    if cadence is None:
        return None
    delta = _CADENCE_DELTAS.get(cadence.strip().lower())
    if delta is None:
        return None
    return current + delta


async def check_recurring_offerings(
    session: AsyncSession, *, now: datetime | None = None,
) -> dict[str, int]:
    """Surface recurring offerings whose ``next_due_at`` has fallen.

    Advances ``next_due_at`` for the named cadences so the schedule
    rolls forward on its own; non-named cadences are logged and left
    for a future ephemeris-aware scheduler.
    """
    now = now or datetime.now(tz=UTC)
    stmt = (
        select(RecurringOffering)
        .where(RecurringOffering.deleted_at.is_(None))
        .where(RecurringOffering.is_active.is_(True))
        .where(RecurringOffering.next_due_at.is_not(None))
        .where(RecurringOffering.next_due_at <= now)
    )
    rows = (await session.execute(stmt)).scalars().all()

    advanced = 0
    not_advanced = 0
    for rec in rows:
        log.info(
            "recurring offering due",
            extra={
                "recurring_offering_id": str(rec.id),
                "label": rec.label,
                "cadence": rec.cadence,
            },
        )
        next_due = _advance_next_due(rec.cadence, rec.next_due_at or now)
        if next_due is not None:
            rec.next_due_at = next_due
            advanced += 1
        else:
            not_advanced += 1

    if advanced:
        await session.commit()
    return {
        "recurring_offerings_due": len(rows),
        "advanced": advanced,
        "not_advanced": not_advanced,
    }


# ───── Beat-driven aggregator ─────────────────────────────────────────


@celery_app.task(
    name="theourgia.core.tasks.phase05.run_phase05_reminders",
    bind=True,
    max_retries=3,
)
def run_phase05_reminders(self) -> dict[str, dict[str, int]]:  # type: ignore[no-untyped-def]
    """Run all four Phase 05 reminder checks in one beat tick.

    Returns the per-check status dicts so an operator can see at a
    glance how much each ledger reported.
    """
    import asyncio

    from theourgia.core.db import task_session_scope

    async def _run() -> dict[str, dict[str, int]]:
        result: dict[str, dict[str, int]] = {}
        async with task_session_scope() as session:
            result["oaths"] = await check_oath_checkpoints(session)
            result["contracts"] = await check_contract_obligations(session)
            result["servitors"] = await check_servitor_feeding(session)
            result["recurring_offerings"] = await check_recurring_offerings(session)
        return result

    return asyncio.run(_run())
