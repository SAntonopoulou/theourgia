"""Public registry endpoints — browse + per-plugin detail + author profile.

These endpoints back surfaces A1 (RegistryPublicHome) and the
publicly-visible detail pages. They are unauthenticated.

Rule 38: sort options are alpha · recent-update · recently-added.
NEVER popularity. Rule 9: no count-of-installs / no stars / no
ranking.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.api.deps import get_db_session
from theourgia_registry.models.author import Author
from theourgia_registry.models.plugin import Plugin


__all__ = ["router"]


router = APIRouter()


SortOption = Literal["alpha", "recent_update", "recently_added"]


class PublicPluginCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    author_did: str
    author_display_name: str
    description: str
    tier: str
    homepage: str | None
    updated_at: datetime
    tombstoned: bool


class PublicPluginListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugins: list[PublicPluginCard]


class PublicAuthorRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    did: str
    display_name: str
    homepage: str | None
    plugin_count: int


@router.get("/plugins", response_model=PublicPluginListResponse)
async def list_plugins(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    sort: SortOption = "recent_update",
    q: str | None = Query(default=None, max_length=200),
) -> PublicPluginListResponse:
    stmt = select(Plugin, Author).join(Author, Plugin.author_id == Author.id)
    if q:
        # Simple ILIKE substring match for v1.
        stmt = stmt.where(Plugin.name.ilike(f"%{q}%"))  # type: ignore[union-attr]
    if sort == "alpha":
        stmt = stmt.order_by(Plugin.name.asc())  # type: ignore[union-attr]
    elif sort == "recently_added":
        stmt = stmt.order_by(Plugin.created_at.desc())  # type: ignore[union-attr]
    else:  # recent_update
        stmt = stmt.order_by(Plugin.updated_at.desc())  # type: ignore[union-attr]

    rows = (await db.execute(stmt)).all()
    cards = [
        PublicPluginCard(
            id=str(plugin.id),
            name=plugin.name,
            author_did=author.did,
            author_display_name=author.display_name,
            description=plugin.description,
            tier=plugin.tier.value,
            homepage=plugin.homepage,
            updated_at=plugin.updated_at,
            tombstoned=plugin.tombstoned_at is not None,
        )
        for (plugin, author) in rows
    ]
    return PublicPluginListResponse(plugins=cards)


@router.get("/authors/{did:path}", response_model=PublicAuthorRead)
async def get_author(
    did: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PublicAuthorRead:
    author = (
        await db.execute(select(Author).where(Author.did == did))
    ).scalars().first()
    if author is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such author on this registry.",
        )
    count = len(
        list(
            (
                await db.execute(
                    select(Plugin).where(Plugin.author_id == author.id)
                )
            ).scalars().all()
        )
    )
    return PublicAuthorRead(
        did=author.did,
        display_name=author.display_name,
        homepage=author.homepage,
        plugin_count=count,
    )
