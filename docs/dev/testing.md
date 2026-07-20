# Testing guide

Theourgia tests live next to the code in each subproject. The backend
uses pytest; the frontend uses Vitest + Playwright (when frontend code
lands).

## Backend layout

```
backend/
├── tests/
│   ├── conftest.py            # shared fixtures (app, async_client, …)
│   ├── test_*.py              # unit + small-integration tests
│   └── integration/           # tests that need a real Postgres / Redis
└── theourgia/
    └── …
```

## Running tests

```bash
cd backend
uv run pytest                              # everything
uv run pytest tests/test_webauthn.py       # one module
uv run pytest -k webauthn                  # by keyword
uv run pytest -m asyncio                   # only async tests
uv run pytest --cov=theourgia              # with coverage
```

## Conftest fixtures

| Fixture | Purpose |
|---|---|
| `anyio_backend` | Pins anyio to `"asyncio"` |
| `reset_settings` | Clear cached `Settings` between tests |
| `stock_env` | Test env with no operator opt-ins (no Sentry, no Restic) |
| `app` | Fresh FastAPI app, test mode |
| `async_client` | `httpx.AsyncClient` over ASGITransport |
| `postgres_url` | Returns test DB URL if configured, else None |

## Testing patterns

### Async tests

```python
import pytest

@pytest.mark.asyncio
async def test_something_async():
    ...
```

### Endpoint tests (no DB)

```python
@pytest.mark.asyncio
async def test_meta(async_client):
    response = await async_client.get("/api/v1/meta")
    assert response.status_code == 200
```

### Tests that need Postgres

```python
def test_db_thing(postgres_url):
    if postgres_url is None:
        pytest.skip("set THEOURGIA_TEST_DATABASE_URL to enable")
    # ... use postgres_url to connect
```

The CI environment populates `THEOURGIA_TEST_DATABASE_URL`; locally,
spin up Postgres via:

```bash
docker compose -f backend/tests/docker-compose.test.yml up -d
export THEOURGIA_TEST_DATABASE_URL=postgresql+asyncpg://test:test@localhost:5433/theourgia_test
```

(The compose file lands when the first DB-touching test does.)

### Testing third-party library wrappers

When code wraps an external library (py-webauthn, Restic), we test the
*wrapper's* behavior — challenge lifecycle, error mapping, data
forwarding — and stub the underlying library. The wrapped library is
exercised in its own test suite; duplicating those tests here adds
maintenance load without coverage gain.

Pattern from `tests/test_webauthn.py`:

```python
@pytest.fixture(autouse=True)
def _install_fake_webauthn(monkeypatch):
    fake = types.ModuleType("webauthn")
    fake.verify_registration_response = lambda **kwargs: _VerifiedResult()
    monkeypatch.setitem(sys.modules, "webauthn", fake)
```

For subprocess wrappers (Restic), inject a fake subprocess runner:

```python
client = ResticClient(repository=..., password=..., subprocess_runner=fake_runner)
```

## Zero-telemetry verifier

`backend/tests/test_zero_telemetry.py` enforces the project's
"zero telemetry by default" promise. Three checks:

1. `/api/v1/meta` reports `telemetry: "none"` (the public claim)
2. `init_sentry(stock_settings)` returns `False`
3. No telemetry SDK is importable in the default install

Run standalone:

```bash
cd backend
python -m theourgia.scripts.verify_zero_telemetry
```

Exits 0 on PASS, non-zero on FAIL with a diagnostic message. CI invokes
this on every commit; if it fails, the build does too.

When you add an opt-in telemetry feature (e.g., crash reporting),
**don't** add the package to `dependencies` — add it to an
`[project.optional-dependencies]` extra so the default install stays
clean and the verifier keeps passing.

## Coverage targets

- Phase 01 (foundations): every public function in `core/` has at least
  one happy-path test. Edge cases (regressions, errors, expiry) covered
  where they materially affect security.
- Phase 02+ (frontend): UI components have render tests; user flows
  have at least one Playwright happy path each.
- Crypto / auth code: 100% line coverage required, plus property tests
  for any function that takes opaque bytes (see Hypothesis examples in
  `test_crypto_*.py`).

## When tests get slow

- Group fast tests (no IO) into `tests/` directly; tests that touch
  the DB / Redis / network go under `tests/integration/`.
- `pytest -m "not integration"` to skip the slow tier.
- If a test takes more than a second of wall clock, ask whether it's
  doing what it should.

## Playwright suites (three of them)

There are three Playwright configs at the repo root. Keep them apart —
different `testDir`, different targets:

| Suite  | Config                         | `testDir`      | Target                                  |
|--------|--------------------------------|----------------|-----------------------------------------|
| a11y   | `playwright.a11y.config.ts`    | `tests/a11y`   | Storybook static on `:6007` (self-served) |
| visual | `playwright.visual.config.ts`  | `tests/visual` | Storybook static on `:6007` (self-served) |
| e2e    | `playwright.config.ts`         | `tests/e2e`    | a **running app stack** (operator-started) |

The a11y + visual suites build and serve Storybook themselves. The
end-to-end suite does not start anything — it drives a live stack.

## End-to-end tests (Playwright)

`tests/e2e/*.spec.ts` cover the critical user flows a v1.0 must not
regress. They drive the real admin SPA (and, for the blog, the public
site) in a headless Chromium — no mocks, no fixtures.

### Flows covered

| Spec                 | Flow |
|----------------------|------|
| `auth.spec.ts`       | Sign in with a fresh magickal name → app shell → sign out. Plus the **b108-2hl** security property: after a password is set, name-only sign-in is refused. |
| `journal.spec.ts`    | New entry → type title + body → auto-save survives a reload → add a tag → publish. |
| `blog.spec.ts`       | Write an entry, make it Public, publish, then read it back via the backend blog API **and** the public reader page. |
| `divination.spec.ts` | Open the tarot surface, cast a spread, assert a reading renders. |
| `settings.spec.ts`   | Set an account password; the care-toned banner clears and success shows. |
| `responsive.spec.ts` | **Mobile project only.** Sign in, then walk every key surface at an iPhone-13 viewport (390×844) asserting none scrolls horizontally. |

Selectors prefer roles / accessible names / real UI copy, with a few
stable `data-*` hooks the app already exposes (the ProseMirror editor,
the visibility pills, the tarot board). No assertions on styling.

`blog.spec.ts` asserts the published post through the **backend blog
API** (title + full body). The public-site *reader UI* is not exercised
here — this single-origin stack proxies only the admin SPA + `/api` +
`/.well-known`, not the Astro public site.

### Two projects: desktop and mobile

The config defines two projects, scoped by filename:

| Project           | Viewport             | Runs                         |
|-------------------|----------------------|------------------------------|
| `e2e-chromium`    | Desktop Chrome 1280  | the five functional specs    |
| `mobile-chromium` | iPhone 13 (390×844)¹ | only `responsive.spec.ts`    |

¹ iPhone-13 *metrics* on the Chromium engine (WebKit is not installed
here). Run one project alone with `--project=e2e-chromium` or
`--project=mobile-chromium`; omit the flag to run both.

### Mock mode must be OFF (`VITE_THEOURGIA_API_MOCK=0`)

`frontend/admin/.env.development` sets `VITE_THEOURGIA_API_MOCK=1`, so a
plain `vite` dev server runs on **fixtures** and reports itself
perpetually "signed in" — the E2E specs would never touch the backend,
and real auth/persistence would go untested. The E2E admin server MUST
be launched with `VITE_THEOURGIA_API_MOCK=0` so the SPA talks to the
real API. (The single-origin bring-up below already does this.)

### Why it does NOT auto-start the stack

Bringing the full Docker stack up from Playwright's `webServer`
(Postgres + Redis + backend + Celery + admin + public-site) is slow and
fragile: a partially-healthy stack fails in ways that look like test
bugs. So the operator (or CI) starts the stack, then runs the suite.

### The single-origin requirement (read this before running)

The admin SPA calls the backend at its **own origin** (`/api/*`,
same-origin) and session auth rides an HTTP cookie. For the UI flows to
work, admin **and** the API must be served from **one origin**. Same for
the blog reader: the public-site page fetches `/api/*` same-origin.

`just dev` starts admin (`:5173`), backend (`:8000`) and public-site
(`:4321`) as **separate** origins with no `/api` proxy — good for
hot-reload development, but the SPA can't reach the API across origins
there. For E2E, serve everything behind one origin. The simplest option
is the internal Caddy that already reverse-proxies `/api/*` to the
backend (the same layout `dev.theourgia.com` uses):

```bash
# One origin: admin under /app, public site at /, /api → backend.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Then point the suite at that origin (adjust host/port/basename to your
proxy):

```bash
export E2E_BASE_URL=http://127.0.0.1:8080        # admin SPA origin
export E2E_API_URL=http://127.0.0.1:8080         # backend origin (same)
export E2E_PUBLIC_URL=http://127.0.0.1:8080      # public-site origin (same)
```

The config also honours the bare `BASE_URL` / `API_URL` / `PUBLIC_URL`
names. Defaults (used when unset) are the split dev ports
`:5173` / `:8000` / `:4321`.

Open enrollment must be on (`THEOURGIA_ALLOWED_MAGICKAL_NAMES` empty,
the dev default) so the specs can create their own fresh accounts.

### Running

```bash
# 1. Bring up a single-origin app stack (see above) and let it settle.
curl -fsS http://127.0.0.1:8000/readyz     # backend ready?

# 2. Install the browser once, then run.
pnpm exec playwright install chromium
pnpm test:e2e                              # or: just test-e2e
#   = playwright test --config=playwright.config.ts

# Collect / type-check without a stack (no browser, no server needed):
pnpm exec playwright test --config=playwright.config.ts --list
```

Each spec is self-contained: it creates its own account and its own
data, so the suite is safe to re-run against the same database.

### CI posture

Per the project's CI-pared-down-until-v1 stance, the E2E suite runs
**locally / manually** for now — it needs a full app stack, which the
minimized GitHub Actions don't spin up. It is slated to become a
CI-gated job post-v1 (alongside a stack bring-up step), matching the
DoD note in *Coverage targets* above ("user flows have at least one
Playwright happy path each").
