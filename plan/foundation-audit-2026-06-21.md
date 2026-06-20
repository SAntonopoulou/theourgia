# Foundation audit — 2026-06-21

After Substrate Sweep S1–S8 landed, ran a project-wide audit looking for "foundation cracks" — places where code inlines or sidesteps a substrate that should be its canonical home. Per Sophia: "We must have a firm and sound foundation."

**Audit scope:** `backend/theourgia/` + `backend/tests/`. 8 substrate categories + magic numbers + telemetry leakage + TODO/FIXME inventory + module-level state + other anomalies.

**Headline:** The codebase is in good shape. Most categories returned **clean**. Two actionable items + one expected gap to enumerate for future per-feature work.

## Summary

| Category | Status | Count |
|---|---|---|
| A. Hardcoded user-facing English strings | ✅ Clean | 0 |
| B. Inline authorization checks | ✅ Clean | 0 |
| C. Direct cross-cutting calls bypassing services | ✅ Clean | 0 |
| D. Models with `user_id` missing GDPR registration | ⚠️ Expected gap | 12 models |
| E. Hardcoded scope strings | ✅ Clean | 0 |
| F. Magic numbers that should be `Settings` | ⚠️ Actionable | 3 (DB pool) |
| G. TODO / FIXME / XXX / HACK comments | ✅ Clean | 0 |
| H. Sentry / telemetry imports outside the sentry module | ✅ Clean | 0 |
| I. Module-level mutable state outside registries | ✅ Clean | 0 |
| J. Other anomalies | ℹ️ Intentional | 0 cracks |

---

## A. Hardcoded user-facing English strings

**Clean.** All error responses route through `APIError` subclasses with stable `title` fields in `backend/theourgia/api/errors.py`; validation messages delegate to the Pydantic error summarizer (`_summarize_validation_errors`, `backend/theourgia/api/errors.py:240–247`). Email and notification template text is intentionally English-source (translators target the source forms via `pybabel extract`); not a finding.

## B. Inline authorization checks

**Clean.** Both `require_scope()` and `require_access()` route through `authorize()`:

- `backend/theourgia/api/deps.py:160–169` — `require_scope` → `authorize` → raise `ForbiddenError`
- `backend/theourgia/api/deps.py:205–221` — `require_access` → `authorize` → raise `ForbiddenError`

No direct owner / role checks found in `api/routers/`.

## C. Direct cross-cutting calls bypassing services

**Clean.**

- `backend/theourgia/core/federation/keys.py:77–80` — `os.open()` + `os.fdopen()` with `O_EXCL` and mode `0o600` for the federation keypair. This is correctly **outside** `core/storage/` scope: the keypair is a system file (not user content) that needs atomic-create + mode-0600 semantics the storage substrate intentionally doesn't expose.
- WebAuthn challenge store (`backend/theourgia/core/auth/challenges.py:104–139`) uses Redis directly, but for a purpose-specific lifecycle (one-time challenges with GETDEL atomicity) that's distinct from rate-limit counters or idempotency records. Not a finding.

No direct `smtplib`, `boto3`, or raw user-content file I/O detected outside substrate implementations.

## D. Models with `user_id` / owner column missing GDPR registration

**Expected gap.** The substrate exists; no feature has wired in yet. **Complete list of models that will need exporter + deletion handler registration:**

| Model | File | Per-user field |
|---|---|---|
| `BackupCode` | `backend/theourgia/models/auth.py:28` | `user_id` |
| `PasswordResetToken` | `backend/theourgia/models/auth.py:63` | `user_id` |
| `WebauthnCredential` | `backend/theourgia/models/webauthn.py:44` | `user_id` |
| `SealedKdfParams` | `backend/theourgia/models/crypto.py:85` | `user_id` |
| `Session` | `backend/theourgia/models/identity.py:141` | `user_id` |
| `Vault` | `backend/theourgia/models/identity.py:177` | `owner_id` |
| `Membership` | `backend/theourgia/models/identity.py:231` | `user_id` |
| `PrivateViewer` | `backend/theourgia/models/identity.py:270` | `user_id` |
| `Notification` | `backend/theourgia/models/notifications.py:51` | `user_id` |
| `NotificationPreferenceRow` | `backend/theourgia/models/notifications.py:115` | `user_id` |
| `Upload` | `backend/theourgia/models/uploads.py:50` | `owner_id` |
| `PluginCapabilityGrant` | `backend/theourgia/models/plugins.py:114` | `granted_by_user_id` |

These get registered per-feature in Phase 02+ when each domain ships its CRUD endpoints. The substrate's `GDPRService.coverage_audit()` flags any future model added without paired registration.

## E. Hardcoded scope strings

**Clean.** All scope usage references the `Scope` enum:

- `backend/theourgia/api/deps.py:199` — `Scope.ENTRY_READ`
- `backend/theourgia/api/routers/metrics.py:48` — `Scope.ADMIN_OBSERVE`
- `backend/theourgia/core/authz/defaults.py:39–55` — `Scope.*` references throughout

No bare string literals like `"entry.read"` found outside `scopes.py`.

## F. Magic numbers that should be `Settings`

**Actionable.** Database pool parameters are hardcoded in `backend/theourgia/core/db.py:44–46` and should be operator-configurable:

| Location | Value | Field |
|---|---|---|
| `backend/theourgia/core/db.py:44` | `10` | `pool_size` |
| `backend/theourgia/core/db.py:45` | `20` | `max_overflow` |
| `backend/theourgia/core/db.py:46` | `1800` | `pool_recycle` |

**Remediation:** add `db_pool_size` / `db_max_overflow` / `db_pool_recycle` fields to `Settings` and reference them in `db.py`.

Other numbers reviewed and judged correct as-is:

- `backend/theourgia/api/middleware.py:41` — `_MAX_INBOUND_LEN = 128` for request-ID validation. Local guard against malicious headers; not operator-tunable.
- `backend/theourgia/api/middleware.py:122` — CORS `max_age=600`. Could be a setting, low priority.

## G. TODO / FIXME / XXX / HACK comments

**Clean.** Grep found only `backend/theourgia/core/auth/totp.py:174` referencing the literal string `"XXXX-XXXX"` in a docstring example (formatting for backup-code display, not a tag).

## H. Sentry / telemetry imports outside `core/observability/sentry.py`

**Clean.** All `sentry_sdk` imports confined to `backend/theourgia/core/observability/sentry.py:54–73`. The zero-telemetry promise holds — the verifier test at `backend/tests/test_zero_telemetry.py` enforces this property automatically on every run.

## I. Module-level mutable state outside registries

**Clean.** All module-level mutables are explicit registries (events, templates, GDPR, policy) — by-design substrates. No accidental shared state.

## J. Other anomalies

**Clean.** Three string-literal patterns initially flagged turned out to be intentional:

- `"email.dry_run"` / `"email.failed"` (`backend/theourgia/core/email/service.py:90, 106`) — stable structured-log event names, not user-facing.
- `"authz.decision"` (`backend/theourgia/core/authz/authorize.py:111`) — same.

These are dotted identifiers (grep-friendly) by convention; they should NOT flow through `_()`.

---

## Actionable remediation list

Two items to fix before declaring the foundation done:

1. **F — Move DB pool settings to `Settings`.** Add `db_pool_size`, `db_max_overflow`, `db_pool_recycle` to `backend/theourgia/core/config.py` and reference them in `backend/theourgia/core/db.py:44–46`. Defaults stay at current values.

2. **D — Per-feature GDPR registration** (deferred work, not blocking). Each of the 12 models listed gets a registered exporter + deletion handler when its owning feature ships. Substrate's coverage_audit catches misses.

Plus the standing **S9 (caching)** and **S10 (per-user settings)** substrates that Sophia explicitly said are next: those are upcoming, not findings of this audit.

## What this audit didn't catch

The audit can detect *patterns*. It can't detect:

- Whether a substrate's API is the right shape long-term
- Whether the policy chain on a future feature is actually correct
- Edge cases that surface only when real user data lands

Those concerns get caught by real testing as features land. The audit's job is to verify that **the substrate is the canonical path** — and it is.

## Follow-up: translation pass (added after substrate sweep)

Sophia flagged after the post-audit work: "you're using english we're going to have to do another pass for translation."

She's right. As the persona, instance-settings, cache, clock, and user-settings substrates were built, error messages and validation strings were written in English source rather than wrapped in `_()`. This is exactly the kind of inline / inconsistent pattern the i18n substrate exists to prevent — but in practice every substrate that raises exceptions whose messages might surface to users needs a deliberate pass.

**Scope of the translation pass:**

| Tier | Examples | Priority |
|---|---|---|
| **A — user-facing** (returned to clients in 4xx/5xx responses) | `PersonaError` messages in `core/persona/service.py:82, 93, 143, 185, 240, 244, 260`; `PermissionError` raised by `core/instancesettings/service.py:get_public_typed`; APIError titles in `core/api/errors.py` | Wrap in `_lazy(...)` at definition site |
| **B — admin-facing** (only seen by hub admins / operators) | Audit log free-form fields, dashboard error displays | Wrap when the admin UI ships |
| **C — developer-only** (never surface to users) | `KeyError` / `ValueError` raised on registry misuse — `core/instancesettings/registry.py:127`, `core/usersettings/registry.py:148`, etc. | Leave in English (these are programming errors, not user errors) |

**When to do the pass:** Before Phase 02 endpoints land. The persona / instance-settings / etc. exceptions become user-facing only when the API surfaces them, which happens with the Phase 02 account-management UI. The substrate code itself has no API surface yet.

**Going-forward discipline:** When adding new substrate code, if it raises an exception whose message could plausibly surface to a user, wrap the message in `_lazy(...)` at the raise site. Don't accumulate English literals and translate later — that pattern is exactly what the i18n substrate was built to prevent.

**Updated remediation list:**

1. **D — Per-feature GDPR registration** (deferred to Phase 02+ feature work).
2. **Translation pass** (this section) — schedule before any Phase 02 endpoint exposes the new substrates' exceptions to users.

The DB-pool-settings finding from the original audit is fixed (commit `1396321`).
