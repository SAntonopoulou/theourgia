# Phase 03 — Batch 22: Calendar engine substrate

> First batch of Phase 03 (Time & Cosmos). Lays the `Calendar` protocol + registry so the remaining 7 calendars + festival overlays land cleanly. Ships 4 priority calendars: Gregorian, Julian, Hebrew, Thelemic.

## Substrate

- `backend/theourgia/core/calendars/__init__.py` — barrel exports the protocol + registry helpers + side-effect-imports each calendar so registration runs at module-load.
- `backend/theourgia/core/calendars/base.py` — `Calendar` (runtime-checkable Protocol), `CalendarDate` dataclass, `register_calendar` / `registered_calendars` / `get_calendar` registry.

Calendar contract:
- `id` — stable kebab-case key (`gregorian`, `hebrew`, etc.)
- `name` — English display label
- `family` — `solar` · `lunisolar` · `lunar` · `ritual`
- `from_instant(instant, *, locale)` — UTC `datetime` → localized `CalendarDate`
- `to_instant(date)` — inverse

`CalendarDate` ships `long` / `short` / `numeric` / `with_day_name` formatted strings + a calendar-specific `raw` dict so dynamic callers (Today widget, journal stamper) can introspect without the protocol changing every time a calendar lands.

## Calendars shipped

### Gregorian (`solar`)
- Babel-backed locale formatting (`babel.dates.format_date`).
- Numeric form is ISO 8601; long/with-day forms use CLDR per locale.
- Round-trips identity.

### Julian (`solar`)
- Pure-Python Julian Day Number ↔ proleptic Julian conversion using the algorithm in Meeus, *Astronomical Algorithms* 2nd ed. Ch. 7.
- For 2026-06-21 Gregorian → June 8 Julian (13-day offset, 1900–2099).
- For historical references (e.g. 350 AD Mar 25 Gregorian → Mar 24 Julian) the algorithm follows Meeus exactly.

### Hebrew (`lunisolar`)
- Reingold/Dershowitz R.D. algorithm with proper dechiyot (postponements) and Metonic-cycle leap-year detection.
- `HEBREW_EPOCH = -1373428` (verified against R&D Appendix C: Iyyar 10 5727 = May 20 1967).
- Civil month iteration walks Tishrei → Adar (+ Adar II) → Nisan → Elul, so the year rolls correctly at Rosh Hashanah.
- `raw` carries `is_leap_year`, `year_length`, `month_name`, `rd` for downstream consumers.
- **Day-granular conversion only this batch.** Hebrew days start at sunset; the precise sunset boundary lands in Batch 24 once Swiss Ephemeris is wired.

### Thelemic (`ritual`)
- Anno IVxxxv / Era Vulgaris dual presentation.
- 22-year docosaeteris cycles from the 1904 receipt of *Liber AL*.
- Year boundary: vernal equinox. **Placeholder Mar 20 0:00 UTC this batch**; refined to the true astronomical instant in Batch 23 once the ephemeris is wired.
- Returns the Roman cycle (capital) + Roman year-in-cycle (lowercase), e.g. "An VIxiii" for 2026.

## Tests

`backend/tests/test_calendars.py` — 23 tests:
- 4 registry tests (default registration, `get_calendar`, unknown id, idempotent register).
- 4 Gregorian tests (English, Greek locale via Babel, round-trip, tz-aware enforcement).
- 3 Julian tests (current-era offset, 350 AD anchor against Meeus, round-trip).
- 4 Hebrew tests (2026 solstice → Tammuz 5786, leap-year detection for AM 5787, round-trip, Reingold reference Iyyar 10 5727).
- 3 Thelemic tests (Anno count + docosaeteris, vernal-equinox boundary, round-trip).
- 5 cross-tradition parametric tests (well-formed dates × every calendar; day-after-day advances by 1 day everywhere).

Run via the project venv:

```
.venv/bin/python -m pytest tests/test_calendars.py -q
# 23 passed in 0.56s
```

Full backend suite (excluding API): **1028 tests pass — no regressions.**

## Defer to later batches

- **Locale-aware formatting for non-Babel calendars** — Julian/Hebrew/Thelemic currently format their long/short strings in English; per-locale formatting hooks land when the i18n catalog ships its first per-calendar key set in Batch 25 (festival overlays).
- **Day-of-week-with-sunset boundary** for Hebrew and Islamic — Batch 24 plumbs the real sunrise/sunset and applies it.
- **Remaining calendars from §1 of `plan/03-time-and-cosmos.md`**: Hindu/Vedic (Vikram Samvat + Shaka), Coptic, Islamic/Hijri (lunar + tabular), Ancient Greek (Attic), Mayan (Long Count + Tzolkin + Haab), Egyptian decanic, French Republican. Each is a focused follow-up that drops into the same substrate.

## Phase 03 Definition-of-Done status

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 shipped (substrate done) |
| Astrology engine validated against reference charts | ⏳ Batch 23 |
| Multi-tradition house calculations cross-checked | ⏳ Batch 23 |
| Planetary hours validated against published tables | ⏳ Batch 24 |
| Event stream populated for ±50 years from current date | ⏳ Batch 24 |
| Election finder returns sensible results | ⏳ Batch 26 |
| Liber Resh transitions fire at correct local times | ⏳ Batch 26 |
| Frontend chart renderer accessible | ⏳ Batch 27 |
| All festival entries cite at least one source | ⏳ Batch 25 |
