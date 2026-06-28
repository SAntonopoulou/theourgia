"""FastAPI dependency injection for the registry.

Auth flow: author signs requests with their vault-issued Ed25519 key;
`get_current_author` looks up the Author by DID, loads the cached
public key, and verifies the signature using
`core.did_auth.verify_request_signature`.

Tests inject `current_author_override` via `app.dependency_overrides`
to skip the live signature check.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.core.db import session_scope
from theourgia_registry.core.did_auth import (
    AuthFailure,
    verify_request_signature,
)
from theourgia_registry.models.author import Author
from theourgia_registry.models.maintainer import (
    Maintainer,
    MaintainerRole,
)


__all__ = [
    "get_db_session",
    "get_current_author",
    "CurrentAuthor",
    "get_current_maintainer",
    "CurrentMaintainer",
    "get_current_lead",
    "CurrentLead",
]


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with session_scope() as session:
        yield session


async def get_current_author(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Author:
    """Resolve the request's signing author or 401.

    The request body is read via Starlette's cached `body()` — safe to
    call here AND in Pydantic body parsing because Starlette buffers
    the bytes on first read.
    """
    did = request.headers.get("X-Author-DID")
    timestamp = request.headers.get("X-Author-Timestamp")
    signature_b64 = request.headers.get("X-Author-Signature")

    if not did:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Author-DID header required",
        )

    result = await db.execute(select(Author).where(Author.did == did))
    author = result.scalar_one_or_none()
    if author is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="unknown author DID — register first",
        )
    if author.public_key_pem is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="author has no registered public key",
        )

    body = await request.body()

    try:
        verify_request_signature(
            did=did,
            timestamp=timestamp or "",
            signature_b64=signature_b64 or "",
            body=body,
            public_key_pem=author.public_key_pem,
        )
    except AuthFailure as exc:
        raise HTTPException(
            status_code=exc.status_code, detail=str(exc),
        ) from exc

    return author


CurrentAuthor = Annotated[Author, Depends(get_current_author)]


async def get_current_maintainer(
    author: CurrentAuthor,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Maintainer:
    """Resolve to an active Maintainer or raise 403.

    Multi-maintainer governance — any LEAD or REVIEWER may review.
    Revoked maintainers cannot use any maintainer-only endpoint."""
    result = await db.execute(
        select(Maintainer).where(
            Maintainer.author_id == author.id,
            Maintainer.revoked_at.is_(None),
        ),
    )
    maintainer = result.scalar_one_or_none()
    if maintainer is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="this DID is not an active maintainer",
        )
    return maintainer


CurrentMaintainer = Annotated[Maintainer, Depends(get_current_maintainer)]


async def get_current_lead(
    maintainer: CurrentMaintainer,
) -> Maintainer:
    """Resolve to a LEAD maintainer or raise 403.

    Only LEAD can appoint/revoke other maintainers (rule 41 — no
    self-promotion path; appointment is a LEAD's gated action)."""
    if maintainer.role != MaintainerRole.LEAD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="this action requires LEAD maintainer role",
        )
    return maintainer


CurrentLead = Annotated[Maintainer, Depends(get_current_lead)]
