"""Get-or-create a user's default vault.

Called at sign-in so every account — new or pre-existing — ends up with
exactly one default vault. Idempotent: a second call for a user who
already owns a vault returns it untouched.
"""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.identity import Vault

__all__ = ["ensure_vault", "vault_slug"]

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def vault_slug(name: str) -> str:
    """Deterministic URL-safe slug from a magickal name / email local
    part. Lowercase, non-alphanumerics collapse to a single hyphen,
    trimmed, capped at 48 chars to leave room for a dedupe suffix."""
    s = _SLUG_RE.sub("-", name.lower()).strip("-")
    if not s:
        s = "vault"
    return s[:48]


async def _unique_slug(session: AsyncSession, base: str) -> str:
    """Return ``base`` if free, else ``base-2``, ``base-3``, … The vault
    slug is globally unique (``uq_vault_slug``) because it is the
    federation actor handle."""
    candidate = base
    n = 1
    while True:
        exists = (
            await session.execute(
                select(func.count())
                .select_from(Vault)
                .where(Vault.slug == candidate)
            )
        ).scalar_one()
        if not exists:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


async def ensure_vault(
    session: AsyncSession,
    *,
    owner_id: UUID,
    display_name: str,
    slug_hint: str,
) -> Vault:
    """Return the owner's default vault, creating it if absent.

    Idempotent — the first vault a user owns (lowest created_at) is the
    default. Does NOT commit; the caller owns the transaction.
    """
    existing = (
        await session.execute(
            select(Vault)
            .where(Vault.owner_id == owner_id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    slug = await _unique_slug(session, vault_slug(slug_hint))
    vault = Vault(
        owner_id=owner_id,
        slug=slug,
        display_name=display_name or slug,
        description="",
        public_face_enabled=False,
    )
    session.add(vault)
    await session.flush()
    return vault
