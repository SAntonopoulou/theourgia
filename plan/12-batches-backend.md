# Phase 12 backend authoring plan (B137 → B142)

**Status:** OPEN — ready to execute.
**Modeled on:** `plan/11-batches-backend.md` (same six-batch shape).

This document **locks every backend product decision** for the
single-vault subset of Phase 12 Federation. The implementation
agent does not pick alternatives; the agent renders the locked
decisions across migrations, models, routers, and tests.

**Scope:** the per-vault hub + membership + private-viewer +
group-ritual + SSO + audit-export path that wires the H08
Cluster A frontend (15 surfaces · all shipped) to live data,
**without** the cross-instance wire protocol.

**Explicitly out of scope (Phase 12.5 or Phase 13):**

- The federation transport itself — HTTP Signatures sender +
  receiver, signed envelope verification, replay-nonce store,
  capability-token issuance. These ship as B143+ once a second
  test instance is available.
- ActivityPub adapter (Phase 13 / B150+).
- Federation peer discovery, peer browser GET endpoint, peer
  handshake state machine.
- Cross-instance group-ritual sync. The single-vault scheduler
  ships now; the cross-instance broadcast lands when transport
  does.
- Federation event broadcast — the local audit row is written;
  the equivalent outbound `Push` / `Mirror` / `Heartbeat`
  envelope is queued in a `federation_outbox` table that B143+
  drains.

Carry-forward backend conventions (proven B103-B135):

- `owner_id: UUID | None` with `ForeignKey("user.id",
  ondelete="SET NULL")`.
- Inline Pydantic schemas in router files.
- Pagination via `limit: int = 100` (max 500).
- `SoftDeleteMixin` via `deleted_at` where the model has an
  identity-bearing life cycle (hub, group_ritual). Membership
  + audit-event rows are append-only / hard-delete-only.
- Honesty rules enforced at the API layer; DB constraints back
  the most critical ones — `private_viewer.revoked_at` is
  immutable once set; `group_ritual_reflection` is write-once
  per `(ritual_id, participant_id)`; SSO assertion `expires_at`
  is checked at every read.
- `audit_event` table from Phase 01 is reused — Phase 12 emits
  rows with `kind=ADMIN` or `kind=FEDERATION`. No new audit
  table.

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|-------|-------|--------------|-----------:|------------:|
| B137 | Hub + membership + role + capability-grant schema + REST | Phase 01 (user) | ~1100 | ~32 |
| B138 | Private viewer + credential issue (one-time plaintext) | B137 | ~700 | ~26 |
| B139 | Group ritual + participant + fragment + reflection | B137 | ~950 | ~30 |
| B140 | Federation audit-log query + CSV export | B137-B139 (events emitted by each) | ~500 | ~20 |
| B141 | SSO assertion issue + verify (single-vault scaffold) | B137 (hub) | ~700 | ~24 |
| B142 | Phase 12 close-out (CHANGELOG · FEATURES · README · memory) | B137-B141 | (docs) | (none) |

Approximate total: ~3950 lines + ~132 tests.
Backend test count target: 2331 → ~2463 by Phase 12 (single-vault) close.

Alembic chain: 0055 → 0056 → 0057 → 0058 → (B140 ships no
migration; reuses `audit_event`) → 0059 (SSO).

---

## B137 — Hub + membership + role + capability-grant

> ⚠ **REVISION 2026-06-27 — IMPLEMENTATION DISCOVERY.** Phase 01
> `backend/theourgia/models/identity.py` already defines
> ``Hub`` (sparse: slug + display_name + description +
> tradition_tags CSV), ``Membership`` (with vault-OR-hub
> semantics + CHECK constraint + ``MembershipRole`` enum
> prefixed `hub_admin`/`hub_officer`/etc.), and
> ``PrivateViewer`` (vault-scoped, revoked-at timestamp).
>
> B137 therefore **EXTENDS** the existing identity-layer tables
> instead of creating new ones. The migration is ALTER TABLE +
> CREATE TABLE for the only genuinely new model:
> ``HubRoleCapability``. B138 likewise extends the existing
> ``PrivateViewer`` row with the H08 scope-kind + delivery +
> credential-hash columns rather than creating a parallel
> table.
>
> Frontend wire-key impact: H08 surface 12 renders the role
> chip without the `hub_` prefix. The backend either (a)
> strips the prefix at the read seam, or (b) renames the enum
> to bare values via a follow-on Alembic. Decision deferred to
> the executing batch.

**Files created (revised):**

- `backend/theourgia/models/hub_capability.py` — the only
  net-new model (`HubRoleCapability`).
- `backend/alembic/versions/0056_phase12_hubs.py` — ALTER
  TABLE on ``hub`` (add tagline, membership_policy enum,
  accepts_sso, auto_curates, public_banner_url,
  public_tradition_tags JSONB) + CREATE TABLE
  ``hub_role_capability``.
- `backend/theourgia/api/routers/v1/hubs.py` — REST surface
  against the merged model.
- `backend/tests/test_hubs.py` — unit tests against the
  router schemas + the default capability matrix invariants.

**Original plan body retained below as reference for the
fields B137 must end up with — only the *origin* changes.**

**Models:**

```python
class HubMembershipPolicy(str, enum.Enum):
    PUBLIC = "public"        # anyone can join, no approval
    OWA = "open_with_approval"  # anyone can request, officer approves
    PRIVATE = "private"      # invite-only


class HubRole(str, enum.Enum):
    ADMIN = "admin"
    OFFICER = "officer"
    MODERATOR = "moderator"
    MEMBER = "member"
    OBSERVER = "observer"


class HubCapability(str, enum.Enum):
    EDIT_HUB_CONTENT = "edit_hub_content"
    MODERATE_SUBMISSIONS = "moderate_submissions"
    MANAGE_MEMBERS = "manage_members"
    SEND_NEWSLETTERS = "send_newsletters"
    RUN_ANALYTICS_QUERIES = "run_analytics_queries"
    ACCEPT_FEDERATION_PEERS = "accept_federation_peers"
    EDIT_ROLE_DEFINITIONS = "edit_role_definitions"
    MANAGE_PERMISSION_MATRIX = "manage_permission_matrix"
    VIEW_AUDIT_LOG = "view_audit_log"
    SCHEDULE_GROUP_RITUALS = "schedule_group_rituals"
    APPROVE_CURATION_SUBMISSIONS = "approve_curation_submissions"


class Hub(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "hub"

    slug: str = Field(index=True, unique=True, max_length=80)
    name: str = Field(max_length=240)
    tagline: str | None = Field(default=None, max_length=420)
    description: str | None = None  # markdown

    owner_id: UUID = Field(foreign_key="user.id")
    membership_policy: HubMembershipPolicy = Field(
        default=HubMembershipPolicy.PRIVATE,
    )
    accepts_sso: bool = Field(default=False)
    auto_curates: bool = Field(default=False)

    # Public face — only used when membership_policy != PRIVATE.
    public_banner_url: str | None = None
    public_tradition_tags: list[str] = Field(default_factory=list, sa_column=Column(JSONB))


class Membership(IDMixin, TimestampMixin, table=True):
    __tablename__ = "membership"
    __table_args__ = (
        UniqueConstraint("hub_id", "user_id", name="uq_membership_hub_user"),
    )

    hub_id: UUID = Field(foreign_key="hub.id", ondelete="CASCADE")
    user_id: UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    role: HubRole = Field(default=HubRole.MEMBER)
    joined_at: datetime = Field(default_factory=_utcnow)


class HubRoleCapability(SQLModel, table=True):
    """Per-role capability grants. Built-in roles get seeded
    defaults at hub creation. Custom roles append rows."""
    __tablename__ = "hub_role_capability"
    __table_args__ = (
        PrimaryKeyConstraint("hub_id", "role", "capability"),
    )

    hub_id: UUID = Field(foreign_key="hub.id", ondelete="CASCADE")
    role: HubRole
    capability: HubCapability
```

**REST routes:**

- `GET  /api/v1/hubs` — list hubs the caller has any membership in (+ owned hubs).
- `POST /api/v1/hubs` — create a hub. Seeds capability grants for the five built-in roles per the H08 default matrix. Owner gets `ADMIN` membership row written same transaction.
- `GET  /api/v1/hubs/{id}` — full hub. 403 if caller is not a member (when `membership_policy=PRIVATE`).
- `PATCH /api/v1/hubs/{id}` — owner / admin only.
- `GET  /api/v1/hubs/{id}/members` — list members. 403 if caller lacks `MANAGE_MEMBERS`.
- `POST /api/v1/hubs/{id}/members/{user_id}/role` — change a member's role. 403 unless caller has `MANAGE_MEMBERS` AND target is not the owner.
- `DELETE /api/v1/hubs/{id}/members/{user_id}` — remove a member. Same checks.
- `GET  /api/v1/hubs/{id}/roles` — full capability matrix.
- `PATCH /api/v1/hubs/{id}/roles` — bulk-replace the matrix. 403 unless caller has `MANAGE_PERMISSION_MATRIX`. Writes one ADMIN audit row per cell changed.

**Tests cover:**

- Owner is auto-admin on creation; capability seed exists for all five built-in roles.
- Default capability matrix mirrors the H08 brief (observer all-false; admin all-true; officer / moderator / member as specified).
- Private hub returns 403 to non-members.
- Public hub returns the full record to anyone.
- Role-change refuses to demote the owner.
- Permission-matrix patch writes one audit row per cell + emits `kind=ADMIN`.
- Membership uniqueness — second insert for same (hub, user) raises IntegrityError.

---

## B138 — Private viewer

**Files created:**

- `backend/theourgia/models/private_viewer.py`
- `backend/alembic/versions/0057_phase12_private_viewers.py`
- `backend/theourgia/api/routers/v1/private_viewers.py`
- `backend/tests/test_private_viewers.py`

**Models:**

```python
class PrivateViewerScopeKind(str, enum.Enum):
    FULL = "full"
    TAG = "tag"
    KIND = "kind"
    SPECIFIC = "specific"


class PrivateViewerDelivery(str, enum.Enum):
    SIGNED_LINK = "signed_link"
    PASSPHRASE = "passphrase"


class PrivateViewer(IDMixin, TimestampMixin, table=True):
    __tablename__ = "private_viewer"

    owner_id: UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    label: str = Field(max_length=240)
    email_or_handle: str = Field(max_length=320)

    scope_kind: PrivateViewerScopeKind = Field(
        default=PrivateViewerScopeKind.TAG,
    )
    # JSONB body — for TAG: {"tags": [...]}, for KIND: {"kinds": [...]},
    # for SPECIFIC: {"entry_ids": [...]}, for FULL: {} (empty)
    scope_payload: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    delivery: PrivateViewerDelivery = Field(
        default=PrivateViewerDelivery.SIGNED_LINK,
    )

    # The credential. PBKDF2-HMAC-SHA256 over the plaintext, stored
    # alongside the salt. The plaintext is RETURNED ONCE at POST
    # time; never persisted in raw form; never recoverable.
    credential_hash: bytes = Field(sa_column_kwargs={"nullable": False})
    credential_salt: bytes = Field(sa_column_kwargs={"nullable": False})

    last_used_at: datetime | None = None
    revoked_at: datetime | None = None
```

**REST routes:**

- `GET  /api/v1/private-viewers` — list owned (active + revoked).
- `POST /api/v1/private-viewers` — create. Body: `{label, email_or_handle, scope_kind, scope_payload, delivery}`. Server generates a 32-byte URL-safe plaintext, hashes via PBKDF2-HMAC-SHA256 (100,000 iters, fresh 16-byte salt), persists hash + salt. Response: `{viewer, plaintext_credential}` — **the only time the plaintext is returned.**
- `POST /api/v1/private-viewers/{id}/revoke` — sets `revoked_at = now()`. 409 if already revoked.

**Honesty constraints:**

- `revoked_at` once set is immutable (DB CHECK constraint + service layer guard).
- Default `scope_kind` enforced at the API layer: if the client sends `full` with `scope_payload={}` it's accepted, but the schema `scope_kind` default is `TAG`.
- Audit row written at issue (`kind=FEDERATION`, action `private_viewer.issue`) and at revoke (`private_viewer.revoke`).

---

## B139 — Group ritual + participant + fragment + reflection

**Files created:**

- `backend/theourgia/models/group_ritual.py`
- `backend/alembic/versions/0058_phase12_group_rituals.py`
- `backend/theourgia/api/routers/v1/group_rituals.py`
- `backend/tests/test_group_rituals.py`

**Models:**

```python
class GroupRitualLocation(str, enum.Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    DISPERSED = "dispersed"


class GroupRitualStatus(str, enum.Enum):
    DRAFT = "draft"
    INVITED = "invited"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ParticipantStatus(str, enum.Enum):
    INVITED = "invited"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    IN_RITUAL = "in_ritual"
    COMPLETED = "completed"


class GroupRitual(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "group_ritual"

    organizer_id: UUID = Field(foreign_key="user.id")
    hub_id: UUID | None = Field(default=None, foreign_key="hub.id")

    title: str = Field(max_length=300)
    description: str | None = None
    scheduled_for_utc: datetime
    location: GroupRitualLocation = Field(default=GroupRitualLocation.DISPERSED)
    location_detail: str | None = None  # for PHYSICAL

    shared_script: str | None = None  # markdown
    correspondences_payload: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    egregore_entity_id: UUID | None = Field(default=None, foreign_key="entity.id")
    status: GroupRitualStatus = Field(default=GroupRitualStatus.DRAFT)


class GroupRitualParticipant(SQLModel, table=True):
    __tablename__ = "group_ritual_participant"
    __table_args__ = (
        PrimaryKeyConstraint("ritual_id", "user_id"),
    )

    ritual_id: UUID = Field(foreign_key="group_ritual.id", ondelete="CASCADE")
    user_id: UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    status: ParticipantStatus = Field(default=ParticipantStatus.INVITED)
    role_in_ritual: str | None = Field(default=None, max_length=120)


class GroupRitualFragment(IDMixin, TimestampMixin, table=True):
    """One participant's contribution during the live ritual. Append-only."""
    __tablename__ = "group_ritual_fragment"

    ritual_id: UUID = Field(foreign_key="group_ritual.id", ondelete="CASCADE")
    author_id: UUID = Field(foreign_key="user.id")
    body: str
    posted_at_utc: datetime = Field(default_factory=_utcnow)


class GroupRitualReflection(IDMixin, TimestampMixin, table=True):
    """Post-ritual write-once reflection. One per participant."""
    __tablename__ = "group_ritual_reflection"
    __table_args__ = (
        UniqueConstraint("ritual_id", "author_id", name="uq_reflection_ritual_author"),
    )

    ritual_id: UUID = Field(foreign_key="group_ritual.id", ondelete="CASCADE")
    author_id: UUID = Field(foreign_key="user.id")
    body: str
```

**REST surface:**

- `GET    /api/v1/group-rituals` — list (filtered by organizer, hub, status).
- `POST   /api/v1/group-rituals` — create draft.
- `GET    /api/v1/group-rituals/{id}` — full record (with participants, fragments, reflections).
- `PATCH  /api/v1/group-rituals/{id}` — organizer-only; refuses if `status != DRAFT`.
- `POST   /api/v1/group-rituals/{id}/invite` — bulk invite (body: `{user_ids: [...]}`). Sets status `DRAFT → INVITED` on first call.
- `POST   /api/v1/group-rituals/{id}/respond` — caller-as-participant; body: `{accepted: bool}`.
- `POST   /api/v1/group-rituals/{id}/start` — organizer; status `INVITED → IN_PROGRESS`.
- `POST   /api/v1/group-rituals/{id}/fragments` — body: `{body}`. Only when status=IN_PROGRESS.
- `POST   /api/v1/group-rituals/{id}/complete` — caller-as-participant; sets their participant status to COMPLETED.
- `POST   /api/v1/group-rituals/{id}/reflection` — body: `{body}`. Write-once per participant (409 if exists).
- `POST   /api/v1/group-rituals/{id}/close` — organizer; status → COMPLETED.

---

## B140 — Federation audit-log query + CSV export

**Files created:**

- `backend/theourgia/api/routers/v1/federation_audit.py`
- `backend/tests/test_federation_audit.py`

(no new migration — reuses `audit_event`).

**REST surface:**

- `GET /api/v1/hubs/{id}/audit` — query the existing
  `audit_event` table filtered to `hub_id={id}`. Pagination,
  actor/event-type/time-range filters. 403 unless caller has
  `VIEW_AUDIT_LOG`.
- `GET /api/v1/hubs/{id}/audit.csv` — same filter set, CSV
  serialized envelope-by-row. Forensic artefact — never
  abridged.

---

## B141 — SSO assertion (single-vault scaffold)

**Files created:**

- `backend/theourgia/models/sso_assertion.py`
- `backend/alembic/versions/0059_phase12_sso.py`
- `backend/theourgia/api/routers/v1/sso.py`
- `backend/tests/test_sso.py`

**Models:**

```python
class SsoAssertion(IDMixin, TimestampMixin, table=True):
    """A signed assertion the practitioner's vault issues for
    a specific request — e.g. 'I, did:theourgia:hearth/aspasia,
    consent to joining did:theourgia:aurora/coven for 24h.'

    The Ed25519 signing happens in B143+; B141 stores the
    payload + a deterministic id so the surface can render the
    consent moment + revoke list."""
    __tablename__ = "sso_assertion"

    issuer_user_id: UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    target_did: str = Field(max_length=255)  # did:theourgia:host:slug
    scope_payload: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    expires_at_utc: datetime
    revoked_at: datetime | None = None
    signature_b64: str | None = None  # filled by B143 (Ed25519 over canonical JSON)
```

**REST:**

- `GET  /api/v1/sso/assertions` — list issuer's assertions (active first; revoked + expired at bottom).
- `POST /api/v1/sso/authorize` — create. Server fixes
  `expires_at_utc = now + 24h` (rule from H08).
- `POST /api/v1/sso/assertions/{id}/revoke` — sets
  `revoked_at`. Immutable once set.

---

## B142 — Phase 12 close-out

Documentation only: CHANGELOG, FEATURES, README, memory index update. No code; only the close-out artefacts.

---

## Definition of Done (single-vault subset)

- [ ] B137 — hub create + membership + role capability matrix all green.
- [ ] B138 — private viewer issue returns plaintext exactly once.
- [ ] B139 — group ritual full lifecycle (draft → invited → in-progress → completed) tested.
- [ ] B140 — audit log filter + CSV export against seeded events.
- [ ] B141 — SSO assertion issue + revoke against the local issuer.
- [ ] B142 — README updated; memory index updated; CHANGELOG.

Phase 12.5 (transport) and Phase 13 (ActivityPub) are explicitly
NOT in this plan. They land once a second test instance is
available + the threat model is signed off.
