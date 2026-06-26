"""Analytics endpoints (B122).

Per ``plan/09-batches-backend.md`` § B122.

``POST /api/v1/analytics/query`` — run a full DSL query without
saving the result. Used by the H06 Query Builder surface for live
preview.

Honesty rules wired (mirror the executor):
  * Owner-scoped; 401 unauthenticated.
  * Sealed exclusion + sealed_excluded_count surfaced when the
    filter tree touches entry.body_text.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.analytics.executor import (
    ExecutionError,
    QueryExecutionResult,
    execute_query,
)
from theourgia.core.analytics.query_dsl import (
    DSLValidationError,
    parse as parse_query,
)

__all__ = ["router"]

router = APIRouter()


@router.post(
    "/analytics/query",
    response_model=QueryExecutionResult,
    tags=["analytics"],
)
async def analytics_query(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> QueryExecutionResult:
    """Run a query against the caller's vault and return the result
    without persisting a snapshot. Use ``POST /studies/{id}/run`` to
    persist."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    try:
        parsed = parse_query(payload)
    except DSLValidationError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid query: {exc}",
        )
    try:
        return await execute_query(
            db=db, owner_id=current_user.id, parsed=parsed,
        )
    except (DSLValidationError, ExecutionError) as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            str(exc),
        )
