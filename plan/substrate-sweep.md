# Substrate sweep — between Phase 01 and Phase 02

While Phase 02 (Frontend Foundations) waits for the designer's design-system handoff, we are landing a short sequence of cross-cutting infrastructure substrates. Each substrate is the "scaffold-now, real impl per-batch-later" pattern — the same shape the Restic backup substrate took before Celery beat wired it up.

**Why now:** Every feature we ship between today and a dedicated "retrofit pass" accumulates inline ad-hoc usage of the cross-cutting concerns below. Putting the substrates in place first means features written from this point onward plug into stable interfaces (`email_service.send_template`, `_("...")`, `event_bus.publish`, `notification_service.send_to_user`, `storage_service.put`) instead of inlining or being skipped and retrofitted later.

**Order (decided 2026-06-20):**

| # | Substrate | Why first |
|---|---|---|
| S1 | **Email** | Every feature with a user-facing action needs to be able to send mail; without this, retrofit hits hundreds of call sites |
| S2 | **i18n / translation** | Sophia's day-one i18n decision; every user-facing string must flow through `_()` from the first feature onward |
| S3 | **Event bus + outbox** | The integration spine — plugins, federation, AI agents, notifications, email digests all subscribe to the same bus |
| S4 | **Notifications** | In-app + push + email-digest dispatch; features call into the notification service to "tell user X happened" |
| S5 | **File uploads / object storage** | Avatars, sigil images, ritual photos, audio recordings — every content-bearing feature accepts uploads |

**What each substrate batch includes:**

- The core package (interface + 2-4 backends, real but inert without keys)
- Settings additions to `core/config.py`
- A persistence model + Alembic migration if the substrate needs one (EmailLog, OutboxEvent, Notification, NotificationPreference, Upload)
- FastAPI dependency-injection wiring
- Celery task for async dispatch where applicable
- Tests with green pytest run before commit
- `docs/admin/<substrate>.md` for operators
- `docs/dev/<substrate>.md` for developers

**What each substrate batch deliberately does NOT include:**

- Real provider keys (operator picks at deploy time)
- UI surfaces (Phase 02+)
- The first feature that uses it (lands when its phase does)

**After the sweep:** Phase 02 resumes with the full feature catalog. New features should treat these substrates as the canonical integration points — never inline email/i18n/event/notification/upload logic. If a substrate is missing something a feature needs, extend the substrate, don't sidestep it.

## Second wave (S6–S8) — authorization / GDPR / rate limiting

Discovered after S1–S5 landed: three more cross-cutting gaps that would otherwise become per-feature inline code.

| # | Substrate | Why now |
|---|---|---|
| S6 | **Per-resource authorization** | `require_scope` in `api/deps.py` is currently a placeholder accepting any authenticated user. Every endpoint that lands without this substrate either over-permits or inlines its own check. Pattern: `authorize(user, action, resource, context) -> AuthorizationDecision` composed from registered policies |
| S7 | **GDPR (export + deletion + consent)** | Sophia's rule: GDPR compliance from architecture, not retrofitted. Pattern: feature owners register `register_exporter(...)` and `register_deletion_handler(...)`; central endpoints invoke the registry |
| S8 | **Rate limiting + idempotency** | Marked deferred in `middleware.py` from Phase 01. Same shape as substrate work — middleware-declarative per-endpoint |

## Deferred (must not be forgotten)

| # | Substrate | When to build |
|---|---|---|
| S9 | **Caching** (Redis prod, in-memory tests) | Build alongside the first feature that needs it — likely Phase 03 astrology / gematria. **Do not let "I'll just use Redis directly" become precedent.** |
| S10 | **Per-user settings** | Generalize the notification-preference shape. Build when Phase 02 ships account UI |

## Foundation audit pass (after S6–S8)

Between the second wave completing and Phase 02 feature work beginning, sweep the codebase for:

- Hardcoded English strings that should be `_()`
- Ad-hoc auth checks that should be `authorize()`
- Inline `smtplib` / direct provider calls bypassing the email service
- Direct event-handler invocations bypassing the bus
- Raw file I/O for user content bypassing the storage service
- Manual cache wiring (`redis.set(...)` etc.) bypassing the (forthcoming) cache substrate
- Manual rate-limit checks bypassing the rate-limit substrate
- Anything that looks like ad-hoc cross-cutting logic worth extracting

Findings get recorded in a dated `plan/foundation-audit-YYYY-MM-DD.md` before remediation. The goal is a firm, sound foundation before any Phase 02 feature lands.
