"""First-run setup status endpoint — b108-2hf.

FEATURES §12 · "Web-based first-run wizard — replace CLI + `.env`
with a signed-out setup surface". The wizard itself lives in the
admin SPA; this router is the state-detection endpoint the wizard
polls to decide whether to render or redirect to sign-in.

`GET /api/v1/setup/status` — public. Returns the vault-provisioning
state as an enum:
  * `empty`         — no User rows exist yet; wizard should render
  * `provisioned`   — at least one User exists; wizard redirects to
                      signin

Kept intentionally minimal: no user data leaked, no allowlist detail
exposed (revealing the allowlist to an anonymous caller would help
an attacker enumerate accepted names). If the operator set the
allowlist, the empty-vault state still says `empty` — the wizard
posts to demo-signin, which will 403 if the chosen name is not on
the list. That surface handles the "single-operator vault" copy.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.models.identity import User

__all__ = ["router"]

router = APIRouter()


class SetupStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: Literal["empty", "provisioned"]


@router.get(
    "/setup/status",
    response_model=SetupStatus,
    tags=["setup"],
    summary="First-run status (public)",
)
async def setup_status(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SetupStatus:
    """Return `empty` if no users exist, `provisioned` otherwise.

    Public endpoint — no auth cookie required. Any signed-out
    visitor to `/app/setup` will call this to decide whether to
    render the wizard.
    """
    stmt = select(User.id).limit(1)
    row = (await db.execute(stmt)).scalar_one_or_none()
    return SetupStatus(state="provisioned" if row is not None else "empty")
