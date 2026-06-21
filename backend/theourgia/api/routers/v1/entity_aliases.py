"""Entity alias-graph + saved view HTTP endpoints.

Alias-graph (typed entity ↔ entity relationships):

``GET    /api/v1/entity-aliases``        — list (filter ``?source_id=`` / ``?target_id=`` / ``?kind=``)
``POST   /api/v1/entity-aliases``        — create
``GET    /api/v1/entity-aliases/{id}``   — fetch
``DELETE /api/v1/entity-aliases/{id}``   — soft delete

Saved views (user-defined unified aggregations across entities):

``GET    /api/v1/entity-views``          — list
``POST   /api/v1/entity-views``          — create
``GET    /api/v1/entity-views/{id}``     — fetch
``PATCH  /api/v1/entity-views/{id}``     — update name / members / description
``DELETE /api/v1/entity-views/{id}``     — soft delete

Per ``plan/05-magical-beings.md`` §11. The aggregate resolver
(``GET /api/v1/entities/{id}/aggregate``) lives on the entities
router and consumes both shapes here.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.entities import EntityAlias, EntityAliasKind, EntityView

__all__ = ["router"]

router = APIRouter()


EntityAliasKindLiteral = Literal[
    "same-as", "aspect-of", "aspect-includes", "syncretic-with", "epithet-of",
]


# ───── EntityAlias ─────────────────────────────────────────────────────


class EntityAliasRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    source_entity_id: str
    target_entity_id: str
    kind: EntityAliasKindLiteral
    notes: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class EntityAliasCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_entity_id: UUID
    target_entity_id: UUID
    kind: EntityAliasKindLiteral
    notes: str | None = None


def _alias_to_read(row: EntityAlias) -> EntityAliasRead:
    return EntityAliasRead(
        id=str(row.id),
        source_entity_id=str(row.source_entity_id),
        target_entity_id=str(row.target_entity_id),
        kind=row.kind.value,
        notes=row.notes,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/entity-aliases",
    response_model=list[EntityAliasRead],
    tags=["entities"],
)
async def list_entity_aliases(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    source_id: UUID | None = None,
    target_id: UUID | None = None,
    kind: EntityAliasKindLiteral | None = None,
    incident_to: UUID | None = None,
) -> list[EntityAliasRead]:
    """List alias edges.

    ``incident_to`` is a shorthand for "any edge that touches this
    entity" (matches source OR target), used by the aggregate endpoint
    to find all neighbours.
    """
    stmt = select(EntityAlias).where(EntityAlias.deleted_at.is_(None))
    if source_id is not None:
        stmt = stmt.where(EntityAlias.source_entity_id == source_id)
    if target_id is not None:
        stmt = stmt.where(EntityAlias.target_entity_id == target_id)
    if incident_to is not None:
        stmt = stmt.where(
            or_(
                EntityAlias.source_entity_id == incident_to,
                EntityAlias.target_entity_id == incident_to,
            )
        )
    if kind is not None:
        stmt = stmt.where(EntityAlias.kind == EntityAliasKind(kind))
    stmt = stmt.order_by(EntityAlias.created_at.asc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_alias_to_read(row) for row in rows]


@router.post(
    "/entity-aliases",
    response_model=EntityAliasRead,
    status_code=status.HTTP_201_CREATED,
    tags=["entities"],
)
async def create_entity_alias(
    payload: EntityAliasCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> EntityAliasRead:
    if payload.source_entity_id == payload.target_entity_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "An entity cannot be its own alias.",
        )
    row = EntityAlias(
        source_entity_id=payload.source_entity_id,
        target_entity_id=payload.target_entity_id,
        kind=EntityAliasKind(payload.kind),
        notes=payload.notes,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _alias_to_read(row)


@router.get(
    "/entity-aliases/{alias_id}",
    response_model=EntityAliasRead,
    tags=["entities"],
)
async def get_entity_alias(
    alias_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityAliasRead:
    row = await db.get(EntityAlias, alias_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alias not found.")
    return _alias_to_read(row)


@router.delete(
    "/entity-aliases/{alias_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["entities"],
)
async def delete_entity_alias(
    alias_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(EntityAlias, alias_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alias not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── EntityView ──────────────────────────────────────────────────────


class EntityViewRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    member_entity_ids: list[str]
    description: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class EntityViewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    member_entity_ids: list[str] = Field(default_factory=list)
    description: str | None = None


class EntityViewUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    member_entity_ids: list[str] | None = None
    description: str | None = None


def _view_to_read(row: EntityView) -> EntityViewRead:
    return EntityViewRead(
        id=str(row.id),
        name=row.name,
        member_entity_ids=list(row.member_entity_ids) if row.member_entity_ids else [],
        description=row.description,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/entity-views",
    response_model=list[EntityViewRead],
    tags=["entities"],
)
async def list_entity_views(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[EntityViewRead]:
    stmt = (
        select(EntityView)
        .where(EntityView.deleted_at.is_(None))
        .order_by(EntityView.name.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_view_to_read(row) for row in rows]


@router.post(
    "/entity-views",
    response_model=EntityViewRead,
    status_code=status.HTTP_201_CREATED,
    tags=["entities"],
)
async def create_entity_view(
    payload: EntityViewCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> EntityViewRead:
    row = EntityView(
        name=payload.name,
        member_entity_ids=payload.member_entity_ids,
        description=payload.description,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _view_to_read(row)


@router.get(
    "/entity-views/{view_id}",
    response_model=EntityViewRead,
    tags=["entities"],
)
async def get_entity_view(
    view_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityViewRead:
    row = await db.get(EntityView, view_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity view not found.")
    return _view_to_read(row)


@router.patch(
    "/entity-views/{view_id}",
    response_model=EntityViewRead,
    tags=["entities"],
)
async def update_entity_view(
    view_id: UUID,
    payload: EntityViewUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityViewRead:
    row = await db.get(EntityView, view_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity view not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _view_to_read(row)


@router.delete(
    "/entity-views/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["entities"],
)
async def delete_entity_view(
    view_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(EntityView, view_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity view not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
