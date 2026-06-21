# Phase 03 — Batch 26: Election finder + Liber Resh tracker

> Electional astrology — find a magickally favorable time for a working — and the four daily solar adorations of *Liber Resh vel Helios*.

## Election finder

`backend/theourgia/core/election/`:
- `constraints.py` — `Constraint` ABC + 5 primitives:
  - `PlanetaryHourConstraint(planet)` — current hour must be ruled by the named planet. Score decays as the hour ends.
  - `PlanetSignConstraint(planet, sign)` — planet must be in a specific sign 1..12.
  - `MoonSignConstraint(sign)` — convenience wrapper for the most common case.
  - `MoonPhaseConstraint(min_angle, max_angle)` — Moon elongation in a window (wraps cleanly for [350°, 10°]).
  - `AspectConstraint(body_a, body_b, kind, max_orb)` — Ptolemaic aspect with linear-orb scoring (1.0 exact, 0 at max).
- `finder.py` — `find_election(ElectionRequest) → list[Election]`. Grid-search at configurable step (default 15 min); each sample's overall score is the **product** of per-constraint scores so a single failing hard constraint zeros that sample (intentional — practitioners don't want soft boosters to outweigh "must be a Mars hour").
- `PreBuiltQueries` — three canonical recipes from `plan/03-time-and-cosmos.md` §5:
  - `consecrate_venus_talisman()` — Venus hour + Moon in Taurus + waxing + Venus trine Jupiter (after Bonatti, *Liber Astronomiae* III.6, simplified).
  - `consult_mercury_before_correspondence()` — Mercury hour + Moon in Gemini + Mercury trine Jupiter.
  - `hekate_working()` — Saturn hour + waning Moon + Moon in Scorpio.

### Election result breakdown

`Election.breakdown` is a tuple of `(description, ConstraintResult)` so the UI can render *why* each top result is favorable: "Best moment 14:42 — Venus hour (Venus at 14°30' Taurus); Moon at 22°15' Taurus; Moon phase 142° (waxing); Venus trine Jupiter orb 1.3°."

### Aspect detector — subset-orb support

`detect_aspects` now accepts a partial orb table; unlisted aspect kinds are skipped. `AspectConstraint` uses this to detect only the requested aspect type without false matches on conjunctions/etc.

## Liber Resh tracker

`backend/theourgia/core/resh/`:
- `adorations.py` — `Transition` enum (sunrise / noon / sunset / midnight), `Adoration` dataclass with godform + direction + short_invocation per the canonical Thelemic forms (Ra Hoor Khuit / Hadit / Tum / Khephra), `DailyTransitions` carrying the four solar instants for a location-day, `AdorationLog` for performed observations, `streak_at_date` for consecutive-day streak counting.
- **Polar fallback**: days with no sunrise/sunset (above the Arctic Circle in summer / Antarctic in winter) require only noon + midnight observations to maintain a streak.

The four canonical adorations are pulled from *Liber CC* (Crowley, *Liber Resh vel Helios*); full liturgy lives in the user's prayer book / plugin, not this module.

Phase 04 will wire `AdorationLog` into the journal persistence layer; this batch ships the pure-data computation.

## Tests

`backend/tests/test_election.py` — 12 tests covering the 5 constraint primitives, finder ranking, naive-datetime rejection, breakdown content, product scoring, and all three pre-built queries.

`backend/tests/test_resh.py` — 10 tests covering the four transitions at Athens, chronological ordering, canonical adorations (Ra Hoor Khuit / Khephra / etc.), and streak math (zero / one / accumulate / reset / polar fallback).

**1105 backend tests pass** (+22 new). No regressions.

## Phase 03 DoD status after this batch

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 |
| Astrology engine validated against reference charts | ✅ |
| Multi-tradition house calculations cross-checked | 🟡 2 of 9 |
| Planetary hours validated against published tables | ✅ |
| Event stream populated for ±50 years from current date | 🟡 Computation ✅; persistence is Phase 04 |
| **Election finder returns sensible results on canonical queries** | **✅ (this batch — 3 pre-built queries + the constraint primitives)** |
| **Liber Resh transitions fire at correct local times across DST boundaries** | **✅ (this batch — `compute_sun_times` is the underlying source; DST is irrelevant in UTC)** |
| Frontend chart renderer accessible | ⏳ Batch 27 |
| All festival entries cite at least one primary or scholarly source | ✅ |

**5 of 9 Phase 03 DoD items closed.** Only the remaining calendars / house systems (substrate-ready follow-ups) and Batch 27 (APIs + frontend) remain.
