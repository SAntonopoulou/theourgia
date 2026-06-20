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
