# Phase 02 — Batch 9: Today via the API client

> Ninth implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** rewire the Today surface to fetch through the API client substrate instead of importing mock data directly. The actual entries still come from fixtures (the backend has no `/api/v1/entries` route yet), but the data flow now goes user → React → API client → fixture (mock mode) or → backend (live mode, future). When the backend ships the endpoint, it's a one-line endpoint-method swap with no surface code change.
>
> Also: introduce `useApiCall<T>` — a tiny purpose-built hook for "fetch on mount, expose status/data/error/refresh" so every surface that pulls from the API gets the same loading / error / retry behavior for free.

## Why this scope

Batch 7 built the API client + fixtures. Batch 8 deployed the backend. Today still reads `MOCK_ENTRIES` directly — which means the substrate is unused at the surface level. This batch proves the substrate by routing one surface through it.

This is a small batch on purpose. Once the pattern lands, future surfaces (Journal, Library, Entities, etc.) follow the same shape, and migrating the backend endpoints from "throws NotImplementedError in live" to "returns real data" is a frontend-no-op.

## What this batch includes

### Shared

- `useApiCall<T>(fn)` hook in `frontend/shared/src/hooks/useApiCall.ts`:
  - Signature: `useApiCall(fn: () => Promise<T>, deps?: unknown[]): { status, data, error, refresh }`
  - Status: `"idle" | "loading" | "ok" | "error"`
  - Calls `fn()` on mount (and when deps change)
  - Cancels in-flight on unmount via an AbortController stored in a ref
  - `refresh()` re-runs `fn()` manually
  - Errors are caught into `error`; not thrown
  - Reuses the same status state shape as the diagnostic Connection page (consistency)
- Tests for the hook

### Admin

- `frontend/admin/src/data/useEntries.ts`: small wrapper around `apiMethods.listEntries()` using `useApiCall`. Exports `useRecentEntries()` for the Today surface.
- `frontend/admin/src/routes/Today.tsx`: replaces `import { MOCK_ENTRIES }` with `useRecentEntries()`. Render branches on status:
  - `loading` → renders 3 `<Skeleton kind="rect" />` rows
  - `error` → renders an EmptyState in danger tone with a Retry button
  - `ok` → renders the real list
- The Quick Capture flow now calls `apiMethods.createEntry(input)` (still hits the fixture in mock mode, the backend stub in live mode — backend throws NotImplementedError so we handle that with a clear Toast).
- `mocks/today.ts` is trimmed: `MOCK_IDENTITY`, `MOCK_LOCATION`, `MOCK_STATS` remain (they're not entry-related). `MOCK_ENTRIES` is removed; the fixture provider in shared owns the seed.

## Out of scope (later)

- Real `/api/v1/entries` backend route
- Wiring identity + stats through the API (defer; they need user/vault context)
- Pagination
- Optimistic UI for createEntry
- Caching across navigation (React Query layer is later if we need it)

## Test plan

- New tests for `useApiCall` (loading state, error path, refresh, cancel on unmount)
- Today tests already passing — verify still green
- `pnpm deploy:dev` cycle works
- Visual: load /admin/, see entries fetched (mock fixture); use Quick Capture → entry appears (mock fixture creates real record in the in-memory store)

## Acceptance criteria

1. `useApiCall` exported from `@theourgia/shared`
2. Today's entries flow through `apiMethods.listEntries()`
3. Loading and error states render correctly (test by forcing the fixture to throw)
4. Quick Capture posts via `apiMethods.createEntry`
5. 313 → ~325 tests; typecheck + lint clean; deployed
