"""Oath ledger HTTP endpoints.

``GET    /api/v1/oaths``           — list (filter ``?kind=`` / ``?status=``)
``POST   /api/v1/oaths``           — record a new oath (default sealed)
``GET    /api/v1/oaths/{id}``      — fetch one (sealed body returned as opaque bytes)
``PATCH  /api/v1/oaths/{id}``      — update status / accountability checkpoints
``DELETE /api/v1/oaths/{id}``      — soft delete

Per ``plan/05-magical-beings.md`` §5. Oaths default to **sealed**
encryption mode (Mode B zero-knowledge). The writer-side payload
allows ``encryption_mode = none`` (some oaths are intentionally
public — coming-out oaths, contractual promises) but the default is
sealed and the UI biases against downgrading.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entries import EncryptionMode
from theourgia.models.oaths import Oath, OathKind, OathStatus

__all__ = ["router"]

router = APIRouter()


OathKindLiteral = Literal[
    "self", "tradition", "order", "deity", "partner", "community", "other",
]
OathStatusLiteral = Literal[
    "active", "fulfilled", "broken", "renounced", "lapsed",
]
EncryptionModeLiteral = Literal["none", "sealed"]


class OathRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    kind: OathKindLiteral
    recipient_entity_id: str | None
    recipient_text: str | None
    text: str | None
    encryption_mode: EncryptionModeLiteral
    sealed: bool
    taken_at: datetime
    expires_at: datetime | None
    renewal_cadence: str | None
    status: OathStatusLiteral
    accountability_checkpoints: list[dict[str, object]]
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class OathCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: OathKindLiteral
    recipient_entity_id: UUID | None = None
    recipient_text: str | None = Field(default=None, max_length=512)
    text: str | None = None
    encryption_mode: EncryptionModeLiteral = "sealed"
    encrypted_payload: bytes | None = None
    taken_at: datetime
    expires_at: datetime | None = None
    renewal_cadence: str | None = Field(default=None, max_length=128)
    status: OathStatusLiteral = "active"
    accountability_checkpoints: list[dict[str, object]] = Field(default_factory=list)


class OathUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str | None = None
    encrypted_payload: bytes | None = None
    expires_at: datetime | None = None
    renewal_cadence: str | None = Field(default=None, max_length=128)
    status: OathStatusLiteral | None = None
    accountability_checkpoints: list[dict[str, object]] | None = None


def _to_read(row: Oath) -> OathRead:
    sealed = row.encryption_mode == EncryptionMode.SEALED
    return OathRead(
        id=str(row.id),
        kind=row.kind.value,
        recipient_entity_id=str(row.recipient_entity_id) if row.recipient_entity_id else None,
        recipient_text=row.recipient_text,
        # Sealed bodies are never returned as plaintext on read — even
        # if a row has both, prefer "(sealed)" semantics on the wire.
        text=None if sealed else row.text,
        encryption_mode=row.encryption_mode.value,
        sealed=sealed,
        taken_at=row.taken_at,
        expires_at=row.expires_at,
        renewal_cadence=row.renewal_cadence,
        status=row.status.value,
        accountability_checkpoints=(
            list(row.accountability_checkpoints)
            if row.accountability_checkpoints
            else []
        ),
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/oaths", response_model=list[OathRead], tags=["oaths"])
async def list_oaths(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    kind: OathKindLiteral | None = None,
    oath_status: OathStatusLiteral | None = None,
    limit: int = 100,
) -> list[OathRead]:
    stmt = select(Oath).where(
        Oath.deleted_at.is_(None),
        Oath.owner_id == current_user.id,
    )
    if kind is not None:
        stmt = stmt.where(Oath.kind == OathKind(kind))
    if oath_status is not None:
        stmt = stmt.where(Oath.status == OathStatus(oath_status))
    stmt = stmt.order_by(Oath.taken_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/oaths",
    response_model=OathRead,
    status_code=status.HTTP_201_CREATED,
    tags=["oaths"],
)
async def create_oath(
    payload: OathCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OathRead:
    mode = EncryptionMode(payload.encryption_mode)
    # When sealed, the plaintext ``text`` is dropped and the body must
    # live in ``encrypted_payload``. The client is responsible for
    # encrypting before POST; we just refuse to persist a sealed row
    # without ciphertext, since that produces an unreadable record.
    if mode == EncryptionMode.SEALED and not payload.encrypted_payload:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Sealed oaths require encrypted_payload.",
        )
    row = Oath(
        kind=OathKind(payload.kind),
        recipient_entity_id=payload.recipient_entity_id,
        recipient_text=payload.recipient_text,
        text=None if mode == EncryptionMode.SEALED else payload.text,
        encryption_mode=mode,
        encrypted_payload=payload.encrypted_payload,
        taken_at=payload.taken_at,
        expires_at=payload.expires_at,
        renewal_cadence=payload.renewal_cadence,
        status=OathStatus(payload.status),
        accountability_checkpoints=payload.accountability_checkpoints,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/oaths/{oath_id}", response_model=OathRead, tags=["oaths"])
async def get_oath(
    oath_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OathRead:
    row = await db.get(Oath, oath_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    return _to_read(row)


@router.patch("/oaths/{oath_id}", response_model=OathRead, tags=["oaths"])
async def update_oath(
    oath_id: UUID,
    payload: OathUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OathRead:
    row = await db.get(Oath, oath_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = OathStatus(data["status"])
    if row.encryption_mode == EncryptionMode.SEALED and "text" in data:
        # Sealed rows cannot accept plaintext updates; the client must
        # re-encrypt and PATCH encrypted_payload instead.
        data.pop("text")
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/oaths/{oath_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["oaths"],
)
async def delete_oath(
    oath_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Oath, oath_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oath not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
