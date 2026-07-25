"""Two-gate covenant HTTP endpoints (Sprint I-B, rule 69).

``POST /api/v1/workings/{entry_id}/intent``   — seal the declared intent (once, forever)
``GET  /api/v1/workings/{entry_id}/verdict``  — covenant + verdict state
``PUT  /api/v1/workings/{entry_id}/verdict``  — judge the two gates; optional finalize
``GET  /api/v1/verdicts/awaiting``            — the Awaiting-judgment queue
``GET  /api/v1/workings/awaiting-judgment``   — H12-sketch alias of the queue

The covenant discipline:

* Intent is declared **exactly once**. There is no update route, no
  admin bypass — the server refuses a second declaration (409) and no
  endpoint anywhere writes the intent columns after sealing. The
  fingerprint (sha256 of text + timestamp) makes tampering evident.
* The verdict (two gates: did it work / is it true) stays editable
  while judgment is open. Finalizing requires both gates non-open;
  after finalization the verdict is immutable too (409).

Workings are journal entries of type ``working`` or
``magical_record`` — the two practitioner-record kinds that carry an
operative claim worth judging.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entries import Entry, EntryType, GateResult

__all__ = ["router"]

router = APIRouter()


GateResultLiteral = Literal["pass", "fail", "open"]

# The entry kinds that carry a judgeable operative claim.
WORKING_TYPES: frozenset[EntryType] = frozenset(
    {EntryType.WORKING, EntryType.MAGICAL_RECORD}
)


# ─── Pure covenant logic (unit-tested directly) ─────────────────


def compute_intent_fingerprint(text: str, declared_at: datetime) -> str:
    """sha256 over the sealed text and its declaration timestamp.

    The timestamp is serialised as ISO-8601 so the fingerprint is
    reproducible from the stored columns alone.
    """
    material = f"{text}\n{declared_at.isoformat()}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def ensure_intent_sealable(entry: Entry) -> None:
    """Refuse declaration on a non-working or an already-sealed entry."""
    if entry.type not in WORKING_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Intent is declared on workings (entry type 'working' or "
            f"'magical_record'); this entry is '{entry.type.value}'.",
        )
    if entry.intent_declared_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Intent is already sealed on this working. The covenant is "
            "unrewritable (rule 69) — declare a new working instead.",
        )


def ensure_verdict_editable(entry: Entry) -> None:
    """Refuse judgment before the covenant or after finalization."""
    if entry.intent_declared_at is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No intent has been declared on this working — the gates "
            "judge a sealed covenant, not an unstated aim.",
        )
    if entry.verdict_finalized_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The verdict on this working is finalized and immutable.",
        )


def ensure_finalizable(gate1: GateResult, gate2: GateResult) -> None:
    """A verdict finalizes only once both gates are discharged."""
    if gate1 == GateResult.OPEN or gate2 == GateResult.OPEN:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Cannot finalize while a gate is still open — judge both "
            "gates first.",
        )


def is_awaiting_judgment(entry: Entry) -> bool:
    """Queue membership: intent sealed, at least one gate open."""
    return entry.intent_declared_at is not None and (
        entry.gate1_result == GateResult.OPEN
        or entry.gate2_result == GateResult.OPEN
    )


# ─── Shapes ─────────────────────────────────────────────────────


class IntentDeclare(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, description="The intent, in the operator's words.")


class DeclaredIntentRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    declared_at: datetime
    fingerprint: str
    immutable: Literal[True] = True


class GateWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: GateResultLiteral = "open"
    notes: str | None = None


class VerdictWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gate1: GateWrite = Field(description="Did it work (repeatable)?")
    gate2: GateWrite = Field(description="Is it true (coherent)?")
    finalize: bool = Field(
        default=False,
        description=(
            "Seal the verdict. Requires both gates non-open; after "
            "this the verdict is immutable."
        ),
    )


class GateRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: GateResultLiteral
    notes: str | None


class VerdictRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entry_id: str
    title: str
    intent: DeclaredIntentRead | None
    gate1: GateRead
    gate2: GateRead
    judged_at: datetime | None
    finalized_at: datetime | None


class AwaitingJudgmentRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entry_id: str
    title: str
    declared_at: datetime
    gate1: GateResultLiteral
    gate2: GateResultLiteral
    age_days: int


def _intent_read(entry: Entry) -> DeclaredIntentRead | None:
    if entry.intent_declared_at is None:
        return None
    return DeclaredIntentRead(
        text=entry.intent_text or "",
        declared_at=entry.intent_declared_at,
        fingerprint=entry.intent_fingerprint or "",
    )


def _verdict_read(entry: Entry) -> VerdictRead:
    return VerdictRead(
        entry_id=str(entry.id),
        title=entry.title,
        intent=_intent_read(entry),
        gate1=GateRead(result=entry.gate1_result.value, notes=entry.gate1_notes),
        gate2=GateRead(result=entry.gate2_result.value, notes=entry.gate2_notes),
        judged_at=entry.judged_at,
        finalized_at=entry.verdict_finalized_at,
    )


async def _load_owned_entry(
    db: AsyncSession, entry_id: UUID, owner_id: UUID
) -> Entry:
    entry = await db.get(Entry, entry_id)
    if entry is None or entry.deleted_at is not None or entry.owner_id != owner_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Working not found.")
    return entry


# ─── Endpoints ──────────────────────────────────────────────────


@router.post(
    "/workings/{entry_id}/intent",
    response_model=DeclaredIntentRead,
    status_code=status.HTTP_201_CREATED,
    tags=["verdicts"],
)
async def declare_intent(
    entry_id: UUID,
    payload: IntentDeclare,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> DeclaredIntentRead:
    """Seal the declared intent on a working. Once. Forever."""
    entry = await _load_owned_entry(db, entry_id, current_user.id)
    ensure_intent_sealable(entry)

    declared_at = datetime.now(tz=UTC)
    entry.intent_text = payload.text
    entry.intent_declared_at = declared_at
    entry.intent_fingerprint = compute_intent_fingerprint(
        payload.text, declared_at
    )
    await db.commit()
    await db.refresh(entry)
    intent = _intent_read(entry)
    assert intent is not None  # just sealed
    return intent


@router.get(
    "/workings/{entry_id}/verdict",
    response_model=VerdictRead,
    tags=["verdicts"],
)
async def get_verdict(
    entry_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> VerdictRead:
    entry = await _load_owned_entry(db, entry_id, current_user.id)
    return _verdict_read(entry)


@router.put(
    "/workings/{entry_id}/verdict",
    response_model=VerdictRead,
    tags=["verdicts"],
)
async def put_verdict(
    entry_id: UUID,
    payload: VerdictWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> VerdictRead:
    """Judge the two gates. Editable while open; immutable once
    finalized. Finalizing requires both gates discharged."""
    entry = await _load_owned_entry(db, entry_id, current_user.id)
    ensure_verdict_editable(entry)

    gate1 = GateResult(payload.gate1.result)
    gate2 = GateResult(payload.gate2.result)
    if payload.finalize:
        ensure_finalizable(gate1, gate2)

    now = datetime.now(tz=UTC)
    entry.gate1_result = gate1
    entry.gate2_result = gate2
    entry.gate1_notes = payload.gate1.notes
    entry.gate2_notes = payload.gate2.notes
    entry.judged_at = now
    if payload.finalize:
        entry.verdict_finalized_at = now

    await db.commit()
    await db.refresh(entry)
    return _verdict_read(entry)


async def _awaiting(
    db: AsyncSession, owner_id: UUID
) -> list[AwaitingJudgmentRead]:
    stmt = (
        select(Entry)
        .where(
            Entry.deleted_at.is_(None),  # type: ignore[union-attr]
            Entry.owner_id == owner_id,
            Entry.intent_declared_at.is_not(None),  # type: ignore[union-attr]
            or_(
                Entry.gate1_result == GateResult.OPEN,
                Entry.gate2_result == GateResult.OPEN,
            ),
        )
        .order_by(Entry.intent_declared_at.asc())  # oldest first
    )
    rows = (await db.execute(stmt)).scalars().all()
    now = datetime.now(tz=UTC)
    out: list[AwaitingJudgmentRead] = []
    for entry in rows:
        declared_at = entry.intent_declared_at
        assert declared_at is not None  # filtered above
        out.append(
            AwaitingJudgmentRead(
                entry_id=str(entry.id),
                title=entry.title,
                declared_at=declared_at,
                gate1=entry.gate1_result.value,
                gate2=entry.gate2_result.value,
                age_days=max(0, (now - declared_at).days),
            )
        )
    return out


@router.get(
    "/verdicts/awaiting",
    response_model=list[AwaitingJudgmentRead],
    tags=["verdicts"],
)
async def awaiting_judgment(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[AwaitingJudgmentRead]:
    """Workings whose covenant is sealed but whose judgment is still
    open — the record does not quietly forget an unfinished judgment."""
    return await _awaiting(db, current_user.id)


@router.get(
    "/workings/awaiting-judgment",
    response_model=list[AwaitingJudgmentRead],
    tags=["verdicts"],
)
async def awaiting_judgment_alias(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[AwaitingJudgmentRead]:
    """H12 API-sketch alias for the Awaiting-judgment queue."""
    return await _awaiting(db, current_user.id)
