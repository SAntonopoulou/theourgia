"""Public reader endpoints (B130).

Per ``plan/10-batches-backend.md`` § B130.

``GET /api/v1/reader/{vault_id}/{publication_slug}``
``GET /api/v1/reader/{vault_id}/{publication_slug}/chapter/{cid}``
``GET /api/v1/vaults/{vault_id}/public``

All public — no auth required.

Honesty rules:
  * Sealed publications NEVER public (defence in depth on top of
    B126's publish-time check + B127's checkout-time check).
  * Withdrawn publications 404.
  * Paywall is structural: paywall_kind + buy/subscribe URL only.
    No countdown timers, no "limited time" pressure, no
    recommended-products carousel.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.publications import (
    Publication,
    PublicationChapter,
    PublicationState,
)

__all__ = ["router"]

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────


PaywallKind = Literal["none", "purchase", "subscribe"]


class ReaderChapter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    order_index: int
    title: str
    body: dict | None  # null when paywalled


class ReaderResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    title: str
    summary: str | None
    cover_url: str | None
    language: str
    license: str
    published_at: datetime | None
    pricing_model: str
    one_time_amount_cents: int | None
    currency: str
    # Body or first chapter is shown; the rest are gated.
    body: dict | None
    chapters: list[ReaderChapter]
    # Paywall metadata.
    paywall_kind: PaywallKind
    purchase_url: str | None
    subscribe_url: str | None
    # b108-2gv — inline PDF / EPUB reader hooks.
    content_format: Literal["html", "pdf", "epub"] = "html"
    file_url: str | None = None
    file_size_bytes: int | None = None


# ── Helpers ────────────────────────────────────────────────────


def _purchase_url(pub: Publication) -> str:
    return (
        "https://theourgia.app/checkout/publication/"
        f"{pub.id}"
    )


def _subscribe_url(pub: Publication) -> str:
    return f"https://theourgia.app/v/{pub.owner_id}/subscribe"


async def _load_public_publication(
    db: AsyncSession, vault_id: UUID, slug: str,
) -> Publication:
    stmt = (
        select(Publication)
        .where(Publication.owner_id == vault_id)
        .where(Publication.slug == slug)
        .where(Publication.deleted_at.is_(None))
    )
    row = (await db.execute(stmt)).scalars().first()
    if row is None or row.state != PublicationState.LIVE:
        # Withdrawn / draft / scheduled — public 404 in all cases.
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Publication not found.",
        )
    # Sealed defence in depth — walk the body and reject if any
    # entry_id ref points at a SEALED entry.
    refs = _walk_entry_refs(dict(row.body or {}))
    if refs:
        bad = (
            await db.execute(
                select(Entry.id)
                .where(Entry.id.in_(refs))
                .where(Entry.owner_id == row.owner_id)
                .where(Entry.encryption_mode == EncryptionMode.SEALED)
            )
        ).scalars().first()
        if bad is not None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "This publication is not available publicly.",
            )
    return row


def _walk_entry_refs(body: dict) -> list[UUID]:
    """Same walker pattern as publications.py — duplicated to avoid
    an import cycle."""
    found: list[UUID] = []

    def walk(node: object) -> None:
        if not isinstance(node, dict):
            return
        attrs = node.get("attrs") if isinstance(node.get("attrs"), dict) else None
        if attrs and isinstance(attrs.get("entry_id"), str):
            try:
                found.append(UUID(attrs["entry_id"]))
            except ValueError:
                pass
        for child in node.get("content", []) or []:
            walk(child)

    walk(body)
    return found


def _paywall_for(pub: Publication) -> PaywallKind:
    if pub.pricing_model == "free":
        return "none"
    if pub.pricing_model == "one_time":
        return "purchase"
    if pub.pricing_model == "subscribe":
        return "subscribe"
    return "none"


# ── Reader ────────────────────────────────────────────────────


@router.get(
    "/reader/{vault_id}/{publication_slug}",
    response_model=ReaderResponse,
    tags=["public-reader"],
)
async def read_publication(
    vault_id: UUID,
    publication_slug: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReaderResponse:
    pub = await _load_public_publication(db, vault_id, publication_slug)

    # Pull chapters when book-kind.
    chapter_rows: list[PublicationChapter] = []
    if pub.kind.value == "book":
        chapter_stmt = (
            select(PublicationChapter)
            .where(PublicationChapter.publication_id == pub.id)
            .order_by(PublicationChapter.order_index.asc())
        )
        chapter_rows = list(
            (await db.execute(chapter_stmt)).scalars().all()
        )

    paywall = _paywall_for(pub)
    # Free publications show full body + every chapter.
    if paywall == "none":
        body_for_reader = dict(pub.body or {})
        chapters = [
            ReaderChapter(
                id=str(c.id),
                order_index=c.order_index,
                title=c.title,
                body=dict(c.body or {}),
            )
            for c in chapter_rows
        ]
    else:
        # Paid/subscribe: show summary + first chapter only; rest
        # gated.
        body_for_reader = None
        chapters = [
            ReaderChapter(
                id=str(c.id),
                order_index=c.order_index,
                title=c.title,
                body=dict(c.body or {}) if i == 0 else None,
            )
            for i, c in enumerate(chapter_rows)
        ]

    return ReaderResponse(
        id=str(pub.id),
        slug=pub.slug,
        title=pub.title,
        summary=pub.summary,
        cover_url=pub.cover_url,
        language=pub.language,
        license=pub.license.value,
        published_at=pub.published_at,
        pricing_model=pub.pricing_model,
        one_time_amount_cents=pub.one_time_amount_cents,
        currency=pub.currency,
        body=body_for_reader,
        chapters=chapters,
        paywall_kind=paywall,
        purchase_url=_purchase_url(pub) if paywall == "purchase" else None,
        subscribe_url=_subscribe_url(pub) if paywall == "subscribe" else None,
        content_format=pub.content_format.value,
        # PDF / EPUB file_url only exposed publicly when the reader can
        # already see the body (no active paywall). Behind a paywall the
        # file stays gated exactly like `body` does.
        file_url=pub.file_url if paywall == "none" else None,
        file_size_bytes=pub.file_size_bytes if paywall == "none" else None,
    )
