# Bundled monitoring — Prometheus + Grafana starter kit

Optional, loopback-only monitoring for a running Theourgia instance: Prometheus (scrapes the backend, Postgres, Redis) and Grafana with one provisioned dashboard. Nothing here binds beyond `127.0.0.1` — reach the UIs over an SSH tunnel (`ssh -L 3000:127.0.0.1:3000 you@host`) or put them behind your own authenticated Caddy site.

## Quickstart

```bash
cd /srv/theourgia/prod

# 1. Mint the scrape token (see "Scrape auth" below) and store it:
curl -si http://127.0.0.1:8190/api/v1/auth/demo-signin \
  -H 'Content-Type: application/json' \
  -d '{"magickal_name": "Your Name", "password": "your-password"}' \
  | grep -oP 'theourgia_session=\K[^;]+' \
  > deploy/monitoring/prometheus/secrets/theourgia-scrape-token
chmod 600 deploy/monitoring/prometheus/secrets/theourgia-scrape-token

# 2. Start the kit (interpolates DB credentials from the stack's .env):
docker compose --env-file .env -f deploy/monitoring/docker-compose.monitoring.yml up -d
```

Grafana: `http://127.0.0.1:3000` (admin / `THEOURGIA_GRAFANA_ADMIN_PASSWORD` from `.env`, default `admin` — change it). The "Theourgia — application" dashboard is pre-provisioned. Prometheus: `http://127.0.0.1:9090` — check **Status → Targets** first; all four targets should be UP.

## Scrape auth — read this honestly

`GET /metrics` is **admin-scoped** (`admin.observe`, held by hub_admin / hub_officer accounts) by design — public metrics would fingerprint the instance. The backend accepts `Authorization: Bearer <token>` where the token is a **regular session token**; there is **no static API-token or machine-user credential mechanism today**. Consequences:

- Session tokens expire after **7 days** (`SESSION_LIFETIME`, `backend/theourgia/api/routers/v1/auth.py`). When the token lapses, the `theourgia-backend` target goes DOWN with 401s and the app panels go stale (exporter panels keep working). Re-mint with the command above; a weekly cron doing the same is the pragmatic fix.
- If you accept the trade-off, you can extend one dedicated scrape session in Postgres instead — `UPDATE session SET expires_at = now() + interval '365 days' WHERE ...` — knowing that token is then a year-long admin credential sitting in a file.
- Signing in from the wizard/UI does not invalidate this token; sessions are independent rows.

## Network note

The kit joins the app stack's Docker network as an external network, default name `theourgia_theourgia-internal`. If `docker network ls | grep theourgia-internal` shows a different prefix on your host (e.g. `COMPOSE_PROJECT_NAME` is set), set `THEOURGIA_APP_NETWORK=<that name>` in `.env`.

To stop: same `docker compose ... down`. Metrics retention is 30 days (`--storage.tsdb.retention.time`). More background: `docs/admin/observability.md`; incident recipes: `docs/admin/runbooks.md`.
