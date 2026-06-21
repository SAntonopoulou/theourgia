"""Entities HTTP endpoints.

Phase 02 shipped a minimal Entity CRUD. **Phase 05 (Batch 43)
extends the schemas to surface every column added in the Phase 05
expansion** — epithets, tradition tags, attributions table,
relationship_status, contact timestamps, notes_private /
notes_shareable, visibility, origin — and adds an aggregate
endpoint that resolves the alias-graph + EntityView projection at
read time.

Endpoints:

``GET    /api/v1/entities``                          — list (filter ``?kind=`` / ``?tradition=`` / ``?relationship_status=``)
``POST   /api/v1/entities``                          — create
``GET    /api/v1/entities/{id}``                     — read
``PATCH  /api/v1/entities/{id}``                     — update
``DELETE /api/v1/entities/{id}``                     — archive (soft delete)
``GET    /api/v1/entities/{id}/aggregate``           — alias-graph + view projection

Per ``plan/05-magical-beings.md`` §1, §11.
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
from theourgia.models.entities import (
    Entity,
    EntityAlias,
    EntityAliasKind,
    EntityKind,
    EntityRelationshipStatus,
    EntityView,
    EntityVisibility,
)

__all__ = ["router"]

router = APIRouter()


EntityKindLiteral = Literal[
    # Phase 02 legacy
    "deity", "spirit", "principle", "place", "object", "other",
    # Phase 05 expansion
    "god", "goddess", "daemon", "angel", "demon", "saint",
    "ancestor", "beloved_dead", "familiar", "servitor", "egregore",
]
EntityRelationshipStatusLiteral = Literal[
    "open", "active", "dormant", "severed", "contracted", "observing",
]
EntityVisibilityLiteral = Literal["personal", "viewer", "hub", "public"]
EntityAliasKindLiteral = Literal[
    "same-as", "aspect-of", "aspect-includes", "syncretic-with", "epithet-of",
]


class EntityRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    kind: EntityKindLiteral
    aliases: list[str]
    epithets: list[str]
    glyph: str
    pronouns: str | None
    gender: str | None
    summary: str | None
    description: str | None
    tradition: str
    tradition_tags: list[str]
    attributions: dict[str, object]
    seal_upload_id: str | None
    portrait_upload_id: str | None
    relationship_status: EntityRelationshipStatusLiteral
    first_contact_at: datetime | None
    last_contact_at: datetime | None
    notes_private: str | None
    notes_shareable: str | None
    visibility: EntityVisibilityLiteral
    origin: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class EntityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    kind: EntityKindLiteral = "other"
    aliases: list[str] = Field(default_factory=list)
    epithets: list[str] = Field(default_factory=list)
    glyph: str = Field(default="entity", max_length=64)
    pronouns: str | None = Field(default=None, max_length=64)
    gender: str | None = Field(default=None, max_length=64)
    summary: str | None = Field(default=None, max_length=1024)
    description: str | None = None
    tradition: str = Field(default="", max_length=64)
    tradition_tags: list[str] = Field(default_factory=list)
    attributions: dict[str, object] = Field(default_factory=dict)
    seal_upload_id: UUID | None = None
    portrait_upload_id: UUID | None = None
    relationship_status: EntityRelationshipStatusLiteral = "open"
    first_contact_at: datetime | None = None
    last_contact_at: datetime | None = None
    notes_private: str | None = None
    notes_shareable: str | None = None
    visibility: EntityVisibilityLiteral = "personal"
    origin: str | None = Field(default=None, max_length=256)


class EntityUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    kind: EntityKindLiteral | None = None
    aliases: list[str] | None = None
    epithets: list[str] | None = None
    glyph: str | None = Field(default=None, max_length=64)
    pronouns: str | None = Field(default=None, max_length=64)
    gender: str | None = Field(default=None, max_length=64)
    summary: str | None = Field(default=None, max_length=1024)
    description: str | None = None
    tradition: str | None = Field(default=None, max_length=64)
    tradition_tags: list[str] | None = None
    attributions: dict[str, object] | None = None
    seal_upload_id: UUID | None = None
    portrait_upload_id: UUID | None = None
    relationship_status: EntityRelationshipStatusLiteral | None = None
    first_contact_at: datetime | None = None
    last_contact_at: datetime | None = None
    notes_private: str | None = None
    notes_shareable: str | None = None
    visibility: EntityVisibilityLiteral | None = None
    origin: str | None = Field(default=None, max_length=256)


def _to_read(row: Entity) -> EntityRead:
    return EntityRead(
        id=str(row.id),
        name=row.name,
        kind=row.kind.value,
        aliases=list(row.aliases) if row.aliases else [],
        epithets=list(row.epithets) if row.epithets else [],
        glyph=row.glyph,
        pronouns=row.pronouns,
        gender=row.gender,
        summary=row.summary,
        description=row.description,
        tradition=row.tradition,
        tradition_tags=list(row.tradition_tags) if row.tradition_tags else [],
        attributions=dict(row.attributions) if row.attributions else {},
        seal_upload_id=str(row.seal_upload_id) if row.seal_upload_id else None,
        portrait_upload_id=str(row.portrait_upload_id) if row.portrait_upload_id else None,
        relationship_status=row.relationship_status.value,
        first_contact_at=row.first_contact_at,
        last_contact_at=row.last_contact_at,
        notes_private=row.notes_private,
        notes_shareable=row.notes_shareable,
        visibility=row.visibility.value,
        origin=row.origin,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/entities", summary="List entities", response_model=list[EntityRead])
async def list_entities(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: EntityKindLiteral | None = None,
    tradition: str | None = None,
    relationship_status: EntityRelationshipStatusLiteral | None = None,
    visibility: EntityVisibilityLiteral | None = None,
    limit: int = 100,
) -> list[EntityRead]:
    stmt = select(Entity).where(Entity.deleted_at.is_(None))
    if kind is not None:
        stmt = stmt.where(Entity.kind == EntityKind(kind))
    if tradition:
        stmt = stmt.where(Entity.tradition == tradition)
    if relationship_status is not None:
        stmt = stmt.where(
            Entity.relationship_status == EntityRelationshipStatus(relationship_status)
        )
    if visibility is not None:
        stmt = stmt.where(Entity.visibility == EntityVisibility(visibility))
    stmt = stmt.order_by(Entity.name.asc()).limit(min(limit, 500))
    result = await db.execute(stmt)
    return [_to_read(row) for row in result.scalars().all()]


@router.post(
    "/entities",
    summary="Create entity",
    response_model=EntityRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_entity(
    payload: EntityCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> EntityRead:
    row = Entity(
        name=payload.name,
        kind=EntityKind(payload.kind),
        aliases=payload.aliases,
        epithets=payload.epithets,
        glyph=payload.glyph,
        pronouns=payload.pronouns,
        gender=payload.gender,
        summary=payload.summary,
        description=payload.description,
        tradition=payload.tradition,
        tradition_tags=payload.tradition_tags,
        attributions=payload.attributions,
        seal_upload_id=payload.seal_upload_id,
        portrait_upload_id=payload.portrait_upload_id,
        relationship_status=EntityRelationshipStatus(payload.relationship_status),
        first_contact_at=payload.first_contact_at,
        last_contact_at=payload.last_contact_at,
        notes_private=payload.notes_private,
        notes_shareable=payload.notes_shareable,
        visibility=EntityVisibility(payload.visibility),
        origin=payload.origin,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/entities/{entity_id}", summary="Get entity", response_model=EntityRead)
async def get_entity(
    entity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityRead:
    stmt = select(Entity).where(Entity.id == entity_id, Entity.deleted_at.is_(None))
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    return _to_read(row)


@router.patch(
    "/entities/{entity_id}",
    summary="Update entity",
    response_model=EntityRead,
)
async def update_entity(
    entity_id: UUID,
    payload: EntityUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityRead:
    stmt = select(Entity).where(Entity.id == entity_id, Entity.deleted_at.is_(None))
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    data = payload.model_dump(exclude_unset=True)
    if "kind" in data and data["kind"] is not None:
        data["kind"] = EntityKind(data["kind"])
    if "relationship_status" in data and data["relationship_status"] is not None:
        data["relationship_status"] = EntityRelationshipStatus(data["relationship_status"])
    if "visibility" in data and data["visibility"] is not None:
        data["visibility"] = EntityVisibility(data["visibility"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/entities/{entity_id}",
    summary="Archive entity",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_entity(
    entity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    stmt = select(Entity).where(Entity.id == entity_id, Entity.deleted_at.is_(None))
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Aggregate resolver ──────────────────────────────────────────────


class AliasNeighbour(BaseModel):
    """One entity reachable from the focus entity via the alias-graph."""

    model_config = ConfigDict(extra="forbid")

    entity_id: str
    kind: EntityAliasKindLiteral
    direction: Literal["outgoing", "incoming"]
    notes: str | None


class EntityAggregate(BaseModel):
    """Read-side projection: focus entity + alias-graph neighbours +
    any saved views that include the focus entity.

    Per ``plan/05-magical-beings.md`` §11. Workings, offerings,
    contracts always attach to one specific entity_id at write time;
    this endpoint resolves the multi-entity view at read time.
    """

    model_config = ConfigDict(extra="forbid")

    focus: EntityRead
    neighbours: list[AliasNeighbour]
    member_entity_ids: list[str] = Field(
        description=(
            "All entity_ids that should be considered together when "
            "aggregating offerings / contracts / workings. Always "
            "contains the focus id, plus any same-as / aspect-of / "
            "aspect-includes / syncretic-with neighbours, plus the "
            "members of every saved EntityView that contains the focus."
        ),
    )
    views: list[str] = Field(
        description="EntityView ids that include the focus entity.",
    )


_GRAPH_KINDS_TO_INCLUDE: frozenset[EntityAliasKind] = frozenset(
    {
        EntityAliasKind.SAME_AS,
        EntityAliasKind.ASPECT_OF,
        EntityAliasKind.ASPECT_INCLUDES,
        EntityAliasKind.SYNCRETIC_WITH,
    }
)


@router.get(
    "/entities/{entity_id}/aggregate",
    response_model=EntityAggregate,
    summary="Resolve alias-graph + saved views for an entity",
)
async def aggregate_entity(
    entity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntityAggregate:
    focus = await db.get(Entity, entity_id)
    if focus is None or focus.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

    edges = (
        await db.execute(
            select(EntityAlias).where(
                EntityAlias.deleted_at.is_(None),
                or_(
                    EntityAlias.source_entity_id == entity_id,
                    EntityAlias.target_entity_id == entity_id,
                ),
            )
        )
    ).scalars().all()

    neighbours: list[AliasNeighbour] = []
    member_ids: set[str] = {str(entity_id)}

    for edge in edges:
        if edge.source_entity_id == entity_id:
            other_id = edge.target_entity_id
            direction = "outgoing"
        else:
            other_id = edge.source_entity_id
            direction = "incoming"
        neighbours.append(
            AliasNeighbour(
                entity_id=str(other_id),
                kind=edge.kind.value,
                direction=direction,
                notes=edge.notes,
            )
        )
        if edge.kind in _GRAPH_KINDS_TO_INCLUDE:
            member_ids.add(str(other_id))

    views_rows = (
        await db.execute(
            select(EntityView).where(EntityView.deleted_at.is_(None))
        )
    ).scalars().all()
    relevant_view_ids: list[str] = []
    for v in views_rows:
        members = list(v.member_entity_ids) if v.member_entity_ids else []
        if str(entity_id) in members:
            relevant_view_ids.append(str(v.id))
            member_ids.update(str(m) for m in members)

    return EntityAggregate(
        focus=_to_read(focus),
        neighbours=neighbours,
        member_entity_ids=sorted(member_ids),
        views=relevant_view_ids,
    )
