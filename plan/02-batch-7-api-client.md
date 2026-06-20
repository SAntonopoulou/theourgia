# Phase 02 — Batch 7: API client + auth context substrate

> Seventh implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the foundation that lets every surface call real backend endpoints — typed `fetch` wrapper, RFC 7807 `Problem` error handling, retry/timeout/cancellation, and a React auth context with the right state shape so the next surface batch can drop in real data fetching. Pure substrate; no surface visibly changes.

## Why this scope

Batches 1–6 built the design system + first real surface (Today) on top of hand-written mock data. Continuing to build surfaces on mocks means every future batch will have to be retrofit when the API actually plugs in. Better to lay the substrate now.

The backend exposes:
- `GET /healthz` — liveness
- `GET /readyz` — readiness (checks DB)
- `GET /api/v1/meta` — instance metadata

WebAuthn primitives exist in `core/auth/webauthn.py` but the HTTP routes for login flow weren't added in Phase 01. That's a backend follow-up — the auth context here is shaped against the expected route signatures so wiring is one-line per call when those land.

The backend isn't deployed anywhere reachable yet. The client works in two modes:

1. **mock** (default in dev / when no API base URL is configured): every call resolves with fixture data
2. **live**: hits the real backend at the configured `THEOURGIA_API_BASE`

## What this batch includes

### Shared (`frontend/shared/src/api/`)

- `client.ts` — typed fetch wrapper with:
  - Base URL config from env (`THEOURGIA_API_BASE` or default `""`)
  - Automatic JSON parse + typed return
  - RFC 7807 `Problem` parsing on non-2xx
  - Custom error classes: `ApiError`, `NetworkError`, `UnauthorizedError`, `NotFoundError`
  - AbortSignal support (cancel in-flight requests)
  - Configurable timeout (default 30s)
  - Hooks-friendly: methods return a Promise; no global state
- `endpoints.ts` — typed methods, one per known endpoint:
  - `getHealth()` → `{ status: "ok" }`
  - `getReadiness()` → `{ status: "ok", checks: { database: "ok" } }`
  - `getMeta()` → `Meta` (instance_id, version, api_version, environment)
  - Stubbed (404-by-design) for: `login()`, `logout()`, `getCurrentSession()`, `listEntries()`, `getEntry(id)`, `createEntry(input)` — the contract is in place; backend routes come later
- `types.ts` — TypeScript mirrors of backend Pydantic schemas

### Shared (`frontend/shared/src/auth/`)

- `AuthContext.tsx` — React context providing:
  - `session: Session | null` — null when unauthenticated
  - `status: "idle" | "checking" | "authenticated" | "unauthenticated"`
  - `signIn(input)` → starts the WebAuthn flow
  - `signOut()` → invalidates session
  - `refresh()` → re-fetches the session
- `AuthProvider` — Provider component; mounts at the app root. Runs `refresh()` on mount to check for an existing session cookie.
- `useAuth()` / `useSession()` / `useStatus()` — hooks for consumers
- `useRequireAuth()` — convenience hook for protected routes; redirects to /signin (consumer-supplied) when unauthenticated

### Admin

- A dev-only `/connection` route added to the nav (under "Foundations") that shows:
  - Mode (mock or live, with the configured base URL)
  - Calls `getHealth()`, `getReadiness()`, `getMeta()` and shows their results live with a refresh button
  - When in mock mode, displays fixture responses so the shape is visible
- `App.tsx` wraps everything in `<AuthProvider />`

## Out of scope (later batches)

- **Deploying the backend** — Docker build + Postgres on agent-house + Caddy `dev.theourgia.com/api/*` route + CORS config. Separate batch.
- **Wiring Today / Foundations to real data** — depends on backend deploy.
- **Real WebAuthn flow** — backend HTTP routes for `/api/v1/auth/*` don't exist yet. The frontend AuthContext is shaped against the expected signatures; one-line wiring when the routes land.
- **Token refresh / silent renew** — defer until auth surfaces matter.
- **React Query / SWR cache layer** — over-engineering for current scope; raw Promise-returning methods are enough.

## API client shape

```ts
// client.ts
export interface ApiClientConfig {
  baseUrl: string;
  /** When true, all requests resolve from fixtures without touching the network. */
  mock: boolean;
  /** Default timeout in ms. Default 30000. */
  timeoutMs?: number;
  /** Optional bearer token (set after login). */
  authToken?: string | null;
}

export class ApiClient {
  constructor(config: ApiClientConfig);
  request<T>(path: string, opts?: RequestInit & { signal?: AbortSignal }): Promise<T>;
  withAuthToken(token: string | null): ApiClient;  // returns a fresh client
}

export class ApiError extends Error {
  status: number;
  problem: Problem;
}
export class UnauthorizedError extends ApiError {}
export class NotFoundError extends ApiError {}
export class NetworkError extends Error {}
```

## Tests

- Client:
  - Parses JSON responses correctly
  - Surfaces RFC 7807 Problem as `ApiError` with `status` + `problem.detail`
  - 401 → `UnauthorizedError`
  - 404 → `NotFoundError`
  - Timeout → `NetworkError`
  - AbortSignal cancels in-flight
  - Mock mode resolves fixtures without touching `fetch`
- Endpoints:
  - `getHealth` / `getReadiness` / `getMeta` produce the right URL + return typed data
  - Stubbed endpoints throw `NotImplementedError` with a clear message
- AuthContext:
  - Initial status is `checking`
  - On mount, `refresh()` is called once
  - When refresh succeeds, status flips to `authenticated`
  - When refresh fails, status flips to `unauthenticated`
  - `signOut()` clears session + flips to `unauthenticated`
  - `useAuth` outside Provider throws a helpful error

Target ~30-40 new tests.

## Test plan + acceptance

- `pnpm test` — 285 existing + new pass
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm deploy:dev` — ships + verify; new `/admin/connection` route renders mock responses (no backend reachable)
- Commit pushed

## What this batch deliberately does NOT do

- Deploy backend
- Wire Today to real data
- Real WebAuthn login
- Cache / dedupe / retry logic beyond the basics
- Generated client from OpenAPI schema (could be a follow-up; for now the typed methods are hand-written and small)

## Risks + mitigations

- **happy-dom fetch limitations**: tests using `fetch` may not have it. Mitigation: `vi.fn()` mock or `msw` if needed; lean toward mock for simplicity.
- **CSRF / cookie semantics**: backend uses bearer tokens per `app.py` description ("Authentication uses bearer tokens issued by the session endpoints"). Client stores token in memory + optionally persists to localStorage; cookie-only is also supported via `credentials: "include"`. Defer the persistence decision to the deploy batch where we can decide based on the deployed auth flow.
- **AuthContext + SSR**: AuthProvider should be a no-op on the server; the public-site is Astro static and doesn't need auth. We export `AuthProvider` but the public-site doesn't import it.

## Plan-doc-discipline

Same as prior batches.
