# Phase 04 — Batch 31: Library catalog expansion

> Extends the Phase 02 `book` table to the full Phase 04 shape (editor / edition / publisher / languages / status / holding / shelf_location / cover_image_url), adds `book_note` / `quote` / `reading_list` tables, and ships BibTeX + RIS import/export helpers.

## Substrate

`backend/theourgia/models/library.py`:
- `BookStatus` enum (`owned` / `reading` / `read` / `want` / `lent_out` / `unlisted`).
- `Holding` enum (`physical` / `digital` / `audiobook` / `none`).
- `Book` extended with the Phase 04 columns above.
- `BookNote` — per-book free-form notes, multiple per book; soft-delete; `page_reference` free-text.
- `Quote` — extracted quotations powering the `/quote` autocite slash command in the editor (Batch 35). `text`, `page_reference`, `language` (BCP-47), optional `image_url`.
- `ReadingList` — ordered reading queue / curriculum builder. `book_ids` as a comma-separated text column for v0 (proper join table when the drag-reorder UI lands).

`backend/theourgia/core/library/`:
- `bibtex.py` — `BibTexEntry` dataclass, `parse_bibtex` (tolerant parser), `book_to_bibtex` (writer with LaTeX-safe escapes).
- `ris.py` — `RisRecord` dataclass, `parse_ris`, `book_to_ris`.
- `__init__.py` — barrel.

The BibTeX parser is intentionally permissive — published `.bib` files use sloppy formatting and a strict reader is less useful than a forgiving one. The writer emits well-formed output for downstream tools.

## Migration

`backend/alembic/versions/0020_library_phase04_expansion.py`:
- `CREATE TYPE book_status` + `book_holding`.
- `batch_alter_table("book")` adds the 8 new columns.
- New tables: `book_note`, `quote`, `reading_list` with their indexes.

## Tests

`backend/tests/test_library_phase04.py` — 15 tests:
- 5 BibTeX (parse single + multiple; LaTeX escape tolerance; round-trip via Book; writer escapes `&`).
- 3 RIS (parse minimal book; round-trip via Book; multi-author via repeated `AU`).
- 4 model shape (Book Phase 04 columns; status enum; holding enum; defaults).
- 3 new-table construction (BookNote / Quote / ReadingList).

**Full backend suite: 1163 tests pass** (+15 new).

## Deferred

- **ISBN lookup** against Open Library — substrate-clean adds a `core/library/isbn.py` with `httpx` lookup + caching once the operator-keys substrate ships. Mocking it for offline operators is a follow-up.
- **CSV / JSON export** — trivial wrappers over the `book_to_*` shape once a designer hand-off settles the column ordering and header conventions.
- **Reading-list reorder UI + join table** — design hand-off + Phase 04 follow-up batch.
- **Open Library cover-image cache** — needs the uploads substrate (already shipped at the model level) + an admin task to refresh stale covers.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 API ready; editor in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| Templates: built-ins + designer + save/load | 🟡 Built-ins + save/load ✅; designer UI deferred |
| Search: lexical + filter chips | ✅ |
| Body sensation | ⏳ Batch 34 |
| Audio | ⏳ Batch 34 |
| **Library catalog: import/export tested with sample BibTeX** | **✅ (this batch — BibTeX + RIS round-trip)** |
| `/quote` autocite | 🟡 Data layer ✅; UI in Batch 35 |
| Print export | ⏳ Batch 36 |
| Visibility downgrade flow | 🟡 Schema ready; UI in Batch 35 |
| Encryption | 🟡 Column ready |
| Performance benchmark | 🟡 Indexes added |
