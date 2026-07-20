"""Entry version-history tests — v1-028 · FEATURES §2.

Covers the four deliverables:

1. the debounced revision-write strategy (10-minute window; forced
   snapshots on visibility / publish transitions; 200-revision cap
   with oldest-pruned);
2. the browse + restore endpoints (registration, auth, shapes, the
   restore-writes-current-first invariant, restore never time-travels
   access control);
3. the sealed honest-behavior decision (sealed entries never snapshot;
   every revision endpoint refuses sealed with 403; any future
   seal-transition code path must purge plaintext revisions — enforced
   by a source scan);
4. router wiring order (snapshot the PRIOR state before mutation).

Uses the frozen-clock (explicit ``now=``) + fake-session patterns from
the memorial + wellbeing tests.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from inspect import getsource
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.routing import APIRoute

from theourgia.api.deps import get_current_user
from theourgia.api.routers.v1 import entries as entries_module
from theourgia.api.routers.v1.entries import (
    EntryRevisionListItem,
    EntryRevisionRead,
)
from theourgia.core.entries.revisions import (
    EXCERPT_LENGTH,
    MAX_REVISIONS_PER_ENTRY,
    REVISION_DEBOUNCE,
    maybe_snapshot_revision,
    purge_plaintext_revisions,
    restore_revision,
    revision_excerpt,
    snapshot_revision_guarded,
    tiptap_plain_text,
)
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryRevision,
    EntryType,
    EntryVisibility,
)

NOW = datetime(2026, 7, 20, 12, 0, tzinfo=UTC)

TIPTAP_BODY = (
    '{"type":"doc","content":[{"type":"paragraph","content":'
    '[{"type":"text","text":"The taper held its flame."}]}]}'
)


# ── Fakes ────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, scalar=None, rows=None) -> None:
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalar_one(self):
        return self._scalar

    def scalars(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None

    def all(self):
        return list(self._rows)

    @property
    def rowcount(self):
        return self._scalar or 0


def _int_param(stmt) -> int | None:
    """Extract the LIMIT value from a compiled statement's params."""
    for value in stmt.compile().params.values():
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    return None


class FakeSession:
    """Serves entry_revision selects from an in-memory list.

    Dispatches on the compiled SQL string — same approach as the
    memorial-sweep fakes.
    """

    def __init__(
        self,
        *,
        revisions: list[EntryRevision] | None = None,
        delete_rowcount: int = 0,
    ) -> None:
        self.revisions = sorted(
            revisions or [], key=lambda r: r.revision_number
        )
        self.added: list[EntryRevision] = []
        self.executed: list[str] = []
        self.delete_stmts: list[str] = []
        self.delete_rowcount = delete_rowcount

    async def execute(self, stmt):
        sql = str(stmt)
        self.executed.append(sql)
        if sql.startswith("DELETE"):
            self.delete_stmts.append(sql)
            return FakeResult(scalar=self.delete_rowcount)
        if "count(" in sql:
            return FakeResult(scalar=len(self.revisions))
        if "ORDER BY entry_revision.revision_number DESC" in sql:
            newest = self.revisions[-1] if self.revisions else None
            return FakeResult(rows=[newest] if newest else [])
        if "ORDER BY entry_revision.revision_number ASC" in sql:
            limit = _int_param(stmt)
            ids = [r.id for r in self.revisions]
            return FakeResult(rows=ids[:limit] if limit else ids)
        raise AssertionError(f"unexpected statement: {sql}")

    def add(self, obj) -> None:
        self.added.append(obj)


def make_entry(**overrides) -> Entry:
    defaults = {
        "title": "A working",
        "type": EntryType.NOTE,
        "excerpt": "",
        "glyph": "feather",
        "owner_id": uuid4(),
        "visibility": EntryVisibility.PERSONAL,
        "body": TIPTAP_BODY,
        "body_text": "The taper held its flame.",
    }
    defaults.update(overrides)
    return Entry(**defaults)


def make_revision(
    entry_id: UUID, number: int, created_at: datetime, **overrides
) -> EntryRevision:
    defaults = {
        "entry_id": entry_id,
        "revision_number": number,
        "title_at_revision": f"Title at rev {number}",
        "body_at_revision": TIPTAP_BODY,
        "body_text_at_revision": "The taper held its flame.",
        "type_at_revision": EntryType.NOTE,
        "visibility_at_revision": EntryVisibility.PERSONAL,
        "created_at": created_at,
    }
    defaults.update(overrides)
    return EntryRevision(**defaults)


# ── Write strategy: debounce ─────────────────────────────────────


@pytest.mark.asyncio
async def test_first_edit_writes_revision_number_one() -> None:
    entry = make_entry()
    session = FakeSession()
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is not None
    assert rev.revision_number == 1
    assert rev.title_at_revision == entry.title
    assert rev.body_at_revision == entry.body
    assert rev.body_text_at_revision == entry.body_text
    assert rev.visibility_at_revision == entry.visibility
    assert session.added == [rev]


@pytest.mark.asyncio
async def test_within_debounce_window_skips_write() -> None:
    """Auto-save every ~1 s must NOT write a revision per save."""
    entry = make_entry()
    recent = make_revision(entry.id, 1, NOW - timedelta(minutes=3))
    session = FakeSession(revisions=[recent])
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is None
    assert session.added == []


@pytest.mark.asyncio
async def test_after_debounce_interval_writes_next_number() -> None:
    entry = make_entry()
    old = make_revision(entry.id, 4, NOW - timedelta(minutes=11))
    session = FakeSession(revisions=[old])
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is not None
    assert rev.revision_number == 5


@pytest.mark.asyncio
async def test_exactly_at_boundary_writes() -> None:
    entry = make_entry()
    old = make_revision(entry.id, 1, NOW - REVISION_DEBOUNCE)
    session = FakeSession(revisions=[old])
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is not None


@pytest.mark.asyncio
async def test_force_bypasses_debounce() -> None:
    """Visibility / publish transitions always get a restore point."""
    entry = make_entry()
    recent = make_revision(entry.id, 1, NOW - timedelta(seconds=30))
    session = FakeSession(revisions=[recent])
    rev = await maybe_snapshot_revision(
        session, entry, now=NOW, force=True, edit_summary="Before publish"
    )
    assert rev is not None
    assert rev.revision_number == 2
    assert rev.edit_summary == "Before publish"


# ── Write strategy: cap + prune ──────────────────────────────────


@pytest.mark.asyncio
async def test_cap_prunes_oldest_revision() -> None:
    entry = make_entry()
    existing = [
        make_revision(entry.id, n, NOW - timedelta(days=1))
        for n in range(1, MAX_REVISIONS_PER_ENTRY + 1)
    ]
    session = FakeSession(revisions=existing)
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is not None
    assert rev.revision_number == MAX_REVISIONS_PER_ENTRY + 1
    # Exactly one DELETE, targeting the single oldest row.
    assert len(session.delete_stmts) == 1


@pytest.mark.asyncio
async def test_under_cap_never_prunes() -> None:
    entry = make_entry()
    existing = [
        make_revision(entry.id, 1, NOW - timedelta(hours=2)),
        make_revision(entry.id, 2, NOW - timedelta(hours=1)),
    ]
    session = FakeSession(revisions=existing)
    rev = await maybe_snapshot_revision(session, entry, now=NOW)
    assert rev is not None
    assert session.delete_stmts == []


# ── Sealed behavior ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_sealed_entry_never_snapshots_even_forced() -> None:
    """Sealed entries keep no server-side history — plaintext
    snapshots would defeat the seal, and there is no plaintext body
    to snapshot anyway."""
    entry = make_entry(
        encryption_mode=EncryptionMode.SEALED, body=None, body_text=None
    )
    session = FakeSession()
    rev = await maybe_snapshot_revision(session, entry, now=NOW, force=True)
    assert rev is None
    assert session.added == []
    # Refuses before touching the database at all.
    assert session.executed == []


@pytest.mark.asyncio
async def test_purge_deletes_every_revision() -> None:
    session = FakeSession(delete_rowcount=7)
    deleted = await purge_plaintext_revisions(session, uuid4())
    assert deleted == 7
    assert len(session.delete_stmts) == 1
    assert "entry_revision" in session.delete_stmts[0]


# Known SEALED assignments on NON-Entry rows. Extending this list is a
# conscious act: only add a file after confirming it never seals an
# ``Entry`` row (entries are the only model with a revision table).
_NON_ENTRY_SEAL_SITES = {
    # Talisman Mode B seal endpoint — seals ``Talisman`` rows
    # (``db.get(Talisman, ...)``); talismans keep no revision history.
    "api/routers/v1/talismans.py",
}


def test_seal_transition_must_purge_source_scan() -> None:
    """CONTRACT GUARD (honest behavior, v1-028): any code path that
    flips ``Entry.encryption_mode`` to SEALED must purge plaintext
    revisions in the same file. No server-side Entry seal transition
    exists today (sealing is a client-side flow); if one ever ships
    without calling ``purge_plaintext_revisions``, this test trips —
    the author must purge, or consciously allowlist a non-Entry site
    above."""
    package_root = Path(entries_module.__file__).parents[3]
    assert (package_root / "core").is_dir(), "unexpected package layout"
    assignment = re.compile(
        r"\.encryption_mode\s*=\s*EncryptionMode\.SEALED"
    )
    offenders: list[str] = []
    for path in package_root.rglob("*.py"):
        rel = path.relative_to(package_root).as_posix()
        if rel in _NON_ENTRY_SEAL_SITES:
            continue
        src = path.read_text(encoding="utf-8")
        if assignment.search(src) and "purge_plaintext_revisions" not in src:
            offenders.append(rel)
    assert offenders == [], (
        "Seal transitions must call purge_plaintext_revisions in the "
        f"same module (see core/entries/revisions.py): {offenders}"
    )


def test_revision_endpoints_refuse_sealed_source_guard() -> None:
    """All three revision endpoints route through the shared sealed
    gate; the gate 403s on SEALED (body-PATCH precedent)."""
    gate = getsource(entries_module._get_owned_unsealed_entry)
    assert "encryption_mode == EncryptionMode.SEALED" in gate
    assert "403" in gate
    for endpoint in (
        entries_module.list_entry_revisions,
        entries_module.get_entry_revision,
        entries_module.restore_entry_revision,
    ):
        assert "_get_owned_unsealed_entry" in getsource(endpoint)


# ── Restore ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_restore_writes_current_state_first() -> None:
    """The never-destructive invariant: the pre-restore state is
    snapshotted (forced, so the debounce cannot swallow it) before the
    old content is applied."""
    entry = make_entry(title="Current title", body='{"current":true}')
    target = make_revision(
        entry.id,
        3,
        NOW - timedelta(days=2),
        title_at_revision="Old title",
        body_at_revision='{"old":true}',
        body_text_at_revision="old text",
    )
    newest = make_revision(entry.id, 5, NOW - timedelta(seconds=10))
    session = FakeSession(revisions=[target, newest])

    snapshot = await restore_revision(session, entry, target, now=NOW)

    # Current state captured first — despite a 10-second-old revision.
    assert snapshot is not None
    assert snapshot.revision_number == 6
    assert snapshot.title_at_revision == "Current title"
    assert snapshot.body_at_revision == '{"current":true}'
    assert snapshot.edit_summary == "Before restore to revision 3"
    # Then the old content applied.
    assert entry.title == "Old title"
    assert entry.body == '{"old":true}'
    assert entry.body_text == "old text"


@pytest.mark.asyncio
async def test_restore_never_time_travels_access_control() -> None:
    """Restoring an old draft must not silently widen visibility or
    flip the type back."""
    entry = make_entry(
        visibility=EntryVisibility.PERSONAL, type=EntryType.DREAM
    )
    target = make_revision(
        entry.id,
        1,
        NOW - timedelta(days=30),
        visibility_at_revision=EntryVisibility.PUBLIC,
        type_at_revision=EntryType.NOTE,
    )
    session = FakeSession(revisions=[target])
    await restore_revision(session, entry, target, now=NOW)
    assert entry.visibility == EntryVisibility.PERSONAL
    assert entry.type == EntryType.DREAM


# ── Excerpt helpers ──────────────────────────────────────────────


def test_tiptap_plain_text_extracts_nested_text() -> None:
    assert tiptap_plain_text(TIPTAP_BODY) == "The taper held its flame."


def test_tiptap_plain_text_falls_back_to_raw_string() -> None:
    assert tiptap_plain_text("plain prose, not JSON") == (
        "plain prose, not JSON"
    )
    assert tiptap_plain_text(None) == ""
    assert tiptap_plain_text("") == ""


def test_revision_excerpt_prefers_body_text_and_truncates() -> None:
    rev = make_revision(
        uuid4(),
        1,
        NOW,
        body_text_at_revision="word " * 200,
    )
    excerpt = revision_excerpt(rev)
    assert len(excerpt) <= EXCERPT_LENGTH
    assert excerpt.endswith("…")
    short = make_revision(
        uuid4(), 1, NOW, body_text_at_revision="  short\n text  "
    )
    assert revision_excerpt(short) == "short text"


# ── Router surface ───────────────────────────────────────────────


REVISION_ROUTES = {
    ("/entries/{entry_id}/revisions", "GET"),
    ("/entries/{entry_id}/revisions/{revision_id}", "GET"),
    ("/entries/{entry_id}/revisions/{revision_id}/restore", "POST"),
}


def test_revision_endpoints_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in entries_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert REVISION_ROUTES.issubset(paths_methods)


def test_revision_endpoints_require_auth() -> None:
    for route in entries_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        for m in route.methods or set():
            if (route.path, m) not in REVISION_ROUTES:
                continue
            deps = route.dependant.dependencies
            calls = [d.call for d in deps]
            sub_names = [
                sub.call.__name__
                for d in deps
                for sub in d.dependencies
                if hasattr(sub.call, "__name__")
            ]
            assert (
                get_current_user in calls
                or "get_current_user" in sub_names
            ), f"{route.path} must require auth"


def test_list_item_shape() -> None:
    item = EntryRevisionListItem(
        id=str(uuid4()),
        revision_number=3,
        created_at=NOW,
        title="A title",
        body_excerpt="An excerpt",
    )
    dumped = item.model_dump()
    assert set(dumped) == {
        "id", "revision_number", "created_at", "title", "body_excerpt",
    }


def test_read_shape_carries_full_body() -> None:
    read = EntryRevisionRead(
        id=str(uuid4()),
        revision_number=3,
        created_at=NOW,
        title="A title",
        body=TIPTAP_BODY,
        edit_summary=None,
    )
    assert read.body == TIPTAP_BODY
    assert set(read.model_dump()) == {
        "id", "revision_number", "created_at", "title", "body",
        "edit_summary",
    }


# ── Failure isolation (guarded snapshot) ─────────────────────────


class ExplodingSession:
    """Every query fails — simulates a broken revision-history layer."""

    def __init__(self) -> None:
        self.added: list[EntryRevision] = []

    async def execute(self, stmt):
        raise RuntimeError("revision store is on fire")

    def add(self, obj) -> None:
        self.added.append(obj)


@pytest.mark.asyncio
async def test_guarded_snapshot_swallows_failures() -> None:
    """Auxiliary history must never break the primary write — the
    guarded variant returns None instead of raising (same
    failure-isolation pattern as apply_publish's AP broadcast)."""
    entry = make_entry()
    session = ExplodingSession()
    result = await snapshot_revision_guarded(session, entry, now=NOW)
    assert result is None


@pytest.mark.asyncio
async def test_restore_snapshot_failure_aborts_the_restore() -> None:
    """The pre-restore snapshot is the never-destructive invariant:
    if the current state cannot be saved, the restore must abort
    WITHOUT touching the entry — restore_revision is deliberately
    unguarded."""
    entry = make_entry(title="Current title")
    target = make_revision(
        entry.id, 1, NOW - timedelta(days=1), title_at_revision="Old title"
    )
    session = ExplodingSession()
    with pytest.raises(RuntimeError):
        await restore_revision(session, entry, target, now=NOW)
    assert entry.title == "Current title"


def test_write_hooks_are_guarded_and_restore_is_not() -> None:
    for endpoint in (
        entries_module.update_entry,
        entries_module.update_entry_body,
        entries_module.publish_entry,
    ):
        assert "snapshot_revision_guarded" in getsource(endpoint)
    # The core restore path calls the UNGUARDED snapshot.
    src = getsource(restore_revision)
    assert "maybe_snapshot_revision" in src
    assert "snapshot_revision_guarded" not in src


# ── Wiring order guards (snapshot the PRIOR state) ───────────────


def test_body_patch_snapshots_before_overwrite() -> None:
    src = getsource(entries_module.update_entry_body)
    snap = src.index("snapshot_revision_guarded")
    write = src.index("row.body = payload.body")
    assert snap < write, "snapshot must capture the PRIOR body"
    # Debounced (no force=) — the auto-save loop must not flood.
    assert "force" not in src.split("snapshot_revision_guarded")[1].split(")")[0]


def test_update_entry_snapshots_prior_state_and_forces_visibility() -> None:
    src = getsource(entries_module.update_entry)
    snap = src.index("snapshot_revision_guarded")
    assert snap < src.index("row.title = payload.title")
    assert "force=visibility_changing" in src


def test_publish_forces_a_revision() -> None:
    src = getsource(entries_module.publish_entry)
    assert "snapshot_revision_guarded" in src
    assert "force=True" in src
    assert src.index("snapshot_revision_guarded") < src.index("apply_publish(")


def test_restore_endpoint_routes_through_core() -> None:
    src = getsource(entries_module.restore_entry_revision)
    assert "restore_revision" in src
    assert "_get_revision_of" in src
