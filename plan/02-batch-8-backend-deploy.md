# Phase 02 — Batch 8: Backend deploy to dev.theourgia.com

> Eighth implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** stand up the backend on agent-house so the API client substrate from Batch 7 has a real backend to call. After this batch, `https://dev.theourgia.com/admin/connection` flips from mock fixtures to live `/healthz`, `/readyz`, and `/api/v1/meta` responses from a real FastAPI instance.

## Why now

Batch 7 shipped the typed API client in pure-substrate mode. Every surface still reads mocks because there's no backend to call. This batch makes the substrate load-bearing:

- Postgres 16 + Redis 7 on agent-house in a docker-compose stack
- Backend container running uvicorn, behind host Caddy
- Alembic migrations applied at deploy time
- Frontend rebuilt with `VITE_THEOURGIA_API_BASE=https://dev.theourgia.com` so the API client switches to live mode

## Architecture

```
                          internet
                              │
                       Cloudflare proxy
                              │
              dev.theourgia.com (host Caddy, 443)
                              │
              ┌───────────────┴───────────────┐
              │                               │
       static frontend                  /api/*, /healthz, /readyz
       /srv/theourgia/dev              reverse_proxy 127.0.0.1:8100
                                              │
                                  ┌───────────┴───────────┐
                                  │   theourgia-backend   │
                                  │   uvicorn :8000       │
                                  └───────────┬───────────┘
                                              │
                                  ┌───────────┴───────────┐
                                  │                       │
                          theourgia-postgres       theourgia-redis
                          (internal network)       (internal network)
```

## Cohort conventions (per pm-claude REPLY_4)

- Container names: `theourgia-*`
- Host port: 8100 (within 8100–8199 reserved range)
- Secrets: `~/secrets/*.env` mode 600 on the server
- Deploy root: `/srv/theourgia/backend/` (compose files + .env + source bind mount)

## What this batch includes

### On agent-house

1. Create `/srv/theourgia/backend/` (root-owned, theourgia-writable)
2. Sync the repo's backend source + compose files into `/srv/theourgia/backend/`
3. Generate three secrets into `/home/theourgia/secrets/backend.env` (mode 600):
   - `THEOURGIA_DB_PASSWORD` — 32-byte random hex
   - `THEOURGIA_SECRET_KEY` — 64-byte random hex
   - `THEOURGIA_MASTER_ENCRYPTION_KEY` — 32-byte random base64 (32 bytes → AES-256)
4. Write a minimal env file with non-secret config (THEOURGIA_ENV=production, THEOURGIA_BASE_URL=https://dev.theourgia.com, THEOURGIA_INSTANCE_ID=dev.theourgia.com)
5. Write a deploy override `docker-compose.dev-theourgia.yml` that:
   - Exposes backend on `127.0.0.1:8100`
   - Skips the celery / celery-beat / frontend services (we don't need them yet)
6. `docker compose up -d --build postgres redis backend`
7. Wait for postgres healthcheck
8. Run `alembic upgrade head` inside the backend container
9. Verify `curl http://127.0.0.1:8100/healthz` returns 200

### Caddy

Update `/etc/caddy/Caddyfile.d/dev-theourgia.caddy` to proxy API requests:

```caddy
dev.theourgia.com {
    ...

    # Backend API routes — match first so they take precedence over static
    @api path /api/* /healthz /readyz
    handle @api {
        reverse_proxy 127.0.0.1:8100
    }

    # Admin SPA
    handle_path /admin* { ... }

    # Public site
    handle { ... }
}
```

`sudo caddy-reload` validates + reloads.

### Frontend

Rebuild with `VITE_THEOURGIA_API_BASE=https://dev.theourgia.com` so the client switches to live mode. Update `scripts/deploy-dev.sh` to set this env var by default (override-able via the shell environment).

## Out of scope (later batches)

- **Celery worker + beat** — no jobs scheduled yet
- **Internal Caddy front (frontend container)** — host Caddy already serves the static frontend
- **Real WebAuthn auth flow** — needs new backend routes
- **Database backups** — Restic substrate from Phase 01 exists but isn't wired to this deploy yet
- **Federation peer routing** — single instance for now
- **Monitoring / log aggregation** — only Docker's json-file driver, viewable via `docker logs`

## Test plan

After deploy:

1. From this machine via Cloudflare edge: `curl https://dev.theourgia.com/healthz` → `{"status":"ok"}`
2. `curl https://dev.theourgia.com/readyz` → `{"status":"ok","checks":{"database":"ok"}}`
3. `curl https://dev.theourgia.com/api/v1/meta` → real Meta response with `instance_id: "dev.theourgia.com"`
4. Visit https://dev.theourgia.com/admin/connection in a browser → banner flips to "Live mode", endpoints all green

## Acceptance criteria

1. Postgres + Redis + Backend running healthy on agent-house, restart policy `unless-stopped`
2. Alembic migrations applied (rows in `alembic_version`)
3. Caddy serves `dev.theourgia.com/healthz`, `/readyz`, `/api/v1/meta` from the backend
4. Frontend rebuilt + redeployed with live API base
5. `/admin/connection` shows live mode + green statuses
6. Secrets stored at `/home/theourgia/secrets/backend.env` mode 600
7. Commit pushed (deploy artifacts: the host compose override + the updated deploy script; **no** secrets committed)

## Risks + mitigations

- **Docker on agent-house** — pm-claude's host runs system services + shared Caddy. Daskalos uses Docker. Mitigation: should be present; if not, install via apt.
- **Postgres data volume on host** — Docker volume `theourgia_postgres_data` lives under `/var/lib/docker/`. Mitigation: fine for v0; the existing Restic substrate handles backups when we wire it.
- **CORS** — same-origin serving (dev.theourgia.com for both static + API), no cross-origin requests. CORS still allows `settings.base_url`; we set it correctly.
- **Cookie domain / secure** — the backend will set cookies for sessions; needs `Secure` + `SameSite=Lax`. Backend defaults handle this in production.
- **Migration safety** — first deploy, no data, no risk. Mitigation noted; future deploys need a backup-before-migrate dance.
- **CSRF / instance_id mismatch** — `settings.instance_id` matters for federation. Set explicitly to `dev.theourgia.com`.

## Plan-doc-discipline

Same as prior batches. Any drift updates this doc before commit.
