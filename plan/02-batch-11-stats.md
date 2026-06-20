# Phase 02 — Batch 11: Entry stats via the API

> **Scope target:** the Stat tiles on Today are still hardcoded (`MOCK_STATS`). Make them real. Backend adds `GET /api/v1/entries/stats` that computes counts + week-over-week deltas from the entries table; frontend wires Today's stats through a typed hook.
>
> This also adds a `?type=` filter to `GET /api/v1/entries` since the count breakdown needs the same predicate, and the cost is trivial. Small, clean, finishes the "Today fully on real data" arc.

## What this batch includes

### Backend

- `GET /api/v1/entries?type=<type>` — optional `type` query param filters by EntryType
- `GET /api/v1/entries/stats` — returns:
  ```json
  {
    "total": 42,
    "by_type": {"observation": 28, "ritual": 8, "divination": 6, ...},
    "this_week": {"total": 12, "by_type": {...}},
    "last_week": {"total": 9, "by_type": {...}}
  }
  ```
  Computed from the entries table; soft-deletes excluded. Week boundaries are UTC for now (locale-aware comes later when we wire the locale substrate to the user).
- Pydantic `EntryStats` schema mirrors the wire shape

### Frontend

- `apiMethods.listEntries({ type?: EntryType })` — adds optional filter; passes through as querystring
- `apiMethods.getEntryStats()` — new typed method
- `EntryStats` type added to `@theourgia/shared`
- `useTodayStats()` hook in `frontend/admin/src/data/` — `useApiCall` wrapper
- Today's three Stat tiles get values + deltas from `useTodayStats()`. Loading → skeleton tiles; error → graceful "—" with a tiny inline retry icon. Three derived stats:
  - **Entries this week** — `stats.this_week.total`, delta = (this_week.total − last_week.total) / last_week.total × 100
  - **Synchronicities** — `stats.this_week.by_type.synchronicity`, delta vs last week
  - **Rites performed** — `stats.this_week.by_type.ritual`, delta vs last week

### Tests

- Backend: stats endpoint with seeded entries spanning two weeks; verify counts + deltas
- Frontend: `apiMethods.getEntryStats` hits `/api/v1/entries/stats` with the right path; mock fixture returns a realistic stats payload
- Today: Stat tiles render skeleton on initial load, then real values

## Out of scope

- Real charts / sparklines on the stat tiles (sparklines still hardcoded as `undefined` — when we have time-series data we wire that)
- User-scoped stats (anonymous era still; everyone sees the same numbers)
- Stats for older windows (just current vs previous week for now)

## Acceptance criteria

1. `GET /api/v1/entries/stats` live on dev.theourgia.com
2. Today's Stat tiles render real counts (currently 2 total entries → so the numbers will be tiny + honest)
3. `mocks/today.ts` no longer exports `MOCK_STATS` — only `MOCK_IDENTITY` and `MOCK_LOCATION` (those wait for auth + user settings)
4. 984 → ~988 backend tests; 319 → ~322 frontend tests
5. Deployed
