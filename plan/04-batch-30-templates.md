# Phase 04 — Batch 30: Entry templates

> 12 built-in scaffolds practitioners can pick from when starting a new entry. Personal / vault-shared / publishable scopes. Template-designer UI is a designer handoff (queued in designer_handoff_02.handoff once we have enough); this batch ships the data layer + API.

## Substrate

`backend/theourgia/models/templates.py`:
- `TemplateScope` enum (`personal` / `vault_shared` / `publishable`).
- `EntryTemplate` model: id, name, description, kind, scope, body_template (Tiptap JSON text), default_title_pattern, default_glyph, owner_id, tradition, license (SPDX).
- Soft-delete via the shared `SoftDeleteMixin`.

`backend/theourgia/core/templates/`:
- `builtins.py` — 12 `BuiltinTemplate` dataclasses + `seed_builtin_templates()` idempotent seeder.
- `__init__.py` — barrel.

## Migration

`backend/alembic/versions/0019_entry_template.py`:
- `CREATE TYPE template_scope AS ENUM (...)`.
- `entry_template` table with FKs to `user`, indexes on `owner_id` / `kind` / `scope` / `deleted_at`.
- Reuses the existing `entry_type` enum for the `kind` column.

## Built-in templates (12, per plan §3)

| Id | Kind | Tradition |
|---|---|---|
| magical-record | magical_record | thelemic |
| ritual-log | ritual_log | — |
| dream | dream | — |
| divination | divination | — |
| synchronicity | synchronicity | — |
| liber-resh | liber_resh | thelemic |
| banishing | ritual_log | — |
| invocation | working | — |
| scrying | scrying | — |
| tarot-reading | divination | — |
| pathworking | pathworking | — |
| astrology-reading | divination | — |

Each ships with:
- A descriptive `name` (e.g. "Magical Record (Crowley)").
- A 1-2 sentence `description`.
- A `body_template` — Tiptap JSON document with prompt placeholders rendered as ghosted text in the editor.
- A `default_title_pattern` (e.g. "Ritual — {date}").
- A `default_glyph` (matching the engraving sprite glyph naming).
- `license = "AGPL-3.0-only"` for built-ins (matches the project license).
- `scope = publishable` so they're visible to every caller.

## API

`backend/theourgia/api/routers/v1/templates.py`:
- `GET /api/v1/templates?scope=…&kind=…` — list visible to caller (built-ins + owner's personal + vault-shared/publishable).
- `GET /api/v1/templates/{id}` — single template (404 + auth gate).
- `POST /api/v1/templates` — create personal template (current_user becomes owner).
- `PATCH /api/v1/templates/{id}` — update (owner-only; built-ins refuse with 403).
- `DELETE /api/v1/templates/{id}` — soft delete (owner-only; built-ins refuse).

## Tests

`backend/tests/test_templates.py` — 13 tests:
- Built-in set is exactly the 12 documented.
- Every built-in has a stable kebab-case id and a unique name.
- Every body_template parses as JSON and is a valid Tiptap doc.
- `default_title_pattern` + `default_glyph` populated.
- Every built-in `kind` is a valid `EntryType`.
- `builtin_by_id` lookup + KeyError on unknown.
- Pydantic schemas validate min/max + reject unknown kinds.
- Router registers `/templates` + `/templates/{template_id}`.

**Full backend suite: 1148 tests pass** (+13 new).

## Deferred to designer / future batches

- **Template designer UI (drag-and-drop visual composer)** — explicit designer hand-off, queued for handoff #2. The data model + API are ready behind it.
- **Template marketplace** — Phase 14 (Plugin Ecosystem) ships the marketplace browse / publish surface. The `scope = publishable` + `license` columns are already in place.
- **Template versioning** — when a marketplace template is updated, users who installed the previous version need a migration path. Schema ready (`updated_at` exists); the migration UX is a future batch.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 API ready; editor in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| **Templates: built-ins ship, designer works, save/load works** | **🟡 Built-ins + save/load ✅; designer UI deferred to designer handoff** |
| Search: lexical + filter chips | ✅ |
| Body sensation | ⏳ Batch 34 |
| Audio | ⏳ Batch 34 |
| Library catalog | ⏳ Batch 31 |
| `/quote` autocite | ⏳ Batch 35 |
| Print export | ⏳ Batch 36 |
| Visibility downgrade flow | 🟡 Schema ready; UI in Batch 35 |
| Encryption | 🟡 Column ready; client crypto future batch |
| Performance benchmark | 🟡 Indexes added |
