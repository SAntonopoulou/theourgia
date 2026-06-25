# Phase 08 backend authoring plan (B110 → B115)

**Status:** OPEN — ready to execute.
**Modeled on:** `plan/07-batches-backend.md` (the B103-B107 lineage that closed Phase 07 backend in five batches).

This document **locks every backend product decision** for Phase 08 (Linguistic Tools). The implementation agent does not pick alternatives; the agent renders the locked decisions across migrations, models, routers, and tests. Where this document says "this column exists", it exists; where it says "this honesty rule fires", it fires. If a genuine question remains after reading this doc, raise it back — do not pick a direction.

The H06 surfaces it unblocks: **Cross-Journal Gematria Search** (S7 #2 — queued, fixture-mode only without backend) + **Saved Studies Index** (S7 #9) + **Per-Study Page** (S7 #10 — the worked example).

What's already shipped, going in:
- **Cipher catalog (client-side)** — `frontend/shared/src/gematria/ciphers.ts` ships 7 PD-cited bundled ciphers (Greek Iso + Ordinal · Hebrew Hechrachi + Siduri + Atbash · English Simple · Coptic Iso). The Gematria Calculator surface (H06-1) uses these client-side for the single-text computation. **Phase 08 backend MUST be a superset, not a replacement** — i.e., it stores the same 7 bundled ciphers plus the queued additions (Mispar Gadol/Katan, Crowley ALW, Arabic Abjad, Sanskrit Katapayadi).
- **Voces backend** — B107 shipped `voce_magicae` + `voce_recording` + the bundled corpus. Per-voce private notes + per-vault hide/show controls are Phase 08 extensions in B114.

Carry-forward backend conventions (proven through B103-B107):
- **`owner_id: UUID | None`** with `ForeignKey("user.id", ondelete="SET NULL")`.
- **Inline Pydantic schemas** in router files. No separate `api/schemas/*.py`.
- **Pagination via `limit: int = 100`** (max 500 enforced at router). No `Page[T]` envelope.
- **SoftDeleteMixin** via `deleted_at`. Soft delete is the only delete.
- **Honesty rules enforced at the API layer**; DB constraints back the most critical ones (e.g., `source_citation` non-empty for bundled voces).
- **Federation prep (`canonical_id` + `instance_id`) explicitly DEFERRED to the Phase 12 cross-cutting batch.** Do not add these columns in Phase 08.

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|-------|-------|--------------|-----------:|------------:|
| B110 | Cipher catalog + custom cipher per-vault | (none for code; H06-1 for the client cipher shape) | ~600 | ~25 |
| B111 | Gematria index + cross-journal search | B110 (cipher_id FK) + Phase 04 (entry table) | ~900 | ~35 |
| B112 | Studies (saved gematria queries + snapshots) | B110 + B111 | ~800 | ~28 |
| B113 | Transliteration scheme reference tables | (independent) | ~500 | ~20 |
| B114 | Voce private notes + per-vault visibility | B107 (voce_magicae) | ~400 | ~18 |
| B115 | Phase 08 close-out (CHANGELOG/FEATURES/README + memory + gates) | B110-B114 | (docs) | (none) |

Approximate total: ~3200 lines + ~126 tests. Backend test count target: 1625 → ~1750 by Phase 08 close.

Alembic chain: 0037 → 0038 → 0039 → 0040 → 0041 → 0042 (one per batch B110-B114; B115 ships no migrations).

---

## B110 — Cipher catalog + custom cipher

**Files created:**

- `backend/theourgia/models/ciphers.py`
- `backend/alembic/versions/0038_phase08_ciphers.py`
- `backend/theourgia/api/routers/v1/ciphers.py`
- `backend/theourgia/core/linguistic/bundled_ciphers.py` (the 13+ bundled ciphers as Python constants — superset of the 7 client-shipped)
- `backend/tests/test_ciphers.py`

**Cipher model:**

```python
class CipherLanguage(str, enum.Enum):
    GREEK = "greek"
    HEBREW = "hebrew"
    ENGLISH = "english"
    COPTIC = "coptic"
    ARABIC = "arabic"
    SANSKRIT = "sanskrit"
    CUSTOM = "custom"


class Cipher(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "cipher"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    language: CipherLanguage = Field(...)
    # mapping = { "α": 1, "β": 2, ... } — JSONB
    mapping: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    # REQUIRED for non-personal ciphers. NULL when personal=True.
    source_citation: Optional[str] = Field(default=None, max_length=480)
    personal: bool = Field(default=False, nullable=False)
    # Bundled ciphers carry a stable slug (e.g., "greek-iso") that the
    # client can reference; personal/custom ciphers leave this NULL.
    bundled_slug: Optional[str] = Field(default=None, max_length=120, unique=True)

    __table_args__ = (
        Index("ix_cipher_owner", "owner_id"),
        Index("ix_cipher_language", "language"),
        Index("ix_cipher_bundled_slug", "bundled_slug"),
    )
```

**Bundled ciphers shipped server-side** (must match the H06-1 client-side shape exactly for the 7 already-shipped, plus the 6 additions):

| Slug | Name | Language | Citation (PD) |
|------|------|----------|---------------|
| `greek-iso` | Isopsephy | greek | "Classical Greek isopsephy — attested across antiquity (e.g. PGM IV.3007). Public domain." |
| `greek-ord` | Ordinal | greek | "Ordinal transform of the Greek alphabet (α=1…ω=24). Convention; public domain." |
| `heb-hechrachi` | Mispar Hechrachi | hebrew | "Sefer Yetzirah 1:1 (c. 2nd-6th c. CE). Traditional absolute value. Public domain." |
| `heb-siduri` | Mispar Siduri | hebrew | "Ordinal transform of the Hebrew alphabet (א=1…ת=22). Traditional kabbalistic method. PD." |
| `heb-atbash` | Atbash | hebrew | "Hebrew substitution cipher attested in Jeremiah 25:26, 51:41. PD." |
| `heb-gadol` | Mispar Gadol | hebrew | "Hebrew gematria with final forms valued 500-900. Attested in Sefer Raziel. PD." |
| `heb-katan` | Mispar Katan | hebrew | "Hebrew gematria reduced to single digits (mod 9). Convention; PD." |
| `eng-simple` | Simple | english | "Convention: A=1…Z=26 ordinal. Public domain." |
| `eng-alw` | Crowley ALW | english | "Aleister Crowley, *Liber CCXXXI* (Trigrammaton, 1907). Public domain by author's death 1947 (UK +70)." |
| `eng-naeq` | NAEQ | english | "New Aeon English Qabalah — James Lees, 1976. PD on a fair-use basis (system widely published)." |
| `eng-heb-mapped` | Hebrew-mapped | english | "English letters mapped to Hebrew equivalents (Crowley convention). PD." |
| `ar-abjad` | Abjad | arabic | "Standard Arabic abjad (ḥisāb al-jummal). Pre-Islamic convention; PD." |
| `skt-katapayadi` | Kaṭapayādi | sanskrit | "Sanskrit numerical mnemonic system. Vedic-era; PD." |
| `copt-iso` | Coptic isopsephy | coptic | "Coptic letter values inherit the Greek isopsephic system. PD." |

Note: Each cipher's `mapping` field is the same JSONB shape as the client-side `Cipher.values` from `frontend/shared/src/gematria/ciphers.ts`. **The implementation agent's job is to copy those mappings verbatim from the client engine to the server, so the two stay in sync.**

**API:**

- `GET /api/v1/ciphers/bundled` → `list[BundledCipherRead]` (public — no auth; reference material).
- `GET /api/v1/ciphers?language=<...>&include_personal=<bool>&limit=100` → `list[CipherRead]` (lists bundled + the caller's personal).
- `GET /api/v1/ciphers/{id}` → `CipherRead`.
- `POST /api/v1/ciphers` body `{ name, language, mapping, notes?, source_citation? }` → `CipherRead`. **Honesty rule:** non-empty `source_citation` flips `personal=false`; empty/null `source_citation` flips `personal=true`.
- `PATCH /api/v1/ciphers/{id}` (owner only) → `CipherRead`. Bundled ciphers (i.e., rows with `bundled_slug` set and `owner_id=None`) cannot be edited; PATCH returns 409.
- `DELETE /api/v1/ciphers/{id}` → 204 (soft, owner only).

**Honesty rules:**

1. Bundled ciphers carry verbatim PD citations. The B107 voces invariant pattern applies: a test fails CI if any bundled cipher has `len(source_citation) < 10` or empty.
2. `bundled_slug` is unique-globally (DB constraint).
3. The 7 ciphers already shipped client-side must have **identical mappings** server-side. A test verifies cell-by-cell equality between the server `bundled_ciphers.py` constants and the JSON shape that the client engine produces. If the client adds a new mapping, the server must too (and vice versa).

**Tests (≥ 25):**

1. `GET /bundled` returns ≥ 13 ciphers; no auth.
2. Every bundled cipher cites a PD source (≥ 10 chars).
3. Bundled cipher slugs are unique.
4. Server-side bundled `greek-iso` mapping matches the H06-1 client-side mapping byte-for-byte.
5. Same equality check for `heb-hechrachi`, `heb-atbash`, `heb-siduri`, `eng-simple`, `copt-iso`, `greek-ord` (the 7 client-shipped).
6. `POST /ciphers` with non-empty `source_citation` → `personal=false`.
7. `POST /ciphers` with empty `source_citation` → `personal=true`.
8. `PATCH` on a bundled cipher returns 409.
9. `DELETE` on a bundled cipher returns 409.
10. Personal ciphers are owner-scoped; users only see their own.
11. List filter by `language=hebrew` returns only Hebrew ciphers.
12-25. Schema validation + router smoke + edge cases.

**DoD:**
- [ ] Model + migration 0038.
- [ ] Bundled corpus constant with ≥ 13 ciphers, every one PD-cited.
- [ ] Router registered.
- [ ] Tests green.
- [ ] Cell-by-cell mapping parity test between server bundled + client engine.

---

## B111 — Gematria index + cross-journal search

**Files created:**

- `backend/theourgia/models/gematria_index.py`
- `backend/alembic/versions/0039_phase08_gematria_index.py`
- `backend/theourgia/api/routers/v1/gematria_search.py`
- `backend/theourgia/core/linguistic/indexer.py` (the on-entry-save indexer)
- `backend/tests/test_gematria_index.py`
- `backend/tests/test_gematria_search.py`

**Index model:**

```python
class GematriaIndex(IDMixin, TimestampMixin, table=True):
    __tablename__ = "gematria_index"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)
    entry_id: UUID = Field(foreign_key="entry.id", nullable=False, index=True, ondelete="CASCADE")
    cipher_id: UUID = Field(foreign_key="cipher.id", nullable=False, index=True)
    # The phrase as it appears in the entry (normalized, lowercased,
    # diacritics-stripped per the cipher's NFC rules). 240 char limit;
    # phrases longer than 240 chars do not index (rare in practice).
    phrase: str = Field(max_length=240, nullable=False)
    value: int = Field(nullable=False, index=True)
    # Cached at index time so SQL search can filter without recomputation.
    digit_sum: int = Field(nullable=False)

    __table_args__ = (
        Index("ix_gematria_value", "value"),
        Index("ix_gematria_owner_value", "owner_id", "value"),
        Index("ix_gematria_owner_cipher_value", "owner_id", "cipher_id", "value"),
        UniqueConstraint("entry_id", "cipher_id", "phrase", name="uq_gematria_entry_cipher_phrase"),
    )
```

**Indexing pipeline (on entry save, async):**

- A Celery task `index_entry_gematria(entry_id)` fires from the entry's `after_update` hook.
- The task:
  1. Strips Tiptap markup from `entry.body` to get plaintext + per-paragraph language hints.
  2. For each enabled cipher (bundled + owner's personal), splits the text into "phrases" via the normalization rules in the cipher's language family.
  3. For each phrase, computes the gematria value and inserts/upserts a `gematria_index` row.
- Re-indexing on entry edit: deletes existing rows for `(entry_id, cipher_id)` and re-inserts.
- Cipher re-indexing on cipher edit: a separate task `reindex_cipher(cipher_id)` regenerates rows across every owner that has indexable entries.

**Sealed entries are NOT indexed.** The indexer skips entries with `encryption_mode='sealed'` entirely. The frontend Cross-Journal Search surface shows sealed-match counts ONLY via a separate `sealed_match_count` field on the response (not from this index — it's a structural "you have N sealed entries that MAY contain matches; unseal to check" indicator, never a substring leak).

**API:**

- `POST /api/v1/gematria/search` body:
  ```json
  {
    "value": 418,
    "cipher_ids": ["<uuid>", "<uuid>"],
    "match_mode": "exact" | "near" | "reduced",
    "delta": 0,           // when match_mode=near
    "include_personal_ciphers": true,
    "limit": 25,
    "offset": 0
  }
  ```
  Returns:
  ```json
  {
    "total_matches": 47,
    "entries_with_matches": 23,
    "results": [
      {
        "entry_id": "...",
        "entry_title": "...",
        "entry_date": "...",
        "phrase": "ἀγαθοδαίμων",
        "cipher_id": "...",
        "cipher_name": "Isopsephy",
        "value": 418,
        "is_sealed": false
      },
      ...
    ],
    "sealed_match_count": 3,
    "resonances": [
      { "phrase": "...", "value": 418, "ciphers": ["Isopsephy", "Mispar Hechrachi"] }
    ]
  }
  ```
- `GET /api/v1/gematria/search/csv?value=...&...` → CSV download of the same results.
- `POST /api/v1/gematria/reindex` (admin only) → kicks off a global re-index. Returns a job id.

**Honesty rules:**

1. **Sealed entries never leak phrase content.** The `is_sealed=true` field is structural; `phrase` is `null` for sealed matches. The `sealed_match_count` is reported separately.
2. **Owner-scoping is server-side.** A request without auth gets a 401; a request with auth scans only that owner's rows.
3. **Personal ciphers are owner-only in shared aggregates.** Even if `include_personal_ciphers=true`, results from personal ciphers carry a flag `cipher_personal=true` so the frontend can surface "this match comes from your custom cipher only — not for shared studies."

**Tests (≥ 35):**

1-10. Indexer: NFC normalisation, diacritic stripping, sealed-skip, re-index on edit.
11-15. Cross-cipher resonance: multi-cipher matches grouped correctly.
16-20. Match modes: exact, near (Δ tolerance), reduced (digit_sum equality).
21-25. Sealed entries: phrase null, sealed_match_count populated.
26-30. Owner scoping: 401 unauthenticated, owner-only rows in results.
31-35. CSV export shape + edge cases (empty results, large result sets).

**DoD:**
- [ ] Model + migration 0039.
- [ ] Indexer task + entry-save hook.
- [ ] Router registered.
- [ ] Sealed-entry skip verified by integration test.
- [ ] Owner-scope enforced.
- [ ] Tests green.

---

## B112 — Studies (saved gematria queries + snapshots)

**Files created:**

- `backend/theourgia/models/studies.py` (Study + StudySnapshot)
- `backend/alembic/versions/0040_phase08_studies.py`
- `backend/theourgia/api/routers/v1/studies.py`
- `backend/tests/test_studies.py`

**Study model:**

```python
class StudyKind(str, enum.Enum):
    GEMATRIA_SEARCH = "gematria_search"
    GEMATRIA_CALCULATION = "gematria_calculation"
    # Phase 09 will extend with QUERY_BUILDER, etc.


class Study(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "study"
    owner_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

    name: str = Field(max_length=240, nullable=False)
    kind: StudyKind = Field(...)
    # query = { value: 418, cipher_ids: [...], match_mode: "exact", ... }
    # or { input: "ἀγαθοδαίμων", cipher_ids: [...] } for calculations.
    query: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    # Citation required only when the practitioner marks this study
    # public/shared (a future flag); per-vault private studies need no citation.
    visibility: Visibility = Field(default=Visibility.PERSONAL, ...)


class StudySnapshot(IDMixin, TimestampMixin, table=True):
    """One execution of a Study. Re-running a Study creates a new snapshot,
    never mutating the prior one (H06 honesty rule #8 — ritual / committed-make)."""
    __tablename__ = "study_snapshot"
    study_id: UUID = Field(foreign_key="study.id", nullable=False, index=True, ondelete="CASCADE")
    # results = the full JSON response from the search/calculation API at
    # the time of the snapshot. Frozen — never edited.
    results: dict = Field(sa_column=Column(JSONB, nullable=False))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
```

**API:**

- `GET /api/v1/studies?kind=<...>&limit=25&offset=0` → `list[StudyRead]`.
- `GET /api/v1/studies/{id}` → `StudyRead` (with snapshot list).
- `POST /api/v1/studies` body `{ name, kind, query, description? }` → `StudyRead`.
- `PATCH /api/v1/studies/{id}` (name + description + visibility only — query is **immutable** after first save) → `StudyRead`.
- `DELETE /api/v1/studies/{id}` → 204 (soft).
- `POST /api/v1/studies/{id}/run` → re-runs the query, creates a new snapshot, returns `StudySnapshotRead`.
- `GET /api/v1/studies/{id}/snapshots` → list of snapshots (chronological).
- `GET /api/v1/studies/{id}/snapshots/{snap_id}` → frozen snapshot.

**Honesty rules:**

1. **Query is immutable after first save.** The H06 §8 ritual rule: re-opening a saved study is read-only; editing creates a new Study (the old one is retained). PATCH cannot change the `query` field; if the practitioner wants to refine, they POST a new study.
2. **Snapshots are frozen.** Once a snapshot is created, its `results` JSONB cannot be modified by any route. The `notes` field on a snapshot IS editable (the practitioner can annotate the result of a past run).
3. **Re-run produces a new snapshot.** It does NOT replace the most recent one. The full chronological history is preserved.

**Tests (≥ 28):**

1-5. Study CRUD: create, read, list, soft-delete, owner-scope.
6-10. Query is immutable: PATCH `query` returns 400; only name/description/visibility patchable.
11-15. Snapshot creation: every `/run` creates a new row; chronological order maintained.
16-20. Snapshot freezing: cannot PATCH snapshot.results (only snapshot.notes).
21-25. Re-run with stale cipher: if a cipher referenced in `query.cipher_ids` was deleted, the run returns an error with a clear message ("Cipher X is no longer in your vault — fork or recreate it.").
26-28. Router smoke + schema validation.

**DoD:**
- [ ] Model + migration 0040.
- [ ] Router registered.
- [ ] Immutable-query rule enforced.
- [ ] Snapshot freezing enforced.
- [ ] Tests green.

---

## B113 — Transliteration scheme reference tables

**Files created:**

- `backend/theourgia/models/transliteration_schemes.py`
- `backend/alembic/versions/0041_phase08_transliteration_schemes.py`
- `backend/theourgia/api/routers/v1/transliteration.py`
- `backend/theourgia/core/linguistic/transliteration_schemes.py` (PD scheme tables as Python constants)
- `backend/tests/test_transliteration_schemes.py`

**Scheme model:**

```python
class SchemeDirection(str, enum.Enum):
    SCRIPT_TO_LATIN = "script_to_latin"
    LATIN_TO_SCRIPT = "latin_to_script"


class TransliterationScheme(IDMixin, TimestampMixin, table=True):
    """A reference table for one transliteration scheme. Transliteration
    itself is client-side per the H06 spec; the server only stores the
    reference tables so the client can verify against the canonical
    mappings."""
    __tablename__ = "transliteration_scheme"
    # Stable slug (e.g., "greek-beta-code", "iast", "sbl-hebrew").
    slug: str = Field(max_length=120, nullable=False, unique=True)
    name: str = Field(max_length=240, nullable=False)
    source_script: str = Field(max_length=40, nullable=False)  # greek/hebrew/sanskrit/arabic/coptic
    direction: SchemeDirection = Field(...)
    # The mapping table itself. JSONB: { "α": "a", "β": "b", ... }
    mapping: dict = Field(sa_column=Column(JSONB, nullable=False))
    source_citation: str = Field(max_length=480, nullable=False)
    # Round-trip integrity flag: ✓ lossless · ◐ normalises · ✗ diacritic loss
    round_trip_status: str = Field(max_length=8, nullable=False)
```

**Bundled schemes shipped server-side:**

| Slug | Name | Source script | Round-trip | Citation |
|------|------|---------------|------------|----------|
| `greek-beta-code` | Beta Code | greek | ✓ | "Thesaurus Linguae Graecae project, UC Irvine. PD reference." |
| `greek-ala-lc` | ALA-LC | greek | ◐ | "American Library Association / Library of Congress romanization, 2010." |
| `iast` | IAST | sanskrit | ✓ | "International Alphabet of Sanskrit Transliteration — 1894 Geneva Congress standard. PD." |
| `harvard-kyoto` | Harvard-Kyoto | sanskrit | ✓ | "ASCII Sanskrit standard from Harvard-Kyoto 1970s. PD." |
| `sbl-hebrew` | SBL Hebrew Romanization | hebrew | ◐ | "Society of Biblical Literature, 2014 style manual." |
| `iso-233-arabic` | ISO 233 | arabic | ✓ | "ISO 233:1984 international standard. Convention; widely PD." |
| `din-31635-arabic` | DIN 31635 | arabic | ◐ | "Deutsches Institut für Normung 31635, 2011." |
| `coptic-sbl` | SBL Coptic | coptic | ◐ | "Society of Biblical Literature Coptic Romanization." |

**API:**

- `GET /api/v1/transliteration/schemes?source_script=<...>` → `list[SchemeRead]` (public; reference material).
- `GET /api/v1/transliteration/schemes/{slug}` → `SchemeRead` with full mapping.

**No write routes** — schemes are reference; they ship as constants and update only with a migration when a new authoritative scheme is added.

**Tests (≥ 20):** every shipped scheme verified against a canonical input (e.g., for IAST: "अग्नि" → "agni"; for Beta Code: "ἀγαθός" → "a)gaqo/s"). The verifier reads the scheme's mapping table and applies it to a known input; the test asserts the output matches a published reference.

**DoD:**
- [ ] Model + migration 0041.
- [ ] 8 bundled schemes shipped, every one PD-cited.
- [ ] Test corpus pinned (one canonical input per scheme).
- [ ] Tests green.

---

## B114 — Voce private notes + per-vault visibility

**Files modified:**

- `backend/theourgia/models/voces.py` (extend with private_note + hidden_in_vault columns)
- `backend/alembic/versions/0042_phase08_voce_extensions.py`
- `backend/theourgia/api/routers/v1/voces.py` (add per-vault note endpoints)
- `backend/tests/test_voces.py` (extend)

**Schema additions:**

A new join table `voce_per_vault_state` (NOT a column on `voce_magicae` — the voce row stays canonical):

```python
class VocePerVaultState(IDMixin, TimestampMixin, table=True):
    __tablename__ = "voce_per_vault_state"
    voce_id: UUID = Field(foreign_key="voce_magicae.id", nullable=False)
    owner_id: UUID = Field(foreign_key="user.id", nullable=False)
    # The H06 "Why I learned this voce" private textarea.
    private_note: Optional[str] = Field(default=None, sa_column=Column(Text))
    # When true, this voce is hidden from this practitioner's library
    # (the bundled corpus is shared but a single practitioner may hide
    # individual entries — e.g., voces they don't work with).
    hidden: bool = Field(default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("voce_id", "owner_id", name="uq_voce_per_vault"),
    )
```

**API:**

- `GET /api/v1/voces/{id}/per-vault` → returns the calling owner's row, or default `{ private_note: null, hidden: false }`.
- `PUT /api/v1/voces/{id}/per-vault` body `{ private_note?, hidden? }` → upserts the row.

**Tests (≥ 18):**

1-5. Default state shape for an un-touched voce.
6-10. Upsert idempotency: PUT twice produces one row, not two.
11-15. Hidden voces are excluded from `GET /api/v1/voces` and `GET /api/v1/voces/bundled` (when `?include_hidden=false` — the default).
16-18. Other owners' notes are not visible.

**DoD:**
- [ ] Model + migration 0042.
- [ ] Endpoints registered.
- [ ] Voce list endpoint respects hidden state.
- [ ] Tests green.

---

## B115 — Phase 08 close-out

**Files modified:**

- `CHANGELOG.md` — "Phase 08 backend COMPLETE" entry.
- `FEATURES.md` — Phase 08 row to ✅; check off Linguistic features per-domain.
- `README.md` — Phase 08 row state + status badge update.
- `plan/08-linguistic-tools.md` — DoD checked.
- Memory: `project_phase_status.md` (test totals, queue update), `project_resume_state.md` (commit history), new `project_phase_08_close.md`.

**Run:**
- Full backend test suite (`pytest backend/`) — confirm all green, ~1750 tests.
- Full frontend test suite (`pnpm test`) — confirm all green.
- Visual + a11y — confirm green (no surface changes; only backend).
- Push.

**DoD:**
- [ ] All gates green.
- [ ] Docs reflect Phase 08 complete.
- [ ] Memory reflects the close + the next queue (Phase 09 backend planning is the natural follow-on).

---

## What's NOT in Phase 08

- **Phase 09 (Synchronicity & Analytics) backend.** Separate plan (`plan/09-batches-backend.md` — to be authored next). The dependency runs the other way: Phase 09's saved-query/study system extends the Phase 08 `study` table with new `kind` values.
- **Community contribution workflow.** Phase 14. The H06 Voces Browser's "Suggest correction" footer honestly labels this.
- **Per-vault `subscription_to_bundled` (e.g., subscribe to a community voces feed).** Phase 12 (Federation).
- **Server-side gematria computation for the single-text Calculator surface.** Per the H06 spec, the Calculator is fully client-side. Server gematria only supports the cross-journal index path.
- **Inline editor hover-translit.** That's a Tiptap-node behaviour; the schemes ship in Phase 08, the editor integration is a separate frontend batch.

---

## Sequencing with H06 frontend ports

The H06 surfaces unblocked by each batch (so the frontend can wire surfaces as backend lands):

- B110 lands → **Gematria Calculator** (H06-1, already shipped at `684b943`) can persist a Custom Cipher to the vault.
- B111 lands → **Cross-Journal Gematria Search** (H06 S7 #2, queued) becomes wirable end-to-end.
- B112 lands → **Saved Studies Index** (H06 S7 #9) + **Per-Study Page** (H06 S7 #10) become wirable.
- B113 lands → **Transliteration Utility** (H06 S7 #3, currently client-only) can verify against canonical scheme references.
- B114 lands → **Voces Library Browser** (H06-4, shipped at `5e60014`) gets the private-note persistence + hide affordance.

**Recommended execution order if interleaving with H06 frontend ports:** B110 → wire Calculator custom-cipher save → B114 → wire Voces Library private-note → B111 → port Cross-Journal Search → B113 → port Transliteration Utility → B112 → port Studies surfaces.

---

**Last build-side update:** 2026-06-25 — Plan authored. Phase 07 backend shipped (B103-B107). H06 frontend foundation + surfaces 1/10 + 4/10 shipped (`e5b6583`, `684b943`, `5e60014`). H07 design request opened (`8476509`).
