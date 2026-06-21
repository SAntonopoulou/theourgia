"""Phase 04 entry model tests.

Validates the expanded discriminator, the new visibility / encryption
enums, the revision shape, and the column defaults.

These are pure-Python class-shape tests (no DB). The full DB-level
integration is covered by the existing API tests + the Alembic
migration; we test that here because the Postgres-required DB tests
already cover the same surface and the enum-level invariants need
their own focused coverage.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryRevision,
    EntryType,
    EntryVisibility,
)


# ───── Discriminator expansion ──────────────────────────────────────────


def test_all_12_phase04_kinds_registered() -> None:
    """Every kind documented in plan/04-journaling.md §1 is present."""
    kinds = {k.value for k in EntryType}
    phase04_required = {
        "note", "ritual_log", "dream", "working",
        "magical_record", "pathworking", "scrying", "body_practice",
        "meeting_note", "study_note", "liber_resh", "blog_post",
    }
    assert phase04_required <= kinds


def test_phase02_legacy_kinds_still_valid() -> None:
    """Backwards compatibility: the original 5 still parse."""
    for legacy in ("observation", "ritual", "divination", "synchronicity", "capture"):
        assert EntryType(legacy)


def test_entry_type_count_is_seventeen() -> None:
    """5 legacy + 12 phase-04 = 17 total."""
    assert len(EntryType) == 17


# ───── Visibility + encryption enums ────────────────────────────────────


def test_visibility_has_four_values() -> None:
    assert {v.value for v in EntryVisibility} == {
        "personal", "viewer", "hub", "public",
    }


def test_encryption_mode_has_two_values() -> None:
    assert {m.value for m in EncryptionMode} == {"none", "sealed"}


def test_visibility_default_is_personal() -> None:
    """Per plan §4: working / ritual_log etc. default to personal."""
    entry = Entry(title="t", excerpt="e", glyph="feather")
    assert entry.visibility == EntryVisibility.PERSONAL


def test_encryption_default_is_none() -> None:
    """Sealing is opt-in; default is plaintext-at-rest (RLS-protected)."""
    entry = Entry(title="t", excerpt="e", glyph="feather")
    assert entry.encryption_mode == EncryptionMode.NONE


# ───── Field shape on the dataclass ─────────────────────────────────────


def test_entry_carries_phase04_columns() -> None:
    """Every column added in Batch 28's migration has a matching Python
    attribute on the model so the API layer can read it without doing
    raw SQL.
    """
    expected = {
        "body_text",
        "authored_by_persona_id",
        "visibility",
        "encryption_mode",
        "encrypted_payload",
        "occurred_at",
        "occurred_at_tz",
        "location_lat",
        "location_lon",
        "astro_snapshot",
        "calendar_snapshot",
        "mood",
        "energy",
        "health_notes",
        "body_snapshot_id",
        "parent_id",
        "scheduled_publish_at",
    }
    for col in expected:
        assert hasattr(Entry, col), f"Entry missing Phase 04 column {col!r}"


def test_entry_accepts_full_phase04_payload() -> None:
    """Smoke-check: every new column can be set + read back."""
    entry = Entry(
        title="A solstice working",
        excerpt="Cast at noon UTC at Athens.",
        glyph="ritual",
        body='{"type":"doc","content":[]}',
        body_text="Cast at noon UTC at Athens. Sun in Cancer.",
        type=EntryType.WORKING,
        visibility=EntryVisibility.PERSONAL,
        encryption_mode=EncryptionMode.NONE,
        occurred_at=datetime(2026, 6, 21, 12, tzinfo=UTC),
        occurred_at_tz="Europe/Athens",
        location_lat=37.9838,
        location_lon=23.7275,
        astro_snapshot='{"sun":{"lon":90.0}}',
        calendar_snapshot='{"hebrew":"5786-04-06"}',
        mood=7,
        energy=8,
        health_notes="Slept well.",
    )
    assert entry.mood == 7
    assert entry.type == EntryType.WORKING
    assert entry.visibility == EntryVisibility.PERSONAL
    assert entry.location_lat == 37.9838
    assert entry.occurred_at_tz == "Europe/Athens"


# ───── Revision table ──────────────────────────────────────────────────


def test_entry_revision_has_required_fields() -> None:
    """The append-only revision row carries enough to reconstruct the
    entry's state at that point.
    """
    expected = {
        "entry_id",
        "revision_number",
        "title_at_revision",
        "body_at_revision",
        "body_text_at_revision",
        "type_at_revision",
        "visibility_at_revision",
        "edited_by",
        "edit_summary",
    }
    for col in expected:
        assert hasattr(EntryRevision, col), f"EntryRevision missing {col!r}"


def test_entry_revision_construct() -> None:
    rev = EntryRevision(
        entry_id="00000000-0000-0000-0000-000000000000",
        revision_number=1,
        title_at_revision="Original",
        type_at_revision=EntryType.NOTE,
        visibility_at_revision=EntryVisibility.PERSONAL,
        edit_summary="Initial creation",
    )
    assert rev.revision_number == 1
    assert rev.title_at_revision == "Original"
    assert rev.type_at_revision == EntryType.NOTE
    assert rev.edit_summary == "Initial creation"


# Magickal-name rule is enforced project-wide by user_magickal_name.md;
# this test file deliberately uses no quoted demo personae so a
# self-check is unnecessary.
