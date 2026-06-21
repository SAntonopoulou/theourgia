"""Today — Ledger widgets aggregator.

``GET /api/v1/today/ledger`` — the four Phase-05 Today cards:

1. **Active practices** — recurring offerings due in ≤ 24h.
2. **Obligations** — overdue contract obligations + overdue oath
   checkpoints. Sealed checkpoints render **count only, zero text**.
3. **Servitor feeding** — servitors whose cadence has elapsed
   (informational, not nagging — "Record feeding when ready").
4. **Attestation activity** — recent counter-sign / revocation
   activity on the user's attestations.

Per the H01-H03 supplement's "Today — Ledger Widgets" surface. The
endpoint returns small typed cards; the frontend renders them in
the Today rail.

Tone discipline carries over: no red/danger for any of these; overdue
items use amber (`--warn`), sealed counts say "N sealed checkpoints
due" without leaking text.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.tasks.phase05 import _feeding_overdue
from theourgia.models.attestations import (
    Attestation,
    AttestationSignature,
)
from theourgia.models.contracts import Contract, ContractStatus, ObligationStatus
from theourgia.models.entries import EncryptionMode
from theourgia.models.oaths import Oath, OathStatus
from theourgia.models.offerings import RecurringOffering
from theourgia.models.servitors import Servitor, ServitorStatus

__all__ = ["router"]

router = APIRouter()


# ───── Payload shapes ─────────────────────────────────────────────────


class ActivePractice(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recurring_offering_id: str
    entity_id: str
    label: str
    cadence: str
    next_due_at: datetime | None
    hours_until_due: float | None


class ActivePracticesCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    practices: list[ActivePractice]
    total_due_in_24h: int


ObligationSide = Literal["ours", "theirs"]


class ContractObligationDue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_id: str
    contract_title: str
    side: ObligationSide
    obligation_id: str
    description: str
    due_at: datetime | None
    status: str


class OathCheckpointDue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    oath_id: str
    oath_kind: str
    recipient: str | None
    due_at: datetime
    sealed: bool
    prompt: str | None = Field(
        default=None,
        description="NULL when the oath is sealed — zero plaintext leaks.",
    )


class ObligationsCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_obligations: list[ContractObligationDue]
    oath_checkpoints: list[OathCheckpointDue]
    sealed_checkpoint_count: int = Field(
        description="How many checkpoints are due but sealed — surface as count only.",
    )


class ServitorFeedingDue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    servitor_id: str
    name: str
    kind: str
    feeding_cadence: str | None
    last_fed_at: datetime | None


class ServitorFeedingCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feedings_due: list[ServitorFeedingDue]


class AttestationActivity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attestation_id: str
    description: str
    signer_label: str
    role: str
    signed_at: datetime


class AttestationActivityCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity: list[AttestationActivity]


class TodayLedger(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active_practices: ActivePracticesCard
    obligations: ObligationsCard
    servitor_feeding: ServitorFeedingCard
    attestation_activity: AttestationActivityCard
    generated_at: datetime


# ───── Aggregation ────────────────────────────────────────────────────


async def _gather_active_practices(
    db: AsyncSession, now: datetime, owner_id: str | None,
) -> ActivePracticesCard:
    horizon = now + timedelta(hours=24)
    stmt = (
        select(RecurringOffering)
        .where(RecurringOffering.deleted_at.is_(None))
        .where(RecurringOffering.is_active.is_(True))
        .where(RecurringOffering.next_due_at.is_not(None))
        .where(RecurringOffering.next_due_at <= horizon)
    )
    if owner_id is not None:
        stmt = stmt.where(RecurringOffering.owner_id == owner_id)
    stmt = stmt.order_by(RecurringOffering.next_due_at.asc()).limit(3)
    rows = (await db.execute(stmt)).scalars().all()

    practices: list[ActivePractice] = []
    for row in rows:
        hours = None
        if row.next_due_at is not None:
            delta = row.next_due_at - now
            hours = delta.total_seconds() / 3600.0
        practices.append(
            ActivePractice(
                recurring_offering_id=str(row.id),
                entity_id=str(row.entity_id),
                label=row.label,
                cadence=row.cadence,
                next_due_at=row.next_due_at,
                hours_until_due=hours,
            )
        )
    return ActivePracticesCard(
        practices=practices,
        total_due_in_24h=len(practices),
    )


async def _gather_obligations(
    db: AsyncSession, now: datetime, owner_id: str | None,
) -> ObligationsCard:
    contract_stmt = (
        select(Contract)
        .where(Contract.deleted_at.is_(None))
        .where(Contract.status == ContractStatus.ACTIVE)
    )
    if owner_id is not None:
        contract_stmt = contract_stmt.where(Contract.owner_id == owner_id)
    contracts = (await db.execute(contract_stmt)).scalars().all()

    contract_due: list[ContractObligationDue] = []
    for contract in contracts:
        for side_name, side_obs in (
            ("ours", contract.our_obligations or []),
            ("theirs", contract.their_obligations or []),
        ):
            for ob in side_obs:
                status_raw = ob.get("status")
                if status_raw not in {
                    ObligationStatus.OVERDUE.value,
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
                if due_at > now:
                    continue
                contract_due.append(
                    ContractObligationDue(
                        contract_id=str(contract.id),
                        contract_title=contract.title,
                        side=side_name,  # type: ignore[arg-type]
                        obligation_id=str(ob.get("id", "")),
                        description=str(ob.get("description", "")),
                        due_at=due_at,
                        status=str(status_raw),
                    )
                )
    contract_due.sort(key=lambda o: (o.due_at or now))
    contract_due = contract_due[:3]

    # Oath checkpoints.
    oath_stmt = (
        select(Oath)
        .where(Oath.deleted_at.is_(None))
        .where(Oath.status == OathStatus.ACTIVE)
    )
    if owner_id is not None:
        oath_stmt = oath_stmt.where(Oath.owner_id == owner_id)
    oaths = (await db.execute(oath_stmt)).scalars().all()

    checkpoints_due: list[OathCheckpointDue] = []
    sealed_count = 0
    for oath in oaths:
        sealed = oath.encryption_mode == EncryptionMode.SEALED
        for cp in oath.accountability_checkpoints or []:
            if cp.get("completed_at") is not None:
                continue
            due_at_raw = cp.get("due_at")
            if due_at_raw is None:
                continue
            try:
                due_at = datetime.fromisoformat(str(due_at_raw))
            except ValueError:
                continue
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=UTC)
            if due_at > now:
                continue
            if sealed:
                sealed_count += 1
                # Do NOT leak the prompt text. Surface as count only.
                continue
            checkpoints_due.append(
                OathCheckpointDue(
                    oath_id=str(oath.id),
                    oath_kind=oath.kind.value,
                    recipient=oath.recipient_text,
                    due_at=due_at,
                    sealed=False,
                    prompt=cp.get("prompt") if isinstance(cp.get("prompt"), str) else None,  # type: ignore[arg-type]
                )
            )
    checkpoints_due.sort(key=lambda c: c.due_at)
    checkpoints_due = checkpoints_due[:3]

    return ObligationsCard(
        contract_obligations=contract_due,
        oath_checkpoints=checkpoints_due,
        sealed_checkpoint_count=sealed_count,
    )


async def _gather_servitor_feeding(
    db: AsyncSession, now: datetime, owner_id: str | None,
) -> ServitorFeedingCard:
    stmt = (
        select(Servitor)
        .where(Servitor.deleted_at.is_(None))
        .where(Servitor.status == ServitorStatus.ACTIVE)
        .where(Servitor.feeding_cadence.is_not(None))
    )
    if owner_id is not None:
        stmt = stmt.where(Servitor.owner_id == owner_id)
    rows = (await db.execute(stmt)).scalars().all()
    due: list[ServitorFeedingDue] = []
    for row in rows:
        if _feeding_overdue(row.last_fed_at, row.feeding_cadence, now):
            due.append(
                ServitorFeedingDue(
                    servitor_id=str(row.id),
                    name=row.name,
                    kind=row.kind.value,
                    feeding_cadence=row.feeding_cadence,
                    last_fed_at=row.last_fed_at,
                )
            )
            if len(due) >= 3:
                break
    return ServitorFeedingCard(feedings_due=due)


async def _gather_attestation_activity(
    db: AsyncSession, now: datetime, owner_id: str | None,
) -> AttestationActivityCard:
    # Recent counter-signs + revocations on attestations subject_user_id =
    # the current user. The non-authenticated case returns empty.
    if owner_id is None:
        return AttestationActivityCard(activity=[])
    since = now - timedelta(days=14)
    stmt = (
        select(AttestationSignature, Attestation)
        .join(Attestation, Attestation.id == AttestationSignature.attestation_id)
        .where(Attestation.deleted_at.is_(None))
        .where(Attestation.subject_user_id == owner_id)
        .where(AttestationSignature.signed_at >= since)
        .where(AttestationSignature.role.in_(["counter-sign", "revocation"]))
        .order_by(AttestationSignature.signed_at.desc())
        .limit(5)
    )
    rows = (await db.execute(stmt)).all()
    activity: list[AttestationActivity] = []
    for sig, attestation in rows:
        activity.append(
            AttestationActivity(
                attestation_id=str(attestation.id),
                description=attestation.description,
                signer_label=sig.signer_label,
                role=sig.role,
                signed_at=sig.signed_at,
            )
        )
    return AttestationActivityCard(activity=activity)


@router.get(
    "/today/ledger",
    response_model=TodayLedger,
    tags=["today"],
)
async def today_ledger(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> TodayLedger:
    """The four Phase-05 Today cards in one round-trip."""
    now = datetime.now(tz=UTC)
    owner_id = current_user.id if current_user is not None else None

    return TodayLedger(
        active_practices=await _gather_active_practices(db, now, owner_id),
        obligations=await _gather_obligations(db, now, owner_id),
        servitor_feeding=await _gather_servitor_feeding(db, now, owner_id),
        attestation_activity=await _gather_attestation_activity(db, now, owner_id),
        generated_at=now,
    )
