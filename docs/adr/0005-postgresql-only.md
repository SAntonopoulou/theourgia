# ADR-0005: PostgreSQL is the only supported database

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #database, #storage

## Context and problem statement

Theourgia stores diverse data: journal entries (rich text + structured metadata), entity graphs with typed relationships, astronomical event streams, gematria index, federation state, vector embeddings for semantic search, JSON-shaped bundle manifests, time-series synchronicity logs.

Some databases are excellent at one or two of these but force compromise on others. The question: do we commit to one database for everything, or use multiple (relational + search + vector + cache)?

Self-hosting concerns also matter. Many practitioners will run Theourgia on small hosts. Forcing them to run multiple datastores raises the bar significantly.

## Decision drivers

- Diverse data types in one product
- Self-host friendliness (fewer services = fewer things to deploy, monitor, back up)
- Robust full-text search (multilingual: Greek, Hebrew, Arabic, Latin)
- Vector similarity for semantic search across journal entries
- Mature transactional guarantees (encryption mode changes, federation state, financial flows)
- Operational maturity (we want decade-long stability)

## Considered options

1. **PostgreSQL only** — with extensions (`pgvector`, `pg_trgm`, `unaccent`, FTS)
2. **PostgreSQL + Elasticsearch / OpenSearch** for search
3. **PostgreSQL + a dedicated vector DB** (Qdrant, Weaviate, Milvus)
4. **SQLite for self-hosters + PostgreSQL for production**
5. **MySQL / MariaDB** — alternative relational
6. **A document database** (MongoDB, CouchDB) — JSONB-native

## Decision

**PostgreSQL 16+ is the only supported database.**

Required extensions: `pgvector`, `pg_trgm`, `unaccent`, `citext`, `pgcrypto`.

## Rationale

PostgreSQL is unique in modern open-source databases for being excellent at *all* of our requirements:

- **Relational core** with the strongest transactional guarantees in OSS
- **JSONB** for flexible schema-less data (bundle manifests, ad-hoc metadata)
- **Full-text search** with multi-language support (the right configuration handles polytonic Greek, Hebrew with niqud diacritics, Arabic, and Latin all reasonably well)
- **`pgvector`** for embedding-based semantic search — no separate vector DB needed
- **Row-Level Security** is the right primitive for our visibility model (`personal / viewer / network / public / sealed`), enforced at the database layer rather than relying on application code alone
- **Partial indexes, expression indexes, GIN/GiST** indices give us tooling for nearly any query pattern
- **`citext`** for case-insensitive identifiers (entity names, identifiers)
- **`unaccent`** for diacritic-insensitive search across European scripts
- **Logical replication** for backups, read replicas, future federation use cases
- Two decades of operational maturity; the most boring choice is sometimes the best one

Option 2 (Postgres + Elasticsearch) adds operational complexity for a search story that `pg_trgm + tsvector + pgvector` handles within our scale.

Option 3 (Postgres + dedicated vector DB) — same operational complexity for what `pgvector` already gives us at our embedding volumes.

Option 4 (SQLite for self-hosters) — appealing for solo magicians on a Raspberry Pi, but SQLite lacks `pgvector`, has weaker FTS for our multilingual case, and doesn't support our planned federation patterns well. The maintenance burden of two database backends is real. We say no.

Option 5 (MySQL/MariaDB) — viable but Postgres beats it on JSONB, extension ecosystem (`pgvector` is canonical for us), and FTS quality.

Option 6 (document DB) — loses ACID guarantees we need for encryption / federation / Stripe flows. Schema-less is the wrong default for a domain this structured.

## Consequences

### Positive
- One datastore to deploy, monitor, back up, secure
- Strong consistency for everything that needs it; flexible JSONB for everything that doesn't
- The visibility model is enforced at the DB layer via RLS — defense in depth
- Vector search, full-text search, and relational queries all in one query language
- Backup story is well-trodden (Restic over `pg_dump` or physical backups)
- Operationally boring in a good way

### Negative / trade-offs
- We require a real Postgres in every environment (no SQLite shortcut for small deployments). Self-hosters need Docker or a managed Postgres.
- We commit to PostgreSQL-specific features (RLS, `pgvector`, JSONB operators). Switching databases later would be a major effort. This is intentional — we're choosing depth.
- Required extensions (`pgvector` especially) need explicit installation; this is handled in the container image and documented for non-Docker self-hosters.

### Neutral
- Connection: `asyncpg` for async paths, `psycopg` 3 for cases where sync is easier
- Migrations via Alembic; every migration round-trips against a populated test DB in CI
- Multi-vault isolation via `vault_id` + RLS policies, not via separate databases per vault

## Implementation notes

- Minimum supported version: **PostgreSQL 16.** Earlier versions lack some features we rely on (`pgvector` extension is improving rapidly; tracks Postgres releases).
- Extensions enabled in the first migration (Phase 01): `pgcrypto`, `pgvector`, `pg_trgm`, `unaccent`, `citext`.
- Role separation in production: `theourgia_app` (DML only), `theourgia_migrate` (DDL during migrations), `theourgia_ro` (read-only for analytics).
- Schema namespacing: plugins get their own schemas to avoid collision (`plugin_<plugin_name>.*`).

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [ARCHITECTURE.md §4 Data Model](../../ARCHITECTURE.md)
- [ARCHITECTURE.md §5 Security & Trust Model](../../ARCHITECTURE.md)
- [plan/01-core-architecture.md](../../plan/01-core-architecture.md)
