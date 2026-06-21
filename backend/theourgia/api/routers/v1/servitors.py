"""Servitor + egregore HTTP endpoints.

``GET    /api/v1/servitors``                    — list (filter ``?kind=`` / ``?status=``)
``POST   /api/v1/servitors``                    — create
``GET    /api/v1/servitors/{id}``               — fetch
``PATCH  /api/v1/servitors/{id}``               — update
``DELETE /api/v1/servitors/{id}``               — soft delete
``POST   /api/v1/servitors/{id}/feed``          — record a feeding (updates last_fed_at)

``GET    /api/v1/servitors/{id}/tasks``         — list tasks for this servitor
``POST   /api/v1/servitors/{id}/tasks``         — assign a task
``PATCH  /api/v1/servitor-tasks/{id}``          — update / complete a task
``DELETE /api/v1/servitor-tasks/{id}``          — soft delete a task

Per ``plan/05-magical-beings.md`` §7. Tone: matter-of-fact ledger
language, no gamification. ``POST /feed`` is named pragmatically;
the UI surfaces it as "Record feeding" not "Feed your servitor!".
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.servitors import (
    Servitor,
    ServitorKind,
    ServitorStatus,
    ServitorTask,
    ServitorTaskStatus,
)

__all__ = ["router"]

router = APIRouter()


ServitorKindLiteral = Literal["servitor", "egregore"]
ServitorStatusLiteral = Literal["active", "dormant", "retired", "decommissioned"]
ServitorTaskStatusLiteral = Literal[
    "pending", "in-progress", "completed", "abandoned",
]


# ───── Servitor ────────────────────────────────────────────────────────


class ServitorRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    kind: ServitorKindLiteral
    purpose: str | None
    sigil_upload_id: str | None
    creation_entry_id: str | None
    feeding_cadence: str | None
    feeding_method: str | None
    last_fed_at: datetime | None
    lifespan_limit: date | None
    status: ServitorStatusLiteral
    members: list[str]
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ServitorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    kind: ServitorKindLiteral = "servitor"
    purpose: str | None = None
    sigil_upload_id: UUID | None = None
    creation_entry_id: UUID | None = None
    feeding_cadence: str | None = Field(default=None, max_length=64)
    feeding_method: str | None = Field(default=None, max_length=128)
    lifespan_limit: date | None = None
    status: ServitorStatusLiteral = "active"
    members: list[str] = Field(default_factory=list)


class ServitorUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    purpose: str | None = None
    sigil_upload_id: UUID | None = None
    creation_entry_id: UUID | None = None
    feeding_cadence: str | None = Field(default=None, max_length=64)
    feeding_method: str | None = Field(default=None, max_length=128)
    lifespan_limit: date | None = None
    status: ServitorStatusLiteral | None = None
    members: list[str] | None = None


class FeedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fed_at: datetime | None = Field(
        default=None,
        description="Defaults to server time at receipt.",
    )
    notes: str | None = None


def _servitor_to_read(row: Servitor) -> ServitorRead:
    return ServitorRead(
        id=str(row.id),
        name=row.name,
        kind=row.kind.value,
        purpose=row.purpose,
        sigil_upload_id=str(row.sigil_upload_id) if row.sigil_upload_id else None,
        creation_entry_id=str(row.creation_entry_id) if row.creation_entry_id else None,
        feeding_cadence=row.feeding_cadence,
        feeding_method=row.feeding_method,
        last_fed_at=row.last_fed_at,
        lifespan_limit=row.lifespan_limit,
        status=row.status.value,
        members=list(row.members) if row.members else [],
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/servitors", response_model=list[ServitorRead], tags=["servitors"])
async def list_servitors(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: ServitorKindLiteral | None = None,
    servitor_status: ServitorStatusLiteral | None = None,
    limit: int = 100,
) -> list[ServitorRead]:
    stmt = select(Servitor).where(Servitor.deleted_at.is_(None))
    if kind is not None:
        stmt = stmt.where(Servitor.kind == ServitorKind(kind))
    if servitor_status is not None:
        stmt = stmt.where(Servitor.status == ServitorStatus(servitor_status))
    stmt = stmt.order_by(Servitor.name.asc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_servitor_to_read(row) for row in rows]


@router.post(
    "/servitors",
    response_model=ServitorRead,
    status_code=status.HTTP_201_CREATED,
    tags=["servitors"],
)
async def create_servitor(
    payload: ServitorCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> ServitorRead:
    row = Servitor(
        name=payload.name,
        kind=ServitorKind(payload.kind),
        purpose=payload.purpose,
        sigil_upload_id=payload.sigil_upload_id,
        creation_entry_id=payload.creation_entry_id,
        feeding_cadence=payload.feeding_cadence,
        feeding_method=payload.feeding_method,
        lifespan_limit=payload.lifespan_limit,
        status=ServitorStatus(payload.status),
        members=payload.members,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _servitor_to_read(row)


@router.get("/servitors/{servitor_id}", response_model=ServitorRead, tags=["servitors"])
async def get_servitor(
    servitor_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ServitorRead:
    row = await db.get(Servitor, servitor_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servitor not found.")
    return _servitor_to_read(row)


@router.patch(
    "/servitors/{servitor_id}",
    response_model=ServitorRead,
    tags=["servitors"],
)
async def update_servitor(
    servitor_id: UUID,
    payload: ServitorUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ServitorRead:
    row = await db.get(Servitor, servitor_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servitor not found.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = ServitorStatus(data["status"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _servitor_to_read(row)


@router.delete(
    "/servitors/{servitor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["servitors"],
)
async def delete_servitor(
    servitor_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(Servitor, servitor_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servitor not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/servitors/{servitor_id}/feed",
    response_model=ServitorRead,
    tags=["servitors"],
)
async def record_feeding(
    servitor_id: UUID,
    payload: FeedRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ServitorRead:
    """Record a feeding event. Updates ``last_fed_at``.

    The scheduler reads ``last_fed_at + feeding_cadence`` to know when
    the next reminder is due (see :mod:`theourgia.core.tasks.scheduler`).
    """
    row = await db.get(Servitor, servitor_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servitor not found.")
    row.last_fed_at = payload.fed_at or datetime.now(tz=UTC)
    await db.commit()
    await db.refresh(row)
    return _servitor_to_read(row)


# ───── ServitorTask ────────────────────────────────────────────────────


class ServitorTaskRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    servitor_id: str
    description: str
    given_at: datetime
    target_completion_at: datetime | None
    completed_at: datetime | None
    status: ServitorTaskStatusLiteral
    outcome_notes: str | None
    created_at: datetime
    updated_at: datetime


class ServitorTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    given_at: datetime
    target_completion_at: datetime | None = None
    status: ServitorTaskStatusLiteral = "pending"


class ServitorTaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, min_length=1)
    target_completion_at: datetime | None = None
    completed_at: datetime | None = None
    status: ServitorTaskStatusLiteral | None = None
    outcome_notes: str | None = None


def _task_to_read(row: ServitorTask) -> ServitorTaskRead:
    return ServitorTaskRead(
        id=str(row.id),
        servitor_id=str(row.servitor_id),
        description=row.description,
        given_at=row.given_at,
        target_completion_at=row.target_completion_at,
        completed_at=row.completed_at,
        status=row.status.value,
        outcome_notes=row.outcome_notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/servitors/{servitor_id}/tasks",
    response_model=list[ServitorTaskRead],
    tags=["servitors"],
)
async def list_servitor_tasks(
    servitor_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    task_status: ServitorTaskStatusLiteral | None = None,
) -> list[ServitorTaskRead]:
    stmt = (
        select(ServitorTask)
        .where(
            ServitorTask.servitor_id == servitor_id,
            ServitorTask.deleted_at.is_(None),
        )
        .order_by(ServitorTask.given_at.desc())
    )
    if task_status is not None:
        stmt = stmt.where(ServitorTask.status == ServitorTaskStatus(task_status))
    rows = (await db.execute(stmt)).scalars().all()
    return [_task_to_read(row) for row in rows]


@router.post(
    "/servitors/{servitor_id}/tasks",
    response_model=ServitorTaskRead,
    status_code=status.HTTP_201_CREATED,
    tags=["servitors"],
)
async def create_servitor_task(
    servitor_id: UUID,
    payload: ServitorTaskCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ServitorTaskRead:
    servitor = await db.get(Servitor, servitor_id)
    if servitor is None or servitor.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servitor not found.")
    row = ServitorTask(
        servitor_id=servitor_id,
        description=payload.description,
        given_at=payload.given_at,
        target_completion_at=payload.target_completion_at,
        status=ServitorTaskStatus(payload.status),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _task_to_read(row)


@router.patch(
    "/servitor-tasks/{task_id}",
    response_model=ServitorTaskRead,
    tags=["servitors"],
)
async def update_servitor_task(
    task_id: UUID,
    payload: ServitorTaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ServitorTaskRead:
    row = await db.get(ServitorTask, task_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = ServitorTaskStatus(data["status"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _task_to_read(row)


@router.delete(
    "/servitor-tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["servitors"],
)
async def delete_servitor_task(
    task_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(ServitorTask, task_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
