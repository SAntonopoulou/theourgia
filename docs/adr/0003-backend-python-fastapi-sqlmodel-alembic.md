# ADR-0003: Backend stack — Python 3.12+ with FastAPI + SQLModel + Alembic

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #backend, #language, #framework, #orm

## Context and problem statement

Theourgia needs a backend stack chosen with intent. The choice affects: developer productivity, performance characteristics, ecosystem depth (astronomy / cryptography / federation / linguistic libraries), maintainability across many years, and the contributor pool we can attract.

## Decision drivers

- Maintainer is fluent in Python; rapid iteration in planning + early phases matters
- Need rich third-party ecosystem for astronomy (Swiss Ephemeris), cryptography, federation, NLP / transliteration, scientific computation
- Mature async story (federation, background jobs, agent integration all benefit)
- Type safety from day one (project commits to strict typing)
- Good migration story (project is long-lived; schemas will evolve)
- Open-source community traction (contributors come from where the language is)

## Considered options

1. **Python 3.12+ with FastAPI + SQLModel + Alembic** — modern async Python web stack
2. **Go with chi / fiber + sqlc + atlas** — fast, strongly typed, single-binary deploys
3. **Rust with axum + sqlx + refinery** — memory safety, performance, smaller surface for security bugs
4. **TypeScript / Node with Fastify + Drizzle + Drizzle migrations** — shared language with frontend
5. **Elixir / Phoenix with Ecto** — actor model, robust concurrency, strong ergonomics for live features
6. **Django / DRF with PostgreSQL** — battle-tested but less aligned with modern async patterns

## Decision

**Python 3.12+, FastAPI, SQLModel, Alembic, asyncpg, Celery, structlog.**

## Rationale

The deciding factors:

- **Astronomical and cryptographic ecosystem.** Python has the strongest ecosystem for Swiss Ephemeris (`pyswisseph`), cryptography (`cryptography`, `PyNaCl`, `argon2-cffi`), linguistic tooling (transliteration, gematria can leverage stdlib), and scientific computation. Rust and Go have these libraries too but not as mature.
- **Maintainer fluency.** Iteration speed matters in early phases. We pay the runtime-performance cost (Python is slower than Go / Rust) consciously; the platform is not CPU-bound for typical use, and we can selectively rewrite hot paths if needed.
- **FastAPI's async model + Pydantic integration** is well-suited to the federation + WebSocket + plugin host workloads we plan.
- **SQLModel unifies Pydantic and SQLAlchemy** — fewer model definitions, single source of truth for ORM + API schema.
- **Alembic** is the mature migration tool for SQLAlchemy ecosystems; offline migration generation + manual review is the discipline we want.
- **structlog** for structured logging is a deliberate choice — JSON-line logs feed cleanly into Grafana Loki / observability pipelines.

Go (option 2) was the strongest alternative but loses on the astronomy/crypto library landscape. Rust (option 3) is wonderful but the contributor pool is smaller and ecosystem depth in our specific niches is thinner. TypeScript backend (option 4) would share language with frontend but the typing story for ORM/migrations is less mature than Python's, and the synchronous/async story is more confusing. Elixir (option 5) is delightful but the maintainer doesn't have it in their fingers, and library coverage for our magickal-specific needs is sparse. Django (option 6) is solid but its sync-by-default model conflicts with our federation + WebSocket needs.

## Consequences

### Positive
- Rapid development in early phases; maintainer can move fast
- Best-in-class library coverage for our specific domain (astronomy, crypto, federation)
- Async-first stack appropriate for our workloads
- Strict typing via mypy + Pydantic catches whole classes of bugs at edit time

### Negative / trade-offs
- Python runtime performance is lower than Go/Rust. We accept this; the platform is not CPU-bound. If a specific hot path becomes a bottleneck (e.g., a federation message hot path or a gematria query), we can rewrite *that* path in Rust via PyO3 or similar.
- Memory footprint of Python services is larger than Go/Rust — relevant for low-spec self-hosters. We document realistic resource requirements.
- Dependency management is a known source of complexity. We use `uv` for speed + lockfile guarantees.

### Neutral
- Tooling decisions:
  - `uv` as package manager (modern, fast; supersedes pip/poetry/pdm for our needs)
  - `Ruff` for lint + format (replaces flake8, isort, black, autoflake all at once)
  - `mypy` for type checking (strict mode)
  - `pytest` + `hypothesis` for testing
  - `pip-audit` for vulnerability scanning

## Implementation notes

Key library version pins (see [`backend/pyproject.toml`](../../backend/pyproject.toml) for canonical):

- Python 3.12+ (3.13 supported)
- FastAPI 0.115+
- SQLModel 0.0.22+ (still pre-1.0 but stable enough for our use; tracked carefully)
- Alembic 1.14+
- asyncpg 0.30+
- psycopg 3.2+ (kept alongside asyncpg for cases where sync DB ops are easier)
- Celery 5.4+ with Redis broker
- cryptography 44+, PyNaCl 1.5+, argon2-cffi 23.1+
- pyswisseph 2.10+ (see [ADR-0006](0006-swiss-ephemeris-over-skyfield.md))
- structlog 24.5+

Async-first throughout: all DB calls via asyncpg / SQLModel async sessions; all HTTP calls via httpx.

## References

- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [SQLModel documentation](https://sqlmodel.tiangolo.com/)
- [Alembic documentation](https://alembic.sqlalchemy.org/)
- [uv documentation](https://docs.astral.sh/uv/)
- [backend/pyproject.toml](../../backend/pyproject.toml)
- [ARCHITECTURE.md §2 Technology Stack](../../ARCHITECTURE.md)
