"""Altar HTTP endpoints.

``GET    /api/v1/altars``                    — list
``POST   /api/v1/altars``                    — create
``GET    /api/v1/altars/{id}``               — detail
``PATCH  /api/v1/altars/{id}``               — update
``DELETE /api/v1/altars/{id}``               — soft delete
``POST   /api/v1/altars/{id}/photos``        — append upload id

Validation rules (H05):
  · ``tool_ids`` referenced in create/update must belong to the same
    vault as the altar.
  · ``linked_working_entry_ids`` must reference entries in the same
    vault.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.entries import Entry
from theourgia.models.tools import Altar, Tool

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class AltarRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    description: str | None
    tool_ids: list[str]
    arrangement_diagram_svg: str | None
    photo_upload_ids: list[str]
    is_permanent: bool
    linked_working_entry_ids: list[str]
    created_at: datetime
    updated_at: datetime


class AltarCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    description: str | None = None
    tool_ids: list[UUID] = Field(default_factory=list)
    arrangement_diagram_svg: str | None = None
    is_permanent: bool = False
    linked_working_entry_ids: list[UUID] = Field(default_factory=list)


class AltarUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    tool_ids: list[UUID] | None = None
    arrangement_diagram_svg: str | None = None
    is_permanent: bool | None = None
    linked_working_entry_ids: list[UUID] | None = None


class AltarPhotoPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upload_id: UUID


# ── Helpers ──────────────────────────────────────────────────────────


def _to_read(row: Altar) -> AltarRead:
    return AltarRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        description=row.description,
        tool_ids=[str(x) for x in (row.tool_ids or [])],
        arrangement_diagram_svg=row.arrangement_diagram_svg,
        photo_upload_ids=[str(x) for x in (row.photo_upload_ids or [])],
        is_permanent=row.is_permanent,
        linked_working_entry_ids=[
            str(x) for x in (row.linked_working_entry_ids or [])
        ],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _owner_check(row: Altar, current_user_id: UUID | None) -> None:
    if (
        current_user_id is not None
        and row.owner_id is not None
        and row.owner_id != current_user_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Altar not found.")


async def _validate_tool_ids(
    tool_ids: list[UUID], db: AsyncSession, owner_id: UUID | None,
) -> None:
    if not tool_ids:
        return
    stmt = select(Tool).where(Tool.id.in_(tool_ids))
    if owner_id is not None:
        stmt = stmt.where(Tool.owner_id == owner_id)
    rows = (await db.execute(stmt)).scalars().all()
    if len(rows) != len(set(tool_ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more tool_ids are not in your vault.",
        )


async def _validate_entry_ids(
    entry_ids: list[UUID], db: AsyncSession, owner_id: UUID | None,
) -> None:
    if not entry_ids:
        return
    stmt = select(Entry).where(Entry.id.in_(entry_ids))
    if owner_id is not None:
        stmt = stmt.where(Entry.owner_id == owner_id)
    rows = (await db.execute(stmt)).scalars().all()
    if len(rows) != len(set(entry_ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more linked_working_entry_ids are not in your vault.",
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get("/altars", response_model=list[AltarRead], tags=["altars"])
async def list_altars(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    is_permanent: bool | None = None,
    limit: int = 100,
) -> list[AltarRead]:
    stmt = select(Altar).where(Altar.deleted_at.is_(None))
    if current_user is not None:
        stmt = stmt.where(Altar.owner_id == current_user.id)
    if is_permanent is not None:
        stmt = stmt.where(Altar.is_permanent == is_permanent)
    stmt = stmt.order_by(Altar.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/altars",
    response_model=AltarRead,
    status_code=status.HTTP_201_CREATED,
    tags=["altars"],
)
async def create_altar(
    payload: AltarCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AltarRead:
    owner_id = current_user.id if current_user is not None else None
    await _validate_tool_ids(payload.tool_ids, db, owner_id)
    await _validate_entry_ids(payload.linked_working_entry_ids, db, owner_id)

    row = Altar(
        owner_id=owner_id,
        name=payload.name,
        description=payload.description,
        tool_ids=[str(t) for t in payload.tool_ids],
        arrangement_diagram_svg=payload.arrangement_diagram_svg,
        photo_upload_ids=[],
        is_permanent=payload.is_permanent,
        linked_working_entry_ids=[
            str(e) for e in payload.linked_working_entry_ids
        ],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/altars/{altar_id}", response_model=AltarRead, tags=["altars"],
)
async def get_altar(
    altar_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AltarRead:
    row = await db.get(Altar, altar_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Altar not found.")
    _owner_check(row, current_user.id if current_user else None)
    return _to_read(row)


@router.patch(
    "/altars/{altar_id}", response_model=AltarRead, tags=["altars"],
)
async def update_altar(
    altar_id: UUID,
    payload: AltarUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AltarRead:
    row = await db.get(Altar, altar_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Altar not found.")
    _owner_check(row, current_user.id if current_user else None)

    data = payload.model_dump(exclude_unset=True)
    if "tool_ids" in data and data["tool_ids"] is not None:
        await _validate_tool_ids(data["tool_ids"], db, row.owner_id)
        data["tool_ids"] = [str(t) for t in data["tool_ids"]]
    if (
        "linked_working_entry_ids" in data
        and data["linked_working_entry_ids"] is not None
    ):
        await _validate_entry_ids(
            data["linked_working_entry_ids"], db, row.owner_id,
        )
        data["linked_working_entry_ids"] = [
            str(e) for e in data["linked_working_entry_ids"]
        ]
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/altars/{altar_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["altars"],
)
async def delete_altar(
    altar_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await db.get(Altar, altar_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Altar not found.")
    _owner_check(row, current_user.id if current_user else None)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/altars/{altar_id}/photos",
    response_model=AltarRead,
    tags=["altars"],
)
async def add_altar_photo(
    altar_id: UUID,
    payload: AltarPhotoPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AltarRead:
    row = await db.get(Altar, altar_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Altar not found.")
    _owner_check(row, current_user.id if current_user else None)
    photos = list(row.photo_upload_ids or [])
    upload_id_str = str(payload.upload_id)
    if upload_id_str not in photos:
        photos.append(upload_id_str)
        row.photo_upload_ids = photos
        await db.commit()
        await db.refresh(row)
    return _to_read(row)
