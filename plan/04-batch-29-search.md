# Phase 04 — Batch 29: Search substrate (Postgres FTS + filter chips)

> Lexical search over journal entries with filter chips (kind, visibility, date range). Sealed entries excluded server-side. Semantic search via pgvector is queued behind this (same interface; adds a vector-similarity rank when `embed` is set on the request).

## Substrate

`backend/theourgia/core/search/`:
- `search.py` — `SearchRequest` dataclass + `search_entries(session, request) → SearchResults` async function.
- `__init__.py` — barrel exports `SearchHit`, `SearchRequest`, `SearchResults`, `search_entries`.

The query builder composes:
- Soft-delete filter (`deleted_at IS NULL`)
- Sealed-entry exclusion (`encryption_mode == none`) — the server never sees plaintext for sealed rows.
- Kind / visibility / owner_id filters (AND across families, OR within).
- Date range via `coalesce(occurred_at, created_at)` so legacy entries without a backfilled `occurred_at` still match.
- Optional FTS via Postgres `websearch_to_tsquery` (quotes for phrases, OR for disjunction, `-foo` for negation).
- Order by FTS rank when a query was supplied; by most-recent otherwise.
- Pagination via `limit` / `offset` with a separate count query for `total`.

## Migration

`backend/alembic/versions/0018_entry_search.py`:
- `ALTER TABLE entry ADD COLUMN search_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_text,''))) STORED`
- `CREATE INDEX ix_entry_search_tsvector ON entry USING gin (search_tsvector)`

Why a stored generated column rather than a trigger: writes stay simple, the index updates atomically with the row, and the search service can target the column directly via `Entry.search_tsvector @@ websearch_to_tsquery(...)`.

## API

`backend/theourgia/api/routers/v1/search.py`:
- `GET /api/v1/search?q=…&kind=…&visibility=…&since=…&until=…&limit=…&offset=…`
- Multiple `kind` values via repeat (`?kind=working&kind=ritual_log`).
- Returns `{ hits: EntryRead[], total: int, limit, offset }`.
- Reuses `EntryRead` + `_to_read` from the entries router for shape consistency.

Mounted in `routers/__init__.py` at the `/api/v1` prefix.

## Tests

`backend/tests/test_search.py` — 5 tests:
- SearchRequest defaults (no filters; limit 20; offset 0).
- SearchRequest with full filter set.
- Empty-tuple-as-empty-filter sentinel.
- SearchResponse Pydantic shape.
- `/search` endpoint registered on the router.

Full-DB integration tests run against the real Postgres in the deploy round-trip (per the existing entries test pattern that defers DB-binding tests to the curl-against-dev check).

**Full backend suite: 1135 tests pass** (+5 new).

## Deferred

- **Tag / entity filters**: the m2m tables don't exist yet (Phase 05 ships entities; tags are a Batch 29.5 substrate item if they don't naturally fold into entities).
- **Saved searches** (`saved_query` table): a focused follow-up batch once the JSON-filter-payload schema settles after a few real-world filter combinations.
- **Semantic search via pgvector**: the SearchRequest interface accommodates it; the `embed` field is the future addition. Local embedding model selection (Ollama / HuggingFace) is its own substrate question.
- **Search performance benchmark**: the 5,000-entry < 200ms DoD target is verifiable once the load-test harness ships in Phase 15.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 API ready; editor in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| Templates: built-ins ship, designer works, save/load works | ⏳ Batch 30 |
| **Search: lexical + semantic + filter chips all functional** | **🟡 Lexical + filter chips ✅; semantic deferred** |
| Body sensation diagram | ⏳ Batch 34 |
| Audio | ⏳ Batch 34 |
| Library catalog | ⏳ Batch 31 |
| `/quote` autocite | ⏳ Batch 35 |
| Print export | ⏳ Batch 36 |
| Visibility downgrade flow | 🟡 Schema ready; UI in Batch 35 |
| Encryption: sealed entries verified zero-knowledge | 🟡 Column ready; client crypto in future batch |
| Performance: 5,000-entry < 200ms | 🟡 Indexes added; benchmark in Phase 15 load test |
