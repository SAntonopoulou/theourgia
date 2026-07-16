"""Publication HTTP endpoints (B126).

Per ``plan/10-batches-backend.md`` § B126.

``GET    /api/v1/publications``                       — list
``POST   /api/v1/publications``                       — create draft
``GET    /api/v1/publications/{id}``                  — read
``PATCH  /api/v1/publications/{id}``                  — update (NOT state)
``DELETE /api/v1/publications/{id}``                  — soft delete

Lifecycle:
``POST   /api/v1/publications/{id}/publish``          — flips to LIVE
``POST   /api/v1/publications/{id}/schedule``         — flips to SCHEDULED
``POST   /api/v1/publications/{id}/withdraw``         — flips to WITHDRAWN
``POST   /api/v1/publications/{id}/republish``        — WITHDRAWN → LIVE

Chapters (book kind only):
``POST   /api/v1/publications/{id}/chapters``         — append
``PATCH  /api/v1/publications/{id}/chapters/{cid}``   — update
``DELETE /api/v1/publications/{id}/chapters/{cid}``   — remove
``POST   /api/v1/publications/{id}/chapters/reorder`` — rewrite indices

Honesty rules:
  * Slug auto-derived from title when omitted (kebab-case +
    collision-safe via numeric suffix).
  * State transitions are explicit — generic PATCH rejects ``state``.
  * Sealed entries cannot be embedded — /publish + /republish refuse
    when the Tiptap body references a sealed entry.
  * Withdrawn rows STAY; the route surfaces them in list responses
    so the publisher's admin can see history.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.publishing.book_pdf import (
    BookPdfInput,
    PublicationChapterInput,
    render_book_pdf,
)
from theourgia.core.traditions import (
    RESPECT_SOURCE_DETAIL,
    closed_tradition_conflicts,
    get_closed_tradition_slugs,
)
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.persona import Persona, PersonaKind
from theourgia.models.publications import (
    Publication,
    PublicationChapter,
    PublicationKind,
    PublicationLicense,
    PublicationState,
)


_LICENSE_NOTICES: dict[PublicationLicense, str] = {
    PublicationLicense.ALL_RIGHTS_RESERVED: "All rights reserved.",
    PublicationLicense.CC_BY: (
        "Licensed under Creative Commons Attribution 4.0 (CC BY 4.0)."
    ),
    PublicationLicense.CC_BY_SA: (
        "Licensed under Creative Commons Attribution-ShareAlike 4.0 "
        "(CC BY-SA 4.0)."
    ),
    PublicationLicense.CC_BY_NC: (
        "Licensed under Creative Commons Attribution-NonCommercial 4.0 "
        "(CC BY-NC 4.0)."
    ),
    PublicationLicense.CC_BY_NC_SA: (
        "Licensed under Creative Commons "
        "Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)."
    ),
    PublicationLicense.CC_BY_NC_ND: (
        "Licensed under Creative Commons "
        "Attribution-NonCommercial-NoDerivatives 4.0 (CC BY-NC-ND 4.0)."
    ),
    PublicationLicense.CC_BY_ND: (
        "Licensed under Creative Commons Attribution-NoDerivatives 4.0 "
        "(CC BY-ND 4.0)."
    ),
    PublicationLicense.CC0: (
        "Dedicated to the public domain via CC0 1.0 Universal."
    ),
    PublicationLicense.PUBLIC_DOMAIN: (
        "This work is in the public domain."
    ),
}

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────


class PublicationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    kind: str
    state: str
    title: str
    slug: str
    summary: str | None
    body: dict
    cover_url: str | None
    language: str
    license: str
    published_at: datetime | None
    scheduled_publish_at: datetime | None
    withdrawn_at: datetime | None
    pricing_model: str
    one_time_amount_cents: int | None
    currency: str
    watermark_enabled: bool
    cited: bool
    chapters: list["ChapterRead"]
    created_at: datetime
    updated_at: datetime


class ChapterRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    publication_id: str
    order_index: int
    title: str
    body: dict
    created_at: datetime
    updated_at: datetime


PublicationRead.model_rebuild()


class PublicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: PublicationKind
    title: str = Field(min_length=1, max_length=240)
    slug: str | None = Field(default=None, max_length=240)
    summary: str | None = None
    body: dict = Field(default_factory=dict)
    cover_url: str | None = Field(default=None, max_length=480)
    language: str = Field(default="en", max_length=16)
    license: PublicationLicense = PublicationLicense.ALL_RIGHTS_RESERVED
    pricing_model: str = Field(default="free", pattern=r"^(free|one_time|subscribe)$")
    one_time_amount_cents: int | None = Field(default=None, ge=0)
    currency: str = Field(default="usd", max_length=8)


class PublicationUpdate(BaseModel):
    """``state`` is intentionally absent — lifecycle endpoints own that."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=240)
    slug: str | None = Field(default=None, max_length=240)
    summary: str | None = None
    body: dict | None = None
    cover_url: str | None = Field(default=None, max_length=480)
    language: str | None = Field(default=None, max_length=16)
    license: PublicationLicense | None = None
    pricing_model: str | None = Field(
        default=None, pattern=r"^(free|one_time|subscribe)$",
    )
    one_time_amount_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    watermark_enabled: bool | None = None


class SchedulePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheduled_publish_at: datetime


class ChapterCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=240)
    body: dict = Field(default_factory=dict)


class ChapterUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=240)
    body: dict | None = None


class ReorderPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ordered_ids: list[UUID]


# ── Slug helpers ───────────────────────────────────────────────


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    base = _SLUG_RE.sub("-", title.lower()).strip("-")
    return base or "untitled"


async def _unique_slug(
    db: AsyncSession, owner_id: UUID, requested: str | None, title: str,
) -> str:
    """Return a slug that doesn't collide with the caller's existing
    publications. Auto-derives when ``requested`` is None."""
    base = slugify(requested) if requested else slugify(title)
    candidate = base
    suffix = 2
    while True:
        stmt = (
            select(Publication.id)
            .where(Publication.owner_id == owner_id)
            .where(Publication.slug == candidate)
            .where(Publication.deleted_at.is_(None))
        )
        hit = (await db.execute(stmt)).scalars().first()
        if hit is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


# ── Helpers ──────────────────────────────────────────────────────


async def _chapters_for(
    db: AsyncSession, publication_id: UUID,
) -> list[PublicationChapter]:
    stmt = (
        select(PublicationChapter)
        .where(PublicationChapter.publication_id == publication_id)
        .order_by(PublicationChapter.order_index.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


def _to_chapter_read(row: PublicationChapter) -> ChapterRead:
    return ChapterRead(
        id=str(row.id),
        publication_id=str(row.publication_id),
        order_index=row.order_index,
        title=row.title,
        body=dict(row.body or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_publication_read(
    row: Publication, chapters: list[PublicationChapter],
) -> PublicationRead:
    return PublicationRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        kind=row.kind.value,
        state=row.state.value,
        title=row.title,
        slug=row.slug,
        summary=row.summary,
        body=dict(row.body or {}),
        cover_url=row.cover_url,
        language=row.language,
        license=row.license.value,
        published_at=row.published_at,
        scheduled_publish_at=row.scheduled_publish_at,
        withdrawn_at=row.withdrawn_at,
        pricing_model=row.pricing_model,
        one_time_amount_cents=row.one_time_amount_cents,
        currency=row.currency,
        watermark_enabled=row.watermark_enabled,
        cited=row.cited,
        chapters=[_to_chapter_read(c) for c in chapters],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_owned(
    db: AsyncSession, publication_id: UUID, owner_id: UUID,
) -> Publication:
    row = await db.get(Publication, publication_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != owner_id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Publication not found.",
        )
    return row


def _collect_entry_id_refs(body: dict) -> list[UUID]:
    """Walk a Tiptap body looking for `entry-link` / `chart-link`
    style nodes that reference an entry id. The Phase 04 Tiptap
    node set uses ``attrs.entry_id`` on the relevant block kinds."""
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


async def _reject_sealed_embeds(
    db: AsyncSession, body: dict, owner_id: UUID,
) -> None:
    """If the body references any entry id that's sealed, raise 400.

    The defence-in-depth rule from the plan: sealed entries cannot
    appear in a public publication. The Reader endpoint enforces
    this too at read-time."""
    refs = _collect_entry_id_refs(body)
    if not refs:
        return
    stmt = (
        select(Entry.id)
        .where(Entry.id.in_(refs))
        .where(Entry.owner_id == owner_id)
        .where(Entry.encryption_mode == EncryptionMode.SEALED)
    )
    bad = (await db.execute(stmt)).scalars().first()
    if bad is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Sealed entries cannot be embedded in a public publication.",
        )


async def _reject_closed_tradition_embeds(
    db: AsyncSession, body: dict, owner_id: UUID,
) -> None:
    """If the body references any entry carrying a closed-tradition
    tag, raise 400.

    v1-001 respect-source rule (Phase 15 §14): publications are
    public-facing, so closed-tradition material never embeds. Same
    walk as :func:`_reject_sealed_embeds`."""
    refs = _collect_entry_id_refs(body)
    if not refs:
        return
    closed = await get_closed_tradition_slugs(db)
    if not closed:
        return
    stmt = (
        select(Entry.id, Entry.tradition_tags)
        .where(Entry.id.in_(refs))
        .where(Entry.owner_id == owner_id)
    )
    # Intersect in Python — the referenced-entry set is small and the
    # closed set tiny; JSONB overlap operators aren't worth it here.
    for _entry_id, tradition_tags in (await db.execute(stmt)).all():
        conflicts = closed_tradition_conflicts(tradition_tags or [], closed)
        if conflicts:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                RESPECT_SOURCE_DETAIL.format(slugs=", ".join(conflicts)),
            )


# ── Routes ──────────────────────────────────────────────────────


@router.get(
    "/publications",
    response_model=list[PublicationRead],
    tags=["publications"],
)
async def list_publications(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    state: PublicationState | None = None,
    kind: PublicationKind | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[PublicationRead]:
    stmt = (
        select(Publication)
        .where(Publication.owner_id == current_user.id)
        .where(Publication.deleted_at.is_(None))
    )
    if state is not None:
        stmt = stmt.where(Publication.state == state)
    if kind is not None:
        stmt = stmt.where(Publication.kind == kind)
    stmt = (
        stmt.order_by(Publication.created_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    # Skip chapters on the list view (rebuild via detail).
    return [_to_publication_read(r, []) for r in rows]


@router.post(
    "/publications",
    response_model=PublicationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["publications"],
)
async def create_publication(
    payload: PublicationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    slug = await _unique_slug(
        db, current_user.id, payload.slug, payload.title,
    )
    row = Publication(
        owner_id=current_user.id,
        kind=payload.kind,
        state=PublicationState.DRAFT,
        title=payload.title,
        slug=slug,
        summary=payload.summary,
        body=dict(payload.body),
        cover_url=payload.cover_url,
        language=payload.language,
        license=payload.license,
        pricing_model=payload.pricing_model,
        one_time_amount_cents=payload.one_time_amount_cents,
        currency=payload.currency,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_publication_read(row, [])


@router.get(
    "/publications/{publication_id}",
    response_model=PublicationRead,
    tags=["publications"],
)
async def get_publication(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    row = await _load_owned(db, publication_id, current_user.id)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


@router.patch(
    "/publications/{publication_id}",
    response_model=PublicationRead,
    tags=["publications"],
)
async def update_publication(
    publication_id: UUID,
    payload: PublicationUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    row = await _load_owned(db, publication_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] is not None:
        data["slug"] = await _unique_slug(
            db, current_user.id, data["slug"], row.title,
        )
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


@router.delete(
    "/publications/{publication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["publications"],
)
async def delete_publication(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await _load_owned(db, publication_id, current_user.id)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


    # ── Lifecycle ────────────────────────────────────────────────────


def _now_utc(row: Publication) -> datetime:
    return datetime.now(tz=row.created_at.tzinfo or timezone.utc)


@router.post(
    "/publications/{publication_id}/publish",
    response_model=PublicationRead,
    tags=["publications"],
)
async def publish_publication(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    """Flip DRAFT/SCHEDULED → LIVE.

    Honesty rule: rejects when the body references a sealed entry.
    """
    row = await _load_owned(db, publication_id, current_user.id)
    if row.state not in (PublicationState.DRAFT, PublicationState.SCHEDULED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot publish from state {row.state.value!r}.",
        )
    await _reject_sealed_embeds(db, dict(row.body or {}), current_user.id)
    await _reject_closed_tradition_embeds(
        db, dict(row.body or {}), current_user.id,
    )
    row.state = PublicationState.LIVE
    row.published_at = _now_utc(row)
    row.scheduled_publish_at = None
    await db.commit()
    await db.refresh(row)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


@router.post(
    "/publications/{publication_id}/schedule",
    response_model=PublicationRead,
    tags=["publications"],
)
async def schedule_publication(
    publication_id: UUID,
    payload: SchedulePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    row = await _load_owned(db, publication_id, current_user.id)
    if row.state not in (PublicationState.DRAFT, PublicationState.SCHEDULED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot schedule from state {row.state.value!r}.",
        )
    row.state = PublicationState.SCHEDULED
    row.scheduled_publish_at = payload.scheduled_publish_at
    await db.commit()
    await db.refresh(row)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


@router.post(
    "/publications/{publication_id}/withdraw",
    response_model=PublicationRead,
    tags=["publications"],
)
async def withdraw_publication(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    row = await _load_owned(db, publication_id, current_user.id)
    if row.state != PublicationState.LIVE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot withdraw from state {row.state.value!r}.",
        )
    row.state = PublicationState.WITHDRAWN
    row.withdrawn_at = _now_utc(row)
    await db.commit()
    await db.refresh(row)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


@router.post(
    "/publications/{publication_id}/republish",
    response_model=PublicationRead,
    tags=["publications"],
)
async def republish_publication(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PublicationRead:
    """WITHDRAWN → LIVE — the H07 "publish a new version" affordance.

    Bumps ``published_at`` so the feed sees it as fresh.
    """
    row = await _load_owned(db, publication_id, current_user.id)
    if row.state != PublicationState.WITHDRAWN:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot republish from state {row.state.value!r}.",
        )
    await _reject_sealed_embeds(db, dict(row.body or {}), current_user.id)
    await _reject_closed_tradition_embeds(
        db, dict(row.body or {}), current_user.id,
    )
    row.state = PublicationState.LIVE
    row.published_at = _now_utc(row)
    row.withdrawn_at = None
    await db.commit()
    await db.refresh(row)
    chapters = await _chapters_for(db, publication_id)
    return _to_publication_read(row, chapters)


    # ── Chapters (book kind only) ───────────────────────────────────


@router.post(
    "/publications/{publication_id}/chapters",
    response_model=ChapterRead,
    status_code=status.HTTP_201_CREATED,
    tags=["publications"],
)
async def append_chapter(
    publication_id: UUID,
    payload: ChapterCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ChapterRead:
    row = await _load_owned(db, publication_id, current_user.id)
    if row.kind != PublicationKind.BOOK:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Chapters are only valid on book-kind publications.",
        )
    existing = await _chapters_for(db, publication_id)
    next_index = (existing[-1].order_index + 1) if existing else 0
    chapter = PublicationChapter(
        publication_id=publication_id,
        order_index=next_index,
        title=payload.title,
        body=dict(payload.body),
    )
    db.add(chapter)
    await db.commit()
    await db.refresh(chapter)
    return _to_chapter_read(chapter)


@router.patch(
    "/publications/{publication_id}/chapters/{chapter_id}",
    response_model=ChapterRead,
    tags=["publications"],
)
async def update_chapter(
    publication_id: UUID,
    chapter_id: UUID,
    payload: ChapterUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ChapterRead:
    await _load_owned(db, publication_id, current_user.id)
    chapter = await db.get(PublicationChapter, chapter_id)
    if chapter is None or chapter.publication_id != publication_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Chapter not found.",
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(chapter, k, v)
    await db.commit()
    await db.refresh(chapter)
    return _to_chapter_read(chapter)


@router.delete(
    "/publications/{publication_id}/chapters/{chapter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["publications"],
)
async def remove_chapter(
    publication_id: UUID,
    chapter_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    await _load_owned(db, publication_id, current_user.id)
    chapter = await db.get(PublicationChapter, chapter_id)
    if chapter is None or chapter.publication_id != publication_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Chapter not found.",
        )
    await db.delete(chapter)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/publications/{publication_id}/chapters/reorder",
    response_model=list[ChapterRead],
    tags=["publications"],
)
async def reorder_chapters(
    publication_id: UUID,
    payload: ReorderPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[ChapterRead]:
    await _load_owned(db, publication_id, current_user.id)
    existing = await _chapters_for(db, publication_id)
    existing_ids = {c.id for c in existing}
    if set(payload.ordered_ids) != existing_ids:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "ordered_ids must list exactly the current chapters.",
        )
    # Two-step rewrite to dodge the unique constraint on (pub, idx):
    # bump everything to a large temporary range first, then rewrite.
    by_id = {c.id: c for c in existing}
    for i, c in enumerate(existing):
        c.order_index = 10_000 + i
    await db.flush()
    for i, cid in enumerate(payload.ordered_ids):
        by_id[cid].order_index = i
    await db.commit()
    refreshed = await _chapters_for(db, publication_id)
    return [_to_chapter_read(c) for c in refreshed]


@router.get(
    "/publications/{publication_id}/book-pdf",
    tags=["publications"],
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Book-quality PDF export.",
        },
    },
)
async def export_book_pdf(
    publication_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    """Render the publication + chapters to a print-quality PDF.

    Owner-only. Front matter (title / copyright / TOC) + Nisan-order
    body composition. Chapters open on right-hand pages by trade-book
    convention. Widow/orphan control + justified text with hyphenation.
    """
    row = await _load_owned(db, publication_id, current_user.id)
    chapters = await _chapters_for(db, publication_id)

    persona_stmt = (
        select(Persona)
        .where(Persona.user_id == current_user.id)
        .where(Persona.kind == PersonaKind.DEFAULT)
        .where(Persona.is_active.is_(True))
    )
    persona = (await db.execute(persona_stmt)).scalars().first()
    author = persona.display_name if persona else ""
    license_notice = _LICENSE_NOTICES.get(row.license)

    payload = BookPdfInput(
        title=row.title,
        author=author,
        body=dict(row.body or {}),
        chapters=[
            PublicationChapterInput(
                order_index=c.order_index,
                title=c.title,
                body=dict(c.body or {}),
            )
            for c in chapters
        ],
        summary=row.summary,
        license_notice=license_notice,
        language=row.language,
    )
    data = render_book_pdf(payload)
    filename = f"{row.slug or 'publication'}.pdf"
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            ),
            "Cache-Control": "private, no-store",
        },
    )
