"""Tool HTTP endpoints.

``GET    /api/v1/tools``                    — list
``POST   /api/v1/tools``                    — create
``GET    /api/v1/tools/{id}``               — detail
``PATCH  /api/v1/tools/{id}``               — update meta only
``DELETE /api/v1/tools/{id}``               — soft delete
``POST   /api/v1/tools/{id}/consecrate``    — set consecration atomically
``POST   /api/v1/tools/{id}/unconsecrate``  — null both consecration fields
``POST   /api/v1/tools/{id}/photos``        — append upload id
``DELETE /api/v1/tools/{id}/photos/{upload_id}`` — remove upload id

Honesty rule (H05): ``consecration_date`` and
``consecration_working_entry_id`` are not in :class:`ToolUpdate` —
they are set only by the ``/consecrate`` sub-resource, which
requires a real working entry. Un-consecration is a separate
sub-resource so the practitioner can correct mistakes honestly.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entries import Entry
from theourgia.models.tools import Tool, ToolKind

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class ToolRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    kind: str
    description: str | None
    materials: list[str]
    dimensions: dict[str, Any]
    photo_upload_ids: list[str]
    provenance: str | None
    acquisition_date: date | None
    consecration_date: date | None
    consecration_working_entry_id: str | None
    current_location: str | None
    is_consecrated: bool
    created_at: datetime
    updated_at: datetime


class ToolCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    kind: ToolKind
    description: str | None = None
    materials: list[str] = Field(default_factory=list)
    dimensions: dict[str, Any] = Field(default_factory=dict)
    provenance: str | None = None
    acquisition_date: date | None = None
    current_location: str | None = Field(default=None, max_length=480)


class ToolUpdate(BaseModel):
    """Consecration fields are NOT here — sub-resource only."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    kind: ToolKind | None = None
    description: str | None = None
    materials: list[str] | None = None
    dimensions: dict[str, Any] | None = None
    provenance: str | None = None
    acquisition_date: date | None = None
    current_location: str | None = Field(default=None, max_length=480)


class ToolConsecratePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consecration_working_entry_id: UUID
    consecration_date: date


class ToolPhotoPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upload_id: UUID


# ── Helpers ──────────────────────────────────────────────────────────


def _to_read(row: Tool) -> ToolRead:
    return ToolRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        kind=row.kind.value,
        description=row.description,
        materials=list(row.materials or []),
        dimensions=dict(row.dimensions or {}),
        photo_upload_ids=[str(x) for x in (row.photo_upload_ids or [])],
        provenance=row.provenance,
        acquisition_date=row.acquisition_date,
        consecration_date=row.consecration_date,
        consecration_working_entry_id=(
            str(row.consecration_working_entry_id)
            if row.consecration_working_entry_id
            else None
        ),
        current_location=row.current_location,
        is_consecrated=row.consecration_working_entry_id is not None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _owner_check(row: Tool, current_user_id: UUID) -> None:
    if row.owner_id != current_user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")


async def _validate_working_entry(
    entry_id: UUID, db: AsyncSession, owner_id: UUID | None,
) -> None:
    entry = await db.get(Entry, entry_id)
    if entry is None or entry.deleted_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "consecration_working_entry_id does not match a live entry.",
        )
    if owner_id is not None and entry.owner_id != owner_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                "consecration_working_entry_id must reference an entry "
                "in your vault."
            ),
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get("/tools", response_model=list[ToolRead], tags=["tools"])
async def list_tools(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    kind: ToolKind | None = None,
    consecrated: bool | None = None,
    limit: int = 100,
) -> list[ToolRead]:
    stmt = select(Tool).where(
        Tool.deleted_at.is_(None),
        Tool.owner_id == current_user.id,
    )
    if kind is not None:
        stmt = stmt.where(Tool.kind == kind)
    if consecrated is True:
        stmt = stmt.where(Tool.consecration_working_entry_id.is_not(None))
    elif consecrated is False:
        stmt = stmt.where(Tool.consecration_working_entry_id.is_(None))
    stmt = stmt.order_by(Tool.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/tools",
    response_model=ToolRead,
    status_code=status.HTTP_201_CREATED,
    tags=["tools"],
)
async def create_tool(
    payload: ToolCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    owner_id = current_user.id
    row = Tool(
        owner_id=owner_id,
        name=payload.name,
        kind=payload.kind,
        description=payload.description,
        materials=payload.materials,
        dimensions=payload.dimensions,
        photo_upload_ids=[],
        provenance=payload.provenance,
        acquisition_date=payload.acquisition_date,
        current_location=payload.current_location,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/tools/{tool_id}", response_model=ToolRead, tags=["tools"],
)
async def get_tool(
    tool_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    return _to_read(row)


@router.patch(
    "/tools/{tool_id}", response_model=ToolRead, tags=["tools"],
)
async def update_tool(
    tool_id: UUID,
    payload: ToolUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/tools/{tool_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tools"],
)
async def delete_tool(
    tool_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/tools/{tool_id}/consecrate",
    response_model=ToolRead,
    tags=["tools"],
)
async def consecrate_tool(
    tool_id: UUID,
    payload: ToolConsecratePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    if row.consecration_working_entry_id is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            (
                "This tool is already consecrated — call /unconsecrate "
                "first to record a re-consecration honestly."
            ),
        )
    await _validate_working_entry(
        payload.consecration_working_entry_id, db, row.owner_id,
    )
    row.consecration_working_entry_id = payload.consecration_working_entry_id
    row.consecration_date = payload.consecration_date
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/tools/{tool_id}/unconsecrate",
    response_model=ToolRead,
    tags=["tools"],
)
async def unconsecrate_tool(
    tool_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    """Null both consecration fields. The H05 honesty rule: errors
    can be corrected; the audit log preserves the timeline."""
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    row.consecration_working_entry_id = None
    row.consecration_date = None
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/tools/{tool_id}/photos",
    response_model=ToolRead,
    tags=["tools"],
)
async def add_tool_photo(
    tool_id: UUID,
    payload: ToolPhotoPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ToolRead:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    photos = list(row.photo_upload_ids or [])
    upload_id_str = str(payload.upload_id)
    if upload_id_str not in photos:
        photos.append(upload_id_str)
        row.photo_upload_ids = photos
        await db.commit()
        await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/tools/{tool_id}/photos/{upload_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tools"],
)
async def remove_tool_photo(
    tool_id: UUID,
    upload_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Tool, tool_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found.")
    _owner_check(row, current_user.id)
    upload_id_str = str(upload_id)
    photos = [p for p in (row.photo_upload_ids or []) if str(p) != upload_id_str]
    row.photo_upload_ids = photos
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
