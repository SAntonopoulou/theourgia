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

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entities import (
    KINSHIP_ALIAS_KINDS,
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
    "parent-of", "sibling-of", "spouse-of",
]
KinshipAliasKindLiteral = Literal["parent-of", "sibling-of", "spouse-of"]


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
    ancestor_profile: dict[str, object] = Field(default_factory=dict)
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
    ancestor_profile: dict[str, object] = Field(default_factory=dict)


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
    ancestor_profile: dict[str, object] | None = None


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
        ancestor_profile=dict(row.ancestor_profile) if row.ancestor_profile else {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/entities", summary="List entities", response_model=list[EntityRead])
async def list_entities(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    kind: EntityKindLiteral | None = None,
    tradition: str | None = None,
    relationship_status: EntityRelationshipStatusLiteral | None = None,
    visibility: EntityVisibilityLiteral | None = None,
    limit: int = 100,
) -> list[EntityRead]:
    stmt = select(Entity).where(
        Entity.deleted_at.is_(None),
        Entity.owner_id == current_user.id,
    )
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
    current_user: CurrentUser,
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
        ancestor_profile=payload.ancestor_profile,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/entities/{entity_id}", summary="Get entity", response_model=EntityRead)
async def get_entity(
    entity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntityRead:
    stmt = select(Entity).where(
        Entity.id == entity_id,
        Entity.deleted_at.is_(None),
        Entity.owner_id == current_user.id,
    )
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
    current_user: CurrentUser,
) -> EntityRead:
    stmt = select(Entity).where(
        Entity.id == entity_id,
        Entity.deleted_at.is_(None),
        Entity.owner_id == current_user.id,
    )
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
    current_user: CurrentUser,
) -> Response:
    stmt = select(Entity).where(
        Entity.id == entity_id,
        Entity.deleted_at.is_(None),
        Entity.owner_id == current_user.id,
    )
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
    current_user: CurrentUser,
) -> EntityAggregate:
    focus = await db.get(Entity, entity_id)
    if focus is None or focus.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    if focus.owner_id != current_user.id:
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


# ───── Family tree (kinship graph) ─────────────────────────────────────


class KinshipCreate(BaseModel):
    """Add one kinship edge between two owned entities."""

    model_config = ConfigDict(extra="forbid")

    target_entity_id: UUID
    kind: KinshipAliasKindLiteral
    notes: str | None = Field(default=None, max_length=1024)


class KinshipRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source_entity_id: str
    target_entity_id: str
    kind: KinshipAliasKindLiteral
    notes: str | None


class FamilyTreeNode(BaseModel):
    """One entity node in the tree with its generation offset from the probe.

    Generation 0 is the probe, -1 is one generation up (parent),
    +1 is one generation down (child). Siblings + spouses share
    generation with their kinship counterpart.
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    kind: EntityKindLiteral
    generation: int
    ancestor_profile: dict[str, object] = Field(default_factory=dict)


class FamilyTreeEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source_entity_id: str
    target_entity_id: str
    kind: KinshipAliasKindLiteral


class FamilyTree(BaseModel):
    """Kinship graph reachable from a probe entity, bounded by generation."""

    model_config = ConfigDict(extra="forbid")

    probe_id: str
    nodes: list[FamilyTreeNode]
    edges: list[FamilyTreeEdge]


def _kinship_to_read(row: EntityAlias) -> KinshipRead:
    return KinshipRead(
        id=str(row.id),
        source_entity_id=str(row.source_entity_id),
        target_entity_id=str(row.target_entity_id),
        kind=row.kind.value,  # type: ignore[arg-type]
        notes=row.notes,
    )


@router.post(
    "/entities/{entity_id}/kinship",
    response_model=KinshipRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add one kinship edge (parent-of / sibling-of / spouse-of)",
)
async def create_kinship(
    entity_id: UUID,
    payload: KinshipCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> KinshipRead:
    """Kinship both entities must be owned by the caller."""
    if payload.target_entity_id == entity_id:
        raise HTTPException(status_code=400, detail="Cannot relate an entity to itself.")
    source = await db.get(Entity, entity_id)
    target = await db.get(Entity, payload.target_entity_id)
    if source is None or source.deleted_at is not None or source.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    if target is None or target.deleted_at is not None or target.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail=f"Entity {payload.target_entity_id} not found",
        )
    row = EntityAlias(
        source_entity_id=entity_id,
        target_entity_id=payload.target_entity_id,
        kind=EntityAliasKind(payload.kind),
        notes=payload.notes,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _kinship_to_read(row)


@router.delete(
    "/entities/kinship/{alias_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove one kinship edge",
)
async def delete_kinship(
    alias_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(EntityAlias, alias_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != current_user.id
        or row.kind not in KINSHIP_ALIAS_KINDS
    ):
        raise HTTPException(status_code=404, detail=f"Kinship {alias_id} not found")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/entities/{entity_id}/family-tree",
    response_model=FamilyTree,
    summary="Kinship graph reachable from an entity within N generations",
)
async def family_tree(
    entity_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    generations: int = 3,
) -> FamilyTree:
    """BFS the kinship graph.

    `generations` is a soft bound in both directions from the probe
    (1 = probe + parents/children/siblings/spouses; 3 = default and
    the practical max — great-grandparents / great-grandchildren).
    Clamped to [1, 6].
    """
    generations = max(1, min(int(generations), 6))
    probe = await db.get(Entity, entity_id)
    if probe is None or probe.deleted_at is not None or probe.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

    all_edges = (
        await db.execute(
            select(EntityAlias).where(
                EntityAlias.deleted_at.is_(None),
                EntityAlias.owner_id == current_user.id,
                EntityAlias.kind.in_(list(KINSHIP_ALIAS_KINDS)),
            )
        )
    ).scalars().all()

    # index edges by touched entity for BFS
    from collections import defaultdict, deque

    adjacency: dict[UUID, list[EntityAlias]] = defaultdict(list)
    for e in all_edges:
        adjacency[e.source_entity_id].append(e)
        adjacency[e.target_entity_id].append(e)

    generation_of: dict[UUID, int] = {entity_id: 0}
    frontier: deque[UUID] = deque([entity_id])
    reached_edges: dict[UUID, EntityAlias] = {}
    while frontier:
        current = frontier.popleft()
        current_gen = generation_of[current]
        if abs(current_gen) >= generations:
            continue
        for edge in adjacency[current]:
            other = (
                edge.target_entity_id
                if edge.source_entity_id == current
                else edge.source_entity_id
            )
            if edge.kind == EntityAliasKind.PARENT_OF:
                # directed: source is parent of target
                if edge.source_entity_id == current:
                    other_gen = current_gen + 1  # target is one gen down
                else:
                    other_gen = current_gen - 1  # source is one gen up
            else:
                # symmetric (sibling, spouse) — same generation
                other_gen = current_gen
            if abs(other_gen) > generations:
                continue
            reached_edges[edge.id] = edge
            if other not in generation_of:
                generation_of[other] = other_gen
                frontier.append(other)

    # fetch node rows for every id we reached
    node_ids = list(generation_of.keys())
    if node_ids:
        node_rows = (
            await db.execute(
                select(Entity).where(
                    Entity.id.in_(node_ids),
                    Entity.deleted_at.is_(None),
                    Entity.owner_id == current_user.id,
                )
            )
        ).scalars().all()
    else:
        node_rows = []

    # cause_of_death_private is stripped even for the owner in the
    # tree viz — the tree is a display surface, not a detail view.
    def _sanitised_profile(row: Entity) -> dict[str, object]:
        profile = dict(row.ancestor_profile) if row.ancestor_profile else {}
        profile.pop("cause_of_death_private", None)
        return profile

    nodes = [
        FamilyTreeNode(
            id=str(r.id),
            name=r.name,
            kind=r.kind.value,  # type: ignore[arg-type]
            generation=generation_of[r.id],
            ancestor_profile=_sanitised_profile(r),
        )
        for r in node_rows
    ]
    edges = [
        FamilyTreeEdge(
            id=str(e.id),
            source_entity_id=str(e.source_entity_id),
            target_entity_id=str(e.target_entity_id),
            kind=e.kind.value,  # type: ignore[arg-type]
        )
        for e in reached_edges.values()
    ]
    return FamilyTree(
        probe_id=str(entity_id),
        nodes=nodes,
        edges=edges,
    )
