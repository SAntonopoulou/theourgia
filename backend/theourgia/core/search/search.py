"""Search service — composes the SQL for entry lookup with filters.

Designed to be call-site-clean: the request carries every filter as
typed fields, and :func:`search_entries` returns a typed result set.
The API layer's job is just to deserialize and serialize.

The actual FTS query uses Postgres's ``websearch_to_tsquery`` for
practitioner-friendly syntax: quotes for phrase matches, OR for
disjunction, ``-foo`` for negation. Without a query string the
search degrades to a filter-only listing (every NON-SEALED entry
matching the filter set, ordered by ``occurred_at`` desc).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryType,
    EntryVisibility,
)

__all__ = ["SearchHit", "SearchRequest", "SearchResults", "search_entries"]


@dataclass(frozen=True, slots=True)
class SearchRequest:
    """Inputs to :func:`search_entries`.

    Every filter is optional. Combining them is AND-semantics: kinds
    OR'd among themselves, then AND'd with the rest of the filters.
    """

    # The user's text query (Postgres websearch syntax).
    query: Optional[str] = None

    # Filter by entry kind(s). None = no kind filter.
    kinds: tuple[EntryType, ...] | None = None

    # Filter by visibility. None = the caller's authz-context default
    # (the API layer applies the user-vs-public default).
    visibilities: tuple[EntryVisibility, ...] | None = None

    # Restrict to a single owner. None = no owner filter (the API
    # layer typically sets this to the authenticated user's id).
    owner_id: Optional[UUID] = None

    # Date range filter on ``occurred_at`` (falls back to ``created_at``
    # when ``occurred_at`` is null on a row).
    occurred_after: Optional[datetime] = None
    occurred_before: Optional[datetime] = None

    # Tag / entity filters (composed in via subquery once the m2m
    # tables ship). Accept the ids; no-op until then.
    tag_ids: tuple[UUID, ...] = field(default_factory=tuple)
    entity_ids: tuple[UUID, ...] = field(default_factory=tuple)

    # Pagination.
    limit: int = 20
    offset: int = 0


@dataclass(frozen=True, slots=True)
class SearchHit:
    """One row in the result set.

    The ``rank`` is the FTS rank when a text query was supplied,
    NaN otherwise. The Entry instance is the full row — the caller
    can decide what to serialize.
    """

    entry: Entry
    rank: float
    matched_excerpt: Optional[str]


@dataclass(frozen=True, slots=True)
class SearchResults:
    hits: list[SearchHit]
    total: int  # total matching rows (before limit/offset)
    sealed_excluded_count: int = 0
    """How many sealed entries match the metadata filters (owner /
    visibility / kinds / date range) but were necessarily excluded —
    the server can't read their plaintext, so we can neither include
    them in the hits nor confirm whether they'd match the FTS query.
    The UI surfaces this as a calm count ("N sealed entries may also
    match — unlock the vault on this device"). Never red."""


async def search_entries(
    session: AsyncSession,
    request: SearchRequest,
) -> SearchResults:
    """Execute the request and return ranked hits.

    Sealed entries are never returned by this function — the API
    layer composes them in client-side after decrypting a candidate
    set (see ``feedback_quality_over_speed.md`` discussion of search
    over zero-knowledge content; full description in
    ``plan/04-journaling.md`` §5).
    """
    base = select(Entry).where(
        Entry.deleted_at.is_(None),
        Entry.encryption_mode == EncryptionMode.NONE,
    )

    # Kinds.
    if request.kinds:
        base = base.where(Entry.type.in_(list(request.kinds)))

    # Visibilities.
    if request.visibilities:
        base = base.where(Entry.visibility.in_(list(request.visibilities)))

    # Owner.
    if request.owner_id is not None:
        base = base.where(Entry.owner_id == request.owner_id)

    # Date range — coalesce occurred_at to created_at for rows that
    # haven't been backfilled.
    if request.occurred_after is not None:
        effective_when = func.coalesce(Entry.occurred_at, Entry.created_at)
        base = base.where(effective_when >= request.occurred_after)
    if request.occurred_before is not None:
        effective_when = func.coalesce(Entry.occurred_at, Entry.created_at)
        base = base.where(effective_when <= request.occurred_before)

    # Text query via Postgres FTS over the precomputed tsvector
    # (added in migration 0018). When absent, no rank — order by
    # most-recent.
    rank_col: object | None = None
    if request.query and request.query.strip():
        tsquery = func.websearch_to_tsquery("english", request.query)
        base = base.where(
            func.to_tsvector(
                "english",
                func.coalesce(Entry.title, "") + " " + func.coalesce(Entry.body_text, ""),
            ).op("@@")(tsquery),
        )
        rank_col = func.ts_rank_cd(
            func.to_tsvector(
                "english",
                func.coalesce(Entry.title, "") + " " + func.coalesce(Entry.body_text, ""),
            ),
            tsquery,
        )
        base = base.order_by(desc(rank_col))
    else:
        base = base.order_by(
            desc(func.coalesce(Entry.occurred_at, Entry.created_at)),
        )

    # Count the total before pagination.
    count_stmt = select(func.count()).select_from(base.subquery())
    total_row = await session.execute(count_stmt)
    total = int(total_row.scalar_one())

    paged = base.limit(request.limit).offset(request.offset)
    rows = await session.execute(paged)
    entries = rows.scalars().all()

    hits: list[SearchHit] = []
    for entry in entries:
        # Best-effort excerpt: first 240 chars of body_text containing
        # any of the query terms. Falls back to the stored excerpt.
        excerpt = entry.excerpt or (
            (entry.body_text or "")[:240] if entry.body_text else None
        )
        hits.append(SearchHit(entry=entry, rank=float("nan"), matched_excerpt=excerpt))

    # Count sealed entries that share the metadata filters — the
    # honest "N sealed may also match" signal. We can't apply the FTS
    # predicate (the server can't read the ciphertext), so this is the
    # *upper bound*: every sealed row in the user's scope matching
    # kind/visibility/owner/date range.
    sealed_base = select(func.count()).select_from(Entry).where(
        Entry.deleted_at.is_(None),
        Entry.encryption_mode == EncryptionMode.SEALED,
    )
    if request.kinds:
        sealed_base = sealed_base.where(Entry.type.in_(list(request.kinds)))
    if request.visibilities:
        sealed_base = sealed_base.where(
            Entry.visibility.in_(list(request.visibilities)),
        )
    if request.owner_id is not None:
        sealed_base = sealed_base.where(Entry.owner_id == request.owner_id)
    if request.occurred_after is not None:
        effective_when = func.coalesce(Entry.occurred_at, Entry.created_at)
        sealed_base = sealed_base.where(effective_when >= request.occurred_after)
    if request.occurred_before is not None:
        effective_when = func.coalesce(Entry.occurred_at, Entry.created_at)
        sealed_base = sealed_base.where(effective_when <= request.occurred_before)
    sealed_count = int((await session.execute(sealed_base)).scalar_one())

    return SearchResults(
        hits=hits, total=total, sealed_excluded_count=sealed_count,
    )
