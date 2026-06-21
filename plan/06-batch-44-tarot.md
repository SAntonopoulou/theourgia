# Phase 06 — Batch 44: Tarot engine

> Phase 06 opener. Ships the Tarot data model (deck / card / spread /
> tarot_reading), a deterministic seeded-shuffle engine, the bundled
> Rider-Waite-Smith public-domain deck, five bundled spreads
> (single · two three-card variants · Celtic Cross · Year Ahead), and
> the HTTP surface that drives the design-fidelity workbench at
> `frontend/admin/src/routes/Divination.tsx`.

## Data layer

`backend/theourgia/models/tarot.py`:

* `Deck` — name / slug / creator / license / language / tradition /
  reversal convention / art set / is_builtin.
* `Card` — `(deck_id, position)` unique; per-card slug, name, suit,
  arcana_number, upright + reversed meanings, correspondences (JSONB
  for planetary / elemental / decan / hebrew_letter / tree_of_life
  entries), per-language name translations.
* `Spread` — built-in or user-designed; positions list (each item
  `{index, name, meaning, x?, y?, rotation?}`), layout_json for
  custom-canvas spreads, is_builtin flag.
* `Reading` (`tarot_reading` table) — deck + spread + question +
  querent + draw_method + **seed** + drawn_cards (JSONB array of
  `{position_index, card_position, orientation, interpretation?}`) +
  overall_interpretation + retrospective_rating (1..5) +
  retrospective_notes + optional entry / entity / working FKs.

Alembic 0025 creates all four tables + the supporting enums
(`deck_tradition`, `card_suit`, `spread_kind`, `tarot_draw_method`).

## Engine — deterministic shuffle

`backend/theourgia/core/divination/tarot/engine.py`:

* `make_seed(*parts) -> str` — SHA-256 of tab-joined parts. Anchors
  the `hash_of_question` draw method.
* `shuffle_deck(deck_size, seed) -> list[int]` — seeded
  `random.Random.shuffle`. Same seed → same permutation.
* `draw_cards(deck_size, position_count, seed, reversals=True, orientation_bias=0.5) -> list[DrawnCard]`
  — primary primitive.
* `tarot_cast(...)` — high-level wrapper matching the plan's
  `*Cast(seed)` vocabulary.

The RNG is seeded via SHA-256 hashing of the seed string → 64-bit
integer → `random.Random`. The Python MT19937 state is well-defined
across builds, so seeds are portable.

## Bundled content

`backend/theourgia/core/divination/tarot/bundles.py`:

* **Rider-Waite-Smith** (PD): all 78 cards. 22 majors with Hebrew
  letter / planet / zodiac / Tree-of-Life-path correspondences from
  Waite's *Pictorial Key* (1910, PD). 56 minors with suit /
  element / rank metadata; per-rank upright + reversed gloss
  synthesised from the standard rank progression (Ace → seed; 10 →
  culmination; courts → maturity / authority). Long-form per-card
  interpretation is the user's via a per-card-notes table (next
  Tarot batch).
* **5 built-in spreads**: Single Card · Three Card (Past/Present/Future)
  · Three Card (Situation/Action/Outcome) · Celtic Cross · Year Ahead.
* `BUILTIN_DECKS` / `BUILTIN_SPREADS` tuples + `builtin_*_by_slug`
  lookup helpers. The seeder pattern (upsert at app startup) mirrors
  the entry-template built-ins; the actual upsert runs in a follow-up
  patch.

## HTTP surface

`backend/theourgia/api/routers/v1/tarot.py`:

| Endpoint | Notes |
|---|---|
| `GET/POST/GET/PATCH/DELETE /tarot/decks` | Built-in decks read-only; user decks editable by owner. |
| `GET/POST/DELETE /tarot/spreads` | Built-in spreads read-only. |
| `POST /tarot/cast` | The main event. Loads deck + spread, runs `tarot_cast`, persists `Reading` row + returns the expanded `DrawnCardRead` payload (each drawn card joined with its `Card` row + spread-position metadata). |
| `GET/PATCH/DELETE /tarot/readings` | Including `retrospective_rating` 1..5. |

The cast endpoint supports four draw methods:
* `browser_rng` — UUID-based seed.
* `hash_of_question` — `SHA256(timestamp + question)` via `make_seed`.
* `physical` — caller-supplied seed (treated as the user's free-form
  label for the physical session).
* `mental` — caller-supplied seed; the engine still runs but the
  reading is annotated as a chosen-by-intuition draw.

## Tests

`backend/tests/test_tarot_engine.py` — 40 tests:

* 3× `make_seed` — determinism, divergence, Unicode.
* 4× `shuffle_deck` — permutation property + same/different seeds +
  validation.
* 11× `draw_cards` — count, uniqueness within reading, determinism,
  reversal bias edge cases, validation.
* `tarot_cast` parity with `draw_cards`.
* 11× RWS bundle integrity — 78 cards · suit counts · contiguous
  positions · unique slugs · arcana_number on majors · correspondence
  keys present · meanings non-empty · PD license.
* 4× built-in spread shapes — counts + Celtic Cross 10 positions +
  Year Ahead 12 positions.
* 1× full integration: Celtic Cross with RWS via `tarot_cast` is
  deterministic.
* 1× model class-shape sanity check.
* 3× router payload class-shape — `CastRequest` defaults,
  `DeckCreate` non-empty cards, `ReadingUpdate` rating in [1..5].

**Full backend suite: 1292 tests pass** (+40).

## Deferred (separate batches)

- **Built-in seeder**: an Alembic data migration or startup task that
  upserts `BUILTIN_DECKS` + `BUILTIN_SPREADS` into the DB so the
  application ships with the RWS deck loaded. Trivial; lands when the
  product surface needs it.
- **Per-card user notes**: a `card_user_note` table letting users
  override built-in meanings without modifying the immutable bundle
  card rows.
- **Custom spread canvas designer**: the layout_json column already
  carries x/y/rotation; the drag-and-drop UI is designer work.
- **Additional bundled decks**: Marseille / Etteilla / Sola Busca —
  per the plan, all PD-eligible.
- **AI-assisted interpretation** (separate, opt-in): reading + question
  + cards → narrative. Routes through the agent integration substrate
  + BYO-keys (per `memory/project_ai_agent_integration.md`).

## Phase 06 DoD status after this batch

| Item | Status |
|---|---|
| Tarot engine | ✅ data layer + deterministic shuffle + bundled deck + HTTP |
| I Ching | ⏳ Batch 45 |
| Geomancy | ⏳ Batch 46 |
| Runes | ⏳ Batch 47 |
| Pendulum / Bibliomancy / Horary / Scrying | ⏳ Batch 48 |
| Practice logs (rituals / dreams / pathworking / asana / banishing) | ⏳ Batch 49 |
| Frontend wiring | 🟡 design-fidelity scaffolding already lives at `frontend/admin/src/routes/Divination.tsx`; live engine wiring is per-tool |
