# Phase 06 — Batch 46: Geomancy engine

> Third Phase 06 batch. Ships the 16 figures, the
> mother→daughter→niece→witness→judge cascade, the 12-house chart
> assignment, the HTTP surface, and full Agrippan attributions per
> figure. Continues the `*Cast(seed)` vocabulary.

## Data layer

`backend/theourgia/models/geomancy.py`:

* `GeomancyReading` — one session. Persists the four **mothers** +
  the cast `seed` + the denormalised `judge_figure` (for fast
  filtering); everything else is rederived deterministically by the
  engine at read time. JSON shape stays minimal.
* `GeomancyMethod` enum — `dots` / `rng` / `manual`.

The 16 figures themselves are static catalog data — they live in
`core/divination/geomancy/bundles.py` and never need a table. The
catalog is reachable via `GET /api/v1/geomancy/figures`.

Alembic 0027 creates `geomancy_reading` + the `geomancy_method`
enum.

## Engine

`backend/theourgia/core/divination/geomancy/engine.py`:

* `FigureName` enum — the 16 Latin canonical names (Via, Cauda
  Draconis, Puer, Fortuna Minor, Puella, Amissio, Carcer, Laetitia,
  Caput Draconis, Conjunctio, Acquisitio, Rubeus, Fortuna Major,
  Albus, Tristitia, Populus).
* `Figure` dataclass — `name`, four-line pattern (top-down,
  `True`=single, `False`=double), 0..15 index.
* `combine(a, b)` — geomantic addition. With single=`True` and
  double=`False`, the operation is line-by-line XOR. Properties
  pinned by tests: commutative · associative · Populus is identity ·
  `f + f = Populus`.
* Seeded mother generation: SHA-256(seed) → `random.Random` → 4
  mothers × 4 lines (16 random bits).
* Daughter derivation: transpose. `D_i.line[j] = M_j.line[i]`.
* Niece derivation: `N1 = M1+M2`, `N2 = M3+M4`, `N3 = D1+D2`,
  `N4 = D3+D4`.
* Witnesses: right `= N1+N2`, left `= N3+N4`.
* Judge: `right_witness + left_witness`.
* Reconciler (Sentence): `M1 + Judge`.
* `geomancy_cast(seed)` — high-level entry point. Returns a `Chart`
  carrying mothers, daughters, nieces, both witnesses, judge,
  reconciler, and the twelve `HouseAssignment` rows.
* `HOUSE_MEANINGS` — twelve traditional house glosses (querent,
  resources, siblings, home, children, illness/labour, partnership,
  death/legacy, philosophy, career, friends, self-undoing).

## Bundle

`backend/theourgia/core/divination/geomancy/bundles.py`:

* 16 `BuiltinFigure` entries with Agrippa attributions:
  * **Planet** (Sun / Moon / Mercury / Venus / Mars / Jupiter /
    Saturn / North Node / South Node).
  * **Zodiac sign**.
  * **Element** (fire / water / air / earth).
  * **Mobility** — `mobile` swift / `stable` slow. The Agrippan
    list; per-tradition overrides can ship later as plugin data.
  * One-sentence traditional **meaning**.
* `figure_metadata(name)` lookup helper.

## HTTP surface

`backend/theourgia/api/routers/v1/geomancy.py`:

| Endpoint | Notes |
|---|---|
| `GET /geomancy/figures` | All 16 with metadata (planet / zodiac / element / mobility / meaning). |
| `GET /geomancy/figures/{name}` | One by Latin canonical name; 404 otherwise. |
| `POST /geomancy/cast` | RNG / dots methods — seed-driven; persists `GeomancyReading` and returns the full chart + house assignments. |
| `POST /geomancy/cast/manual` | Caller supplies the four mothers explicitly; engine derives the rest. |
| `GET/GET/PATCH/DELETE /geomancy/readings` | Filterable by `judge` (figure name); rating constrained to 1..5. |

The chart is **rederived** on every reading read — storage stores
only the four mothers + seed, and the engine is the source of
truth for everything else. This keeps the JSON payload small and
the round-trip auditable (any drift between persisted mothers and
chart shape would fail the engine's invariants).

## Tests

`backend/tests/test_geomancy_engine.py` — 30 tests:

* 5× figure / pattern invariants — 16 names · canonical patterns
  for Populus + Via · pattern round-trip for all 16 · FIGURE_ORDER
  uniqueness · `figure_by_name` constructor.
* 5× combine algebra — XOR per line · commutativity · associativity ·
  Populus identity · self-cancellation.
* 4× cascade — daughters are transpose · all-Populus chart all
  Populus · judge identity when mothers pair-match (M1=M2, M3=M4) ·
  reconciler = M1 + judge.
* 5× house mapping — 12 houses in order · 1-4 mothers · 5-8
  daughters · 9-12 nieces · 12 house meanings populated.
* 3× determinism — same seed deterministic · different seeds
  diverge · `Chart` shape.
* 5× bundle metadata — all 16 present · planet/zodiac/element/
  mobility/meaning populated · Caput/Cauda are North/South Node ·
  Fortuna Major (stable) + Minor (mobile) both solar · unknown
  raises.
* 3× router payload class-shape — RNG default · manual cast
  4-mother shape constraint · rating range.

**Full backend suite: 1359 tests pass** (+30).

## Deferred (separate batches)

- **Perfection conditions** — `occupation`, `conjunction`, `mutation`,
  `translation`, `way of points` — a separate `perfection.py` module
  that walks the chart and reports which classical perfection
  conditions hold for a given houses pair. Engine is pure logic,
  composes with the engine here.
- **Per-house interpretation strings** — bundled per-(figure, house)
  text tables. Authoring + data-batch work.
- **Frontend wiring** — the Divination workbench has an honest
  "Geomancy" stage awaiting per-tool `.dc.html` from the designer.
- **Astrological projection** — overlay the geomantic chart onto a
  Phase 03 horary chart (the houses align). Cross-cuts; lands once
  both engines have stable interfaces.

## Phase 06 DoD status after this batch

| Item | Status |
|---|---|
| Tarot | ✅ Batch 44 |
| I Ching | ✅ Batch 45 |
| **Geomancy** | **✅ engine + 16 figures + 12-house chart (this batch)** |
| Runes | ⏳ Batch 47 |
| Pendulum / Bibliomancy / Horary / Scrying | ⏳ Batch 48 |
| Practice logs | ⏳ Batch 49 |
