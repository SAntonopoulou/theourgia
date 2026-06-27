"""FastAPI dependency injection for the registry.

Auth dependencies are stubbed for v1; once the SSO bridge to the
vault host is in place, ``get_current_author`` will verify the
incoming HTTP signature against the author's cached public key.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.core.db import session_scope
from theourgia_registry.models.author import Author


__all__ = ["get_db_session", "get_current_author", "CurrentAuthor"]


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with session_scope() as session:
        yield session


async def get_current_author() -> Author:
    """Stub — returns 401 until the SSO bridge is wired.

    The intended shape:
      1. Read Signature + Signature-Input from request headers.
      2. Resolve keyid → Author row (load public_key_pem).
      3. Verify the signature against the resolved key.
      4. Return the Author.
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="SSO bridge to vault host not yet configured.",
    )


CurrentAuthor = Annotated[Author, Depends(get_current_author)]
