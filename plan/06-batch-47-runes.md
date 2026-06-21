# Phase 06 — Batch 47: Runes engine

> Fourth Phase 06 batch. Ships the rune model + multi-set schema +
> the seeded draw engine (which respects per-rune symmetry for
> reversal handling) + the Elder Futhark bundle (24 runes with
> Proto-Germanic names, aett groupings, elements, and per-rune
> upright + reversed meanings) + HTTP surface (sets + spreads +
> cast + readings).

## Data layer

`backend/theourgia/models/runes.py`:

* `RuneReading` — rune set choice + spread name + position count +
  cast seed + drawn runes (JSON list of `{position_index, rune_index,
  orientation}`) + interpretation + retrospective rating / notes +
  optional entry / entity / working FKs.
* `RuneSet` enum — `elder_futhark` / `younger_futhark` /
  `anglo_saxon_futhorc` / `armanen` / `northumbrian`.

The runes themselves are static catalog data. Alembic 0028 creates
`rune_reading` + the `rune_set` enum.

## Engine

`backend/theourgia/core/divination/runes/engine.py`:

* `RuneSet` (engine-side mirror of the model enum) · `RuneOrientation`
  (`upright` / `reversed`) · `DrawnRune` dataclass.
* `shuffle_runes(set_size, seed)` — seeded permutation of 0..N-1.
* `draw_runes(set_size, position_count, seed, reversible_flags,
  allow_reversals)` — the primary primitive. Each drawn rune flips
  with 50% probability **only if it is reversible**; symmetric runes
  (`reversible_flags[i] = False`) are forced upright regardless of
  the RNG roll.
* `runes_cast(...)` — high-level wrapper matching the
  `*Cast(seed)` vocabulary.

Same SHA-256 → 64-bit int → `random.Random` primitive as the other
engines.

## Bundle

`backend/theourgia/core/divination/runes/bundles.py`:

* `ELDER_FUTHARK` — all 24 runes with:
  * Proto-Germanic reconstructed name + Latin transliteration.
  * Unicode glyph from the Runic block (U+16A0..U+16FF).
  * Aett (1: Freyr's · 2: Heimdall's · 3: Tyr's) — 8 runes each.
  * Element (fire / earth / air / water) per traditional attribution.
  * `symmetric` flag — `True` for Gebo, Hagalaz, Isa, Jera, Ingwaz,
    Dagaz (the six runes whose glyphs are vertically symmetric).
  * Upright + reversed meanings — synthesised from PD sources (the
    Anglo-Saxon Rune Poem is c. 9-10th century PD; the Norwegian and
    Icelandic rune poems are also PD). Symmetric runes carry the
    canonical placeholder "no reversed reading" so the engine and UI
    can render them consistently.
* `BUILTIN_RUNE_SETS` tuple + `runeset_by_value(value)` lookup helper.
* `BuiltinRuneSet.reversible_flags` derives the flag tuple from the
  per-rune `symmetric` field so the engine call-site is one line.

Future bundle entries (Younger Futhark, Anglo-Saxon Futhorc,
Armanen, Northumbrian) ship in follow-up data batches — the engine
already handles any rune-set of any size.

## HTTP surface

`backend/theourgia/api/routers/v1/runes.py`:

| Endpoint | Notes |
|---|---|
| `GET /runes/sets` | All bundled sets with id/name/description/size. |
| `GET /runes/sets/{set_id}` | One set with full rune list. |
| `GET /runes/spreads` | Built-in spreads (single, three_rune, nine_rune_wyrd). |
| `POST /runes/cast` | Cast a reading. Hooks `runes_cast` with the bundle's reversible_flags. |
| `GET/GET/PATCH/DELETE /runes/readings` | CRUD. Filter by `rune_set`. Rating constrained 1..5. |

The cast endpoint persists `RuneReading` and returns the drawn
runes joined with their `Rune` metadata + spread-position metadata.

## Tests

`backend/tests/test_runes_engine.py` — 30 tests:

* 10× determinism — shuffle is a permutation, same/different seeds,
  primitive validation, count + uniqueness, `allow_reversals=False`.
* 3× symmetric-rune orientation — symmetric runes never flip when
  marked non-reversible; flag length validated; reversal probability
  exercised when all reversible.
* 9× Elder Futhark bundle integrity — 24 runes · indices 0..23 ·
  aetts split 8/8/8 · canonical names present · symmetric set
  exactly {Gebo, Hagalaz, Isa, Jera, Ingwaz, Dagaz} · symmetric
  reversed-meaning placeholder · reversible property inversion ·
  reversible_flags align with rune order · every rune has glyph +
  transliteration + element + upright_meaning.
* 2× bundle lookups — by enum value + by string; unknown set raises.
* 2× integration — end-to-end cast via bundle reversible_flags;
  symmetric rune always upright in 200-seed search.
* 4× router payload class-shape — cast request defaults,
  ReadingUpdate rating range, built-in spread counts, bundle
  non-empty.

**Full backend suite: 1389 tests pass** (+30).

## Deferred (separate batches)

- **Additional rune sets** — Younger Futhark, Anglo-Saxon Futhorc,
  Armanen, Northumbrian. Pure data; no engine work.
- **Per-rune user notes** — `rune_user_note` table for the user to
  override bundle meanings without modifying the immutable catalog.
- **Bind-rune designer** — UI feature; users combine multiple runes
  into a single sigil. The Phase 07 Workshop area is the natural
  home; the rune catalog here is the data source.
- **Custom spread designer** — same shape as the Tarot custom spread
  designer; lands once the designer's `.dc.html` for spread layouts
  arrives.
- **Merkstave** orientation — a "dark stave" reading sometimes used
  for runes drawn upright in difficult spread positions. That's
  reading-context, not engine; lives in the interpretation layer.

## Phase 06 DoD status after this batch

| Item | Status |
|---|---|
| Tarot | ✅ Batch 44 |
| I Ching | ✅ Batch 45 |
| Geomancy | ✅ Batch 46 |
| **Runes** | **✅ engine + Elder Futhark bundle + spreads + API (this batch)** |
| Pendulum / Bibliomancy / Horary / Scrying | ⏳ Batch 48 |
| Practice logs | ⏳ Batch 49 |
