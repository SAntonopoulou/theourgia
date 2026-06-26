# Phase 09 backend authoring plan (B120 → B125)

**Status:** OPEN — ready to execute.
**Modeled on:** `plan/08-batches-backend.md` (the B110-B115 lineage that closed Phase 08 backend in five batches).

This document **locks every backend product decision** for the
solo-magician subset of Phase 09 (Synchronicity & Analytics). The
implementation agent renders the locked decisions across migrations,
models, routers, and tests. Where this document says "this column
exists", it exists; where it says "this honesty rule fires", it
fires. If a genuine question remains after reading this doc, raise
it back — do not pick a direction.

**Scope:** the solo-magician analytics path that unblocks H06
surfaces 7/10 (Analytics Dashboard), 8/10 (Query Builder), 9/10
(Synchronicity Log), 10/10 (Synchronicity Quick-Capture).

**Explicitly out of scope (Phase 12+):**

- Network-aggregate analytics (`/api/v1/hubs/:id/analytics/*`).
- Differential-privacy noise + cohort thresholds.
- Anonymized cross-vault contribution flows.
- Federation of saved studies.
- Email delivery of the weekly digest (digest ships in-app first;
  email rides the Phase 12 federation layer's notification spine).
- Pattern-detection ML / anomaly-detection automatic surfacing.

These pieces all depend on Phase 12 (Federation) substrate that
doesn't exist yet. Authoring them now would either be speculative
or would create a non-trivial migration when the federation
substrate lands. **They WILL ship — just later.**

Carry-forward backend conventions (proven through B103-B114):

- `owner_id: UUID | None` with `ForeignKey("user.id", ondelete="SET NULL")`.
- Inline Pydantic schemas in router files.
- Pagination via `limit: int = 100` (max 500).
- `SoftDeleteMixin` via `deleted_at`.
- Honesty rules enforced at the API layer; DB constraints back the
  most critical ones.
- Federation prep (`canonical_id` + `instance_id`) explicitly
  DEFERRED to Phase 12. Do not add these columns in Phase 09.

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|-------|-------|--------------|-----------:|------------:|
| B120 | Synchronicity table + CRUD + auto-tag | Phase 03 (astro) + Phase 04 (entry) | ~750 | ~30 |
| B121 | Extend Study with QUERY_BUILDER kind + query DSL | B112 (study) | ~500 | ~22 |
| B122 | Query executor — filter pipeline | B120 + B121 + Phase 04 (entry) | ~900 | ~35 |
| B123 | Analytics aggregates — counts, time-series, heatmap | B122 | ~600 | ~25 |
| B124 | Weekly digest (in-app only) | B122 + B123 | ~400 | ~15 |
| B125 | Phase 09 close-out (CHANGELOG · FEATURES · README · memory) | B120-B124 | (docs) | (none) |

Approximate total: ~3150 lines + ~127 tests.
Backend test count target: 1753 → ~1880 by Phase 09 close.

Alembic chain: 0042 → 0043 → 0044 → 0045 → 0046 → 0047 (one per
batch B120-B124; B125 ships no migrations).

---

## B120 — Synchronicity table + CRUD + auto-tag

**Files created:**

- `backend/theourgia/models/synchronicities.py`
- `backend/alembic/versions/0043_phase09_synchronicities.py`
- `backend/theourgia/api/routers/v1/synchronicities.py`
- `backend/theourgia/core/analytics/__init__.py` (new package)
- `backend/theourgia/core/analytics/autotag.py` (the on-save
  auto-tagger; pure function so tests can drive it directly)
- `backend/tests/test_synchronicities.py`

**Synchronicity model:**

```python
class SynchronicityCategory(str, enum.Enum):
    NUMBER_SEQUENCE   = "number_sequence"
    NAME_OCCURRENCE   = "name_occurrence"
    DREAM_SPILLOVER   = "dream_spillover"
    ANIMAL_OMEN       = "animal_omen"
    SONG_LYRIC        = "song_lyric"
    OVERHEARD_SPEECH  = "overheard_speech"
    WEATHER           = "weather"
    OBJECT_ENCOUNTER  = "object_encounter"
    ELECTROMAGNETIC   = "electromagnetic"
    CUSTOM            = "custom"


class Synchronicity(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "synchronicity"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)

    occurred_at: datetime = Field(nullable=False)
    description: str = Field(sa_column=Column(Text, nullable=False))

    category: SynchronicityCategory = Field(...)
    intensity: int = Field(ge=1, le=10, nullable=False, default=5)

    # Free-form structured field. For number_sequence this might be
    # { "number": "1111", "noticed_via": "clock" }; for animal_omen
    # { "species": "raven", "count": 3 }. Schema is per-category and
    # validated at the API layer.
    structured_data: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    # Auto-tagged on save. The route fills these in unless overridden.
    astro_snapshot: dict | None = Field(
        default=None, sa_column=Column(JSONB),
    )
    calendar_stamp: dict | None = Field(
        default=None, sa_column=Column(JSONB),
    )
    weather_snapshot: dict | None = Field(
        default=None, sa_column=Column(JSONB),
    )
    # Lat/lng — PRECISION-RESPECTING. Same rules as Pilgrimage Map
    # (Phase 11): the route honours the practitioner's per-vault
    # precision setting; values lower than the floor are dropped.
    location_lat: float | None = Field(default=None)
    location_lng: float | None = Field(default=None)
    location_precision: str = Field(default="hidden", max_length=16)

    # Cross-references
    linked_entry_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    linked_entity_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    linked_working_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    __table_args__ = (
        Index("ix_sync_owner", "owner_id"),
        Index("ix_sync_occurred_at", "occurred_at"),
        Index("ix_sync_category", "category"),
        Index("ix_sync_owner_occurred", "owner_id", "occurred_at"),
    )
```

**Auto-tag pipeline (pure function):**

```python
def autotag_synchronicity(
    *,
    occurred_at: datetime,
    location_lat: float | None,
    location_lng: float | None,
    location_precision: str,
    astro_provider: AstroProvider,
    calendar_provider: CalendarProvider,
    weather_provider: WeatherProvider | None,
) -> AutotagResult:
    """Compute the astro_snapshot, calendar_stamp, and (optional)
    weather_snapshot at occurred_at for the given location.

    PURE: no I/O. The providers are dependency-injected so tests can
    pass stubs that return known fixtures.
    """
```

The route calls `autotag_synchronicity` on POST + PATCH (when
`occurred_at` or location changes) and merges the result into the
record. Practitioner-supplied overrides (e.g., manually edited
calendar stamp) are preserved.

**API:**

- `GET /api/v1/synchronicities?from=&to=&category=&intensity_min=&limit=100&offset=0`
  → `list[SyncRead]`
- `POST /api/v1/synchronicities` body `{ description, category,
   intensity?, occurred_at?, structured_data?, location_lat?,
   location_lng?, location_precision?, linked_*? }` → `SyncRead`.
  - `occurred_at` defaults to `now()`.
  - `intensity` defaults to 5.
  - The route auto-tags from `occurred_at` + location; the response
    surfaces the populated `astro_snapshot` + `calendar_stamp` +
    `weather_snapshot`.
- `GET /api/v1/synchronicities/{id}` → `SyncRead`.
- `PATCH /api/v1/synchronicities/{id}` (owner only) — every field
  patchable EXCEPT `auto_tagged_at` and the linked-id integrity.
- `DELETE /api/v1/synchronicities/{id}` → 204 (soft).
- `POST /api/v1/synchronicities/{id}/retag` → re-runs auto-tag
  pipeline against the current `occurred_at` + location.

**Honesty rules:**

1. Auto-tagged snapshots include a `source: "auto"` marker in their
   JSONB so the frontend can distinguish them from
   practitioner-edited overrides.
2. Location precision honours the per-vault floor (the same
   precision substrate as the Pilgrimage Map). If the floor is
   "country", the surface and the DB row both hold country-level
   precision only.
3. Weather is opt-in. When the weather provider returns nothing,
   `weather_snapshot` is null (NOT an empty object).
4. The 10 categories are a closed enum; `custom` is the escape
   hatch with free-form `structured_data`.

**Tests (≥ 30):**

1-5. CRUD: create, read, list, soft-delete, owner-scope.
6-10. Auto-tag: astro + calendar populated when omitted; not
overwritten when supplied.
11-14. Location precision: floor enforced server-side.
15-20. Category enum + intensity range bounds.
21-25. Retag endpoint: idempotent on no-op; rewrites when
occurred_at changes.
26-30. Linked-id validation: linked_entry_ids must reference
caller's entries, etc.

**DoD:**

- [ ] Model + migration 0043.
- [ ] Router registered.
- [ ] Auto-tag pure function + provider injection.
- [ ] Honesty rules wired.
- [ ] Tests green.

---

## B121 — Extend Study with QUERY_BUILDER kind + query DSL

**Files modified:**

- `backend/theourgia/models/studies.py` (extend `StudyKind` enum)
- `backend/alembic/versions/0044_phase09_study_kind_query_builder.py`
- `backend/theourgia/api/routers/v1/studies.py` (no new endpoints;
  the existing `/run` endpoint dispatches the new kind)
- `backend/theourgia/core/analytics/query_dsl.py` (NEW — the
  filter DSL definition + parser)
- `backend/tests/test_query_dsl.py`

**Schema extension:**

The `StudyKind` enum gains `QUERY_BUILDER`. Alembic 0044 adds the
value to the existing `study_kind` Postgres enum (use
`ALTER TYPE ... ADD VALUE`).

**Query DSL:**

A `Study.query` for `QUERY_BUILDER` kind looks like:

```json
{
  "version": 1,
  "subject": "entry" | "working" | "synchronicity" | "divination",
  "filters": [
    {"op": "and", "children": [...]}
    or
    {"op": "or",  "children": [...]}
    or
    {"op": "not", "child": {...}}
    or
    {"field": "<axis>", "cmp": "eq|ne|lt|le|gt|ge|in|nin|contains|matches|between", "value": <json>}
  ],
  "group_by": [<axis>, ...] | null,
  "order_by": [{"field": <axis>, "dir": "asc"|"desc"}, ...] | null,
  "limit": <int> | null,
  "aggregate": "count" | "mean" | "sum" | "histogram" | null,
  "aggregate_axis": <axis> | null
}
```

Axes available (frozen at v1 of the DSL):

```
entry.created_at        entry.captured_at      entry.entry_type
entry.body_text         entry.encryption_mode  entry.visibility
entry.linked_entity_ids entry.linked_working_ids

working.created_at      working.outcome_rating working.tradition_tags

synchronicity.occurred_at synchronicity.category synchronicity.intensity
synchronicity.linked_*

astro.moon_phase       astro.planetary_hour   astro.sun_sign
astro.moon_sign        astro.has_aspect_to_natal

calendar.season        calendar.festival      calendar.weekday
```

The DSL is **declarative**, not eval'd. The `query_dsl.parse` and
`query_dsl.validate` functions ship in B121; the actual executor
lands in B122.

**Tests (≥ 22):**

1-5. Enum migration: study_kind now has QUERY_BUILDER.
6-12. DSL parser: round-trip every comparator + boolean combinator.
13-18. Validation: rejects unknown fields, unknown ops, mismatched
value types.
19-22. Edge cases: empty filters list, deeply nested OR/AND, NOT of
NOT.

**DoD:**

- [ ] Migration 0044.
- [ ] DSL parser + validator.
- [ ] `/api/v1/studies/{id}/run` dispatches QUERY_BUILDER (calls the
      B122 executor — wire the dispatch with a `TODO: B122` stub
      that returns a synthetic empty response; the real wiring
      lands one batch later).
- [ ] Tests green.

---

## B122 — Query executor (filter pipeline)

**Files created:**

- `backend/theourgia/core/analytics/executor.py`
- `backend/tests/test_query_executor.py`

**Executor contract:**

```python
async def execute_query(
    *,
    db: AsyncSession,
    owner_id: UUID,
    query: dict,
) -> QueryExecutionResult:
    """Validate the query against the DSL, then build a SQLAlchemy
    select() across the indicated subject table joined to the
    requested axes, apply the filters, the group-by, the order-by,
    and the optional aggregate, then return the rows.

    Honesty rules:
      * Sealed entries are EXCLUDED from any executor that reads
        entry.body_text. Other entry fields (created_at,
        entry_type) may still match — the body content is what's
        protected.
      * Owner-scoped at every table; cross-vault queries are
        impossible.
      * Personal-cipher provenance (B111) carries through into any
        gematria-axis filter.
    """
```

**Result shape:**

```python
class QueryExecutionResult(BaseModel):
    total_rows: int
    rows: list[dict]           # subject-typed rows (entry, working, etc)
    groups: list[GroupRow] | None  # populated when group_by set
    aggregate_value: float | None  # populated when aggregate set
    sealed_excluded_count: int     # H06 sealed-honesty indicator
```

**API:**

- The existing `POST /api/v1/studies/{id}/run` dispatches based on
  `study.kind`. For `QUERY_BUILDER`, it calls `execute_query` and
  records the result in a new `StudySnapshot` (the B112 path —
  every run creates a new snapshot, never replaces).

- Additionally:
  - `POST /api/v1/analytics/query` — body is a full DSL query;
    returns `QueryExecutionResult` without saving. Used by the
    Query Builder surface for live preview.

**Honesty rules:**

1. Sealed entries' body text NEVER enters a result — the executor
   adds `Entry.encryption_mode != SEALED` to any query that touches
   `entry.body_text`. Other entry fields stay matchable so a date
   filter on sealed entries still works (no count leakage either —
   `sealed_excluded_count` indicates the count of sealed entries
   that would have matched the date filter).
2. Personal-cipher matches are flagged in the row (carries over
   the B111 `cipher_personal` flag).
3. The executor caps result rows at 1000 in a single response;
   pagination via `limit` + `offset` for larger result sets.
4. Timeout: each executor call has a 10s soft cap; exceeding it
   returns `{partial: true, ...}` with what was collected.

**Tests (≥ 35):**

1-10. Filter pipeline: each comparator + each subject table.
11-20. Group-by + aggregates: count, mean, sum, histogram.
21-25. Sealed exclusion: body_text filter never returns a sealed
row; date filter returns sealed rows.
26-30. Owner scope: cross-vault queries return empty.
31-35. Pagination + timeout shape.

**DoD:**

- [ ] Executor implementation.
- [ ] `/api/v1/analytics/query` endpoint.
- [ ] `/studies/{id}/run` dispatches QUERY_BUILDER (replaces the
      B121 stub).
- [ ] Sealed exclusion + sealed_excluded_count verified by
      integration tests.
- [ ] Tests green.

---

## B123 — Analytics aggregates (counts, time-series, heatmap)

**Files created:**

- `backend/theourgia/core/analytics/aggregates.py`
- `backend/theourgia/api/routers/v1/analytics.py`
- `backend/tests/test_analytics_aggregates.py`

**Three core aggregate endpoints:**

- `POST /api/v1/analytics/timeseries` body
  `{ subject, axis: "captured_at", granularity: "day"|"week"|"month",
     from, to, filters? }` → `[{ bucket, count }]`.
- `POST /api/v1/analytics/heatmap` body
  `{ subject, x_axis, y_axis, value_axis: "count" | "mean_outcome",
     filters? }` → `[{ x, y, value }]`. Used by the H06 Analytics
  Dashboard's "planetary hour × weekday" heatmap.
- `POST /api/v1/analytics/correlation` body
  `{ subject, axes: [...], filters? }` →
  `{ pearson: [[...]], spearman: [[...]] }` — symmetric NxN
  correlation matrices over the selected numeric axes.

Plus a small read-only:

- `GET /api/v1/analytics/today` → `{ entries_today, workings_today,
   syncs_today, dominant_planetary_hour }` — what the H06 Analytics
  Dashboard's hero strip wants. Cached for 30s server-side.

**Honesty rules:**

1. Every aggregate response carries a `sample_size` field. If the
   sample size is below a per-aggregate minimum (see below), the
   response carries `small_sample: true`. The frontend surfaces
   this as the `--ink-mute` chip (B112 honesty rule mirrored).
2. Minimums: `timeseries` requires ≥ 5 rows total; `heatmap`
   requires ≥ 10 rows; `correlation` requires ≥ 20 rows. Below
   these the response still returns the data but with the flag
   tripped.
3. Correlation responses carry the per-axis sample size + a
   `null_threshold_warning` if any axis has fewer than half the
   non-null values present. Informational, not blocking.
4. Sealed entries follow the same B122 rule.

**Tests (≥ 25):**

1-8. Time-series: day/week/month buckets correctly assigned.
9-15. Heatmap: x/y axes produce the right grid; missing cells are 0.
16-20. Correlation: Pearson + Spearman symmetric matrices over a
known fixture dataset.
21-25. Sample-size flagging + sealed exclusion + caching.

**DoD:**

- [ ] Three POST endpoints + GET /today.
- [ ] Aggregate honesty fields (sample_size, small_sample,
      null_threshold_warning) wired.
- [ ] Tests green.

---

## B124 — Weekly digest (in-app only)

**Files created:**

- `backend/theourgia/models/digest.py` (Digest + DigestItem)
- `backend/alembic/versions/0047_phase09_digest.py`
- `backend/theourgia/api/routers/v1/digest.py`
- `backend/theourgia/core/analytics/digest_builder.py`
- `backend/tests/test_digest.py`

**Digest model:**

```python
class Digest(IDMixin, TimestampMixin, table=True):
    __tablename__ = "digest"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)

    # The week the digest summarises.
    period_start: datetime = Field(nullable=False)
    period_end:   datetime = Field(nullable=False)

    # Aggregate snapshot at digest time.
    summary: dict = Field(sa_column=Column(JSONB, nullable=False))

    __table_args__ = (
        Index("ix_digest_owner_period", "owner_id", "period_start"),
        UniqueConstraint("owner_id", "period_start",
                         name="uq_digest_owner_period"),
    )


class DigestItem(IDMixin, TimestampMixin, table=True):
    """Individual surfaced patterns. Kept as separate rows so each
    can be marked read / dismissed by the practitioner."""
    __tablename__ = "digest_item"
    digest_id: UUID = Field(foreign_key="digest.id", nullable=False,
                            ondelete="CASCADE", index=True)
    kind: str = Field(max_length=64, nullable=False)
    headline: str = Field(max_length=240, nullable=False)
    body: str = Field(sa_column=Column(Text))
    structured: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    sample_size: int = Field(nullable=False, default=0)
    confidence: float | None = Field(default=None)
    dismissed: bool = Field(default=False, nullable=False)
```

**Builder (pure function):**

```python
def build_digest(
    *,
    owner_id: UUID,
    period_start: datetime,
    period_end: datetime,
    snapshot: AnalyticsSnapshot,
) -> tuple[dict, list[DigestItemDraft]]:
    """Produces the per-period summary + a list of surfaced items.

    Items are produced in three tiers:
      tier 1 (always): the basic counts (entries, workings, syncs)
      tier 2 (heuristic): "your Mars-hour mean outcome is X, vs
        Y for all hours" when n >= MIN_SAMPLE_PER_TIER_2
      tier 3 (correlation): when at least one numeric axis pair
        correlates above a threshold AND n >= MIN_SAMPLE_PER_TIER_3.

    Every tier-2 / tier-3 item carries a confidence interval and a
    sample size in the structured payload. The headline copy is
    matter-of-fact, never oracular ("Mars hour: mean 7.2 ± 1.3 ·
    n=14" not "The Moon favors you!").
    """
```

**Scheduling:**

A Celery beat task runs `build_digest` for every active owner on
Monday 06:00 in the owner's local timezone. Existing
`theourgia.core.tasks` scheduler infra (used by the backup task)
handles this — `digest_builder.run_weekly` is a new
`@celery_app.task`.

**API:**

- `GET /api/v1/digest/weekly` → `DigestRead` (the most-recent
  week's digest for the caller).
- `GET /api/v1/digest/weekly/{period_start}` → a specific past
  digest.
- `PATCH /api/v1/digest/items/{id}` body `{ dismissed: true }` —
  the only mutable field.
- `POST /api/v1/digest/rebuild` (debug) → forces a digest rebuild
  for the current week. Owner-only.

**Honesty rules:**

1. Headlines NEVER include modal language ("must", "will", "should
   work"). Tested against a banned-phrase regex.
2. Every surfaced item carries `sample_size` + `confidence` (when
   available). The frontend renders them inline; missing values
   are NOT hidden — the surface shows "(no CI · small sample)".
3. The Celery task is best-effort. If the digest builder raises,
   the task records a row with `summary = { error: "..." }` and
   no items; the practitioner sees an empty digest with an
   explanation.

**Tests (≥ 15):**

1-5. Digest model + uniqueness on (owner_id, period_start).
6-10. Builder: tier 1 always present; tier 2 + 3 gated by sample
size.
11-13. Banned-phrase headline regex blocks oracular language.
14-15. Dismiss endpoint mutates only the dismissed field.

**DoD:**

- [ ] Model + migration 0047.
- [ ] Builder + Celery task.
- [ ] API endpoints registered.
- [ ] Banned-phrase test passes against the builder's actual
      headline templates.
- [ ] Tests green.

---

## B125 — Phase 09 close-out

**Files modified:**

- `CHANGELOG.md` — "Phase 09 backend (solo-magician subset) COMPLETE".
- `FEATURES.md` — Phase 09 row to ✅ for the solo subset, with an
  explicit note that the network-aggregate path remains Phase 12+.
- `README.md` — Phase 09 row status.
- `plan/09-synchronicity-and-analytics.md` — DoD checked for the
  solo path; cross-magician items remain unchecked with a clear
  "Phase 12+" annotation.
- Memory: `project_phase_status.md` (test totals, queue update),
  `project_resume_state.md` (commit history), new
  `project_phase_09_close.md`.

**Run:**

- Full backend test suite — confirm all green, ~1880 tests.
- Full frontend test suite — confirm all green.
- Visual + a11y — confirm green (no surface changes; only backend).
- Push.

**DoD:**

- [ ] All gates green.
- [ ] Docs reflect Phase 09 solo-subset complete; network path
      explicitly flagged.
- [ ] Memory reflects the close + the next queue (H06 surfaces
      7-10 now unblocked).

---

## What's NOT in Phase 09 backend (this plan)

Re-stating from the top for clarity:

- Network-aggregate analytics (`/api/v1/hubs/:id/analytics/*`).
- Differential-privacy noise + cohort thresholds.
- Anonymized cross-vault contribution flows.
- Federation of saved studies.
- Email delivery of the weekly digest.
- Pattern-detection ML.

Each of these has a clear home in Phase 12+ and shouldn't be
authored speculatively. The solo-magician path is the load-bearing
piece — get that solid first.

---

## Sequencing with H06 frontend ports

The four remaining H06 surfaces unblock as follows:

| Surface | Unblocked by |
|---|---|
| Synchronicity Quick-Capture (10/10) | B120 |
| Synchronicity Log (9/10) | B120 |
| Query Builder (8/10) | B121 + B122 + B123 (for live preview chart) |
| Analytics Dashboard (7/10) | B123 (timeseries + heatmap + today) + B124 (digest) |

A reasonable interleave: ship B120, port surfaces 9 + 10; ship
B121-B122, port surface 8; ship B123-B124, port surface 7. Each
port lands its own batch in parallel with the next backend batch.
