"""Search HTTP endpoint.

``GET /api/v1/search?q=…&kind=…&visibility=…&since=…&until=…``

Wraps :mod:`theourgia.core.search` for the API layer.
Lexical FTS via Postgres + filter chips. Sealed-entry candidate
composition (Mode B zero-knowledge) is a client-side concern; this
endpoint never returns sealed rows.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.routers.v1.entries import EntryRead, _to_read
from theourgia.core.search import SearchRequest, search_entries
from theourgia.models.entries import EntryType, EntryVisibility

__all__ = ["router"]

router = APIRouter()


class SearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hits: list[EntryRead]
    total: int
    limit: int
    offset: int
    sealed_excluded_count: int = 0


@router.get(
    "/search",
    summary="Lexical search across entries",
    response_model=SearchResponse,
    tags=["search"],
)
async def search(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    q: str | None = Query(default=None, max_length=512),
    kind: list[str] | None = Query(default=None),
    visibility: list[str] | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> SearchResponse:
    """Lexical full-text search over the user's accessible entries.

    All filters compose via AND-semantics; values within ``kind`` and
    ``visibility`` lists compose via OR.
    """
    kinds_typed = tuple(EntryType(k) for k in (kind or [])) or None
    vis_typed = tuple(EntryVisibility(v) for v in (visibility or [])) or None

    request = SearchRequest(
        query=q,
        kinds=kinds_typed,
        visibilities=vis_typed,
        owner_id=current_user.id,
        occurred_after=since,
        occurred_before=until,
        limit=limit,
        offset=offset,
    )

    results = await search_entries(session, request)

    return SearchResponse(
        hits=[_to_read(hit.entry) for hit in results.hits],
        total=results.total,
        limit=limit,
        offset=offset,
        sealed_excluded_count=results.sealed_excluded_count,
    )
