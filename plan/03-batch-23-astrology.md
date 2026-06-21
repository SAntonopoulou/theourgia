# Phase 03 — Batch 23: Astrology engine (Swiss Ephemeris)

> Wraps `pyswisseph` for chart calculation. Multi-tradition by default: same chart can be queried with tropical or sidereal zodiac, with Placidus or Whole Sign houses, with modern or Hellenistic aspect rules. Attribution baked in.

## Substrate

`backend/theourgia/core/astro/`:
- `__init__.py` — barrel export.
- `attribution.py` — the mandatory Swiss Ephemeris + JPL DE441 credit string, used by chart results, the docs credits page, and the chart renderer footer.
- `bodies.py` — canonical body set (Sun → Pluto + Mean Lunar Node + Mean Apogee + 4 asteroids). Pluggable: `register_body(Body)` lets a plugin extend the set without core changes.
- `zodiac.py` — `Zodiac` (tropical/sidereal), `Ayanamsa` (Lahiri / Krishnamurti / Fagan-Bradley / Raman / Yukteshwar), `sign_of(longitude)` helper returning `(sign_index, sign_name, glyph, degree_in_sign)`.
- `houses.py` — `HouseSystem` (Placidus + Whole Sign this batch; the other 7 land in follow-ups), `compute_houses(jd, lat, lon, system)` returning a `Houses` dataclass with all 12 cusps + ASC/MC/ARMC/Vertex.
- `aspects.py` — Ptolemaic aspect detector with a configurable orb table. Default orbs target modern moderate values; Hellenistic / Cosmobiological orbs land via plugin shadow.
- `chart.py` — `compute_chart(ChartRequest) → ChartResult`. Returns every body's tropical + sidereal placement, the houses, the angles, and every detected aspect.

## Ephemeris strategy

- **Default: `FLG_MOSEPH`** — Astrodienst's built-in Moshier analytical ephemeris. ~arcsec accuracy, no data files required. Works out of the box.
- **Asteroid bodies (Chiron, Ceres, Pallas, Vesta)** require Astrodienst's `seas_*.se1` files, which aren't part of the Moshier pack. The chart computer **gracefully degrades**: asteroid calc raises `swisseph.Error`, we catch it and skip the body. Planets, lunar node, lunar apogee always populate.
- **Operator opt-in to the asteroid pack**: drop `seas_*.se1` files into `backend/data/ephe/` (path passed to `swe.set_ephe_path` at app boot — wired in a later batch).
- **Future: `FLG_SWIEPH`** — when the operator ships the full Astrodienst `.se1` pack (50MB for 1800–2400), the computer switches flag and returns sub-arcsec precision.

## Attribution invariant

Mandatory under the AGPL-3.0 path of Swiss Ephemeris's dual license:

```
Astrological calculations powered by Swiss Ephemeris by Astrodienst AG (https://www.astro.com/swisseph/).
Ephemeris data derived from the JPL DE441 planetary ephemeris (NASA / Jet Propulsion Laboratory / California Institute of Technology).
```

- Carried on every `ChartResult.attribution`.
- CI test (`test_chart_result_carries_attribution`) asserts the string is present in any chart output.
- Rendered as a footer in the chart SVG (frontend, Batch 27).
- Hard-coded in the docs credits page (Batch 27).

## Tests

`backend/tests/test_astro.py` — 17 tests:
- 2 astronomical anchors (summer solstice → Cancer ingress, autumnal equinox → Libra ingress, both for Athens at 2026 reference dates).
- 4 placement-coverage tests (every planet present; tropical vs sidereal differ by ~24° Lahiri ayanāṃśa; house assignments in 1..12; retrograde detection matches speed sign).
- 3 house tests (Placidus default returns 12 valid cusps; Whole Sign cusps are exactly 30° apart; ASC + MC present).
- 3 aspect-detector tests (conjunction, opposition, out-of-orb exclusion).
- 3 `sign_of` tests (Aries at 0°, wrap at 360°, negative modulo).
- 1 attribution test (mandatory credit present in result).
- 1 input-validation test (naive `datetime` rejected).

Full backend suite: **1045 tests pass** (+17 new). No regressions.

## Defer to later batches

- **Full `.se1` ephemeris ship** — operator-deployable pack lands in Batch 24 alongside the planetary-hour sunrise/sunset work (both depend on the same ephemeris).
- **Remaining house systems** — Koch, Regiomontanus, Campanus, Equal, Porphyry, Alcabitius, Sripati (Batch 26 alongside the election finder; many use the same Swiss Ephemeris codes via `swe.houses` so they're a small extension).
- **Saved chart storage** — DB schema + persistence model lands when Phase 04 (Journaling) hooks up the entry-stamps-chart relationship.
- **Aspect families** — harmonic + midpoint detectors are a clean follow-up; the existing dataclass already accommodates them.
- **Hellenistic time-lord techniques** — zodiacal releasing, profections, ascensions are their own substantial chunk.
- **Vedic vargas** — divisional charts D1, D9, D10 etc. require their own per-chart computation; they reuse the sidereal placements this batch produces.

## Phase 03 DoD status after this batch

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 shipped |
| Astrology engine validated against reference charts | ✅ Solstice / equinox anchors pass |
| Multi-tradition house calculations cross-checked | 🟡 2 of 9 systems shipped |
| Planetary hours validated against published tables | ⏳ Batch 24 |
| Event stream populated for ±50 years from current date | ⏳ Batch 24 |
| Election finder returns sensible results | ⏳ Batch 26 |
| Liber Resh transitions fire at correct local times | ⏳ Batch 26 |
| Frontend chart renderer accessible | ⏳ Batch 27 |
| All festival entries cite at least one source | ⏳ Batch 25 |
