"""Maintainer-side endpoints — review queue + decisions + tier promotion +
maintainer roster management.

Multi-maintainer from day 1: ``POST /maintainers`` lets a LEAD maintainer
appoint others. ``DELETE /maintainers/{author_id}`` revokes (sets
``revoked_at``, never deletes).

Rule 41: authors can't promote themselves to maintainer — that's the
LEAD's gated action.
Rule 44: maintainer review shows the diff. No "approve blind" — the
verification panel + capability diff are read-only.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict


__all__ = ["router"]


router = APIRouter()


class MaintainerRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    author_did: str
    role: str
    appointed_at: str
    revoked: bool
