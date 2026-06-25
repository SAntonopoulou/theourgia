# Phase 07 Backend — Implementation Plan (B103 → B109)

> **Status:** Planned · execution pauses here · resumes next session.
> **Planned by:** Soror Ευ. Α. (build side) · 2026-06-23.
> **Purpose:** Phase 07 frontend shipped in H05 (`B89-B96`). Frontend currently runs against in-memory fixtures. This plan authors the backend (Alembic models + SQLModel + FastAPI routes + tests) and then wires the frontend pickers / save handlers to live endpoints. Phase 07 closes when this plan completes.

The plan locks every backend decision so execution next session is a typing pass, not a thinking pass.

---

## Cross-cutting decisions (apply to every batch)

These are pinned before B103 starts:

### 1. Model conventions

- All workshop tables use **`IDMixin + TimestampMixin + SoftDeleteMixin`** (`backend/theourgia/models/base.py`). UUIDv7 PKs · `created_at` / `updated_at` · `deleted_at` for soft-delete.
- All workshop tables carry **`owner_id: Optional[UUID]`** (FK to `user.id`, nullable for legacy anonymous-write per the `Entry` precedent) — **NOT** `vault_id`. The codebase does not have a separate `vault` table; the user is the vault. Indexed via `Index("ix_<table>_owner", "owner_id")`. Matches `Oath`, `Initiation`, `Entry`.
- All workshop tables that include user-authored long text use **`Text`** (not `String`).
- All JSONB columns use `sa_column=Column(JSONB, nullable=False, server_default='{}')` or `'[]'` depending on shape — the model-level default lets the API skip null-handling.
- **No new owner-scoping decorator** — use the `OptionalCookieUser` dep already imported by every router (e.g. `Depends(get_optional_user_from_cookie)`). Scope queries to `owner_id == current_user.id`.

### 2. Encryption (Mode B) for sealed talismans

Reuses the existing `EncryptionMode` enum from `theourgia.models.entries`. The Talisman model carries `encryption_mode: EncryptionMode` + `encrypted_payload: bytes | None`. Sealing flow:

- Client encrypts `front_svg + back_svg + components` JSON client-side with the vault's key.
- POST `/api/v1/talismans/{id}/seal` accepts `{ ciphertext: bytes, iv: bytes }`, sets `encryption_mode=SEALED`, stores the ciphertext, **null-out** the plaintext columns.
- POST `/api/v1/talismans/{id}/unseal` is the same as Oath/Initiation unseal — the API returns the ciphertext + IV; the client decrypts in memory; the server never sees the key.

The flow mirrors `Oath` exactly. Same Mode B discipline.

### 3. Soft-delete + audit

- Soft-delete: `DELETE` endpoints set `deleted_at = now()` and return 204. List endpoints filter `deleted_at IS NULL` by default; admin `?include_deleted=true` param flips it (consistent with existing `entries.py` pattern).
- Audit: writes to `audit_log` table on create / update / delete / fork. The existing `theourgia.core.audit.record_event` helper handles this. Same pattern as the entries router.

### 4. Federation prep (Phase 12 readiness)

**Deferred.** No existing model carries `canonical_id` / `instance_id` today — including `Entry`. Adding those columns to Workshop tables would prematurely commit to a federation schema that the rest of the codebase doesn't yet share. When Phase 12 opens, a dedicated cross-cutting batch will add federation-id columns to every table that needs them, with a single Alembic migration covering all tables. Workshop tables in B103-B107 follow the existing two-id pattern (`id` PK + `owner_id` FK) only.

The `parent_<domain>_id` versioning column **does** ship per B103-B107 since that's domain-specific lineage, not federation lineage.

### 5. Versioning ("Edit a new version" pattern)

Per the H05 "committed-make + read-only-on-reopen" rule. Every workshop domain that supports versioning (Sigil, Talisman, Circle — NOT Tool/Altar/Voce — those are evolving registries, not snapshotted artefacts) has a nullable `parent_<domain>_id: UUID | None`. Fork endpoints (`POST /<domain>s/{id}/fork`) create a new row with `parent_<domain>_id = source.id`. The fork does **not** soft-delete the parent.

### 6. API conventions

- All routes mount under `/api/v1/` per existing pattern.
- Authentication via the `OptionalCookieUser` dep (existing pattern from `oaths.py`, `initiations.py`).
- **Pydantic schemas defined inline in the router file** — `<Domain>Read`, `<Domain>Create`, `<Domain>Update` classes alongside the FastAPI handlers. No separate `api/schemas/<domain>.py` files. Matches the existing convention used by every v1 router today.
- Pagination on list endpoints: simple `limit: int = 100` query param, clamped to `min(limit, 500)`. List endpoints return `list[Read]` directly (no envelope) — matches `oaths.py`. If a future endpoint needs offset pagination, add it then.
- Filtering: each domain documents its filter params; tools support `?kind=athame`, voces `?tradition=pgm`, sigils `?mode=spare`, etc.
- All POST/PATCH responses return the full updated row.
- All routes write to the audit log on mutation.

### 7. Bundled fixtures (cross-vault, immutable)

- The **7 planetary magic squares** ship as a Python constant in `theourgia.core.workshop.planetary_squares` (NOT as DB rows). The model layer for `MagicSquare` only handles custom user squares. A dedicated endpoint `GET /api/v1/magic-squares/planetary` returns the constants.
- The **PGM bundled voces** ship as a Python constant in `theourgia.core.workshop.bundled_voces`. Endpoint `GET /api/v1/voces/bundled` returns them. The per-vault `voce_magicae` table tracks user-authored + user-forked-from-bundled rows.
- The **preset circles** (LBRP, Heptameron, etc.) ship as a Python constant in `theourgia.core.workshop.preset_circles`. Endpoint `GET /api/v1/circles/presets`. Loading a preset hits the practitioner's `POST /api/v1/circles` with the preset's structure as the body — no link back to the preset row (the preset is a template, not a parent).

### 8. Testing per domain

Each domain's test file (`backend/tests/test_<domain>.py`) covers:

- **CRUD happy path** — create, read, list, update, soft-delete.
- **owner_id scoping** — User A's GET /sigils does not see User B's sigil.
- **Soft-delete behaviour** — deleted rows excluded from list by default; admin can include them.
- **Fork** (for versioned domains) — fork creates new row with parent_*_id set; parent unaffected.
- **Honesty rules** — domain-specific (e.g., Tool consecration cannot be set without working link; Voce cannot save without citation; Talisman sealed cannot have plaintext columns populated).

Target: ≥ 15 tests per domain. Phase 07 backend tests should add ~120 tests total (1473 → ~1600).

### 9. Frontend wiring (B108)

When the backend lands:

- `frontend/shared/src/api/types.ts` gains `SigilRecord`, `MagicSquareRecord`, `TalismanRecord`, `CircleRecord`, `ToolRecord`, `AltarRecord`, `VoceMagicaeRecord`, `VoceRecordingRecord`, `BundledVoceRecord` types (frontend convention is `<Domain>Record`; backend convention is `<Domain>Read` — they describe the same wire shape on each side).
- `frontend/shared/src/api/endpoints.ts` gains CRUD methods per domain.
- `frontend/shared/src/api/fixtures.ts` gains in-memory fixture handlers per route.
- Each Workshop admin route replaces its Toast-on-save with a real POST. The shared surface components stay pure (they accept onSave callbacks; no surface change beyond fixture removal).

---

## Batch breakdown

The order respects the dependency graph: foundation → composites → independent → wiring.

### B103 — Sigils + Magic Squares (foundation)

**Why this batch first:** Sigils + Magic Squares are independent of each other; Talismans + Circles depend on them.

**Files created:**

- `backend/theourgia/models/sigils.py`
- `backend/theourgia/models/magic_squares.py`
- `backend/alembic/versions/0033_workshop_sigils_magic_squares.py`
- `backend/theourgia/api/routers/v1/sigils.py`
- `backend/theourgia/api/routers/v1/magic_squares.py`
- `backend/theourgia/core/workshop/__init__.py`
- `backend/theourgia/core/workshop/planetary_squares.py` (7 constants)
- `backend/tests/test_sigils.py`
- `backend/tests/test_magic_squares.py`

**Sigil model fields:**

```python
class SigilMode(str, enum.Enum):
    SPARE = "spare"          # letter elimination
    KAMEA = "kamea"          # magic-square pathing
    ROSE_CROSS = "rose_cross"
    PYTHAGOREAN = "pythagorean"  # rosette
    HEBREW = "hebrew"        # letterform
    GREEK = "greek"          # letterform
    HASHED = "hashed"        # deterministic curve
    HARMONOGRAPH = "harmonograph"
    FORMULA = "formula"      # parametric r = f(θ, …)
    FREEFORM = "freeform"    # canvas
    IMAGE = "image"          # upload + vectorize

class SigilPurpose(str, enum.Enum):
    WORKSHOP_DRAFT = "workshop_draft"
    CONSECRATED = "consecrated"
    GIFT = "gift"
    PERSONAL_STUDY = "personal_study"

class Sigil(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "sigil"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    title: str = Field(max_length=240, nullable=False)
    intention: str = Field(sa_column=Column(Text, nullable=False))
    mode: SigilMode = Field(sa_column=Column(SQLEnum(SigilMode, name="sigil_mode"), nullable=False))
    parameters: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    svg: str = Field(sa_column=Column(Text, nullable=False))
    seed: Optional[str] = Field(default=None, max_length=64)
    purpose: SigilPurpose = Field(default=SigilPurpose.WORKSHOP_DRAFT, ...)
    citation: Optional[str] = Field(default=None, max_length=480)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    linked_entity_id: Optional[UUID] = Field(default=None, foreign_key="entity.id", nullable=True)
    linked_working_entry_id: Optional[UUID] = Field(default=None, foreign_key="entry.id", nullable=True)

    parent_sigil_id: Optional[UUID] = Field(default=None, foreign_key="sigil.id", nullable=True)

    __table_args__ = (
        Index("ix_sigil_owner", "owner_id"),
        Index("ix_sigil_mode", "mode"),
        Index("ix_sigil_parent", "parent_sigil_id"),
    )
```

**MagicSquare model fields (custom only):**

```python
class MagicSquare(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "magic_square"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    order: int = Field(ge=3, le=12, nullable=False)
    cells: list[list[int]] = Field(sa_column=Column(JSONB, nullable=False))  # 2D array
    attribution: Optional[str] = Field(default=None, max_length=480)
    is_magic: bool = Field(default=False, nullable=False)  # computed at save — does it sum correctly?

    __table_args__ = (
        Index("ix_magic_square_owner", "owner_id"),
        Index("ix_magic_square_order", "order"),
    )
```

**API — Sigils:**

- `GET /api/v1/sigils?mode=<...>&purpose=<...>&linked_entity_id=<...>&limit=25&offset=0` → `list[SigilRead]`
- `GET /api/v1/sigils/{id}` → `SigilRead` (includes svg + parameters)
- `POST /api/v1/sigils` body `{ title, intention, mode, parameters, svg, seed?, purpose, citation?, notes?, linked_entity_id?, linked_working_entry_id? }` → `SigilRead`
- `PATCH /api/v1/sigils/{id}` body `{ title?, notes?, purpose?, linked_entity_id?, linked_working_entry_id? }` (immutable: intention, mode, parameters, svg, seed) → `SigilRead`
- `DELETE /api/v1/sigils/{id}` → 204 (soft)
- `POST /api/v1/sigils/{id}/fork` body `{ title? }` → new `SigilRead` with `parent_sigil_id` set

**API — Magic Squares:**

- `GET /api/v1/magic-squares/planetary` → `PlanetarySquaresResponse` (the 7 constants, no auth scoping). Public endpoint.
- `GET /api/v1/magic-squares?limit=25&offset=0` → `list[MagicSquareRead]` (custom only)
- `GET /api/v1/magic-squares/{id}` → `MagicSquareRead`
- `POST /api/v1/magic-squares` body `{ name, order, cells, attribution? }` → `MagicSquareRead` (server validates cells is `order × order` matrix; sets `is_magic`)
- `PATCH /api/v1/magic-squares/{id}` body `{ name?, cells?, attribution? }` → `MagicSquareRead`
- `DELETE /api/v1/magic-squares/{id}` → 204 (soft)

**Tests — `test_sigils.py` (≥ 18 tests):**

1. `POST /sigils` creates a row with the expected mode + parameters.
2. List filters by mode.
3. List filters by purpose.
4. List excludes soft-deleted by default.
5. GET non-existent returns 404.
6. PATCH cannot mutate intention.
7. PATCH cannot mutate mode.
8. PATCH cannot mutate svg.
9. PATCH can change title + notes + purpose + linked_entity_id.
10. DELETE soft-deletes; GET still returns the row only with `?include_deleted=true`.
11. Fork creates a new row with `parent_sigil_id = source.id`.
12. Fork creates correct lineage chain (parent → child).
13. Fork does NOT soft-delete the parent.
14. User A's vault cannot see User B's sigils.
15. owner_id is auto-populated from current_user; cannot be spoofed in body.
16. owner_id properly set from auth context.
17. N/A — see plan §4 federation deferral.
18. Audit log records create + update + delete + fork events.

**Tests — `test_magic_squares.py` (≥ 14 tests):**

1. `GET /planetary` returns 7 squares (Saturn 3×3 → Moon 9×9) in fixed order, no auth required.
2. Planetary squares are not in the user's `GET /magic-squares` list.
3. POST creates a custom square; `is_magic` computed from cells.
4. POST with invalid cells (wrong dimensions) returns 400.
5. POST with order out of range (e.g., 2 or 13) returns 422.
6. PATCH can edit cells; `is_magic` recomputed.
7. PATCH cannot edit order (would break the matrix).
8. DELETE soft-deletes.
9. List excludes soft-deleted.
10. owner_id scoping (cross-user isolation).
12. Audit log records mutations.
13. `is_magic = True` for the seeded Lo Shu (3×3 valid square).
14. `is_magic = False` for an invalid square.

**DoD for B103:**
- [ ] Both models compile + Alembic migration applies cleanly.
- [ ] Both routers registered in `theourgia.api.routers.v1.__init__`.
- [ ] Both test files green.
- [ ] Audit log fired on every mutation.

---

### B104 — Talismans (composite + Mode B encryption)

**Why this batch:** Depends on Sigils + Magic Squares (composite refs). Sealed encryption pattern matches Oath.

**Files created:**

- `backend/theourgia/models/talismans.py`
- `backend/alembic/versions/0034_workshop_talismans.py`
- `backend/theourgia/api/routers/v1/talismans.py`
- `backend/tests/test_talismans.py`

**Talisman model fields:**

```python
class Talisman(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "talisman"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    purpose: str = Field(sa_column=Column(Text, nullable=False))

    # Plaintext fields — NULL when sealed
    front_svg: Optional[str] = Field(default=None, sa_column=Column(Text))
    back_svg: Optional[str] = Field(default=None, sa_column=Column(Text))
    components: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    # components = {
    #   sigil_ids: [UUID], square_ids: [UUID],
    #   names: [{ text, script, position, size, color }],
    #   borders: [{ kind, inscription_text?, rotation_deg }],
    #   image_attachment_ids: [UUID],
    #   inscriptions: [{ text, script, position, size, color }],
    # }
    materials_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    linked_election: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    # linked_election = { datetime, latitude, longitude, planet, planetary_hour }  (snapshot)
    linked_consecration_working_id: Optional[UUID] = Field(default=None, foreign_key="entry.id")

    # Sealed mode
    encryption_mode: EncryptionMode = Field(default=EncryptionMode.PLAINTEXT, nullable=False)
    encrypted_payload: Optional[bytes] = Field(default=None, sa_column=Column(LargeBinary))
    encryption_iv: Optional[bytes] = Field(default=None, sa_column=Column(LargeBinary))

    # Versioning
    parent_talisman_id: Optional[UUID] = Field(default=None, foreign_key="talisman.id")

    __table_args__ = (
        Index("ix_talisman_owner", "owner_id"),
        Index("ix_talisman_parent", "parent_talisman_id"),
    )
```

**API:**

- `GET /api/v1/talismans?sealed=<bool>&limit=25&offset=0` → `list[TalismanRead]` (sealed rows surface count only when listed; metadata visible: name, purpose, sealed flag)
- `GET /api/v1/talismans/{id}` → `TalismanRead` — when sealed, returns `{ encrypted_payload, encryption_iv, encryption_mode }`; when plaintext, returns the SVGs + components
- `POST /api/v1/talismans` body `{ name, purpose, front_svg, back_svg, components, materials_notes?, linked_election?, linked_consecration_working_id? }` → `TalismanRead`
- `PATCH /api/v1/talismans/{id}` (only meta: name, materials_notes, linked_consecration_working_id, linked_election) → `TalismanRead`
- `DELETE /api/v1/talismans/{id}` → 204 (soft)
- `POST /api/v1/talismans/{id}/seal` body `{ ciphertext: base64, iv: base64 }` → `TalismanRead` — sets `encryption_mode=SEALED`, stores ciphertext + iv, **nulls out** front_svg/back_svg/components
- `POST /api/v1/talismans/{id}/unseal` → returns ciphertext + iv (the client decrypts; server never sees the key)
- `POST /api/v1/talismans/{id}/fork` body `{ name? }` → forks. If parent is sealed, fork is initially sealed too with a placeholder ciphertext that the client must re-encrypt.

**Tests (≥ 20):**

1. POST creates plaintext talisman.
2. POST validates `components.sigil_ids` references real sigils owned by the vault.
3. POST validates `components.square_ids` references real magic_squares owned by the vault.
4. PATCH can change name + materials_notes.
5. PATCH cannot mutate front_svg / back_svg / components (must fork).
6. Seal flow: POST /seal → row.front_svg is null, encrypted_payload populated.
7. Sealed talisman GET returns ciphertext but not plaintext.
8. Unseal returns ciphertext + iv but doesn't change row.
9. Sealed talisman in list shows only metadata (name, purpose, sealed: true).
10. Fork creates a new row with parent_talisman_id set.
11. Forking a sealed talisman initialises the fork sealed (placeholder).
12. Linked consecration working FK validates the entry is in the same vault.
13. Linked election JSON validates shape (datetime, lat, lng required).
14. Linked election with past datetime + no consecration working sets a flag (`election_passed: true` derived field in response).
15. DELETE soft-deletes; list excludes by default.
16. owner_id scoping.
18. parent_<domain>_id chain validates correctly.
19. Audit log records seal + unseal + fork events.
20. Cannot POST with both plaintext AND encrypted_payload — 400.

**DoD for B104:**
- [ ] Model + migration applied.
- [ ] Router registered.
- [ ] Tests green.
- [ ] Mode B round-trip test (encrypt-decrypt) verified.

---

### B105 — Magical Circles (+ preset library)

**Files created:**

- `backend/theourgia/models/circles.py`
- `backend/alembic/versions/0035_workshop_circles.py`
- `backend/theourgia/api/routers/v1/circles.py`
- `backend/theourgia/core/workshop/preset_circles.py` (LBRP, Heptameron, Goetic, Picatrix × 7 planets, Greek defixiones)
- `backend/tests/test_circles.py`

**Circle model:**

```python
class CompassTradition(str, enum.Enum):
    ARCHANGELS = "archangels"
    GREEK_WINDS = "greek_winds"
    WATCHTOWERS = "watchtowers"
    VEDIC_DIKPALAS = "vedic_dikpalas"
    CUSTOM = "custom"

class Circle(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "circle"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    purpose: str = Field(sa_column=Column(Text, nullable=False))
    diameter_m: float = Field(default=2.0, nullable=False)
    rings: list[dict] = Field(sa_column=Column(JSONB, nullable=False))
    # rings = [{ kind: 'inscription'|'glyph_row'|'image'|'blank'|'multi_glyph', content, direction, rotation_deg, ... }]
    compass_tradition: CompassTradition = Field(...)
    compass_points: dict = Field(sa_column=Column(JSONB, nullable=False))
    # compass_points = { N: '...', E: '...', S: '...', W: '...' }
    centre_element: dict = Field(sa_column=Column(JSONB, nullable=False))
    # centre_element = { kind: 'pentagram'|'hexagram'|'unicursal'|'solomonic_seal'|'sigil'|'kamea_trace'|'blank', sigil_id?, square_id?, ... }
    citation: Optional[str] = Field(default=None, max_length=480)  # for forked presets

    parent_circle_id: Optional[UUID] = Field(default=None, foreign_key="circle.id")

    __table_args__ = (
        Index("ix_circle_owner", "owner_id"),
    )
```

**API:**

- `GET /api/v1/circles/presets` → `PresetCirclesResponse` (the constants from `core/workshop/preset_circles.py`, no auth)
- `GET /api/v1/circles?limit=25&offset=0` → `list[CircleRead]`
- `GET /api/v1/circles/{id}` → `CircleRead`
- `POST /api/v1/circles` body `{ name, purpose, diameter_m, rings, compass_tradition, compass_points, centre_element, citation? }` → `CircleRead`
- `PATCH /api/v1/circles/{id}` (any field except parent_circle_id) → `CircleRead`
- `DELETE /api/v1/circles/{id}` → 204 (soft)
- `POST /api/v1/circles/{id}/fork` body `{ name? }` → forks

**Tests (≥ 16):**

1. `GET /presets` returns the preset library (≥ 5 entries), no auth.
2. POST creates a circle with the expected ring structure.
3. POST validates compass_tradition is single value (cannot mix traditions in compass_points).
4. POST validates centre_element kind enum.
5. POST validates rings array length 1-6.
6. PATCH can change any field except parent_circle_id.
7. Fork creates a new row with parent_circle_id set.
8. Loading a preset (POST with the preset's body) creates a row WITHOUT parent_circle_id (presets are templates, not parents).
9. DELETE soft-deletes.
10. owner_id scoping.
12. parent_<domain>_id chain validates correctly.
13. Custom-tradition compass_points accepts free text in cardinal fields.
14. Audit log records mutations.
15. Centre element with sigil_id validates the sigil is in the vault.
16. Centre element with square_id validates the magic_square is in the vault OR is one of the 7 planetary fixtures.

**DoD for B105:**
- [ ] Model + migration.
- [ ] Preset library constant with ≥ 5 entries.
- [ ] Router registered.
- [ ] Tests green.

---

### B106 — Tools + Altars

**Files created:**

- `backend/theourgia/models/tools.py` (Tool + Altar in one file)
- `backend/alembic/versions/0036_workshop_tools_altars.py`
- `backend/theourgia/api/routers/v1/tools.py`
- `backend/theourgia/api/routers/v1/altars.py`
- `backend/tests/test_tools.py`
- `backend/tests/test_altars.py`

**Tool model:**

```python
class ToolKind(str, enum.Enum):
    ATHAME = "athame"
    WAND = "wand"
    CHALICE = "chalice"
    PENTACLE = "pentacle"
    CENSER = "censer"
    BELL = "bell"
    SWORD = "sword"
    LAMP = "lamp"
    MIRROR = "mirror"
    BOWL = "bowl"
    STATUE = "statue"
    ROBE = "robe"
    CINGULUM = "cingulum"
    OTHER = "other"

class Tool(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "tool"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    kind: ToolKind = Field(...)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    materials: list[str] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    dimensions: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    # dimensions = { length_cm?, width_cm?, height_cm?, weight_g? }
    photo_attachment_ids: list[UUID] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    provenance: Optional[str] = Field(default=None, sa_column=Column(Text))
    acquisition_date: Optional[date] = Field(default=None)
    consecration_date: Optional[date] = Field(default=None)
    consecration_working_entry_id: Optional[UUID] = Field(default=None, foreign_key="entry.id")
    current_location: Optional[str] = Field(default=None, max_length=480)

    __table_args__ = (
        Index("ix_tool_owner", "owner_id"),
        Index("ix_tool_kind", "kind"),
    )
```

**Altar model:**

```python
class Altar(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "altar"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    tool_ids: list[UUID] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    arrangement_diagram_svg: Optional[str] = Field(default=None, sa_column=Column(Text))
    photo_attachment_ids: list[UUID] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    is_permanent: bool = Field(default=False, nullable=False)
    linked_working_entry_ids: list[UUID] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))

    __table_args__ = (
        Index("ix_altar_owner", "owner_id"),
    )
```

**API — Tools:**

- `GET /api/v1/tools?kind=<...>&consecrated=<bool>&limit=25&offset=0` → `list[ToolRead]`
- `GET /api/v1/tools/{id}` → `ToolRead` (includes `use_history` — a computed list of entry rows that link the tool; not stored)
- `POST /api/v1/tools` body `{ name, kind, description?, materials, dimensions?, provenance?, acquisition_date?, current_location? }` → `ToolRead`
- `PATCH /api/v1/tools/{id}` body (any field except consecration — sub-resource) → `ToolRead`
- `DELETE /api/v1/tools/{id}` → 204 (soft)
- `POST /api/v1/tools/{id}/consecrate` body `{ consecration_working_entry_id, consecration_date }` → `ToolRead` (the only way to set consecration; explicit working link required — honesty rule)
- `POST /api/v1/tools/{id}/photos` body `{ attachment_id }` → `ToolRead` (appends)
- `DELETE /api/v1/tools/{id}/photos/{attachment_id}` → 204

**API — Altars:**

- `GET /api/v1/altars?is_permanent=<bool>&limit=25&offset=0` → `list[AltarRead]`
- `GET /api/v1/altars/{id}` → `AltarRead`
- `POST /api/v1/altars` body `{ name, description?, tool_ids, arrangement_diagram_svg?, is_permanent }` → `AltarRead`
- `PATCH /api/v1/altars/{id}` → `AltarRead`
- `DELETE /api/v1/altars/{id}` → 204 (soft)
- `POST /api/v1/altars/{id}/photos` body `{ attachment_id }` → `AltarRead`

**Tests — `test_tools.py` (≥ 18):**

1. POST creates tool.
2. POST without kind returns 422.
3. PATCH cannot directly set consecration_date or consecration_working_entry_id (honesty rule).
4. `/consecrate` sets both fields atomically; requires existing working entry.
5. `/consecrate` validates the working entry's kind is consecration-flavored (working / magical_record / ritual_log).
6. List filters by kind.
7. List filters by consecrated=true returns only tools with consecration_working_entry_id set.
8. ToolDetail's `use_history` includes entries that reference this tool's id (computed query).
9. Photos can be added + removed.
10. Photos attachment ownership validated (same vault).
11. DELETE soft-deletes.
12. owner_id scoping.
14. Audit log records mutations + consecration event.
15. "Other" kind accepts a free-text `name` for the kind label.
16. Cannot consecrate a tool that's already consecrated without first explicitly un-consecrating.
17. Un-consecrate endpoint nulls both fields (honesty: can correct mistakes).
18. List default-excludes soft-deleted.

**Tests — `test_altars.py` (≥ 12):**

1. POST creates altar.
2. POST validates tool_ids reference tools in the same vault.
3. PATCH can update tool_ids list.
4. List filters by is_permanent.
5. AltarDetail returns the resolved tool rows (joined query, not just ids).
6. Photos add/remove.
7. DELETE soft-deletes.
8. owner_id scoping.
10. Audit log records mutations.
11. arrangement_diagram_svg accepts SVG text (no validation beyond size limit).
12. linked_working_entry_ids validate the entries are in the same vault.

**DoD for B106:**
- [ ] Both models + migration.
- [ ] Both routers registered.
- [ ] Both test files green.

---

### B107 — Voces Magicae (per-vault + bundled fixtures)

**Files created:**

- `backend/theourgia/models/voces.py` (VoceMagicae + VoceRecording — bundled live as constants)
- `backend/alembic/versions/0037_workshop_voces.py`
- `backend/theourgia/api/routers/v1/voces.py`
- `backend/theourgia/core/workshop/bundled_voces.py` (PGM IV.2785 Hekate hymn + ~30 fixtures)
- `backend/tests/test_voces.py`

**VoceMagicae model (per-vault):**

```python
class SourceScript(str, enum.Enum):
    GREEK = "greek"
    HEBREW = "hebrew"
    LATIN = "latin"
    COPTIC = "coptic"
    ARABIC = "arabic"
    SANSKRIT = "sanskrit"
    CUSTOM = "custom"

class VoceMagicae(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "voce_magicae"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    source_text: str = Field(sa_column=Column(Text, nullable=False))
    source_script: SourceScript = Field(...)
    transliteration: Optional[str] = Field(default=None, sa_column=Column(Text))
    ipa: Optional[str] = Field(default=None, max_length=480)
    source_citation: str = Field(max_length=480, nullable=False)  # REQUIRED — honesty rule
    planetary_associations: list[str] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    elemental_associations: list[str] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))
    linked_entity_ids: list[UUID] = Field(sa_column=Column(JSONB, nullable=False, server_default="[]"))

    # When forked from a bundled voce, this references the bundled id (string, not FK — bundled isn't a table)
    forked_from_bundled_id: Optional[str] = Field(default=None, max_length=120)

    __table_args__ = (
        Index("ix_voce_owner", "owner_id"),
        Index("ix_voce_source_script", "source_script"),
    )
```

**VoceRecording model:**

```python
class VoceRecording(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "voce_recording"
    voce_id: UUID = Field(foreign_key="voce_magicae.id", index=True, nullable=False)
    audio_attachment_id: UUID = Field(foreign_key="audio_attachment.id", nullable=False)
    duration_seconds: int = Field(ge=0, nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
```

**API:**

- `GET /api/v1/voces/bundled?tradition=<...>` → returns the bundled fixtures (no auth scoping; public read).
- `GET /api/v1/voces?source_script=<...>&limit=25&offset=0` → `list[VoceMagicaeRead]` (per-vault)
- `GET /api/v1/voces/{id}` → `VoceMagicaeRead` (with recordings list)
- `POST /api/v1/voces` body `{ name, source_text, source_script, transliteration?, ipa?, source_citation, planetary_associations, elemental_associations, linked_entity_ids }` → `VoceMagicaeRead` (REJECTS if source_citation is empty)
- `PATCH /api/v1/voces/{id}` → `VoceMagicaeRead` (source_citation still required to be non-empty)
- `DELETE /api/v1/voces/{id}` → 204 (soft)
- `POST /api/v1/voces/fork-bundled` body `{ bundled_id }` → creates a per-vault row with `forked_from_bundled_id = bundled_id`, copying the bundled fields
- `POST /api/v1/voces/{id}/recordings` body `{ audio_attachment_id, duration_seconds, notes? }` → `VoceRecordingRead`
- `DELETE /api/v1/voces/{id}/recordings/{recording_id}` → 204 (soft-delete the recording)

**Tests (≥ 18):**

1. `GET /bundled` returns ≥ 25 voces, no auth.
2. POST without source_citation returns 422 (or 400 with a clear message).
3. POST with empty source_citation returns 422.
4. POST creates voce; owner_id scoped.
5. PATCH cannot clear source_citation.
6. List filters by source_script.
7. List excludes soft-deleted.
8. `fork-bundled` creates a new per-vault row with `forked_from_bundled_id` set, copying source_text + transliteration + IPA + citation from the bundled fixture.
9. `fork-bundled` with an unknown bundled_id returns 404.
10. Recording POST validates audio_attachment is owned by the vault.
11. Recording POST validates duration_seconds is non-negative.
12. Recording soft-delete works.
13. DELETE soft-deletes the voce.
14. owner_id scoping.
16. Linked entities validated to be in the same vault.
17. Used-in-workings computed correctly (entries that reference this voce id).
18. Audit log records mutations.

**DoD for B107:**
- [ ] Models + migration.
- [ ] Bundled voces constant with ≥ 25 PGM voces.
- [ ] Router registered.
- [ ] Tests green.

---

### B108 — Frontend wiring (replaces fixtures with live endpoints)

**Why this batch:** All backend domains are live. The shared Workshop surfaces have been running on in-memory fixtures since H05. This batch swaps in real endpoint calls.

**Files modified:**

- `frontend/shared/src/api/types.ts` — add types for all 8 records + their inputs.
- `frontend/shared/src/api/endpoints.ts` — add CRUD methods per domain.
- `frontend/shared/src/api/fixtures.ts` — add in-memory fixture handlers per route (so mock mode still works).
- `frontend/shared/src/api/index.ts` — export the new types.
- `frontend/admin/src/data/useSigils.ts` (new) — hook
- `frontend/admin/src/data/useMagicSquares.ts` (new)
- `frontend/admin/src/data/useTalismans.ts` (new)
- `frontend/admin/src/data/useCircles.ts` (new)
- `frontend/admin/src/data/useTools.ts` (new)
- `frontend/admin/src/data/useAltars.ts` (new) — likely fold into useTools.ts
- `frontend/admin/src/data/useVoces.ts` (new)
- `frontend/admin/src/routes/SigilGeneratorRoute.tsx` — replace Toast-on-save with real POST
- `frontend/admin/src/routes/MagicSquaresRoute.tsx` — wire library + save
- `frontend/admin/src/routes/TalismansRoute.tsx` (rename existing file) — wire CRUD + seal/unseal
- `frontend/admin/src/routes/MagicalCircleRoute.tsx` — wire library + save
- `frontend/admin/src/routes/ToolRegistryRoute.tsx` — wire CRUD + photos + consecrate
- `frontend/admin/src/routes/VocesMagicaeRoute.tsx` — wire CRUD + recordings + bundled library + fork

**Sealed talisman client-side encryption (within B108):**

- Use the existing Web Crypto API pattern from `frontend/shared/src/SealUnlock/`.
- On Save with sealed=true: client encrypts `JSON.stringify({ front_svg, back_svg, components })` with the vault key derived from the practitioner's passphrase (existing PBKDF2 + AES-GCM substrate from B54).
- POST to `/seal` with the resulting ciphertext + IV.
- On open: GET returns ciphertext; if vault key is in memory (SealUnlock unlocked), decrypt + render; else show the SealUnlock dialog.

**Tests:**

- 5-8 new endpoint tests per domain (fixture-mode shape verification + live-mode shape verification). Aim for ~40 new tests in `api/endpoints.test.ts`.
- Update existing Workshop surface tests where they previously asserted Toast text — assert against the API call (mock the API client and verify the POST body shape).

**DoD for B108:**
- [ ] All 6 admin Workshop routes save via real endpoints in live mode + fixtures in mock mode.
- [ ] Sealed talisman seal/unseal round-trip works (test: save sealed talisman, reload page, click unseal → renders correctly).
- [ ] Storybook stories continue to render (no surface-component changes).
- [ ] Visual + a11y baselines unchanged (or refreshed with explanation in commit).

---

### B109 — Phase 07 close-out

**Files modified:**

- `CHANGELOG.md` — "Phase 07 backend COMPLETE" entry.
- `FEATURES.md` — Phase 07 row to ✅; check off the Workshop features per-domain.
- `README.md` — Phase 07 row from `[~]` to `[x]`. Status badge from `Phase_07_frontend_shipped` to `Phase_07_complete`.
- `plan/07-workshop.md` — DoD checked.
- Memory: `project_phase_status.md` (test totals, queue update), `project_resume_state.md` (commit history), new `project_phase_07_close.md`.

**Run:**
- Full backend test suite (`pytest backend/`) — confirm all green, ~1600 tests.
- Full frontend test suite (`pnpm test`) — confirm all green.
- Visual + a11y — confirm green.
- Push.

**DoD for B109:**
- [ ] All gates green.
- [ ] Docs reflect Phase 07 complete.
- [ ] Memory reflects the close + the next queue (B102 a11y residual is the only follow-up; everything else is Phase 08+ via H06).

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|---|---|---|---|---|
| B103 | Sigils + Magic Squares | (none) | ~1100 | ~32 |
| B104 | Talismans + Mode B crypto | B103 | ~900 | ~20 |
| B105 | Magical Circles + preset library | (none for code; B103 for centre refs) | ~700 | ~16 |
| B106 | Tools + Altars | (none) | ~900 | ~30 |
| B107 | Voces Magicae + bundled fixtures | (none) | ~750 | ~18 |
| B108 | Frontend wiring + sealed crypto | B103-B107 | ~1500 | ~40 |
| B109 | Close-out (docs + gate run) | B103-B108 | ~50 | 0 |
| **Total** | | | **~5900** | **~156** |

After B109: **Phase 07 closes end-to-end.** Backend tests jump 1473 → ~1629. Frontend tests jump 1722 → ~1760. All gates green.

---

## What's NOT in this plan (deferred / queued)

- **Sealed-content encryption for voces**: per the H05 design, voces are NOT sealed by default (their value is community sharing). Sealed-voce flow is queued for a later batch if/when the requirement surfaces.
- **Federation export of workshop artefacts**: federation endpoint authoring + canonical_id/instance_id columns ship together in a Phase 12 cross-cutting batch.
- **Community contribution flow** (suggest correction on bundled voces, contribute custom cipher): explicitly Phase 14 territory; H06's surfaces stub the affordances.
- **Custom-square kamea sigil** (B100 follow-up): the Kamea sigil generator currently accepts only the 7 planetary squares. Extending to custom squares is a frontend-only change once B103 ships.
- **B102 a11y residual** (14 design tradeoffs at 97.5%): would need design conversation; not blocking.

---

## Resume cue for next session

Open this file (`plan/07-batches-backend.md`). Begin at B103. Each batch's "Files created" list is the typing checklist; the model + endpoint definitions in this plan are the spec. No new thinking required — execute, test, commit, push.

The first action next session is:

```bash
cd /home/sophia/Documents/development/theourgia
# Create the new domain module
mkdir -p backend/theourgia/core/workshop
# Begin B103: open backend/theourgia/models/sigils.py
```
