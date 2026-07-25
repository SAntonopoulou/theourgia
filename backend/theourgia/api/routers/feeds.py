"""Unversioned feed endpoints (B130).

Per ``plan/10-batches-backend.md`` § B130.

``GET /vaults/{vault_id}/feed.rss``
``GET /vaults/{vault_id}/feed.atom``
``GET /vaults/{vault_id}/feed.json``

These are mounted at the app level (NOT under /api/v1) so feed
readers can subscribe to a stable URL just like any RSS source.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.core.publishing.rss import (
    FeedItem,
    FeedMeta,
    build_atom,
    build_json_feed,
    build_rss,
)
from theourgia.models.identity import Vault
from theourgia.models.publications import (
    Publication,
    PublicationState,
)

__all__ = ["router"]

router = APIRouter()


PUBLIC_BASE_URL = "https://theourgia.app"


# Friendly labels for each license slug — same set as Publication
# enum. The feed surfaces this verbatim per the H07 rule.
_LICENSE_LABELS: dict[str, str] = {
    "all_rights_reserved": "All rights reserved",
    "cc_by": "CC-BY 4.0",
    "cc_by_sa": "CC-BY-SA 4.0",
    "cc_by_nc": "CC-BY-NC 4.0",
    "cc_by_nc_sa": "CC-BY-NC-SA 4.0",
    "cc_by_nc_nd": "CC-BY-NC-ND 4.0",
    "cc_by_nd": "CC-BY-ND 4.0",
    "cc0": "CC0 (public domain dedication)",
    "public_domain": "Public domain",
}


async def _live_publications(
    db: AsyncSession, vault_id: UUID,
) -> list[Publication]:
    stmt = (
        select(Publication)
        .where(Publication.owner_id == vault_id)
        .where(Publication.deleted_at.is_(None))
        .where(Publication.state == PublicationState.LIVE)
        .order_by(Publication.published_at.desc().nulls_last())
        .limit(50)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _resolve_author_label(db: AsyncSession, owner_id: UUID) -> str:
    """The feed's author label — the owner's default vault display name.

    Same source the ActivityPub actor and bundle exports use: the
    owner's first (default) Vault row. Every account gets one via
    ``ensure_vault`` at sign-in, so the settings fallback
    (``THEOURGIA_PROFILE_DISPLAY_NAME_FALLBACK``) only surfaces for
    rows that predate the v1-030 backfill.
    """
    vault = (
        await db.execute(
            select(Vault)
            .where(Vault.owner_id == owner_id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalars().first()
    if vault is not None and vault.display_name:
        return vault.display_name
    return get_settings().profile_display_name_fallback


def _to_feed_item(pub: Publication, author_label: str) -> FeedItem:
    license_label = _LICENSE_LABELS.get(
        pub.license.value, pub.license.value,
    )
    return FeedItem(
        id=str(pub.id),
        slug=pub.slug,
        title=pub.title,
        summary=pub.summary,
        published_at=pub.published_at or pub.created_at,
        updated_at=pub.updated_at,
        author_label=author_label,
        license_slug=pub.license.value,
        license_label=license_label,
    )


def _feed_meta(vault_id: UUID) -> FeedMeta:
    return FeedMeta(
        vault_slug=str(vault_id),
        title="Theourgia Vault Feed",
        description="Recent public publications from this vault.",
        public_base_url=PUBLIC_BASE_URL,
        language="en",
    )


@router.get("/vaults/{vault_id}/feed.rss", tags=["feeds"])
async def vault_rss(
    vault_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    pubs = await _live_publications(db, vault_id)
    author = await _resolve_author_label(db, vault_id)
    body = build_rss(
        _feed_meta(vault_id), [_to_feed_item(p, author) for p in pubs],
    )
    return Response(content=body, media_type="application/rss+xml")


@router.get("/vaults/{vault_id}/feed.atom", tags=["feeds"])
async def vault_atom(
    vault_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    pubs = await _live_publications(db, vault_id)
    author = await _resolve_author_label(db, vault_id)
    body = build_atom(
        _feed_meta(vault_id), [_to_feed_item(p, author) for p in pubs],
    )
    return Response(content=body, media_type="application/atom+xml")


@router.get("/vaults/{vault_id}/feed.json", tags=["feeds"])
async def vault_json_feed(
    vault_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    pubs = await _live_publications(db, vault_id)
    author = await _resolve_author_label(db, vault_id)
    body = build_json_feed(
        _feed_meta(vault_id), [_to_feed_item(p, author) for p in pubs],
    )
    return Response(content=body, media_type="application/feed+json")
