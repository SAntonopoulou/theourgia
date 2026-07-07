"""Entry-template HTTP endpoints.

``GET    /api/v1/templates``       — list (filter by ``?scope=`` / ``?kind=``)
``GET    /api/v1/templates/{id}``  — single template
``POST   /api/v1/templates``       — create a personal template
``PATCH  /api/v1/templates/{id}``  — update
``DELETE /api/v1/templates/{id}``  — soft delete
"""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.routers.v1.entries import EntryTypeLiteral
from theourgia.models.entries import EntryType
from theourgia.models.templates import EntryTemplate, TemplateScope

__all__ = ["router"]

router = APIRouter()


TemplateScopeLiteral = Literal["personal", "vault_shared", "publishable"]


class TemplateRead(BaseModel):
    """Wire format for a single template."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    name: str
    description: str
    kind: EntryTypeLiteral
    scope: TemplateScopeLiteral
    body_template: str
    default_title_pattern: str | None
    default_glyph: str
    owner_id: str | None
    tradition: str | None
    license: str | None


class TemplateCreate(BaseModel):
    """POST body."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=1024)
    kind: EntryTypeLiteral
    scope: TemplateScopeLiteral = "personal"
    body_template: str = Field(min_length=1)
    default_title_pattern: str | None = Field(default=None, max_length=256)
    default_glyph: str = Field(default="feather", max_length=64)
    tradition: str | None = Field(default=None, max_length=64)
    license: str | None = Field(default=None, max_length=64)


class TemplateUpdate(BaseModel):
    """PATCH body. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=1024)
    scope: TemplateScopeLiteral | None = None
    body_template: str | None = Field(default=None, min_length=1)
    default_title_pattern: str | None = Field(default=None, max_length=256)
    default_glyph: str | None = Field(default=None, max_length=64)
    tradition: str | None = Field(default=None, max_length=64)
    license: str | None = Field(default=None, max_length=64)


def _to_read(row: EntryTemplate) -> TemplateRead:
    return TemplateRead(
        id=str(row.id),
        name=row.name,
        description=row.description,
        kind=row.kind.value,
        scope=row.scope.value,
        body_template=row.body_template,
        default_title_pattern=row.default_title_pattern,
        default_glyph=row.default_glyph,
        owner_id=str(row.owner_id) if row.owner_id else None,
        tradition=row.tradition,
        license=row.license,
    )


@router.get(
    "/templates",
    response_model=list[TemplateRead],
    tags=["templates"],
)
async def list_templates(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    scope: TemplateScopeLiteral | None = None,
    kind: EntryTypeLiteral | None = None,
) -> list[TemplateRead]:
    """List templates the caller can use.

    Visibility:
    * Built-in templates (``owner_id IS NULL``) — visible to everyone.
    * Personal templates — visible only to their owner.
    * Vault-shared / publishable — visible to vault members (today: visible to all).
    """
    stmt = select(EntryTemplate).where(EntryTemplate.deleted_at.is_(None))

    if scope is not None:
        stmt = stmt.where(EntryTemplate.scope == TemplateScope(scope))
    if kind is not None:
        stmt = stmt.where(EntryTemplate.kind == EntryType(kind))

    # Per-user filtering: caller sees built-ins + their own personal +
    # all vault-shared / publishable.
    stmt = stmt.where(
        (EntryTemplate.owner_id.is_(None))  # built-ins
        | (EntryTemplate.owner_id == current_user.id)
        | (EntryTemplate.scope.in_([
            TemplateScope.VAULT_SHARED, TemplateScope.PUBLISHABLE,
        ]))
    )

    stmt = stmt.order_by(EntryTemplate.created_at)
    rows = (await session.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/templates/{template_id}",
    response_model=TemplateRead,
    tags=["templates"],
)
async def get_template(
    template_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TemplateRead:
    row = await session.get(EntryTemplate, template_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    # Auth: caller must own it, or it must be built-in / publishable.
    if (
        row.owner_id is not None
        and row.owner_id != current_user.id
        and row.scope not in (TemplateScope.VAULT_SHARED, TemplateScope.PUBLISHABLE)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    return _to_read(row)


@router.post(
    "/templates",
    response_model=TemplateRead,
    status_code=status.HTTP_201_CREATED,
    tags=["templates"],
)
async def create_template(
    payload: TemplateCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TemplateRead:
    row = EntryTemplate(
        name=payload.name,
        description=payload.description,
        kind=EntryType(payload.kind),
        scope=TemplateScope(payload.scope),
        body_template=payload.body_template,
        default_title_pattern=payload.default_title_pattern,
        default_glyph=payload.default_glyph,
        owner_id=current_user.id,
        tradition=payload.tradition,
        license=payload.license,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.patch(
    "/templates/{template_id}",
    response_model=TemplateRead,
    tags=["templates"],
)
async def update_template(
    template_id: UUID,
    payload: TemplateUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TemplateRead:
    row = await session.get(EntryTemplate, template_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    # Auth: only the owner can update; built-in templates (owner_id is None)
    # require admin (deferred — built-ins are application-level).
    if row.owner_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Built-in templates are not editable.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorised.")

    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.scope is not None:
        row.scope = TemplateScope(payload.scope)
    if payload.body_template is not None:
        row.body_template = payload.body_template
    if payload.default_title_pattern is not None:
        row.default_title_pattern = payload.default_title_pattern
    if payload.default_glyph is not None:
        row.default_glyph = payload.default_glyph
    if payload.tradition is not None:
        row.tradition = payload.tradition
    if payload.license is not None:
        row.license = payload.license

    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["templates"],
)
async def delete_template(
    template_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    from datetime import UTC, datetime

    row = await session.get(EntryTemplate, template_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    if row.owner_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Built-in templates are not deletable.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorised.")
    row.deleted_at = datetime.now(tz=UTC)
    session.add(row)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
