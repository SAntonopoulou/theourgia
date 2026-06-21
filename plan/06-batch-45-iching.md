# Phase 06 — Batch 45: I Ching engine

> Second Phase 06 batch. Ships the I Ching data model + deterministic
> cast engine + all 64 King-Wen hexagrams + HTTP surface. Mirrors the
> Tarot batch shape: model + engine + bundle + API + tests + plan.

## Data layer

`backend/theourgia/models/iching.py`:

* `Hexagram` — King Wen number 1..64 · pinyin + English name ·
  6-char `binary_pattern` (bottom-up; `'1'` = yang) · lower + upper
  `Trigram` enum · judgment text · image text · 6 line texts · free-form
  `correspondences` JSONB.
* `IChingReading` — question · method (`three_coins` /
  `yarrow_stalks`) · **seed** · drawn_at · `lines[]` (6 strings,
  bottom-up, one of `old_yin` / `young_yang` / `young_yin` /
  `old_yang`) · primary + optional transformation hexagram number ·
  changing-line indices · interpretation · retrospective rating /
  notes · optional entry / entity / working FKs.
* `Trigram` enum: `qian` / `dui` / `li` / `zhen` / `xun` / `kan` /
  `gen` / `kun`. Stored on Hexagram for fast trigram-pair lookup;
  reused on future trigram-only surfaces.

Alembic 0026 creates both tables + the supporting enums (`trigram`,
`iching_cast_method`).

## Engine — deterministic cast

`backend/theourgia/core/divination/iching/engine.py`:

* `LineKind` — four values with `.is_yang` / `.is_changing` /
  `.value_number` properties (6/7/8/9 per tradition).
* `cast_three_coins(seed)` — six lines drawn from the canonical coin
  distribution: P(6) = 1/8, P(7) = 3/8, P(8) = 3/8, P(9) = 1/8.
* `cast_yarrow_stalks(seed)` — six lines drawn from the yarrow
  distribution: P(6) = 1/16, P(7) = 5/16, P(8) = 7/16, P(9) = 3/16.
  Static yin dominates; the two changing lines together are rarer
  than under coins — matches the tradition that "yarrow is the
  harder oracle to move".
* `iching_cast(seed, method)` — high-level dispatcher. Returns
  `CastResult(lines, primary_hexagram, transformation_hexagram,
  changing_lines, method)`.
* `hexagram_for_lines(lines)` / `lines_for_hexagram(number)` —
  King Wen lookup, full round-trip-safe over all 64.

The RNG primitive is the same as Tarot: SHA-256(seed) → 64-bit int →
`random.Random` → seeded draw from the cumulative distribution table.

**Changing-line semantics:** a primary hexagram is the six lines
as drawn (old_yin counted as yin, old_yang counted as yang). The
**transformation hexagram** is the same six lines with every
changing line flipped (old_yin → yang, old_yang → yin). Returned as
`None` when no lines change.

## Bundled content

`backend/theourgia/core/divination/iching/bundles.py`:

* 64 `BuiltinHexagram` entries — number, pinyin + English name,
  derived `binary_pattern` / `lines` / `lower_trigram` /
  `upper_trigram` (all computed from the engine's King Wen table),
  one-sentence `judgment_summary` + `image_summary` paraphrased
  from public-domain sources (Legge 1899 and pre-1923 PD material).
* `TRIGRAM_PATTERNS` — the eight bagua three-line patterns,
  bottom-up.
* `hexagram_by_number(n)` / `trigram_for_lines(lines)` lookup
  helpers.
* Long-form per-line text (six per hexagram) seeds via a follow-up
  data batch; this file ships the structure now so the engine + API
  are usable.

## HTTP surface

`backend/theourgia/api/routers/v1/iching.py`:

| Endpoint | Notes |
|---|---|
| `GET /iching/hexagrams` | All 64 in King Wen order; merges DB-seeded text with bundle defaults. |
| `GET /iching/hexagrams/{number}` | One hexagram, 1..64; 404 otherwise. |
| `POST /iching/cast` | Runs `iching_cast` and persists `IChingReading`; returns the lines + primary/transformation hexagram refs (name, pattern, trigram pair). |
| `GET/GET/PATCH/DELETE /iching/readings` | Standard CRUD over the reading log; `retrospective_rating` constrained to 1..5. |

The cast endpoint derives a seed from `SHA-256(timestamp || question
|| uuid)` when the caller doesn't supply one, so each cast is unique
yet reproducible from its `seed` field.

Bundle/engine consistency is verified at module import time via
`_verify_bundle_against_engine()` — drift on any binary pattern
fails fast.

## Tests

`backend/tests/test_iching_engine.py` — 37 tests:

* 3× `LineKind` invariants (polarity / changing / value numbers).
* 4× determinism — same seed deterministic; different seeds diverge;
  method dispatcher accepts enum + string.
* 2× empirical distribution — 1000-seed sweep verifies coin and
  yarrow probabilities within tolerance; yarrow asserts `P(8) >
  P(7)`.
* 6× King Wen lookup — hexagrams 1, 2, 11, 63, 64 spot-checked;
  full round-trip for all 64; uniqueness; LineKind input accepted;
  old lines counted pre-change.
* 2× validation — `lines_for_hexagram` rejects 0/65;
  `hexagram_for_lines` rejects non-6-length.
* 3× transformation hexagram — all-static produces None; any
  changing produces a flipped-pattern hexagram; manual one-line-flip
  matches engine output.
* 3× cast result invariants — method carried; changing line
  indices 1-based bottom-up; indices sorted ascending.
* 8× bundle integrity — 64 entries · 1..64 numbers · English
  names unique · binary patterns match engine · judgment summaries
  populated · trigram pairs valid · 8 bagua patterns · pinyin name
  collision noted (10/Lǚ vs 56/Lǚ).
* 4× router payload class-shape — cast request defaults;
  `ReadingUpdate` rating range.

**Full backend suite: 1329 tests pass** (+37).

## Deferred (separate batches)

- **Long-form per-line texts**: 384 short interpretations (six per
  hexagram). Authoring batch; the schema already accepts a 6-element
  `line_texts` JSONB array per hexagram row.
- **DB seeder**: an Alembic data migration or startup task that
  upserts `BUILTIN_HEXAGRAMS` into the `hexagram` table. Trivial; lands
  alongside the long-form text seed.
- **Per-hexagram user notes**: a `hexagram_user_note` table letting
  users override bundled meanings without modifying the immutable
  bundle rows.
- **Frontend wiring**: the Divination workbench has an honest "I
  Ching" stage at `frontend/admin/src/routes/Divination.tsx`
  awaiting engine wiring — straightforward when the designer's
  per-tool `.dc.html` lands.
- **Coin / stalk visual animation** in the frontend: presentational
  affordance; engine doesn't care.

## Phase 06 DoD status after this batch

| Item | Status |
|---|---|
| Tarot | ✅ engine + PD RWS bundle + API (Batch 44) |
| **I Ching** | **✅ engine + 64 hexagrams + API (this batch)** |
| Geomancy | ⏳ Batch 46 |
| Runes | ⏳ Batch 47 |
| Pendulum / Bibliomancy / Horary / Scrying | ⏳ Batch 48 |
| Practice logs | ⏳ Batch 49 |
