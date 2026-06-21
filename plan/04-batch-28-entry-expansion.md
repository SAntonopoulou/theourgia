# Phase 04 — Batch 28: Entry model expansion + revision history

> First Phase 04 batch. Extends the Phase 02 `entry` table from 5 kinds to 17 (5 legacy + 12 new), adds the visibility + encryption + temporal + body-state columns the rest of Phase 04 reads, and ships the `entry_revision` append-only history table.

## Substrate

`backend/theourgia/models/entries.py`:

- **`EntryType` enum expanded to 17 values**:
  - Phase 02 legacy: `observation`, `ritual`, `divination`, `synchronicity`, `capture` (preserved).
  - Phase 04 added: `note`, `ritual_log`, `dream`, `working`, `magical_record`, `pathworking`, `scrying`, `body_practice`, `meeting_note`, `study_note`, `liber_resh`, `blog_post`.

- **`EntryVisibility` enum**: `personal` (default) · `viewer` · `hub` · `public`.

- **`EncryptionMode` enum**: `none` (default — plaintext at rest, RLS protected) · `sealed` (client-encrypted zero-knowledge).

- **New columns on `entry`**:
  - `body_text` (denormalised plaintext for Postgres FTS in Batch 29).
  - `authored_by_persona_id` (FK to persona; wires multi-identity authoring in Batch 32).
  - `visibility`, `encryption_mode`, `encrypted_payload` (BYTEA for sealed payload).
  - `occurred_at`, `occurred_at_tz` (when the event actually happened vs `created_at`; IANA timezone alongside UTC).
  - `location_lat`, `location_lon` (optional; redacted on public visibility at the API layer).
  - `astro_snapshot`, `calendar_snapshot` (JSON text — auto-stamped via Phase 03 engine, opt-in).
  - `mood` (1–10), `energy` (1–10), `health_notes`.
  - `body_snapshot_id` (FK to be added when the body_snapshot table ships in Batch 34).
  - `parent_id` (self-FK for thread / reply relationships).
  - `scheduled_publish_at` (read by the Batch 33 Celery scheduler).

- **New `entry_revision` table**: append-only history, with `revision_number` unique per `entry_id`, snapshotting title / body / type / visibility plus an optional `edit_summary` and `edited_by` FK. The `/api/v1/entries/:id/revisions` endpoint lands in a follow-up; the table is ready now so the migration is settled.

## Migration

`backend/alembic/versions/0017_entry_phase04_expansion.py`:
- `ALTER TYPE entry_type ADD VALUE IF NOT EXISTS '…'` for each of the 12 new kinds.
- `CREATE TYPE entry_visibility` + `entry_encryption_mode`.
- `op.batch_alter_table("entry")` adds every new column.
- New indexes: `ix_entry_occurred_at`, `ix_entry_visibility`, `ix_entry_parent_id`, `ix_entry_scheduled_publish_at`, `ix_entry_authored_by_persona_id`, `ix_entry_body_snapshot_id`.
- `entry_revision` table created with `UniqueConstraint(entry_id, revision_number)`.
- **Backwards compatible**: every new column is nullable or has a server default; existing entry rows are untouched.

Downgrade reverses everything except the enum value additions — Postgres doesn't support `DROP VALUE`, and existing rows using the new kinds would be invalidated. The migration documents this honestly.

## API surface (entries router)

`backend/theourgia/api/routers/v1/entries.py` updated:
- `EntryTypeLiteral` expanded to all 17 kinds.
- `EntryVisibilityLiteral` + `EncryptionModeLiteral` added.
- `EntryRead` carries the Phase 04 fields as optionals (body, visibility, encryption_mode, occurred_at, occurred_at_tz, location_lat/lon, mood, energy, health_notes, parent_id, scheduled_publish_at).
- `EntryCreate` accepts the same set with Pydantic validation (mood/energy bounded 1–10; lat/lon bounded ±90 / ±180).
- `_to_read` populates from the model; `create_entry` writes through.
- Pre-Phase-04 client payloads still validate — every new field has a default.

## Tests

`backend/tests/test_entries_phase04.py` — 11 new tests:
- Discriminator coverage (all 12 Phase 04 kinds present; 5 legacy still valid; 17 total).
- Visibility + encryption enums.
- Default values (PERSONAL visibility, NONE encryption).
- Phase 04 column presence on the model class.
- Full Phase 04 payload round-trips through the Python model.
- `EntryRevision` class has all required fields + constructs cleanly.

**Full backend suite: 1130 tests pass** (+11 new; existing 1119 from Phase 03 still green).

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 Model + API ready; editor wire-up in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| Templates: built-ins ship, designer works, save/load works | ⏳ Batch 30 |
| Search: lexical + semantic + filter chips all functional | ⏳ Batch 29 |
| Body sensation diagram: full picker, save, embed, replay | ⏳ Batch 34 |
| Audio: record, play, store, transcribe | ⏳ Batch 34 |
| Library catalog: import/export tested with sample BibTeX | ⏳ Batch 31 |
| `/quote` autocite works end-to-end | ⏳ Batch 35 |
| Print export produces a beautiful PDF on a representative ritual log | ⏳ Batch 36 |
| Visibility downgrade flow has clear confirmations | 🟡 Schema ready; UI in Batch 35 + designer hand-off |
| Encryption: sealed entries verified zero-knowledge end-to-end | 🟡 Column + enum ready; client-side crypto in a future batch |
| Performance: 5,000-entry vault searchable in < 200ms | 🟡 Indexes added; benchmark in Batch 29 |
