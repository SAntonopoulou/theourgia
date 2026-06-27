# Theourgia plugin registry

The author/reviewer/public side of [`plugins.theourgia.com`](https://plugins.theourgia.com).

Lives in this monorepo alongside `backend/` (the vault host) and `frontend/`. The two backends share crypto primitives (Ed25519 + RFC 9421 + DID format) but otherwise run as independent FastAPI apps with their own databases.

## Scope

- **Public**: browse plugins, view plugin detail, view author profile.
- **Author**: submit / withdraw plugin versions; file vulnerability advisories.
- **Maintainer (multi-maintainer from day 1)**: review queue, accept / request changes, tier promotion, advisory verification, maintainer-roster management.

Per H10 rules 41–44:

- Submissions are never auto-promoted (rule 41).
- License is SPDX-validated, blocking, against an explicit allowlist (rule 42).
- Severity is low/medium/high — no `critical` (rule 43).
- Maintainer review shows the diff; no approve-blind (rule 44).

## Running

```sh
cd registry
pip install -e .[test]
alembic upgrade head
uvicorn theourgia_registry.api.app:app --host 0.0.0.0 --port 8001
```

## Status

Scaffold landed at H10 Cluster A kickoff. Models + alembic 0001 + schema-locked endpoints + license allowlist live. SSO bridge to the vault host + DB-backed mutations + the eight H10 surfaces are the next batches.
