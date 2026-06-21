# Phase 06 — Batch 48: Pendulum · Bibliomancy · Horary · Scrying

> Fifth Phase 06 batch. Ships the four lightweight divination kinds
> in a single bundle. Each follows the "capture + interpret" shape
> rather than the "shuffle + draw" shape used by Tarot / I Ching /
> Geomancy / Runes. One Alembic migration (0029) creates all four
> tables; four routers keep the API boundary cleanly per-tool.

## Data layer

`backend/theourgia/models/divination_lite.py` ships all four models:

* `PendulumReading` — question + asked_at + outcome (yes / no /
  maybe / no_response) + optional confidence (1..5) + optional
  board image upload + optional board landing JSON + notes +
  calibration ("correct" / "incorrect" / "ambiguous" / NULL) +
  calibration_at.
* `BibliomancyReading` — question + optional book_id (FK to Book) +
  source_label + passage_kind (line / sentence / paragraph) + seed +
  drawn_at + drawn_passage + start_offset + passage_index +
  total_passages + interpretation.
* `HoraryReading` — question + asked_at + lat/lon + location_label
  + chart_snapshot (JSON projection from Phase 03 chart engine) +
  significator_querent + significator_quesited + perfection_notes +
  interpretation + retrospective rating / notes.
* `ScryingSession` — mode (water_bowl / black_mirror / crystal /
  fire / smoke / ink_in_water / candle_flame / other) + started_at +
  ended_at (NULL while in progress) + intention + preparation_notes
  + entity_id + vision_notes + symbols (JSONB list) + sketch upload +
  voice memo upload + planetary_hour snapshot.

Alembic 0029 creates all four tables + supporting enums
(`pendulum_outcome`, `bibliomancy_passage_kind`, `scrying_mode`).

## Bibliomancy engine

`backend/theourgia/core/divination/bibliomancy/engine.py`:

* `PassageKind` enum: `line` / `sentence` / `paragraph`.
* `Passage` dataclass: text + start_offset + kind + index + total.
* `split_text(source, kind)` — tolerant splitter: lines drop blanks,
  paragraphs split on blank lines, sentences split on `.?!` followed
  by whitespace.
* `bibliomancy_cast(source, seed, kind)` — deterministic passage
  picker. SHA-256 seed → `random.Random.randrange`. Falls back to
  the whole source when the requested granularity yields zero
  passages (a single-line poem can still be paragraph-bibliomanced).

The engine is pure: callers supply the source text directly. The
API router pulls source text from the request body — Book.full_text
is **not** in the current Book model, so users paste / upload text
inline at cast time. A follow-up data batch may add `Book.full_text`.

## HTTP surface

Four routers under `routers/v1/`:

| File | Endpoints |
|---|---|
| `pendulum.py` | CRUD + `GET /pendulum/calibration` (per-user accuracy tally) |
| `bibliomancy.py` | `POST /bibliomancy/cast` + CRUD over readings |
| `horary.py` | `POST /horary/cast` (composes Phase 03 `compute_chart`) + CRUD over readings |
| `scrying.py` | `POST /scrying/sessions` (start) + `POST /:id/end` + CRUD + `GET /scrying/symbol-index` |

Horary's `/cast` endpoint persists a compact `chart_snapshot` JSON
projection so list reads don't have to rerun the ephemeris. The
projection captures placements (body / sign / degree / longitude /
house / retrograde), houses cusps, aspects, ascendant + midheaven,
and the Swiss Ephemeris attribution.

Scrying sessions support a two-phase lifecycle: start now, end later
(with vision notes + extracted symbols + sketches). The
symbol-index endpoint returns `{symbol, count, session_ids}` rows
sorted by frequency — powers the cross-session "where else has this
symbol appeared?" lookup (shared with Phase 04 dream symbols).

## Tests

`backend/tests/test_divination_lite.py` — 30 tests:

* 7× bibliomancy engine — split semantics (line / paragraph /
  sentence / empty), determinism, divergence, in-source result,
  whole-source fallback, empty-source rejection, string-kind
  acceptance.
* 1× `Passage` dataclass shape.
* 4× pendulum payloads — minimal create, confidence 1..5 range,
  outcome enum, calibration summary.
* 2× bibliomancy router payloads — defaults, nonempty source.
* 3× horary router payloads — lat/lon ranges, question required,
  rating range.
* 4× scrying router payloads — session start defaults, mode enum,
  end-payload symbol list, symbol entry shape.
* 4× model class-shape sanity for all four models.
* 2× duration_seconds computation in scrying `_to_read`.

**Full backend suite: 1419 tests pass** (+30).

## Deferred (separate batches)

- **Book full-text storage** — add `Book.full_text` column so
  bibliomancy can reference catalog texts directly. Single-column
  migration; the router already takes book_id but uses inline text.
- **Horary perfection-condition computer** — a pure-logic module
  that walks `chart_snapshot` and reports the Hellenistic perfection
  conditions (application / translation of light / collection of
  light / prohibition / refranation). Composable; lands when the
  designer hands over horary interpretation UI.
- **Frontend wiring** — Divination workbench has scaffolding stages
  for each tool; designer's per-tool `.dc.html` (handoff_02 §5/10
  noted as deferred) unblocks the live wiring.
- **Scrying voice transcription** — when the voice memo substrate
  ships (Phase 04 Batch 34's voice integration is queued), scrying
  voice memos can flow through the same transcript engine.

## Phase 06 DoD status after this batch

| Item | Status |
|---|---|
| Tarot | ✅ Batch 44 |
| I Ching | ✅ Batch 45 |
| Geomancy | ✅ Batch 46 |
| Runes | ✅ Batch 47 |
| **Pendulum / Bibliomancy / Horary / Scrying** | **✅ data layer + engines + API (this batch)** |
| Practice logs (rituals, dreams, pathworking, asana, banishing) | ⏳ Batch 49 |
