# Phase 03 — Batch 27: APIs + frontend chart renderer

> Final Phase 03 batch. Six FastAPI endpoints expose the calendars + astrology + festivals + election engine to the frontend, plus an accessible SVG chart wheel + companion tabular legend in the shared design system.

## Backend — six v1 endpoints

`backend/theourgia/api/routers/v1/astro.py`:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/calendar/today` | Stacks every registered calendar's view of an instant (defaults to now). Locale-aware. |
| `GET /api/v1/astro/chart` | Compute a chart for a supplied instant + lat/lon. Tropical/sidereal × Placidus/Whole-Sign. |
| `GET /api/v1/astro/now` | Convenience wrapper around `/chart` with `instant = now`. |
| `GET /api/v1/astro/planetary-hours` | 24 planetary hours for a date + location, with the current-hour index pre-computed. |
| `POST /api/v1/astro/election/search` | Election finder: pass either a `preset` (`venus_talisman` / `mercury_correspondence` / `hekate_working`) OR a list of `ConstraintInput` records. Returns ranked Elections with reason breakdowns. |
| `GET /api/v1/events` | Astronomical events (lunar phases + ingresses) + festival overlays for a date range. Festival entries carry `source_count` so the UI can flag well-cited entries. |

**Attribution invariant**: every chart / election / events response carries the Swiss Ephemeris + JPL DE441 string per the AGPL-3.0 license obligations. `test_astro_chart_returns_placements_houses_aspects` and `test_election_search_with_preset` both assert its presence.

Mounted in `routers/__init__.py` at the `/api/v1` prefix.

### API tests

`backend/tests/test_api_astro.py` — 14 tests via `fastapi.testclient.TestClient`:
- 2 calendar/today (every calendar present; locale param honored)
- 4 chart (full chart structure; latitude validation; sidereal mode; Whole Sign houses)
- 1 now (instant within a minute of `datetime.now`)
- 1 planetary-hours (24 hours + valid current_hour_index)
- 3 election (preset works, custom constraints work, preset+constraints rejected)
- 3 events (astronomical + festivals present; inverted range rejected; festivals can be disabled)

**1119 backend tests pass** (+14 new). No regressions.

## Frontend — SVG chart renderer

`frontend/shared/src/Chart/`:
- `Chart.tsx` — the SVG natal/event wheel. Zodiac ring with sign glyphs, house cusp lines (angular cusps emphasized), planet glyphs ringed inside, optional aspect lines colored by kind (red/danger for square/opposition, blue/info for sextile, green/success for trine, ink-soft for conjunction). ASC/MC labels at the outer rim. Swiss Ephemeris attribution rendered in the SVG footer.
- `ChartLegend.tsx` — accessible-by-default `<table>` listing every placement with sign / degrees-minutes / house / motion (retrograde flag).
- `Chart.stories.tsx` — 5 stories (default / no aspects / no houses / compact / with legend).

**Accessibility:** `role="img"` on the SVG with `<title>` + `<desc>`; each placement is a `<g>` with its own descriptive `<title>` so screen readers announce "Sun at 0° Cancer, house 10" without having to derive it from geometry. ChartLegend provides the equivalent tabular fallback.

Storybook now ships 128 stories total; the **visual regression baseline** has been refreshed (`pnpm test:visual:update` captured 5 new Chart PNGs). All 128 stories pass **both** the pixel diff and the **WCAG 2.2 A + AA axe-core gate**.

## Deferred frontend surfaces

The plan's §7 lists a multi-calendar Today widget, planetary hours strip, lunar-phase indicator, calendar surface with festival overlays, election finder UI, and Liber Resh dashboard. None of these have `.dc.html` files in the design hand-off — per `feedback_read_dc_html_before_building.md`, building them from scratch would be design drift. They're substrate-ready (the backend APIs expose everything needed) but should land alongside a designer hand-off, the same way the rest of the design-fidelity work is paced.

Tracked in `project_resume_state.md` as Phase 03 frontend follow-ups.

## Phase 03 DoD final tally

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 (substrate ready for the rest) |
| Astrology engine validated against reference charts | ✅ |
| Multi-tradition house calculations cross-checked | 🟡 2 of 9 systems shipped |
| Planetary hours validated against published tables | ✅ |
| Event stream populated for ±50 years from current date | 🟡 Computation ✅; persistence is Phase 04 |
| Election finder returns sensible results | ✅ |
| Liber Resh transitions fire at correct local times | ✅ |
| Frontend chart renderer accessible | ✅ |
| All festival entries cite at least one source | ✅ |

**6 of 9 DoD items fully closed, 3 partial (substrate complete, content follow-up).** Phase 03 is structurally complete; the remaining calendars + house systems are mechanical follow-ups dropping into the same substrate.
