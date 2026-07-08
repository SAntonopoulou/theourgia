"""Recipes — incense, oil, wash, philtre.

b108-2gy · FEATURES §10.

Routes:
- GET    /api/v1/recipes                list owned recipes
- POST   /api/v1/recipes                create
- GET    /api/v1/recipes/{id}           read
- PATCH  /api/v1/recipes/{id}           update
- DELETE /api/v1/recipes/{id}           soft-delete
"""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.recipe import Recipe, RecipeKind

__all__ = ["router"]

router = APIRouter()


Visibility = Literal["personal", "viewer", "network", "public"]


class IngredientIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    amount: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)


class StepIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=4000)
    duration_minutes: int | None = Field(default=None, ge=0, le=60_000)


class RecipeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["incense", "oil", "wash", "philtre", "other"]
    name: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=8000)
    ingredients: list[IngredientIn] = Field(default_factory=list)
    steps: list[StepIn] = Field(default_factory=list)
    correspondences: dict[str, Any] = Field(default_factory=dict)
    library_source_ids: list[UUID] = Field(default_factory=list)
    entity_ids: list[UUID] = Field(default_factory=list)
    visibility: Visibility = "personal"


class RecipeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=8000)
    ingredients: list[IngredientIn] | None = None
    steps: list[StepIn] | None = None
    correspondences: dict[str, Any] | None = None
    library_source_ids: list[UUID] | None = None
    entity_ids: list[UUID] | None = None
    visibility: Visibility | None = None


class RecipeRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: str
    name: str
    description: str | None
    ingredients: list[dict[str, Any]]
    steps: list[dict[str, Any]]
    correspondences: dict[str, Any]
    library_source_ids: list[str]
    entity_ids: list[str]
    visibility: Visibility
    created_at: str
    updated_at: str


def _to_read(row: Recipe) -> RecipeRead:
    return RecipeRead(
        id=str(row.id),
        kind=row.kind.value,
        name=row.name,
        description=row.description,
        ingredients=list(row.ingredients or []),
        steps=list(row.steps or []),
        correspondences=dict(row.correspondences or {}),
        library_source_ids=[str(x) for x in (row.library_source_ids or [])],
        entity_ids=[str(x) for x in (row.entity_ids or [])],
        visibility=row.visibility,  # type: ignore[arg-type]
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


@router.get(
    "/recipes",
    response_model=list[RecipeRead],
    summary="List recipes",
)
async def list_recipes(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: Literal["incense", "oil", "wash", "philtre", "other"] | None = None,
) -> list[RecipeRead]:
    stmt = (
        select(Recipe)
        .where(Recipe.owner_id == current_user.id)
        .where(Recipe.deleted_at.is_(None))
        .order_by(Recipe.created_at.desc())
    )
    if kind is not None:
        stmt = stmt.where(Recipe.kind == RecipeKind(kind))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/recipes",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a recipe",
)
async def create_recipe(
    payload: RecipeCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RecipeRead:
    row = Recipe(
        owner_id=current_user.id,
        kind=RecipeKind(payload.kind),
        name=payload.name,
        description=payload.description,
        ingredients=[i.model_dump(exclude_none=True) for i in payload.ingredients],
        steps=[s.model_dump(exclude_none=True) for s in payload.steps],
        correspondences=payload.correspondences,
        library_source_ids=[str(x) for x in payload.library_source_ids],
        entity_ids=[str(x) for x in payload.entity_ids],
        visibility=payload.visibility,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/recipes/{recipe_id}",
    response_model=RecipeRead,
    summary="Read a recipe",
)
async def read_recipe(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RecipeRead:
    row = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found.")
    return _to_read(row)


@router.patch(
    "/recipes/{recipe_id}",
    response_model=RecipeRead,
    summary="Update a recipe",
)
async def update_recipe(
    recipe_id: UUID,
    payload: RecipeUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RecipeRead:
    row = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found.")
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.ingredients is not None:
        row.ingredients = [i.model_dump(exclude_none=True) for i in payload.ingredients]
    if payload.steps is not None:
        row.steps = [s.model_dump(exclude_none=True) for s in payload.steps]
    if payload.correspondences is not None:
        row.correspondences = payload.correspondences
    if payload.library_source_ids is not None:
        row.library_source_ids = [str(x) for x in payload.library_source_ids]
    if payload.entity_ids is not None:
        row.entity_ids = [str(x) for x in payload.entity_ids]
    if payload.visibility is not None:
        row.visibility = payload.visibility
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/recipes/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a recipe",
)
async def delete_recipe(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    row = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return None
