# Phase 05 — Batch 43: API CRUD cleanup + signing + scheduler

> Closes Phase 05 backend. Substrate from Batches 37-42 was data-layer
> only; this batch surfaces every ledger via REST, wires Ed25519
> sign/verify for lineage attestations, adds the entity aggregate
> resolver that resolves the alias-graph + saved-view projection at
> read time, and extends the Celery beat scheduler with the four
> Phase 05 reminder tasks.

## What shipped

### 7 new ledger routers under `backend/theourgia/api/routers/v1/`

| Router | Endpoints |
|---|---|
| `offerings.py` | `GET/POST/GET/PATCH/DELETE /offerings` · `GET/POST/GET/PATCH/DELETE /recurring-offerings` |
| `contracts.py` | `GET/POST/GET/PATCH/DELETE /contracts` · `POST /contracts/:id/fulfill-obligation` |
| `oaths.py` | `GET/POST/GET/PATCH/DELETE /oaths` (sealed default, refuses sealed-without-ciphertext) |
| `initiations.py` | `GET/POST/GET/PATCH/DELETE /initiations` (writer accepts only `encryption_mode = sealed`) |
| `servitors.py` | Servitor CRUD · `POST /:id/feed` · `ServitorTask` CRUD |
| `entity_aliases.py` | Alias-graph CRUD · saved-view CRUD |
| `attestations.py` | Create+self-sign · counter-sign / revoke · `GET /:id/verify` |

### Entity router extended for Phase 05 shape

`routers/v1/entities.py` now exposes every Phase 05 column (epithets,
tradition_tags, attributions, relationship_status, contact
timestamps, notes_private / notes_shareable, visibility, origin) and
adds:

* **`GET /api/v1/entities/:id/aggregate`** — resolves the alias-graph
  + EntityView projection. Returns the focus + neighbours (typed +
  directed) + the `member_entity_ids` set that should be considered
  together when aggregating offerings / contracts / workings, and the
  ids of every EntityView containing the focus.

### Ed25519 sign / verify (`core/federation/signing.py`)

* `canonical_attestation_bytes(claim)` — deterministic JSON encoding
  (sorted keys, no whitespace, ensure_ascii=False) so signatures
  verify against exact bytes.
* `sign_bytes` / `verify_signature` — minimal wrappers over the
  `cryptography` Ed25519 primitives. `verify_signature` returns
  `False` on any failure; it never raises.

The attestations router supports two signing paths:
* **Client-side**: caller supplies a precomputed 64-byte signature
  over the canonical claim bytes (production path; client never
  exposes private key material).
* **Server-side**: caller supplies the 32-byte raw private key
  (integration-test path). The server signs, never persists the key.

`POST /attestations/:id/sign` adds counter-signatures + revocations
under the same `Attestation`. Revocations set the denormalised
`revoked_at` column for fast UI lookup without erasing the signature
chain. `GET /attestations/:id/verify` walks every signature and
reports per-signature status so the UI can render
"Soror Ευ. Α.'s self-signature: ✓ valid · L. Vespera (counter): ✓ valid".

### Celery beat — Phase 05 reminder tasks

`core/tasks/phase05.py` adds four scheduled checks. The beat schedule
in `core/tasks/app.py` runs them every 15 minutes (the reminders ride
the daily / weekly review cadence, not the per-minute publication
cadence).

| Task | What it does |
|---|---|
| `check_oath_checkpoints` | Counts oath accountability checkpoints whose `due_at` has passed and `completed_at` is unset. |
| `check_contract_obligations` | Flips `pending`/`in-progress` obligations to `overdue` in place once their `due_at` has passed. Uses `flag_modified` to mark the JSONB column dirty. |
| `check_servitor_feeding` | Counts servitors whose `last_fed_at + feeding_cadence` has passed. Conservative cadence vocabulary today (`daily` / `weekly` / `monthly` only); `cron:` / `lunar:` advance in a follow-up. |
| `check_recurring_offerings` | Surfaces recurring offerings whose `next_due_at` has fallen + advances `next_due_at` for the named cadences. |

The combined `run_phase05_reminders` Celery task aggregates the four
into one beat tick, returning per-check status dicts for observability.

## Tests

`backend/tests/test_phase05_routers.py` — 25 pure-Python class-shape
tests covering:

* Pydantic payload shapes for every new router (defaults, enums,
  literal sets).
* Contract `fulfill-obligation` helper (in-place mutation + miss-id
  path).
* Initiation writer's sealed-only constraint (literal rejects
  `encryption_mode="none"` at parse).
* Servitor feed + task payloads.
* Entity aggregate response shape (focus + neighbours + member ids +
  views).
* Ed25519 canonical-bytes determinism + Unicode passthrough.
* Sign → verify round-trip + tamper rejection + garbage-signature
  no-raise.
* Reminder helpers (`_feeding_overdue`, `_advance_next_due`) over the
  named cadence vocabulary + None / unknown fallback.

**Full backend suite: 1252 tests pass** (+25 over Phase 05 substrate).

## Phase 05 DoD — final status

| Item | Status |
|---|---|
| Entity expansion (epithets / tradition tags / attributions / relationship / origin / etc.) | ✅ |
| Alias-graph (typed directed edges) | ✅ |
| Saved views (`EntityView`) | ✅ |
| Offerings ledger + recurring offerings | ✅ |
| Contracts + structured obligations + fulfill action | ✅ |
| Oaths (default sealed) | ✅ |
| Initiations (sealed-only) | ✅ |
| Servitors + tasks + feeding | ✅ |
| Lineage attestations + Ed25519 self-sign + counter-sign + revoke + verify | ✅ |
| Entity aggregate read-side resolver | ✅ |
| Celery reminder tasks (oaths / contracts / servitors / recurring offerings) | ✅ |
| Frontend surfaces (entity browser, relational ledger dashboards) | 🟡 blocked on **designer handoff #3** (queued after handoffs 01 + 02 return) |

## What's NOT in this batch (deferred / blocked)

- **Frontend surfaces**: blocked on designer handoff #3 — bundle when
  handoffs 01 + 02 are processed.
- **Lunar / cron / festival cadence advancement** in
  `check_servitor_feeding` and `check_recurring_offerings`: the
  helpers return `False` / `None` for unknown cadences today and the
  loop logs them but doesn't fire. The follow-up batch wires
  `core/calendars` + the Phase 03 ephemeris to resolve them.
- **Notification dispatch from the reminder tasks**: the tasks
  currently log + flip state; they don't yet enqueue a
  `NotificationService.send_to_user(...)`. Lands when the per-template
  registrations + the in-app inbox UI ship.
- **Authorization on Phase 05 routers**: routers follow the Phase 02
  "anonymous-write allowed; gating ships with auth surface" pattern.
  The authz substrate (`core/authz`) already exists; per-router
  scopes land when the admin role mapping is finalised.

## Next

**Phase 06 — Divination & Practice** starts immediately. Per
`plan/06-divination-and-practice.md`: real Tarot / I Ching / Geomancy
/ Runes / Scrying engines with `*Cast(seed)` deterministic functions.
Zero designer dependency until the deep-drilldown surfaces (see
`designer_handoff_02.handoff §5/10`).

**Future**: the "Daily practice tracker" feature (queued post-Phase
06) — a self-designed-ritual companion to Liber Resh. Documented in
`plan/future-daily-practice-tracker.md` and
`memory/project_daily_practice_tracker.md`.
