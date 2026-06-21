# Phase 05 — Batch 37: Entity expansion + alias-graph

> First Phase 05 batch. Extends the Phase 02 `entity` table to the full Phase 05 shape (11 new kinds · 6 relationship statuses · epithets · tradition_tags · attributions · seal/portrait FKs · contact timestamps · public/private notes · visibility · origin). Ships the settled alias-graph (`entity_alias` + `entity_view`) per plan/05 §11.

## Substrate

`backend/theourgia/models/entities.py`:

- **`EntityKind` enum expanded from 6 to 17** (preserving Phase 02 legacy values + adding god / goddess / daemon / angel / demon / saint / ancestor / beloved_dead / familiar / servitor / egregore).
- **`EntityRelationshipStatus`** — `open` (default) / `active` / `dormant` / `severed` / `contracted` / `observing`.
- **`EntityVisibility`** — `personal` (default) / `viewer` / `hub` / `public`.
- **`EntityAliasKind`** — `same-as` / `aspect-of` / `aspect-includes` / `syncretic-with` / `epithet-of`.
- **`Entity` table** — new columns: epithets, pronouns, gender, summary, tradition_tags, attributions (JSONB free-form correspondence table), seal_upload_id, portrait_upload_id, relationship_status, first_contact_at, last_contact_at, notes_private, notes_shareable, visibility, origin.
- **`EntityAlias` table** — typed relationships. Directed edge `source_entity_id` → `target_entity_id`. Symmetric kinds matched bidirectionally at query time; asymmetric ones honor direction.
- **`EntityView` table** — user-defined unified views (`Hekate-all`); `member_entity_ids` JSON array; aggregation done at query time, never by overwriting.

## Settled merge model invariants (per plan/05 §11)

The alias-graph data shape enforces these by construction:

1. **Entities are immutable nodes.** No merge operation rewrites IDs or content. `EntityAlias` is the only way to declare relationships.
2. **Imports never overwrite personal entities.** Bundles import entities with their own `origin` string ("bundle:hekate-working"); personal entities have `origin = "personal"` (or NULL).
3. **Workings / offerings / contracts attach to specific entity_id.** The alias-graph composes at *read* time via `EntityView`; write paths always pick one node.
4. **Aliases are typed.** `same-as` is the strongest claim; `syncretic-with` is the gentlest. The four kinds let a Hellenist say "Hekate-Soteira is an aspect-of Hekate" while a Goetic practitioner says they're "syncretic-with" each other.

## Migration

`backend/alembic/versions/0022_entity_phase05_expansion.py`:
- `ALTER TYPE entity_kind ADD VALUE` for each of the 11 new kinds.
- `CREATE TYPE entity_relationship_status / entity_visibility / entity_alias_kind`.
- `batch_alter_table("entity")` adds 14 new columns.
- New tables: `entity_alias` (3 indexes), `entity_view` (2 indexes).
- New indexes on entity: relationship_status, visibility, last_contact_at.

## Tests

`backend/tests/test_entities_phase05.py` — 13 tests:
- Enum coverage (all 17 EntityKind values; 6 relationship statuses; 4 visibilities; 5 alias kinds).
- Entity defaults (PERSONAL / OPEN / empty lists / empty attributions).
- Full Phase 05 payload round-trip.
- EntityAlias asymmetric (epithet-of) and symmetric (same-as) constructs.
- EntityView aggregation list.
- Immutability invariant (alias does not modify either entity).
- Origin provenance distinguishes bundle / personal.

**Full backend suite: 1196 tests pass** (+13 new).

## Phase 05 DoD status after this batch

| Item | Status |
|---|---|
| **Entity CRUD with all metadata + m2m** | **🟡 Model ✅; API expansion follows in Batch 38+** |
| Offerings, contracts, oaths, initiations, servitors — full lifecycles | ⏳ Batches 38-41 |
| Initiation records default sealed | ⏳ Batch 40 |
| Entity profile aggregates from all linked sources | 🟡 EntityView model ready; API aggregator in Batch 38 |
| /entity slash command with hover preview | ⏳ Batch 35 (Tiptap; designer hand-off) |
| Feeding reminders for servitors | ⏳ Batch 41 |
| Contract obligation reminders | ⏳ Batch 39 |
| Library catalog entity-tagging | ⏳ Batch 31 + follow-up |
| Privacy review for the phase | ⏳ Phase-completion gate |
