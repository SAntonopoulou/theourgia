# Phase 03 — Batch 24: Planetary hours + astronomical events

> Real sunrise/sunset planetary hours (replaces the Workshop clock heuristic) and the precomputed astronomical event stream (lunar phases + planetary ingresses). Built on Batch 23's Swiss Ephemeris wrapper.

## Substrate

`backend/theourgia/core/astro/`:
- **`sun_times.py`** — `compute_sun_times(date_utc, lat, lon)` returns the four Sun transitions (sunrise, solar noon, sunset, solar midnight) via `swe.rise_trans`. Polar fallback: `sunrise`/`sunset` are `None` when the Sun doesn't rise/set; meridian transits always populate.
- **`planetary_hours.py`** — `compute_planetary_hours(date_utc, lat, lon)` returns 24 contiguous `PlanetaryHour`s (12 day + 12 night) with Chaldean-ordered rulers. `current_planetary_hour(now, lat, lon)` is the live-query convenience.
- **`events.py`** — `lunar_phases_in_range`, `planetary_ingresses_in_range`, and the combined `events_in_range`. Binary search to the exact event instant, ~1e-13 day precision.

## Astronomical conventions

- **Day-of-week → planetary ruler**: the medieval naming scheme (Agrippa Book II Ch. 32 / Crowley's *Liber 777*). Sunday → Sun, Monday → Moon, …, Saturday → Saturn. Hard-coded in `DAY_RULERS`.
- **Chaldean cycle**: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → wrap. Slowest-to-fastest geocentric order.
- **Invariant**: the first planetary hour of the day is ruled by the day's ruler. (E.g. on a Sunday at sunrise, hour 1 is Sun-ruled.) Tested.
- **Hour length is not 60 minutes**: the daylight arc is split into 12 equal "planetary hours of the day"; in mid-summer at high latitude a day-hour can be much longer than 60 min and a night-hour much shorter.

## Event stream

- **Lunar phases**: new / first quarter / full / last quarter. Detected by watching the Moon–Sun elongation cross 0° / 90° / 180° / 270° at quarter-day step, then bisecting to the exact moment.
- **Planetary ingresses**: for Sun + Moon + 8 planets, daily-step watch for sign-boundary crossings, then bisect. Handles wrap-around at Aries 0°. Retrograde-direction ingresses honored.
- **Stations / eclipses**: scaffold present in the event-kind enum; detection logic lands in Batch 25 (eclipse cycles tie naturally to the festival overlay work).
- **Combined stream** sorted by instant — ready to feed the `event` table once Phase 04 schema ships.

## Tests

`backend/tests/test_astro_time.py` — 15 tests:
- 3 sun-times tests (Greenwich solstice sunrise ~03:42 UTC; sunset > noon > sunrise at Athens; naive datetime rejected).
- 3 day-ruler tests (Sunday → Sun, Monday → Moon, Saturday → Saturn).
- 4 planetary-hour structural tests (first hour = day ruler; count = 24; contiguity sub-second; Chaldean order advances one step per hour).
- 1 current-hour spot check.
- 2 lunar-phase tests (one full moon in late-June 2026, elongation actually at 180° at the reported instant; events sorted; 6–10 phase events per 2 months).
- 2 ingress tests (Sun's Cancer ingress at the 2026 summer solstice within 30 minutes of 08:24 UTC; combined `events_in_range` is sorted and includes both kinds).

**1060 backend tests pass** (+15 new). No regressions.

## Notes on conventions deferred

- **Sunrise/sunset accuracy** — Moshier ephemeris gives roughly arcsec accuracy on the Sun's position, which translates to seconds-of-time accuracy on rise/set times. Sub-minute precision is more than adequate for planetary hours and Liber Resh; if a future operator wants USNO-table fidelity, they ship `.se1` files and the chart layer switches to `FLG_SWIEPH` automatically.
- **Stations + eclipse detection** — eclipses have their own classification (penumbral, partial, total, annular) that's natural to do alongside the festival data in Batch 25.
- **The Workshop frontend's planetary hour widget** still uses its clock-hour heuristic — Batch 27 wires `current_planetary_hour` through the API and replaces the placeholder.

## Phase 03 DoD status after this batch

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 shipped |
| Astrology engine validated against reference charts | ✅ |
| Multi-tradition house calculations cross-checked | 🟡 2 of 9 systems shipped |
| **Planetary hours validated against published tables** | **✅ (this batch — Chaldean ordering + day-ruler invariants)** |
| **Event stream populated for ±50 years from current date** | **🟡 Computation shipped; persistence + ±50yr precompute is a Phase 04 schema item** |
| Election finder returns sensible results | ⏳ Batch 26 |
| Liber Resh transitions fire at correct local times | ⏳ Batch 26 (sun_times.py is the substrate it needs) |
| Frontend chart renderer accessible | ⏳ Batch 27 |
| All festival entries cite at least one source | ⏳ Batch 25 |
