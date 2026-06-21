# Phase 05 — Batches 38-42: Relational ledger (offerings · contracts · oaths · initiations · servitors · attestations)

> Five sibling tables that together comprise the practitioner's relational record. All ship via Alembic migrations 0023 + 0024.

## Batch 38 — Offerings ledger

`backend/theourgia/models/offerings.py` + Alembic 0023:

- **`Offering`** — entity_id, working_id (optional FK to entry), offered_at, location + lat/lon, structured `items` (JSONB), intention, `reception_perceived` enum (none/faint/clear/strong/overwhelming), outcome_notes, astro_snapshot, calendar_snapshot, owner_id.
- **`RecurringOffering`** — entity_id, label, `cadence` string (with documented vocabulary: `daily` / `weekly` / `monthly` / `lunar:deipnon` / `lunar:noumenia` / `festival:samhain` / `cron:...`), items_template, next_due_at, is_active, owner_id.

Items list is structured but extensible — common kinds (wine / water / milk / honey / incense / food / flowers / libation / blood / breath / song / dance / money / time) plus plugin-registered kinds.

The `OfferingReception` enum is informative-not-diagnostic per the plan — practitioner discernment varies.

## Batch 39 — Contracts / pacts

`backend/theourgia/models/contracts.py` + Alembic 0024:

- **`Contract`** — entity_id, title, terms (rich text), `our_obligations` + `their_obligations` (structured JSONB lists), `status` enum (draft / active / fulfilled / expired / dissolved / breached), effective_at + expires_at + renewable flag, `binding_kind` enum (verbal / written / blood / breath / item-bound / name-bound / other), witness_entity_ids (JSONB array), dissolution_ritual_id (FK to entry).
- **`ObligationStatus`** — pending / in-progress / fulfilled / overdue / waived (stored within the JSONB obligation items).

Why obligations as structured JSON rather than rich text: the Phase-05-aware Celery task can find overdue items deterministically. Per-obligation status drives the reminder workflow.

## Batch 40 — Oaths + Initiations

`backend/theourgia/models/oaths.py` + `initiations.py` + Alembic 0024:

- **`Oath`** — `kind` (self / tradition / order / deity / partner / community / other), recipient_entity_id (optional FK) OR recipient_text, text (NULL when sealed), `encryption_mode` defaults to **sealed** per the plan, encrypted_payload (BYTEA), taken_at, expires_at, renewal_cadence, `status` (active / fulfilled / broken / renounced / lapsed), `accountability_checkpoints` (JSONB list of {due_at, completed_at, reflection_entry_id}).
- **`Initiation`** — tradition (plaintext, user-controlled visibility), `status` (active / lapsed / suspended / resigned), `encryption_mode` defaults to **sealed**, encrypted_payload, publicly_disclosed_at (NULL except for user-opted lineage attestations).

The plan's invariant: initiation records default sealed; the writer-side API hard-prevents downgrade (UI mirrors with hard-prevent-publish per the same plan note). The data model expresses this by keeping detailed fields out of plaintext columns — only `tradition` + `status` ship outside the encrypted payload.

## Batch 41 — Servitors + egregores

`backend/theourgia/models/servitors.py` + Alembic 0024:

- **`Servitor`** — name, `kind` (servitor / egregore), purpose, sigil_upload_id (FK), creation_entry_id (FK), feeding_cadence + feeding_method, last_fed_at, lifespan_limit (date), `status` (active / dormant / retired / decommissioned), `members` (JSONB list of user_ids for egregore kind).
- **`ServitorTask`** — servitor_id, description, given_at, target_completion_at, completed_at, `status` (pending / in-progress / completed / abandoned), outcome_notes.

Per the plan's tone-critical note: the UI must NOT gamify ("your servitor is hungry!"). The data layer is purely descriptive; the schedule_publish_at + feeding cadence drive reminders, never "alerts."

Egregores are individual servitors with `kind = egregore` and a `members` list — feeds Phase 12 (federation) where hub egregores compose across multiple practitioners.

## Batch 42 — Lineage attestations + counter-signing

`backend/theourgia/models/attestations.py` + Alembic 0024:

- **`Attestation`** — subject_user_id + subject_persona_id, `kind` (initiation / grade-granted / membership / teacher-student / ordination / authorship / other), description, tradition, grade_or_degree, granted_at, **signed_statement (canonical JSON bytes — what signatures verify against)**, `visibility` (private / viewer / network / public), revoked_at (denormalised for fast UI lookup).
- **`AttestationSignature`** — attestation_id (FK), signer_user_id, signer_label (human-readable), signer_public_key (32 bytes Ed25519), signature (64 bytes Ed25519), `role` ("self" / "counter-sign" / "revocation"), signed_at.

The trust model from the plan: **peer-to-peer, no central authority**. Each authority publishes their public key (typically on their profile); verifiers check signatures against those keys. Revocation is just another signed row with `role = "revocation"`.

The actual Ed25519 sign + verify operations land in a follow-up substrate batch (the existing `theourgia.core.crypto` module already provides the primitives; wiring them into a `/api/v1/attestations/:id/sign` endpoint is the next concrete piece).

## Tests

`backend/tests/test_offerings.py` — 9 tests.
`backend/tests/test_relational_ledger.py` — 22 tests covering contracts / oaths / initiations / servitors / attestations.

**Full backend suite: 1227 tests pass** (+31 new across Batches 38-42).

## Plan invariants enforced by construction

| Plan invariant | How |
|---|---|
| Initiation records default sealed | `Initiation.encryption_mode` default = SEALED; column non-nullable with server_default |
| Oath default sealed | `Oath.encryption_mode` default = SEALED |
| Attestation default private | `Attestation.visibility` default = PRIVATE |
| Counter-signing is peer-to-peer | No central-authority field; signatures keyed by `signer_public_key` |
| Revocation preserves history | Revocation = a new `AttestationSignature` row with `role = revocation`; the parent attestation is never deleted |
| Egregores compose multiple humans | `Servitor.members` JSONB array of user_ids when `kind = egregore` |
| No Tamagotchi tone for servitors | Data layer is descriptive only; UI guidance per `plan/05` Risks section |
| Contract obligation reminders deterministic | Structured JSONB items with per-item status — Celery task finds overdue rows by JSON path query |

## Deferred to follow-up batches

- **API CRUD endpoints** for all 5 ledgers — trivial wrappers; land alongside the frontend ledger surfaces.
- **Ed25519 sign/verify** endpoints — `core.crypto` primitives exist; the `/api/v1/attestations/:id/sign` + `/verify` endpoints wire them.
- **Reminder Celery tasks** — extend `core/tasks/scheduler.py` with promoters for: oath accountability checkpoints, contract obligations approaching due_at, servitor feeding cadence, recurring offerings.
- **`/entity/aggregate` endpoint** — resolves alias-graph + EntityView to a unified read-side view. Substrate ready; SQL is in scope for a follow-up batch.

## Phase 05 DoD status after this batch bundle

| Item | Status |
|---|---|
| Entity CRUD with all metadata + m2m | 🟡 Model ✅; API CRUD follows |
| **Offerings, contracts, oaths, initiations, servitors — lifecycles** | **🟡 Data model ✅; API + reminder tasks follow** |
| **Initiation records default sealed; impossible to publish** | **✅ (model invariant)** |
| Entity profile aggregates from all linked sources | 🟡 EntityView + aliases ready; aggregator SQL follows |
| /entity slash command with hover preview | ⏳ Batch 35 (Tiptap; designer hand-off) |
| Feeding reminders for servitors | 🟡 Schema ready; Celery task follows |
| Contract obligation reminders | 🟡 Schema ready; Celery task follows |
| Library catalog entity-tagging | 🟡 Tables ready; join model follows |
| Privacy review | ⏳ Phase-completion gate |
