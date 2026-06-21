"""Contracts / pacts HTTP endpoints.

``GET    /api/v1/contracts``                       — list (filter ``?entity_id=`` / ``?status=``)
``POST   /api/v1/contracts``                       — draft a new contract
``GET    /api/v1/contracts/{id}``                  — fetch one
``PATCH  /api/v1/contracts/{id}``                  — update terms, status, obligations
``DELETE /api/v1/contracts/{id}``                  — soft delete
``POST   /api/v1/contracts/{id}/fulfill-obligation`` — flip a single obligation to fulfilled

Per ``plan/05-magical-beings.md`` §3. The ``fulfill-obligation``
endpoint exists because obligations live inside ``our_obligations`` /
``their_obligations`` JSON arrays — flipping one without rewriting the
whole array is the common case + needs an atomic write path.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.contracts import (
    BindingKind,
    Contract,
    ContractStatus,
    ObligationStatus,
)

__all__ = ["router"]

router = APIRouter()


ContractStatusLiteral = Literal[
    "draft", "active", "fulfilled", "expired", "dissolved", "breached",
]
BindingKindLiteral = Literal[
    "verbal", "written", "blood", "breath", "item-bound", "name-bound", "other",
]
ObligationStatusLiteral = Literal[
    "pending", "in-progress", "fulfilled", "overdue", "waived",
]
ObligationSide = Literal["ours", "theirs"]


class ContractRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    entity_id: str
    title: str
    terms: str | None
    our_obligations: list[dict[str, object]]
    their_obligations: list[dict[str, object]]
    status: ContractStatusLiteral
    effective_at: datetime | None
    expires_at: datetime | None
    renewable: bool
    binding_kind: BindingKindLiteral
    witness_entity_ids: list[str]
    dissolution_ritual_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ContractCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_id: UUID
    title: str = Field(min_length=1, max_length=256)
    terms: str | None = None
    our_obligations: list[dict[str, object]] = Field(default_factory=list)
    their_obligations: list[dict[str, object]] = Field(default_factory=list)
    status: ContractStatusLiteral = "draft"
    effective_at: datetime | None = None
    expires_at: datetime | None = None
    renewable: bool = False
    binding_kind: BindingKindLiteral = "verbal"
    witness_entity_ids: list[str] = Field(default_factory=list)
    dissolution_ritual_id: UUID | None = None


class ContractUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=256)
    terms: str | None = None
    our_obligations: list[dict[str, object]] | None = None
    their_obligations: list[dict[str, object]] | None = None
    status: ContractStatusLiteral | None = None
    effective_at: datetime | None = None
    expires_at: datetime | None = None
    renewable: bool | None = None
    binding_kind: BindingKindLiteral | None = None
    witness_entity_ids: list[str] | None = None
    dissolution_ritual_id: UUID | None = None


class FulfillObligationRequest(BaseModel):
    """Body for POST /contracts/{id}/fulfill-obligation."""

    model_config = ConfigDict(extra="forbid")

    side: ObligationSide
    obligation_id: str = Field(min_length=1)
    new_status: ObligationStatusLiteral = "fulfilled"
    fulfilled_at: datetime | None = None
    notes: str | None = None


def _to_read(row: Contract) -> ContractRead:
    return ContractRead(
        id=str(row.id),
        entity_id=str(row.entity_id),
        title=row.title,
        terms=row.terms,
        our_obligations=list(row.our_obligations) if row.our_obligations else [],
        their_obligations=list(row.their_obligations) if row.their_obligations else [],
        status=row.status.value,
        effective_at=row.effective_at,
        expires_at=row.expires_at,
        renewable=row.renewable,
        binding_kind=row.binding_kind.value,
        witness_entity_ids=list(row.witness_entity_ids) if row.witness_entity_ids else [],
        dissolution_ritual_id=(
            str(row.dissolution_ritual_id) if row.dissolution_ritual_id else None
        ),
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/contracts", response_model=list[ContractRead], tags=["contracts"])
async def list_contracts(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    entity_id: UUID | None = None,
    contract_status: ContractStatusLiteral | None = None,
    limit: int = 100,
) -> list[ContractRead]:
    stmt = select(Contract).where(Contract.deleted_at.is_(None))
    if entity_id is not None:
        stmt = stmt.where(Contract.entity_id == entity_id)
    if contract_status is not None:
        stmt = stmt.where(Contract.status == ContractStatus(contract_status))
    stmt = stmt.order_by(Contract.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/contracts",
    response_model=ContractRead,
    status_code=status.HTTP_201_CREATED,
    tags=["contracts"],
)
async def create_contract(
    payload: ContractCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> ContractRead:
    row = Contract(
        entity_id=payload.entity_id,
        title=payload.title,
        terms=payload.terms,
        our_obligations=payload.our_obligations,
        their_obligations=payload.their_obligations,
        status=ContractStatus(payload.status),
        effective_at=payload.effective_at,
        expires_at=payload.expires_at,
        renewable=payload.renewable,
        binding_kind=BindingKind(payload.binding_kind),
        witness_entity_ids=payload.witness_entity_ids,
        dissolution_ritual_id=payload.dissolution_ritual_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/contracts/{contract_id}", response_model=ContractRead, tags=["contracts"])
async def get_contract(
    contract_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ContractRead:
    row = await db.get(Contract, contract_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract not found.")
    return _to_read(row)


@router.patch("/contracts/{contract_id}", response_model=ContractRead, tags=["contracts"])
async def update_contract(
    contract_id: UUID,
    payload: ContractUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ContractRead:
    row = await db.get(Contract, contract_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract not found.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = ContractStatus(data["status"])
    if "binding_kind" in data and data["binding_kind"] is not None:
        data["binding_kind"] = BindingKind(data["binding_kind"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/contracts/{contract_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["contracts"],
)
async def delete_contract(
    contract_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(Contract, contract_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _apply_obligation_update(
    obligations: list[dict[str, object]],
    obligation_id: str,
    new_status: ObligationStatus,
    fulfilled_at: datetime | None,
    notes: str | None,
) -> bool:
    """Mutate the obligations list in place. Returns True if found.

    Each obligation is a JSON dict with at least ``{id, description,
    status}``. We update ``status`` and (if supplied) ``fulfilled_at`` /
    ``notes``. The caller is responsible for flagging the JSON column
    as modified via :func:`flag_modified`.
    """
    for ob in obligations:
        if str(ob.get("id")) == obligation_id:
            ob["status"] = new_status.value
            if fulfilled_at is not None:
                ob["fulfilled_at"] = fulfilled_at.isoformat()
            if notes is not None:
                ob["notes"] = notes
            return True
    return False


@router.post(
    "/contracts/{contract_id}/fulfill-obligation",
    response_model=ContractRead,
    tags=["contracts"],
)
async def fulfill_obligation(
    contract_id: UUID,
    payload: FulfillObligationRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ContractRead:
    """Flip a single obligation to ``fulfilled`` (or any
    :class:`ObligationStatus`).

    The endpoint is named ``fulfill-obligation`` because that's the
    overwhelmingly common case; supplying ``new_status`` lets the same
    endpoint mark obligations as ``in-progress`` / ``overdue`` / ``waived``.
    """
    row = await db.get(Contract, contract_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract not found.")

    field = "our_obligations" if payload.side == "ours" else "their_obligations"
    obligations = list(getattr(row, field) or [])
    found = _apply_obligation_update(
        obligations,
        payload.obligation_id,
        ObligationStatus(payload.new_status),
        payload.fulfilled_at,
        payload.notes,
    )
    if not found:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Obligation {payload.obligation_id!r} not found on the {payload.side} side.",
        )

    setattr(row, field, obligations)
    flag_modified(row, field)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)
