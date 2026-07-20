"""Entry revision snapshots — version history (v1-028 · FEATURES §2).

The ``entry_revision`` table (alembic 0017) existed with zero writers.
This module is the ONE write path for revisions; the HTTP endpoints in
``theourgia.api.routers.v1.entries`` stay thin and route through here.

Write strategy (documented per the batch spec):

* Snapshots capture the **prior** state of an entry — callers MUST
  invoke :func:`maybe_snapshot_revision` *before* mutating the row.
* The Editor auto-save PATCHes ``/entries/{id}/body`` roughly every
  second while the user types. Writing a revision per auto-save would
  flood the table with near-identical rows, so writes are debounced:
  a new revision is only written when the newest existing revision is
  older than :data:`REVISION_DEBOUNCE` (10 minutes) — **except** when
  ``force=True``, which callers pass for meaningful state transitions
  (visibility change, publish) and for the pre-restore snapshot.
* At most :data:`MAX_REVISIONS_PER_ENTRY` (200) revisions are retained
  per entry; the oldest (lowest ``revision_number``) are pruned on
  write. Revision numbers monotonically increase and are never reused
  (the table has a UNIQUE (entry_id, revision_number) constraint).

Sealed entries (honest-behavior decision, documented):

* A sealed entry's plaintext never exists server-side — ``body`` is
  ``None`` and the ciphertext lives in ``encrypted_payload``. Version
  history is a *plaintext* feature; keeping (or serving) plaintext
  snapshots of a now-sealed entry would silently defeat the seal.
* Therefore: sealed entries never get new revisions (this module
  refuses), every revision endpoint refuses sealed entries with 403
  (same precedent as the sealed body-PATCH refusal), and any future
  code path that transitions ``Entry.encryption_mode`` to ``SEALED``
  MUST call :func:`purge_plaintext_revisions` in the same transaction.
  There is no server-side seal-transition endpoint today (sealing is
  a client-side flow); ``tests/test_entry_revisions.py`` carries a
  source-scan regression guard that trips if one ever ships without
  the purge.

Restores are never destructive: :func:`restore_revision` writes the
CURRENT state as a new (forced) revision first, so a restore can
itself be restored away. Restore applies *content* only — title,
body, body_text. Visibility, type, and publish state deliberately do
NOT time-travel: restoring an old draft must never silently widen who
can read the entry.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import delete, func, select

from theourgia.models.entries import EncryptionMode, Entry, EntryRevision

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "EXCERPT_LENGTH",
    "MAX_REVISIONS_PER_ENTRY",
    "REVISION_DEBOUNCE",
    "maybe_snapshot_revision",
    "purge_plaintext_revisions",
    "restore_revision",
    "revision_excerpt",
    "snapshot_revision_guarded",
    "tiptap_plain_text",
]

_log = logging.getLogger(__name__)

# Auto-save fires every ~1 s; one revision per ten minutes of active
# editing keeps history useful without flooding the table.
REVISION_DEBOUNCE = timedelta(minutes=10)

# Retention cap per entry — oldest pruned on write.
MAX_REVISIONS_PER_ENTRY = 200

# List-endpoint excerpt length (characters of extracted plaintext).
EXCERPT_LENGTH = 240


def tiptap_plain_text(body: str | None) -> str:
    """Extract concatenated text from a Tiptap-JSON string.

    Best-effort: on any parse failure the raw string is returned (old
    rows may carry plain prose instead of Tiptap JSON).
    """
    if not body:
        return ""
    try:
        doc = json.loads(body)
    except (ValueError, TypeError):
        return body

    parts: list[str] = []

    def _walk(node: object) -> None:
        if isinstance(node, dict):
            text = node.get("text")
            if isinstance(text, str):
                parts.append(text)
            _walk(node.get("content"))
        elif isinstance(node, list):
            for child in node:
                _walk(child)

    _walk(doc)
    return " ".join(p for p in (s.strip() for s in parts) if p)


def revision_excerpt(revision: EntryRevision) -> str:
    """Short plaintext preview for the revision-list endpoint."""
    text = revision.body_text_at_revision or tiptap_plain_text(
        revision.body_at_revision
    )
    collapsed = " ".join(text.split())
    if len(collapsed) <= EXCERPT_LENGTH:
        return collapsed
    return collapsed[: EXCERPT_LENGTH - 1].rstrip() + "…"


async def _latest_revision(
    session: AsyncSession, entry_id: UUID
) -> EntryRevision | None:
    stmt = (
        select(EntryRevision)
        .where(EntryRevision.entry_id == entry_id)
        .order_by(EntryRevision.revision_number.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def _prune_oldest(session: AsyncSession, entry_id: UUID) -> int:
    """Prune oldest revisions beyond the retention cap.

    Called after a new (not-yet-flushed) revision was added, so the
    persisted count plus one is the effective total.
    """
    count_stmt = (
        select(func.count())
        .select_from(EntryRevision)
        .where(EntryRevision.entry_id == entry_id)
    )
    persisted = int((await session.execute(count_stmt)).scalar_one() or 0)
    overflow = (persisted + 1) - MAX_REVISIONS_PER_ENTRY
    if overflow <= 0:
        return 0
    ids_stmt = (
        select(EntryRevision.id)
        .where(EntryRevision.entry_id == entry_id)
        .order_by(EntryRevision.revision_number.asc())
        .limit(overflow)
    )
    doomed = list((await session.execute(ids_stmt)).scalars().all())
    if not doomed:
        return 0
    await session.execute(
        delete(EntryRevision).where(EntryRevision.id.in_(doomed))
    )
    return len(doomed)


async def maybe_snapshot_revision(
    session: AsyncSession,
    entry: Entry,
    *,
    edited_by: UUID | None = None,
    now: datetime | None = None,
    force: bool = False,
    edit_summary: str | None = None,
) -> EntryRevision | None:
    """Snapshot ``entry``'s CURRENT (pre-mutation) state as a revision.

    Call BEFORE applying the incoming change. Returns the new revision,
    or ``None`` when the write was debounced away or the entry is
    sealed. Adds to the session without committing — the caller owns
    the transaction.

    ``force=True`` bypasses the 10-minute debounce; pass it for
    visibility changes, publish transitions, and pre-restore snapshots.
    """
    if entry.encryption_mode == EncryptionMode.SEALED:
        # Honest behavior: no plaintext history for sealed entries —
        # and a sealed entry has no server-side plaintext to snapshot.
        return None
    now = now or datetime.now(tz=UTC)
    latest = await _latest_revision(session, entry.id)
    if latest is not None and not force:
        latest_at = latest.created_at
        if latest_at.tzinfo is None:
            latest_at = latest_at.replace(tzinfo=UTC)
        if now - latest_at < REVISION_DEBOUNCE:
            return None
    revision = EntryRevision(
        entry_id=entry.id,
        revision_number=(latest.revision_number + 1) if latest else 1,
        title_at_revision=entry.title,
        body_at_revision=entry.body,
        body_text_at_revision=entry.body_text,
        type_at_revision=entry.type,
        visibility_at_revision=entry.visibility,
        edited_by=edited_by,
        edit_summary=edit_summary,
    )
    session.add(revision)
    await _prune_oldest(session, entry.id)
    return revision


async def snapshot_revision_guarded(
    session: AsyncSession,
    entry: Entry,
    *,
    edited_by: UUID | None = None,
    now: datetime | None = None,
    force: bool = False,
    edit_summary: str | None = None,
) -> EntryRevision | None:
    """Failure-isolated :func:`maybe_snapshot_revision`.

    Version history is auxiliary — a snapshot failure must never break
    the primary write (auto-save body PATCH, entry PATCH, publish).
    Same failure-isolation pattern as ``apply_publish``'s AP broadcast.

    Deliberately NOT used by :func:`restore_revision`: there the
    pre-restore snapshot IS the never-destructive invariant, and a
    failure must abort the restore (if the current state cannot be
    saved, it must not be overwritten).
    """
    try:
        return await maybe_snapshot_revision(
            session,
            entry,
            edited_by=edited_by,
            now=now,
            force=force,
            edit_summary=edit_summary,
        )
    except Exception:  # noqa: BLE001 — history must never break the write
        _log.warning(
            "entries.revision.snapshot_failed",
            extra={"entry_id": str(entry.id)},
            exc_info=True,
        )
        return None


async def restore_revision(
    session: AsyncSession,
    entry: Entry,
    revision: EntryRevision,
    *,
    edited_by: UUID | None = None,
    now: datetime | None = None,
) -> EntryRevision | None:
    """Restore ``entry`` to ``revision`` — never destructive.

    Order matters and is the core invariant: the CURRENT state is
    written as a new forced revision FIRST, then the old content is
    applied. Content only (title / body / body_text) — visibility,
    type, and publish state never time-travel (see module docstring).
    Caller commits.
    """
    snapshot = await maybe_snapshot_revision(
        session,
        entry,
        edited_by=edited_by,
        now=now,
        force=True,
        edit_summary=(
            f"Before restore to revision {revision.revision_number}"
        ),
    )
    entry.title = revision.title_at_revision
    entry.body = revision.body_at_revision
    entry.body_text = revision.body_text_at_revision
    return snapshot


async def purge_plaintext_revisions(
    session: AsyncSession, entry_id: UUID
) -> int:
    """Delete every revision of ``entry_id``. Returns the count.

    MUST be called (same transaction) by any code path that flips
    ``Entry.encryption_mode`` to ``SEALED`` — pre-seal plaintext
    snapshots surviving the seal would silently defeat it. No such
    server-side transition exists today; a source-scan regression
    guard in ``tests/test_entry_revisions.py`` enforces this contract
    on any future one.
    """
    result = await session.execute(
        delete(EntryRevision).where(EntryRevision.entry_id == entry_id)
    )
    rowcount = getattr(result, "rowcount", 0) or 0
    return int(rowcount)
