"""Identities API — list / read the authenticated user's personas.

Per ``plan/04-journaling.md`` §15 (Multi-identity authoring):

``GET /api/v1/identities`` — the caller's personas (one default + N
                            secondaries). The frontend picker reads
                            this for "Acting as" + author-of-this-entry.
``GET /api/v1/identities/{id}`` — single persona detail.
``GET /api/v1/me/identities/default`` — the caller's default persona.

Mutation routes (create / update / archive) live in the persona
admin substrate from Phase 01 and are not duplicated here. This
router is read-only for the journaling layer.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, OptionalCookieUser, get_db_session
from theourgia.models.persona import Persona, PersonaKind

__all__ = ["router"]

router = APIRouter()


class IdentityRead(BaseModel):
    """Wire format for a single persona/identity."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    handle: str
    display_name: str
    kind: str  # "default" | "secondary"
    bio: str
    is_active: bool
    public_face_enabled: bool


def _to_read(row: Persona) -> IdentityRead:
    return IdentityRead(
        id=str(row.id),
        handle=row.handle,
        display_name=row.display_name,
        kind=row.kind.value,
        bio=row.bio,
        is_active=row.is_active,
        public_face_enabled=row.public_face_enabled,
    )


@router.get(
    "/identities",
    response_model=list[IdentityRead],
    tags=["identities"],
)
async def list_identities(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[IdentityRead]:
    """List the authenticated user's personas."""
    stmt = (
        select(Persona)
        .where(Persona.user_id == current_user.id)
        .where(Persona.is_active.is_(True))
        .order_by(Persona.kind, Persona.handle)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/identities/{identity_id}",
    response_model=IdentityRead,
    tags=["identities"],
)
async def get_identity(
    identity_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> IdentityRead:
    row = await session.get(Persona, identity_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Identity not found.")
    # Auth: caller must own this persona OR the persona must be
    # public-faced (others can browse public profiles).
    if (
        (current_user is None or row.user_id != current_user.id)
        and not row.public_face_enabled
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Identity not found.")
    return _to_read(row)


@router.get(
    "/me/identities/default",
    response_model=IdentityRead,
    tags=["identities"],
)
async def get_default_identity(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> IdentityRead:
    """The caller's default persona — the editor's fallback author
    when no persona is explicitly picked.
    """
    stmt = (
        select(Persona)
        .where(Persona.user_id == current_user.id)
        .where(Persona.kind == PersonaKind.DEFAULT)
        .where(Persona.is_active.is_(True))
    )
    row = (await session.execute(stmt)).scalars().first()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No default persona — user is in an inconsistent state.",
        )
    return _to_read(row)
