# Phase 06 — Batch 49: Practice logs (closes Phase 06)

> Sixth and final Phase 06 batch. Closes the divination + practice
> phase with three focused additions: a Tree of Life paths catalog,
> a Liber-E-style body-practice tracker (asana + pranayama with
> cumulative aggregation), and a banishing / grounding log with
> cadence reporting.

## What's NOT in this batch (and why)

The plan's Phase 06 outline mentions ritual templates, dream
journal, and pathworking journey-log surfaces. These all ride
existing models:

* **Rituals** → `EntryType.RITUAL_LOG` + Phase 04 `EntryTemplate`
  (12 built-ins bundled, including LBRP, banishing, invocation,
  scrying, tarot-reading, pathworking templates).
* **Dreams** → `EntryType.DREAM` + the cross-entry symbol-index
  pattern (parallel to scrying's `/symbol-index` from Batch 48).
* **Pathworking journeys** → `EntryType.PATHWORKING` + the new
  paths catalog so the user can attach a journey to a specific
  path.
* **Workings** → `EntryType.WORKING`.

The Entry model already carries the columns these need
(`mood`, `energy`, `astro_snapshot`, `calendar_snapshot`, optional
`entity_id`, `parent_id`). Adding parallel tables would split the
journal pipeline without buying anything; the symbol index is the
only cross-entry concern that needs a query, and it's a single
endpoint on the scrying router (already shipped, generalisable).

This batch covers the three surfaces where a focused table earns
its keep.

## Data layer

`backend/theourgia/models/practice_logs.py`:

* `BodyPracticeSession` — `kind` (asana / pranayama / other) ·
  `posture_or_pattern` (free-form: "thunderbolt", "4-8-4-8") ·
  `started_at` · `duration_seconds` · `breaks_count` (Liber E
  refinement measure) · `observation_notes` · optional
  `body_snapshot_id` (cross-link to Phase 04 body diagram) ·
  optional `entry_id`.
* `BanishingMethod` enum — `lbrp` / `star_ruby` / `simple_ground` /
  `breath` / `water` / `salt` / `bell` / `incense` / `khephra` /
  `other`. Plugin extension via the `other` + `method_label` pair.
* `BanishingLog` — `method` + optional `method_label` ·
  `performed_at` · optional `duration_seconds` · `state_before` /
  `state_after` · `notes` · `correspondences` JSONB (moon phase,
  planetary hour, tradition tag).

Alembic 0030 creates both tables + their enums (`body_practice_kind`,
`banishing_method`).

## Tree of Life paths catalog

`backend/theourgia/core/practice/paths.py`:

* `TreeTradition` enum — Lurianic / Golden Dawn / Thelemic.
* `TreeOfLifePath` dataclass — number (11..32), Hebrew letter,
  letter name (transliteration), `connects` (sephirah pair),
  tradition-specific name, optional Tarot card slug, planet,
  element, color, deity associations, notes.
* `TREE_PATHS` tuple — 22 × 3 = 66 entries total.
* Golden Dawn bundle carries the full attribution set (Tarot trump,
  planet/element where applicable, color, deity associations from
  Hellenic + Egyptian + general practice).
* Thelemic bundle differs from Golden Dawn at Heh (15) and Tzaddi
  (28) per Liber AL II:24 ("Tzaddi is not the Star"): The Star
  attaches to Heh, The Emperor to Tzaddi.
* Lurianic bundle ships only what's truly Lurianic — Hebrew letter,
  ordinal, sephirah connection. Tarot, planets, etc. left None to
  reflect the older tradition without imposing later overlays.

Static data; no DB table.

## HTTP surface

`backend/theourgia/api/routers/v1/practice_logs.py` — single router
covering all three concerns:

| Endpoint | Notes |
|---|---|
| `GET /practice/paths` | All 66 paths across the three traditions. |
| `GET /practice/paths/{tradition}` | 22 paths for one tradition. |
| `POST /practice/body` + CRUD | Body practice session. |
| `GET /practice/body/totals` | Cumulative per-(kind, posture) duration + session count + break count. Liber-E-style metric the practitioner watches over weeks. |
| `POST /practice/banishing` + CRUD | Banishing log. |
| `GET /practice/banishing/cadence?window_days=` | Total count + days-with-banishing in the window. Returns a ratio (not a "streak") so the metric stays neutral. |

The cadence endpoint deliberately reports `days_with_banishing` +
ratio rather than a streak counter — per Phase 05 tone discipline,
no gamification. The practitioner watches their own cadence as
information, not as score.

## Tests

`backend/tests/test_practice_logs.py` — 20 tests:

* 9× Tree of Life paths catalog:
  - Three traditions × 22 paths.
  - Path numbers 11..32, Hebrew letters unique per tradition.
  - Golden Dawn first path = Aleph + Fool + Zeus association.
  - Lurianic paths have NO tarot attribution.
  - Thelemic Heh ↔ Tzaddi swap verified.
  - Total 66 path entries.
  - Unknown tradition raises.
  - Path connections within sephirah range.
* 5× body practice — kind enum · positive duration constraint ·
  default kind=asana · non-negative breaks · model columns present.
* 5× banishing log — method enum (10 values) · minimal payload ·
  invalid-method rejection · cadence response shape · model columns
  present.
* 1× path API payload helper round-trip.

**Full backend suite: 1439 tests pass** (+20).

## Phase 06 complete

| Item | Status |
|---|---|
| Tarot | ✅ Batch 44 |
| I Ching | ✅ Batch 45 |
| Geomancy | ✅ Batch 46 |
| Runes | ✅ Batch 47 |
| Pendulum / Bibliomancy / Horary / Scrying | ✅ Batch 48 |
| **Practice logs (body + banishing + paths)** | **✅ this batch** |
| Frontend wiring of per-tool deep UIs | 🟡 blocked on designer .dc.html files |

**Phase 06 backend: structurally complete.** Six batches, ~200
tests, six new Alembic migrations (0025-0030), seven new API router
files, three new core engine packages (`divination/tarot`,
`divination/iching`, `divination/geomancy`, `divination/runes`,
`divination/bibliomancy`, `practice`).

## Designer dependency summary

Phase 06 frontend wiring is queued behind designer handoff_02 §5/10
(per-tool deep UIs) + a future handoff for Phase 05 + 06 surfaces
already at `/home/sophia/designer_handoff_03.handoff` (Phase 05
relational ledger surfaces).

## Next phase

**Phase 07 — Workshop** (sigils, talismans, magic circles, tool
registry) is the natural next major phase. Designer-heavy; expect
substantial wait for `.dc.html` arrivals before frontend wiring.
Backend can advance the data models for sigil generation,
correspondence tables, and tool registry without designer
dependency.

Alternative: pause Phase 07+ until designer handoff cycle catches
up; backend has accumulated significant unwired surface that needs
frontend before it's user-facing.

## Daily practice tracker — future feature

Tracked separately in
`plan/future-daily-practice-tracker.md` +
`memory/project_daily_practice_tracker.md`. Awaits a future
`Daily Practice.dc.html` from the designer. Reuses the body-practice
+ banishing patterns from this batch + the Liber Resh dashboard
primitives from Phase 03.
