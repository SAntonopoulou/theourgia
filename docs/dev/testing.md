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
