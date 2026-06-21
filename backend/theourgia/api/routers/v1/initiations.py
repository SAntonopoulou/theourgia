"""Initiation / grade tracker HTTP endpoints.

``GET    /api/v1/initiations``                — list (filter ``?tradition=`` / ``?status=``)
``POST   /api/v1/initiations``                — record (encryption_mode = sealed is the only accepted value)
``GET    /api/v1/initiations/{id}``           — fetch (encrypted payload returned as opaque bytes)
``PATCH  /api/v1/initiations/{id}``           — update tradition / status / publicly_disclosed_at / encrypted_payload
``DELETE /api/v1/initiations/{id}``           — soft delete

Per ``plan/05-magical-beings.md`` §6: initiations are the most
sensitive data we hold; the writer-side API **refuses** any
``encryption_mode`` other than ``sealed``. The schema default is
already ``sealed``; this just makes the constraint a 400.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.entries import EncryptionMode
from theourgia.models.initiations import Initiation, InitiationStatus

__all__ = ["router"]

router = APIRouter()


InitiationStatusLiteral = Literal["active", "lapsed", "suspended", "resigned"]


class InitiationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    tradition: str
    status: InitiationStatusLiteral
    sealed: bool
    publicly_disclosed_at: datetime | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class InitiationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tradition: str = Field(min_length=1, max_length=128)
    status: InitiationStatusLiteral = "active"
    # The writer accepts only sealed; we keep the field present so the
    # client must opt in explicitly (matching the schema constraint).
    encryption_mode: Literal["sealed"] = "sealed"
    encrypted_payload: bytes
    publicly_disclosed_at: datetime | None = None


class InitiationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tradition: str | None = Field(default=None, min_length=1, max_length=128)
    status: InitiationStatusLiteral | None = None
    encrypted_payload: bytes | None = None
    publicly_disclosed_at: datetime | None = None


def _to_read(row: Initiation) -> InitiationRead:
    return InitiationRead(
        id=str(row.id),
        tradition=row.tradition,
        status=row.status.value,
        sealed=row.encryption_mode == EncryptionMode.SEALED,
        publicly_disclosed_at=row.publicly_disclosed_at,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/initiations", response_model=list[InitiationRead], tags=["initiations"])
async def list_initiations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    tradition: str | None = None,
    init_status: InitiationStatusLiteral | None = None,
    limit: int = 100,
) -> list[InitiationRead]:
    stmt = select(Initiation).where(Initiation.deleted_at.is_(None))
    if tradition is not None:
        stmt = stmt.where(Initiation.tradition == tradition)
    if init_status is not None:
        stmt = stmt.where(Initiation.status == InitiationStatus(init_status))
    stmt = stmt.order_by(Initiation.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/initiations",
    response_model=InitiationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["initiations"],
)
async def create_initiation(
    payload: InitiationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> InitiationRead:
    # The Pydantic `Literal["sealed"]` on the input already enforces
    # this; double-check at runtime for defence in depth in case the
    # router is wired with a more permissive schema later.
    if payload.encryption_mode != "sealed":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Initiations may only be persisted with encryption_mode = sealed.",
        )
    if not payload.encrypted_payload:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Sealed initiations require an encrypted_payload.",
        )
    row = Initiation(
        tradition=payload.tradition,
        status=InitiationStatus(payload.status),
        encryption_mode=EncryptionMode.SEALED,
        encrypted_payload=payload.encrypted_payload,
        publicly_disclosed_at=payload.publicly_disclosed_at,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/initiations/{init_id}", response_model=InitiationRead, tags=["initiations"])
async def get_initiation(
    init_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> InitiationRead:
    row = await db.get(Initiation, init_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Initiation not found.")
    return _to_read(row)


@router.patch(
    "/initiations/{init_id}",
    response_model=InitiationRead,
    tags=["initiations"],
)
async def update_initiation(
    init_id: UUID,
    payload: InitiationUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> InitiationRead:
    row = await db.get(Initiation, init_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Initiation not found.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = InitiationStatus(data["status"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/initiations/{init_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["initiations"],
)
async def delete_initiation(
    init_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(Initiation, init_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Initiation not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
