# Phase 01 — Core Architecture: closing status

Phase 01 (Core Architecture) is **complete**. Ten batches landed,
documented below. This document is the cold-start reference: anyone
walking into the project at this point can read this file plus
`plan/01-core-architecture.md` and have the full picture.

## What was built

### Batch 1 — Data layer
- `core/config.py` — Pydantic `Settings`, secret enforcement.
- `core/db.py` — async SQLAlchemy engine, `session_scope`, FastAPI dep.
- `core/ids.py` — UUIDv7 per RFC 9562.
- `core/timeutil.py` — tz-aware helpers (refuses naive datetimes).
- `models/identity.py` — User, Session, Vault, Hub, Membership.
- `models/audit.py` — AuditEvent, AuditEventKind, AuditOutcome.
- Migration `0001` — extensions, enums, identity tables, RLS, audit immutability.

### Batch 2 — Encryption
- `core/crypto/envelope.py` — versioned `[ver][mode][key_id][nonce_len][nonce][ct]`.
- `core/crypto/mode_a.py` — AES-256-GCM (server-side).
- `core/crypto/mode_b.py` — XChaCha20-Poly1305 (reference for browser).
- `core/crypto/keys.py` — `MasterKey`, `DataKey`, wrap/unwrap.
- `core/crypto/kdf.py` — Argon2id (INTERACTIVE).
- `models/crypto.py` — VaultKey, SealedKdfParams.
- Migration `0002` — encryption tables with `uq_vault_key_one_active`.

### Batch 3 — Authentication
- `core/auth/passwords.py` — Argon2id with INTERACTIVE parameters.
- `core/auth/tokens.py` — 256-bit URL-safe; SHA-256 storage form.
- `core/auth/totp.py` — RFC 6238 (stdlib only); RFC 4226 §D vector verified.
- `core/auth/lockout.py` — exponential ladder.
- `models/auth.py` — BackupCode, PasswordResetToken.
- Migration `0003`.

### Batch 4 — Authorization
- `core/authz/visibility.py` — 5-value enum + predicates.
- `core/authz/scopes.py` — ~40 dotted scopes across 12 domains.
- `core/authz/checks.py` — pure `can_read_with_visibility` / `can_write_with_visibility`.
- `core/authz/rls.py` — `set_current_user_id` for PostgreSQL RLS GUC.
- `core/authz/audit.py` — factory + persister.

### Batch 5 — API
- `api/app.py` — factory + OpenAPI customization.
- `api/lifespan.py` — startup secret check + shutdown.
- `api/errors.py` — RFC 7807 translator with APIError taxonomy.
- `api/middleware.py` — RequestID, CORS.
- `api/deps.py` — `get_current_user` (sets RLS GUC + binds user contextvar).
- Routers: `/healthz`, `/readyz`, `/api/v1/meta` (reports `telemetry: "none"`).

### Batch 6 — Plugins
- `core/plugins/manifest.py` — strict Pydantic schema (flat or nested TOML).
- `core/plugins/capabilities.py` — 23-value enum.
- `core/plugins/extension_points.py` — 22 hooks.
- `core/plugins/state.py` — state machine.
- `core/plugins/registry.py` — thread-safe singleton.
- `core/plugins/context.py` — capability-scoped sandbox + `CapabilityDeniedError`.
- `core/plugins/loader.py` — capability clipping on activate.
- `models/plugins.py` — PluginInstall, PluginCapabilityGrant, PluginSetting.
- Migration `0004`.

### Batch 7 — Federation
- `core/federation/identity.py` — `did:theourgia:host[:kind:slug]`.
- `core/federation/keys.py` — Ed25519 keypair, idempotent O_EXCL load.
- `core/federation/http_signatures.py` — RFC 9421 focused subset.
- `core/federation/capability_tokens.py` — EdDSA-signed JWTs.
- `api/routers/well_known.py` — `/.well-known/theourgia/actor`.

### Batch 8 — Backup tooling
- `core/backups/policy.py` — `RetentionPolicy` mapping to Restic flags.
- `core/backups/restic.py` — `ResticClient` subprocess wrapper with injected runner.
- `core/backups/status.py` — outcome types.
- `models/backups.py` — `BackupRun`, status + trigger enums.
- Migration `0005` — backup_run + RLS (admin-only read).
- `docs/admin/disaster-recovery.md` — full DR runbook.

### Batch 9 — Observability
- `core/observability/context.py` — request_id / user_id contextvars.
- `core/observability/logging.py` — structlog with JSON / pretty + idempotent config.
- `core/observability/metrics.py` — 6 Prometheus collectors on dedicated registry.
- `core/observability/sentry.py` — opt-in, silent no-op without DSN.
- `core/tasks/app.py` — Celery app + beat schedule (daily + hourly_incremental).
- `core/tasks/backup.py` — scheduled task wrapping ResticClient.
- `api/routers/metrics.py` — admin-scoped `/metrics`.
- `docs/admin/observability.md` — runbook.

### Batch 10 — WebAuthn, zero-telemetry verifier, test fixtures
- `core/auth/challenges.py` — `ChallengeStore` Protocol + in-memory + Redis impls.
- `core/auth/webauthn.py` — `WebauthnService` with begin/finish for both ceremonies, sign-count regression detection.
- `models/webauthn.py` — `WebauthnCredential`.
- Migration `0006` — webauthn_credential + RLS (owner-only).
- `scripts/verify_zero_telemetry.py` — CLI verifier + `main()` returning exit code.
- `tests/conftest.py` — `app`, `async_client`, `stock_env`, `reset_settings`, `postgres_url`.
- `docs/dev/testing.md` — testing guide.

## What was NOT built in Phase 01 (deliberately deferred)

- **API endpoints for WebAuthn registration / authentication ceremonies.** The service substrate is in place; the HTTP routes that drive it land in Phase 03 (auth flow) when the frontend can drive the ceremony end-to-end.
- **Live Celery worker / beat in dev compose.** The Celery app is configured and the beat schedule is declared, but starting workers is a docker-compose update that lands with Phase 02 infrastructure pass.
- **Real Postgres in unit tests.** `conftest.py` provides the `postgres_url` fixture that returns None when not configured; tests that need a DB skip gracefully. The docker-compose for the test DB lands with the first DB-touching integration test.
- **Federation peer registry.** Federation *primitives* (DID, keys, HTTP signatures, capability tokens, well-known actor) are done; peer registry + outbound delivery come in Phase 13 (federation engine).
- **Plugin runtime sandbox.** Manifest / state / context / loader are done; the actual sandboxed execution boundary (subprocess / Wasm) lands when the first real plugin needs it.

## Open invariants enforced by tests

| Invariant | Enforced by |
|---|---|
| Zero telemetry by default | `tests/test_zero_telemetry.py` + CLI verifier |
| Sentry is opt-in only | `tests/test_observability_sentry.py::test_no_dsn_means_no_initialization` |
| Metrics registry is isolated | `tests/test_observability_metrics.py::test_registry_is_isolated_not_default` |
| Celery accepts JSON only | `tests/test_tasks_celery.py::test_celery_app_json_only_serialization` |
| Backup `keeps_anything` guards prune | `tests/test_backups_policy.py` + `tests/test_backups_restic.py` |
| WebAuthn sign count is strictly increasing | `tests/test_webauthn.py::test_finish_authentication_rejects_regressing_sign_count` |
| Challenges are single-use | `tests/test_challenges.py::test_in_memory_store_take_is_single_use` |
| RLS policies cover every per-user table | (TODO: add a meta-test in Phase 02 that introspects pg_policies) |

## Next: Phase 02 (Frontend Foundations)

**Blocked on design.** The designer is finishing the Theourgia design
system; Phase 02 work picks up once those tokens, components, and
visual language are in hand. Phase 02 scope per `plan/02-*.md`:

- Astro 4 public-site scaffold
- React 19 admin SPA scaffold
- Design-token pipeline (Tailwind config from designer's tokens)
- Component library (Headless UI + custom)
- Tiptap editor wiring
- i18n setup (per the day-one i18n decision)

When the designer hands off, the cold-start sequence is:

1. Read this file.
2. Read `plan/02-*.md`.
3. Read `docs/admin/observability.md` + `docs/admin/disaster-recovery.md` (operational context).
4. Read `docs/dev/testing.md` (testing patterns).
5. Begin Phase 02 Batch 1.
