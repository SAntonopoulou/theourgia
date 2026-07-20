"""Entry HTTP endpoints.

``GET    /api/v1/entries``           — list (optional ?type= filter)
``GET    /api/v1/entries/stats``     — counts + week-over-week deltas
``POST   /api/v1/entries``           — create
``GET    /api/v1/entries/{id}``      — single entry
``POST   /api/v1/entries/{id}/seal`` — Mode B seal (v1-033; one-way)
``GET    /api/v1/entries/{id}/sealed-payload`` — owner-gated ciphertext read

Phase 02 NOTE: these endpoints are **unauthenticated** during foundations.
Anonymous read + write is intentional for the dev preview. They gain auth
gating when the auth HTTP routes ship in a later batch — that batch
should also flip ``Entry.owner_id`` to NOT NULL.
"""

from __future__ import annotations

import logging
from base64 import b64encode
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.entries.revisions import (
    purge_plaintext_revisions,
    restore_revision,
    revision_excerpt,
    snapshot_revision_guarded,
)
from theourgia.core.traditions import (
    RESPECT_SOURCE_DETAIL,
    closed_tradition_conflicts,
    get_closed_tradition_slugs,
)
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryRevision,
    EntryType,
    EntryVisibility,
)

__all__ = ["apply_publish", "router"]

_log = logging.getLogger(__name__)

router = APIRouter()


# Phase 04 expanded the discriminator to 17 kinds (5 legacy + 12 new).
# The literal here lists them all so OpenAPI clients see the full set.
EntryTypeLiteral = Literal[
    # Phase 02 legacy
    "observation", "ritual", "divination", "synchronicity", "capture",
    # Phase 04
    "note", "ritual_log", "dream", "working", "magical_record",
    "pathworking", "scrying", "body_practice", "meeting_note",
    "study_note", "liber_resh", "blog_post",
]

# The 5 legacy types — used by the existing stats endpoint that
# pre-dated the Phase 04 expansion. Phase 04 stats land in a future
# `EntryStatsV2` shape; this list stays narrow for back-compat.
_ALL_TYPES: tuple[EntryTypeLiteral, ...] = (
    "observation",
    "ritual",
    "divination",
    "synchronicity",
    "capture",
)


EntryVisibilityLiteral = Literal["personal", "viewer", "hub", "public"]
EncryptionModeLiteral = Literal["none", "sealed"]


class EntryRead(BaseModel):
    """Wire format for a single entry — mirrors frontend ``EntryRecord``.

    Phase 04 expands this with optional fields. Pre-Phase-04 clients
    that don't ask for the new fields keep working because every new
    column is `Optional` and `default=None`.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    title: str
    type: EntryTypeLiteral
    excerpt: str
    glyph: str
    created_at: datetime
    updated_at: datetime

    # Phase 04 extras (all optional for back-compat).
    body: str | None = None
    visibility: EntryVisibilityLiteral = "personal"
    encryption_mode: EncryptionModeLiteral = "none"
    occurred_at: datetime | None = None
    occurred_at_tz: str | None = None
    location_lat: float | None = None
    location_lon: float | None = None
    mood: int | None = None
    energy: int | None = None
    health_notes: str | None = None
    parent_id: str | None = None
    scheduled_publish_at: datetime | None = None
    published_at: datetime | None = None
    # Multi-identity authoring (Batch 32).
    authored_by_persona_id: str | None = None
    # b108-2hm — expose to the editor so the "Published" chip renders.
    sealed: bool = False
    # b108-2hy — auto-stamp snapshots (JSON strings). The frontend
    # renders these as chip strips at the top of the entry.
    astro_snapshot: str | None = None
    calendar_snapshot: str | None = None
    # v1-001 — flexible tags + tradition tags.
    tags: list[str] = []
    tradition_tags: list[str] = []
    # v1-018 — posthumous publication flag (plan/15 §13).
    publish_on_death: bool = False


class EntryCreate(BaseModel):
    """Body for ``POST /api/v1/entries`` — mirrors frontend ``CreateEntryInput``.

    Phase 04 extras are optional; pre-Phase-04 client payloads still
    validate because every new field has a default.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=256)
    type: EntryTypeLiteral = "observation"
    excerpt: str = Field(default="", max_length=1024)
    glyph: str = Field(default="feather", max_length=64)
    body: str | None = None

    # Phase 04 extras.
    visibility: EntryVisibilityLiteral = "personal"
    occurred_at: datetime | None = None
    occurred_at_tz: str | None = Field(default=None, max_length=64)
    location_lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    location_lon: float | None = Field(default=None, ge=-180.0, le=180.0)
    mood: int | None = Field(default=None, ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    health_notes: str | None = None
    parent_id: str | None = None
    scheduled_publish_at: datetime | None = None
    # Multi-identity authoring (Batch 32).
    authored_by_persona_id: str | None = None
    # v1-001 — flexible tags + tradition tags. Normalized on write via
    # ``_normalize_tags`` (strip, drop empties, dedupe, caps).
    tags: list[str] = Field(default_factory=list)
    tradition_tags: list[str] = Field(default_factory=list)
    # v1-018 — publish this entry when memorial mode activates (and
    # posthumous publications are enabled on the memorial config).
    publish_on_death: bool = False


class EntryWindowCounts(BaseModel):
    """Counts in a time window — total + per-type breakdown."""

    model_config = ConfigDict(extra="forbid")

    total: int
    by_type: dict[EntryTypeLiteral, int]


class EntryStats(BaseModel):
    """Response of ``GET /api/v1/entries/stats``."""

    model_config = ConfigDict(extra="forbid")

    total: int
    by_type: dict[EntryTypeLiteral, int]
    this_week: EntryWindowCounts
    last_week: EntryWindowCounts


# v1-001 — tag caps. Enforced in ``_normalize_tags`` rather than the
# pydantic schema so the 422 detail names the offending list.
_MAX_TAGS_PER_LIST = 32
_MAX_TAG_LENGTH = 64


def _normalize_tags(items: list[str], field: str) -> list[str]:
    """Strip whitespace, drop empties, dedupe preserving order."""
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in items:
        stripped = item.strip()
        if not stripped:
            continue
        if len(stripped) > _MAX_TAG_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"{field} items must be at most "
                    f"{_MAX_TAG_LENGTH} characters."
                ),
            )
        if stripped in seen:
            continue
        seen.add(stripped)
        cleaned.append(stripped)
    if len(cleaned) > _MAX_TAGS_PER_LIST:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} accepts at most {_MAX_TAGS_PER_LIST} items.",
        )
    return cleaned


async def _reject_closed_tradition_public(
    session: AsyncSession, tradition_tags: list[str],
) -> None:
    """403 when ``tradition_tags`` intersect the operator's closed set.

    The respect-source rule (Phase 15 §14): closed-tradition content
    never becomes publicly visible from this instance.
    """
    closed = await get_closed_tradition_slugs(session)
    conflicts = closed_tradition_conflicts(tradition_tags, closed)
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=RESPECT_SOURCE_DETAIL.format(slugs=", ".join(conflicts)),
        )


def _to_read(row: Entry) -> EntryRead:
    return EntryRead(
        id=str(row.id),
        title=row.title,
        type=row.type.value,
        excerpt=row.excerpt,
        glyph=row.glyph,
        created_at=row.created_at,
        updated_at=row.updated_at,
        body=row.body,
        visibility=row.visibility.value,
        encryption_mode=row.encryption_mode.value,
        occurred_at=row.occurred_at,
        occurred_at_tz=row.occurred_at_tz,
        location_lat=row.location_lat,
        location_lon=row.location_lon,
        mood=row.mood,
        energy=row.energy,
        health_notes=row.health_notes,
        parent_id=str(row.parent_id) if row.parent_id else None,
        scheduled_publish_at=row.scheduled_publish_at,
        published_at=row.published_at,
        authored_by_persona_id=(
            str(row.authored_by_persona_id)
            if row.authored_by_persona_id
            else None
        ),
        sealed=row.encryption_mode == EncryptionMode.SEALED,
        astro_snapshot=row.astro_snapshot,
        calendar_snapshot=row.calendar_snapshot,
        tags=list(row.tags),
        tradition_tags=list(row.tradition_tags),
        publish_on_death=row.publish_on_death,
    )


def _empty_by_type() -> dict[EntryTypeLiteral, int]:
    return {t: 0 for t in _ALL_TYPES}


@router.get(
    "/entries",
    summary="List entries",
    description="Returns non-deleted entries in reverse-chronological order. Optional ``?type=`` filter.",
    response_model=list[EntryRead],
)
async def list_entries(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    type: EntryTypeLiteral | None = None,
    limit: int = 50,
) -> list[EntryRead]:
    stmt = select(Entry).where(
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    if type is not None:
        stmt = stmt.where(Entry.type == EntryType(type))
    stmt = stmt.order_by(Entry.created_at.desc()).limit(min(limit, 200))
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/entries/stats",
    summary="Entry counts + week-over-week deltas",
    description=(
        "Returns total entry count, per-type breakdown, and counts for the "
        "current and previous UTC-week windows. Soft-deleted entries excluded."
    ),
    response_model=EntryStats,
)
async def get_entry_stats(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryStats:
    now = datetime.now(tz=UTC)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    async def _counts(since: datetime | None = None, until: datetime | None = None) -> EntryWindowCounts:
        stmt = (
            select(Entry.type, func.count(Entry.id))
            .where(
                Entry.deleted_at.is_(None),
                Entry.owner_id == current_user.id,
            )
            .group_by(Entry.type)
        )
        if since is not None:
            stmt = stmt.where(Entry.created_at >= since)
        if until is not None:
            stmt = stmt.where(Entry.created_at < until)
        result = await session.execute(stmt)
        by_type = _empty_by_type()
        total = 0
        for row_type, row_count in result.all():
            literal = row_type.value if isinstance(row_type, EntryType) else str(row_type)
            count_int = int(row_count)
            by_type[literal] = count_int  # type: ignore[index]
            total += count_int
        return EntryWindowCounts(total=total, by_type=by_type)

    all_time = await _counts()
    this_week = await _counts(since=week_ago)
    last_week = await _counts(since=two_weeks_ago, until=week_ago)

    return EntryStats(
        total=all_time.total,
        by_type=all_time.by_type,
        this_week=this_week,
        last_week=last_week,
    )


@router.post(
    "/entries",
    summary="Create entry",
    description=(
        "Create a new entry. Phase 02: unauthenticated; ``owner_id`` is "
        "left NULL until auth routes ship."
    ),
    response_model=EntryRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_entry(
    payload: EntryCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    # v1-001 — normalize the tag lists, then apply the respect-source
    # rule before doing any other work.
    tags = _normalize_tags(payload.tags, "tags")
    tradition_tags = _normalize_tags(payload.tradition_tags, "tradition_tags")
    if payload.visibility == "public":
        await _reject_closed_tradition_public(session, tradition_tags)

    # b108-2hy — auto-stamp on create. Compute the astro + calendar
    # snapshots at entry-birth so the entry always carries context
    # about WHERE in the moon cycle + WHICH sun sign it was made.
    #
    # The AutoStamp module handles the heavy lifting (Swiss Ephemeris
    # + multi-calendar converters). We derive location from the
    # payload if present, otherwise fall back to the user's stored
    # astro location, otherwise Greenwich.
    from datetime import UTC as _UTC, datetime as _dt

    from theourgia.core.entries.autostamp import (
        AutoStampInput,
        compute_snapshots,
    )

    stamp_instant = payload.occurred_at or _dt.now(tz=_UTC)
    if stamp_instant.tzinfo is None:
        stamp_instant = stamp_instant.replace(tzinfo=_UTC)

    stamp_lat = payload.location_lat
    stamp_lon = payload.location_lon
    if stamp_lat is None or stamp_lon is None:
        # Fall back to the user's stored astrological location.
        from theourgia.api.routers.v1.user_settings import _read_value

        settings_lat = await _read_value(session, current_user.id, "astro.lat")
        settings_lon = await _read_value(session, current_user.id, "astro.lng")
        if stamp_lat is None:
            stamp_lat = settings_lat if settings_lat is not None else 0.0
        if stamp_lon is None:
            stamp_lon = settings_lon if settings_lon is not None else 0.0

    # v1-016 — the user's enabled calendars (wizard / settings) join
    # the snapshot beyond the always-stamped four. A failed read means
    # no extras, never a failed entry.
    try:
        from theourgia.api.routers.v1.user_settings import (
            read_enabled_calendars,
        )

        extra_calendar_ids = tuple(
            await read_enabled_calendars(session, current_user.id)
        )
    except Exception:
        extra_calendar_ids = ()

    try:
        snapshot = compute_snapshots(
            AutoStampInput(
                instant=stamp_instant,
                latitude=stamp_lat,
                longitude=stamp_lon,
                extra_calendar_ids=extra_calendar_ids,
            )
        )
        astro_snapshot: str | None = snapshot.astro_snapshot
        calendar_snapshot: str | None = snapshot.calendar_snapshot
    except Exception:
        # Never fail entry creation because the ephemeris hiccupped;
        # the entry itself is more valuable than the context it lacks.
        astro_snapshot = None
        calendar_snapshot = None

    row = Entry(
        title=payload.title,
        type=EntryType(payload.type),
        excerpt=payload.excerpt,
        glyph=payload.glyph,
        body=payload.body,
        owner_id=current_user.id,
        # Phase 04 extras. All optional; Entry defaults handle absent values.
        visibility=EntryVisibility(payload.visibility),
        occurred_at=payload.occurred_at,
        occurred_at_tz=payload.occurred_at_tz,
        location_lat=payload.location_lat,
        location_lon=payload.location_lon,
        mood=payload.mood,
        energy=payload.energy,
        health_notes=payload.health_notes,
        tags=tags,
        tradition_tags=tradition_tags,
        publish_on_death=payload.publish_on_death,
        parent_id=UUID(payload.parent_id) if payload.parent_id else None,
        scheduled_publish_at=payload.scheduled_publish_at,
        authored_by_persona_id=(
            UUID(payload.authored_by_persona_id)
            if payload.authored_by_persona_id
            else None
        ),
        # b108-2hy — auto-populated at create time.
        astro_snapshot=astro_snapshot,
        calendar_snapshot=calendar_snapshot,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.get(
    "/entries/{entry_id}",
    summary="Get entry by id",
    response_model=EntryRead,
)
async def get_entry(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    return _to_read(row)


class EntryUpdate(BaseModel):
    """Body for ``PATCH /api/v1/entries/{id}`` — every field optional."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=256)
    type: EntryTypeLiteral | None = None
    excerpt: str | None = Field(default=None, max_length=1024)
    glyph: str | None = Field(default=None, max_length=64)
    body: str | None = None
    # v1-001 — the Editor's visibility chip PATCHes this route; the
    # respect-source rule below gates the personal-to-public flips.
    visibility: EntryVisibilityLiteral | None = None
    # v1-001 — None means unchanged.
    tags: list[str] | None = None
    tradition_tags: list[str] | None = None
    # v1-018 — None means unchanged.
    publish_on_death: bool | None = None


def _refuse_sealed_plaintext_patch(row: Entry, payload: EntryUpdate) -> None:
    """v1-033 — sealed rows accept no plaintext body and never go
    public. Same refusals as the body-PATCH + publish precedents."""
    if row.encryption_mode != EncryptionMode.SEALED:
        return
    if payload.body is not None:
        raise HTTPException(
            status_code=403,
            detail=(
                "This entry is sealed. Sealed bodies cannot be updated "
                "server-side — the client must re-seal and use the "
                "encrypted payload endpoint."
            ),
        )
    if payload.visibility == "public":
        raise HTTPException(
            status_code=403,
            detail=(
                "Sealed entries cannot be made public. Sealed content "
                "is never publicly visible — defence in depth."
            ),
        )


@router.patch(
    "/entries/{entry_id}",
    summary="Update entry",
    description=(
        "Partial update — only supplied fields change. Phase 02: unauthenticated; "
        "ownership gating ships with the auth surface."
    ),
    response_model=EntryRead,
)
async def update_entry(
    entry_id: UUID,
    payload: EntryUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    _refuse_sealed_plaintext_patch(row, payload)
    # v1-001 — normalize incoming tag lists (None means unchanged).
    new_tags = (
        None if payload.tags is None
        else _normalize_tags(payload.tags, "tags")
    )
    new_tradition_tags = (
        None if payload.tradition_tags is None
        else _normalize_tags(payload.tradition_tags, "tradition_tags")
    )
    # Respect-source rule: refuse any patch that would leave the entry
    # publicly visible with a closed-tradition tag — whether it flips
    # visibility to public or retags an already-public entry.
    effective_visibility = (
        EntryVisibility(payload.visibility)
        if payload.visibility is not None
        else row.visibility
    )
    if effective_visibility == EntryVisibility.PUBLIC and (
        payload.visibility is not None or new_tradition_tags is not None
    ):
        await _reject_closed_tradition_public(
            session,
            new_tradition_tags
            if new_tradition_tags is not None
            else row.tradition_tags,
        )
    # v1-028 — version history. Snapshot the PRIOR state before
    # mutating. Content edits (title / body / type) are debounced to
    # one revision per 10 minutes; a visibility change always forces
    # a revision (it is a meaningful state transition the user will
    # want a restore point at). See core.entries.revisions.
    content_changing = (
        (payload.title is not None and payload.title != row.title)
        or (payload.body is not None and payload.body != row.body)
        or (payload.type is not None and EntryType(payload.type) != row.type)
    )
    visibility_changing = (
        payload.visibility is not None
        and EntryVisibility(payload.visibility) != row.visibility
    )
    if content_changing or visibility_changing:
        await snapshot_revision_guarded(
            session,
            row,
            edited_by=current_user.id,
            force=visibility_changing,
        )
    if payload.title is not None:
        row.title = payload.title
    if payload.type is not None:
        row.type = EntryType(payload.type)
    if payload.excerpt is not None:
        row.excerpt = payload.excerpt
    if payload.glyph is not None:
        row.glyph = payload.glyph
    if payload.body is not None:
        row.body = payload.body
    if payload.visibility is not None:
        row.visibility = EntryVisibility(payload.visibility)
    if new_tags is not None:
        row.tags = new_tags
    if new_tradition_tags is not None:
        row.tradition_tags = new_tradition_tags
    if payload.publish_on_death is not None:
        row.publish_on_death = payload.publish_on_death
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


# ── b108-2hm: body PATCH (Editor auto-save target) ───────────────


class EntryBodyUpdate(BaseModel):
    """PATCH body only — used by the Tiptap auto-save loop."""

    model_config = ConfigDict(extra="forbid")

    body: str = Field(max_length=2_000_000)


@router.patch(
    "/entries/{entry_id}/body",
    summary="Update entry body (auto-save target)",
    response_model=EntryRead,
)
async def update_entry_body(
    entry_id: UUID,
    payload: EntryBodyUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    """Just the Tiptap body — used by the debounced auto-save.

    Separate endpoint from the general PATCH so the auto-save
    loop can send small payloads without dragging every editable
    field across the wire.
    """
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if row.encryption_mode == EncryptionMode.SEALED:
        raise HTTPException(
            status_code=403,
            detail=(
                "This entry is sealed. Sealed bodies cannot be updated "
                "server-side — the client must re-seal and use the "
                "encrypted payload endpoint."
            ),
        )
    # v1-028 — version history. Auto-save fires every ~1 s; the
    # snapshot helper debounces to one revision per 10 minutes of
    # editing (see core.entries.revisions). Snapshot the PRIOR body
    # before overwriting, and only when the body actually changed.
    if payload.body != row.body:
        await snapshot_revision_guarded(session, row, edited_by=current_user.id)
    row.body = payload.body
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


# ── b108-2hm: publish ────────────────────────────────────────────


async def apply_publish(
    session: AsyncSession, row: Entry, *, now: datetime | None = None,
) -> bool:
    """Apply the publish transition to ``row`` — the ONE publish path.

    Used by the publish endpoint below and by the memorial sweep's
    posthumous release (v1-018), so the refusal rules can never drift
    between the two. Raises :class:`HTTPException` on refusal (the
    sweep catches it and log-skips); returns whether anything changed.
    Caller commits.

    - Sealed entries refuse (defence in depth — sealed content never
      goes public).
    - Closed-tradition entries refuse (respect-source rule, v1-001).
    - Idempotent — an already-published entry keeps its original
      timestamp so "when was this published" doesn't drift.
    - b108-2ht: publish ALSO promotes visibility to PUBLIC ("publish
      means public").
    - v1-026: a fresh publish queues AP Create(Note) deliveries to
      the owner's accepted followers (transport- and settings-gated
      inside the helper). Failure-isolated — an enqueue error can
      never fail the publish itself.
    """
    if row.encryption_mode == EncryptionMode.SEALED:
        raise HTTPException(
            status_code=403,
            detail=(
                "Sealed entries cannot be published. Sealed content is "
                "opaque to the server; unsealing before publish would "
                "defeat the whole point of the seal."
            ),
        )
    # v1-001 — respect-source rule: publish promotes visibility to
    # PUBLIC, so closed-tradition entries must refuse here too.
    await _reject_closed_tradition_public(session, row.tradition_tags)
    changed = False
    if row.published_at is None:
        row.published_at = now or datetime.now(tz=UTC)
        changed = True
    if row.visibility != EntryVisibility.PUBLIC:
        row.visibility = EntryVisibility.PUBLIC
        changed = True
    if changed:
        # Late import: keeps the federation stack out of the router's
        # import graph for instances that never touch it.
        try:
            from theourgia.core.federation import ap_outbound

            await ap_outbound.enqueue_create_for_entry(session, row)
        except Exception:  # noqa: BLE001 — publish must never fail on enqueue
            _log.warning(
                "entries.publish.ap_broadcast_failed",
                extra={"entry_id": str(row.id)},
            )
    return changed


@router.post(
    "/entries/{entry_id}/publish",
    summary="Publish an entry",
    description=(
        "Sets published_at to the current time. Fails if the entry is "
        "sealed (defence in depth — sealed content never goes public)."
    ),
    response_model=EntryRead,
)
async def publish_entry(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    # v1-028 — publish is a meaningful state transition: force a
    # revision of the prior state (bypassing the 10-minute debounce)
    # when this publish will actually change something. Snapshot BEFORE
    # apply_publish mutates the row; if apply_publish refuses, the
    # session rolls back on the raised HTTPException (get_db_session),
    # so no stray revision persists.
    will_change = (
        row.published_at is None or row.visibility != EntryVisibility.PUBLIC
    )
    if will_change:
        await snapshot_revision_guarded(
            session,
            row,
            edited_by=current_user.id,
            force=True,
            edit_summary="Before publish",
        )
    if await apply_publish(session, row):
        await session.commit()
        await session.refresh(row)
    return _to_read(row)


# ── v1-033: Mode B seal — the honest model ───────────────────────
#
# "Sealed" server-side means: ``encryption_mode = sealed``, the
# client-encrypted envelope lives in ``encrypted_payload``, and the
# plaintext (``body`` / ``body_text``) plus every plaintext revision
# are gone — same transaction. The envelope is the in-band-salt JSON
# wrapper sealed oaths and initiations already use:
# ``{"v": 1, "iv": <b64>, "ct": <b64>}`` with the PBKDF2 salt in the
# first 16 bytes of ``ct`` (vaultCrypto's Mode B format, b108-2d).
#
# The seal is ONE-WAY server-side: the server never has the key, so
# there is no unseal endpoint — a sealed entry can never become a
# plaintext entry again through this API. Reading is a different flow:
# the owner fetches the ciphertext below and decrypts in memory with
# the vault passphrase (SealUnlock), exactly like the talisman unseal
# read (which is also read-only — the row stays sealed).


class EntrySealRequest(BaseModel):
    """Body of ``POST /entries/{id}/seal`` — the client-encrypted
    envelope string. Never plaintext; the server stores it opaquely.

    The 4 MB cap mirrors the 2 MB plaintext body cap with headroom
    for base64 expansion + the envelope wrapper.
    """

    model_config = ConfigDict(extra="forbid")

    encrypted_payload: str = Field(min_length=1, max_length=4_000_000)


class EntrySealedPayloadRead(BaseModel):
    """Ciphertext-only read model — there is no plaintext field to
    leak by construction."""

    model_config = ConfigDict(extra="forbid")

    encrypted_payload_b64: str


@router.post(
    "/entries/{entry_id}/seal",
    summary="Seal an entry (Mode B client-side encryption)",
    description=(
        "Stores the client-encrypted payload, sets encryption_mode=sealed, "
        "NULLs the plaintext body, and purges every plaintext revision — "
        "one transaction. One-way server-side: there is no unseal "
        "endpoint. The owner reads the ciphertext back via "
        "GET /entries/{id}/sealed-payload and decrypts client-side."
    ),
    response_model=EntryRead,
)
async def seal_entry(
    entry_id: UUID,
    payload: EntrySealRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if row.encryption_mode == EncryptionMode.SEALED:
        raise HTTPException(
            status_code=409,
            detail="This entry is already sealed.",
        )
    if row.visibility == EntryVisibility.PUBLIC:
        raise HTTPException(
            status_code=403,
            detail=(
                "Public entries cannot be sealed. Lower the visibility "
                "first — sealed content is never publicly visible."
            ),
        )
    row.encrypted_payload = payload.encrypted_payload.encode("utf-8")
    row.encryption_mode = EncryptionMode.SEALED
    # The server must never see the plaintext again.
    row.body = None
    row.body_text = None
    # Honest-behavior contract (v1-028): pre-seal plaintext snapshots
    # surviving the seal would silently defeat it. Same transaction —
    # the source-scan guard in tests/test_entry_revisions.py enforces
    # this pairing.
    purged = await purge_plaintext_revisions(session, row.id)
    if purged:
        _log.info(
            "entries.seal.revisions_purged",
            extra={"entry_id": str(row.id), "count": purged},
        )
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.get(
    "/entries/{entry_id}/sealed-payload",
    summary="Sealed ciphertext of an entry (owner-only)",
    description=(
        "Returns the client-encrypted envelope (base64) so the owner's "
        "client can decrypt it in memory with the vault passphrase. "
        "Never returns plaintext; the row stays sealed — read-only."
    ),
    response_model=EntrySealedPayloadRead,
)
async def get_entry_sealed_payload(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntrySealedPayloadRead:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if row.encryption_mode != EncryptionMode.SEALED or not row.encrypted_payload:
        raise HTTPException(
            status_code=409,
            detail="This entry is not sealed.",
        )
    return EntrySealedPayloadRead(
        encrypted_payload_b64=b64encode(row.encrypted_payload).decode("ascii"),
    )


@router.delete(
    "/entries/{entry_id}",
    summary="Archive entry (soft-delete)",
    description="Sets deleted_at. Entry no longer appears in lists or stats. Restorable via PATCH (Phase 03+).",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_entry(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    from datetime import UTC, datetime as _dt
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user.id,
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    row.deleted_at = _dt.now(tz=UTC)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── v1-028: version history (FEATURES §2) ────────────────────────
#
# Revision writes live in ``theourgia.core.entries.revisions`` (the
# hooks above in update_entry / update_entry_body / publish_entry).
# These endpoints browse + restore. All three refuse sealed entries
# with 403 — sealed entries keep no server-readable history (same
# precedent as the sealed body-PATCH refusal; rationale documented in
# the core module).


class EntryRevisionListItem(BaseModel):
    """One row of ``GET /entries/{id}/revisions`` — list shape."""

    model_config = ConfigDict(extra="forbid")

    id: str
    revision_number: int
    created_at: datetime
    title: str
    body_excerpt: str


class EntryRevisionRead(BaseModel):
    """Full revision — ``GET /entries/{id}/revisions/{rev_id}``."""

    model_config = ConfigDict(extra="forbid")

    id: str
    revision_number: int
    created_at: datetime
    title: str
    body: str | None
    edit_summary: str | None


async def _get_owned_unsealed_entry(
    session: AsyncSession, entry_id: UUID, current_user_id: UUID
) -> Entry:
    stmt = select(Entry).where(
        Entry.id == entry_id,
        Entry.deleted_at.is_(None),
        Entry.owner_id == current_user_id,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if row.encryption_mode == EncryptionMode.SEALED:
        raise HTTPException(
            status_code=403,
            detail=(
                "This entry is sealed. Sealed entries keep no "
                "server-readable version history — plaintext snapshots "
                "would defeat the seal."
            ),
        )
    return row


@router.get(
    "/entries/{entry_id}/revisions",
    summary="List an entry's revisions",
    description=(
        "Newest-first version history. Snapshots are debounced to one "
        "per 10 minutes of editing (state transitions always snapshot); "
        "at most 200 are retained per entry, oldest pruned."
    ),
    response_model=list[EntryRevisionListItem],
)
async def list_entry_revisions(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[EntryRevisionListItem]:
    await _get_owned_unsealed_entry(session, entry_id, current_user.id)
    stmt = (
        select(EntryRevision)
        .where(EntryRevision.entry_id == entry_id)
        .order_by(EntryRevision.revision_number.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        EntryRevisionListItem(
            id=str(rev.id),
            revision_number=rev.revision_number,
            created_at=rev.created_at,
            title=rev.title_at_revision,
            body_excerpt=revision_excerpt(rev),
        )
        for rev in rows
    ]


async def _get_revision_of(
    session: AsyncSession, entry_id: UUID, revision_id: UUID
) -> EntryRevision:
    stmt = select(EntryRevision).where(
        EntryRevision.id == revision_id,
        EntryRevision.entry_id == entry_id,
    )
    rev = (await session.execute(stmt)).scalar_one_or_none()
    if rev is None:
        raise HTTPException(
            status_code=404, detail=f"Revision {revision_id} not found"
        )
    return rev


@router.get(
    "/entries/{entry_id}/revisions/{revision_id}",
    summary="Get one revision (full body)",
    response_model=EntryRevisionRead,
)
async def get_entry_revision(
    entry_id: UUID,
    revision_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRevisionRead:
    await _get_owned_unsealed_entry(session, entry_id, current_user.id)
    rev = await _get_revision_of(session, entry_id, revision_id)
    return EntryRevisionRead(
        id=str(rev.id),
        revision_number=rev.revision_number,
        created_at=rev.created_at,
        title=rev.title_at_revision,
        body=rev.body_at_revision,
        edit_summary=rev.edit_summary,
    )


@router.post(
    "/entries/{entry_id}/revisions/{revision_id}/restore",
    summary="Restore an entry to a revision",
    description=(
        "Never destructive: the CURRENT state is written as a new "
        "revision first, then the old content (title + body) is "
        "applied. Visibility, type, and publish state never "
        "time-travel."
    ),
    response_model=EntryRead,
)
async def restore_entry_revision(
    entry_id: UUID,
    revision_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> EntryRead:
    row = await _get_owned_unsealed_entry(session, entry_id, current_user.id)
    rev = await _get_revision_of(session, entry_id, revision_id)
    await restore_revision(session, row, rev, edited_by=current_user.id)
    await session.commit()
    await session.refresh(row)
    return _to_read(row)
