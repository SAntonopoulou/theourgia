# Theourgia — Backend

The Theourgia backend: FastAPI application, federation engine, plugin host, and astronomical / linguistic calculation modules. Python 3.12+, SQLModel + asyncpg over PostgreSQL, Redis-backed sessions and Celery queue.

## Status

**Planning phase.** Package skeleton in place; no application code yet. Implementation begins with Phase 01 (Core Architecture) — see [../plan/01-core-architecture.md](../plan/01-core-architecture.md).

## Layout

```
backend/
├── pyproject.toml       Package manifest, dependencies, build config
├── theourgia/           Source root
│   ├── __init__.py
│   ├── __about__.py     Version and project metadata
│   ├── __main__.py      CLI entry point (placeholder)
│   ├── core/            Framework code (auth, plugins, encryption, federation) — Phase 01
│   ├── modules/         Feature modules (journal, entities, divination, …) — Phase 04+
│   ├── api/             FastAPI routers — Phase 01+
│   ├── workers/         Celery tasks — Phase 01+
│   └── plugins/         Built-in plugins — Phase 14
└── tests/               pytest suite
```

## Development

From the **repository root**:

```bash
just install-backend   # installs deps via uv into backend/.venv
just lint-backend      # Ruff
just typecheck-backend # mypy
just test-backend      # pytest
```

Or directly:

```bash
cd backend
uv sync --all-extras --dev
uv run pytest
```

## Dependencies

See [pyproject.toml](pyproject.toml) for the full list and version constraints. Key choices:

- **FastAPI** — async web framework
- **SQLModel** — Pydantic + SQLAlchemy unified
- **Alembic** — schema migrations
- **asyncpg / psycopg** — PostgreSQL drivers
- **Redis** — sessions, cache, Celery broker
- **Celery** — background jobs
- **pyswisseph** — Swiss Ephemeris (AGPL-3.0; see [../NOTICE](../NOTICE))
- **cryptography / PyNaCl / Argon2** — authenticated encryption and password hashing
- **WebAuthn** — passkey support
- **structlog** — structured logging

Dev-only: pytest, hypothesis, mypy, ruff, pip-audit.

## License

[AGPL-3.0-only](../LICENSE).
