# Operations runbooks — what to do when X

Incident recipes for a production Theourgia instance. Each entry is deliberately short: symptom, diagnosis, action. For total-loss scenarios see the [disaster-recovery runbook](./disaster-recovery.md); for what the instance logs and measures see [observability](./observability.md).

**Conventions used throughout.** Commands run on the production host in the deploy root, with the prod compose pair aliased:

```bash
cd /srv/theourgia/prod
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
```

`psql` into the vault database:

```bash
dc exec postgres psql -U theourgia -d theourgia
```

---

## 1. Backend 5xx spike

Symptom: users report errors; `theourgia_http_requests_total{status=~"5.."}` climbing; or the "5xx by route" panel names a culprit.

```bash
dc logs backend --tail=200 | grep '"level": "error"'
```

1. Every error line carries a `request_id`. Pick one, then filter all lines for that ID to see the full request story: `dc logs backend | grep '<request_id>'`.
2. Is it one route (bad deploy of one feature) or everything (DB/Redis down — see runbooks 2 and 5)?
3. One route, started right after a deploy: roll back (runbook 16).
4. Everything, and `dc exec -T backend curl -fsS http://localhost:8000/readyz` fails: the readiness payload names the failing dependency.

## 2. Database disk full

Symptom: backend errors mentioning `could not extend file` / `No space left on device`; writes fail, reads may still work.

```bash
df -h /var/lib/docker
docker system df
```

1. Free space fast without touching data: `docker system prune -f` (runbook 12 has the full cleanup ladder).
2. Find what Postgres is actually using: `dc exec postgres du -sh /var/lib/postgresql/data`.
3. If the disk is genuinely sized-out, grow the volume/VPS. Postgres handles a full disk by halting writes, not corrupting — but do not restart it repeatedly while full.
4. Afterwards, check the backup schedule kept working: `SELECT * FROM backup_run ORDER BY created_at DESC LIMIT 5;` in psql.

## 3. Migration failed mid-deploy

Symptom: `deploy-prod.sh` dies during `alembic upgrade head`; often `type "..." already exists` or `relation "..." already exists`.

Migration failures leave partial state — Alembic does not roll back DDL that already ran outside the failed statement's transaction. The recurring offender in this codebase is Postgres enum types created before the migration died:

```bash
dc exec postgres psql -U theourgia -d theourgia \
    -c "DROP TYPE IF EXISTS <enum_name> CASCADE;"
dc run --rm backend alembic upgrade head
```

1. Read the traceback for the object name; `\dT` in psql lists enum types.
2. After dropping the orphaned type, re-run the migration (above), then finish the deploy: `./scripts/deploy-prod.sh --skip-pull --skip-migrate` if only the restart is left.
3. Verify: `dc run --rm backend alembic current` matches the head in `backend/alembic/versions/`.
4. The same applies to the agent-daemon and registry databases (`agent-daemon-pg`, `registry-pg`) — substitute the service and DB name.

## 4. Stale service-worker chunks after deploy

Symptom: after a deploy, a user's admin app shows a blank page or "Expected a JavaScript module... MIME type of text/html" in the console.

The service worker is network-first for navigations (b108-2hn) and `sw.js` is served `no-cache`, so this should be rare. When it happens anyway:

1. Confirm `VERSION` in `frontend/admin/public/sw.js` was bumped in the deployed commit — a changed SW with an unchanged VERSION keeps old caches alive.
2. User-side fix: DevTools → Application → Service Workers → Unregister, then hard reload. Or Clear Site Data.
3. If many users are affected, ship a deploy that bumps `VERSION`; activation clears old caches keyed on it.
4. Never "fix" this by making navigations cache-first again — that is the exact regression that caused it historically.

## 5. Redis down

Symptom: sign-ins fail, Celery stops consuming, backend readyz degraded. Redis carries sessions, cache, and the Celery broker.

```bash
dc ps redis
dc exec redis redis-cli ping        # expect PONG
dc logs redis --tail=50
```

1. Not running: `dc up -d redis`. It persists to the `redis_data` volume (`--save 60 1`), so most state survives a restart.
2. Crash-looping on a corrupt RDB file: worst case, remove the volume — sessions are lost (users re-authenticate) and queued Celery tasks are lost (beat re-enqueues scheduled ones on its next tick). Vault data is untouched; it lives in Postgres.
3. After recovery, confirm workers reconnected: `dc logs celery --tail=20` should show `Connected to redis://redis:6379/0`.

## 6. Celery queue backed up

Symptom: scheduled entries not publishing, emails/newsletters late, backups not firing. Two queues exist: `default` and `backups` (routed separately so a stuck backup cannot starve quick tasks).

```bash
dc exec redis redis-cli llen default
dc exec redis redis-cli llen backups
dc exec celery celery -A theourgia.core.tasks inspect active
```

1. Deep queue + idle worker: the worker is stuck. `dc restart celery` (tasks are `acks_late`, so the in-flight task is redelivered).
2. Deep queue + busy worker: something is slow, not stuck — check what `inspect active` shows and whether it correlates with runbook 14.
3. Beat not scheduling at all: `dc logs celery-beat --tail=20`. Exactly one beat process must run; check it isn't crash-looping.

## 7. Certificate / Caddy issues

Symptom: browser TLS errors, `ERR_SSL_PROTOCOL_ERROR`, or Caddy serving nothing. Caddy runs on the host (systemd), not in compose.

```bash
sudo systemctl status caddy
sudo journalctl -u caddy --since -1h | grep -iE 'error|acme|tls'
sudo caddy validate --config /etc/caddy/Caddyfile
```

1. ACME failures almost always mean the DNS-01 challenge broke: check `CLOUDFLARE_API_TOKEN` in `/etc/caddy/caddy.env` is valid and scoped `Zone:DNS:Edit`, and that the systemd override still loads it (`systemctl cat caddy`).
2. Caddy healthy but 502s: the upstreams are the loopback container ports — `sudo ss -tlnp | grep -E '(8190|8193)'`. Missing listener → `dc up -d frontend registry`.
3. After config changes: `sudo systemctl reload caddy` (reload, not restart, keeps existing certs served).

## 8. Restic backup failing

Symptom: `theourgia_backup_runs_total{outcome="failure"}` incrementing, or the daily `backup.complete` log event shows a failure.

```bash
dc logs celery --tail=200 | grep backup
dc exec postgres psql -U theourgia -d theourgia \
    -c "SELECT created_at, outcome, error FROM backup_run ORDER BY created_at DESC LIMIT 5;"
dc exec backend restic check
```

1. The `backup_run` table stores captured restic stderr per attempt — read it before guessing.
2. Auth errors: R2 credentials rotated or expired (runbook 9). `restic check` failing with repository errors: `dc exec backend restic rebuild-index`, then re-run; if it persists, treat per the DR runbook.
3. A backup that has silently not succeeded for days is an emergency, not a chore — you are running without a parachute.

## 9. R2 credential rotation

When: scheduled rotation, a leaked key, or offboarding a machine. Three narrowly-scoped tokens exist per `docs/ops/R2_BUCKETS.md` (`theourgia-media-rw`, `theourgia-backups-rw`, `theourgia-plugins-rw`).

1. Cloudflare dashboard → R2 → Manage R2 API Tokens → roll (or create-then-delete) the affected token.
2. Update `.env` on the host: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (backups + media) and/or the registry's credentials. Keep `.env` mode 0600.
3. Recreate the containers so they pick up the new environment: `dc up -d backend celery celery-beat registry`.
4. Verify each consumer: `dc exec backend restic snapshots | tail -3` (backups), upload a small image via the media library (media), and check registry logs for storage errors.
5. Only then revoke the old token — reversed order means downtime.

## 10. Forgotten operator password

The sign-in flow (`POST /api/v1/auth/demo-signin`) requires the password only when `password_hash` is set on the account; a NULL hash means magickal-name-only sign-in. There is no CLI reset script — the supported path is clearing the hash:

```bash
dc exec postgres psql -U theourgia -d theourgia -c \
  "UPDATE \"user\" SET password_hash = NULL, failed_login_count = 0, locked_until = NULL \
   WHERE email = '<slug>@dev.theourgia.com';"
```

1. The email key is synthesized from the magickal name: lowercase, punctuation collapsed to hyphens, `@dev.theourgia.com` (e.g. "Soror Ev. A." becomes something like `soror-ev-a@dev.theourgia.com`). List candidates with `SELECT id, email FROM "user";` if unsure.
2. Sign in with the magickal name alone, then **immediately** set a new password at `/app/settings/password` — while the hash is NULL, anyone who knows the name can open the account.

## 11. Locked out of TOTP

Symptom: authenticator app lost/reset and 2FA challenges fail.

1. First choice: use one of the ten single-use backup codes issued at enrollment. Each is consumed on use (`backup_code.used_at`).
2. No codes left — clear the enrollment with operator access to the DB:

```bash
dc exec postgres psql -U theourgia -d theourgia -c \
  "UPDATE \"user\" SET totp_secret = NULL WHERE email = '<slug>@dev.theourgia.com'; \
   DELETE FROM backup_code WHERE user_id = (SELECT id FROM \"user\" WHERE email = '<slug>@dev.theourgia.com');"
```

3. Re-enroll 2FA from account settings straight away, and store the fresh backup codes somewhere that survives a phone loss.

## 12. Disk-space cleanup

Routine hygiene, and the first response to runbook 2. Container logs are already capped (json-file, 10 MB x 5 per service), so the usual growth is images and build cache.

```bash
docker system df                                  # who is eating the disk
docker image prune -af --filter "until=168h"      # unused images older than a week
docker builder prune -af --filter "until=168h"    # BuildKit cache
docker system prune -f                            # stopped containers, dangling images, unused networks
sudo journalctl --vacuum-size=500M
```

Never use `docker volume prune` casually here — the Postgres, Redis, and agent-memory volumes are the instance. Volumes are only removed explicitly, eyes open.

## 13. Federation delivery DEAD letters

Symptom: a peer instance stopped receiving your activities. Outbound deliveries retry with backoff; after `max_attempts` failures the row is parked as `dead` and the per-minute drain task ignores it.

```bash
dc exec postgres psql -U theourgia -d theourgia -c \
  "SELECT id, status, attempt_count, next_attempt_at, left(last_error, 120) \
   FROM federation_delivery WHERE status = 'dead' ORDER BY updated_at DESC LIMIT 20;"
```

1. Read `last_error`. A peer that was down gets fixed by requeueing; a signature/410 error will just die again — fix the cause first.
2. Requeue: `UPDATE federation_delivery SET status = 'pending', attempt_count = 0, next_attempt_at = now() WHERE status = 'dead' AND <your predicate>;`
3. The `theourgia.federation.drain_delivery` beat task picks requeued rows up within a minute; watch `dc logs celery --tail=50`.

## 14. Slow query triage

Symptom: latency p99 climbing on specific routes while error rate stays flat.

```bash
dc exec postgres psql -U theourgia -d theourgia -c \
  "SELECT pid, now() - query_start AS runtime, state, left(query, 100) \
   FROM pg_stat_activity WHERE state <> 'idle' ORDER BY runtime DESC;"
```

1. Long-running query found: `EXPLAIN ANALYZE` it in psql (against a copy of the parameters) — the usual finding is a missing index on a new filter column.
2. `pg_stat_statements` is **not** installed by default in the stock `postgres:16-alpine`; without it there is no historical query ranking — you triage live. Consider enabling it if slow queries recur.
3. A query stuck on a lock shows `state = 'active'` with a `wait_event`; find the blocker via `pg_blocking_pids(pid)`. Kill as a last resort: `SELECT pg_cancel_backend(<pid>);`.
4. Correlate with `theourgia_http_request_duration_seconds` by `path_template` to confirm the fix landed.

## 15. Container OOM-killed

Symptom: a service restarts on its own; `dc ps` shows a recent restart; users saw a brief outage.

```bash
docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}}' \
    "$(dc ps -q backend)"
dmesg -T | grep -i 'killed process' | tail -5
docker stats --no-stream
```

1. `OOMKilled: true` on the backend: reduce `THEOURGIA_WORKERS` in `.env` (default 4) and `dc up -d backend`. Each uvicorn worker is a full process.
2. Celery: heavy tasks (book PDF export, media processing) spike memory; consider a lower worker concurrency.
3. Repeated OOM on a box that used to cope usually means a new feature's baseline grew — size the VPS up or set explicit compose memory limits so the kernel kills predictably.

## 16. Upgrade rollback

Symptom: a deploy shipped a regression that cannot be fixed forward quickly.

```bash
git log --oneline -5                       # find the last good commit
git checkout <last-good-sha>
./scripts/deploy-prod.sh --skip-pull --skip-migrate
```

1. `--skip-migrate` matters: the old code usually runs fine against the new schema (additive migrations), and **`alembic downgrade` is not routinely safe here** — enum types and data-bearing columns do not round-trip; downgrade paths are not drilled.
2. If the bad release's migration itself is the problem, restore the pre-deploy Postgres state instead: the volume snapshot from the update procedure (`docs/ops/DEPLOYMENT_RUNBOOK.md` §8) or a restic snapshot per the DR runbook. Never `alembic downgrade` a production database that users have written to since the upgrade.
3. Roll forward as soon as a fix exists — running old code on a new schema is a stopgap, not a state to live in.
4. Return to normal: `git checkout main && ./scripts/deploy-prod.sh`.

## 17. Vault key / envelope concerns

If you suspect `THEOURGIA_SECRET_KEY` or `THEOURGIA_MASTER_ENCRYPTION_KEY` leaked, or you are contemplating rotation: stop and read the [disaster-recovery runbook](./disaster-recovery.md) first.

- The master key wraps Mode A (server-side at rest) content; losing it makes that content permanently opaque, and rotating it is a re-encryption project, not an `.env` edit.
- Mode B (sealed) content never depends on server keys — it decrypts only in users' browsers.
- `THEOURGIA_AGENT_HKDF_SALT` is part of the KDF input for stored agent keys; changing it silently breaks every stored agent credential (Mode B key vault 401s). Do not rotate it without re-encrypting.
- A suspected host compromise is a breach-response situation: see `docs/admin/breach-notification-runbook.md`.

## 18. Reading production logs

Everything logs structured JSON to stderr, collected by Docker (10 MB x 5 rotation per service).

```bash
dc logs backend --tail=100 -f                      # follow
dc logs backend --since 30m | grep '"level": "error"'
dc logs backend | grep '<request_id>'              # one request, all lines
dc logs backend --since 1h \
  | grep -o '{.*}' | jq -r 'select(.user_id=="<id>") | [.timestamp,.event] | @tsv'
```

The `request_id` (UUIDv7, echoed to clients in the `X-Request-ID` response header) is the join key: get it from a user's failing response, filter, and you have the whole story. Full field reference: [observability](./observability.md).

## 19. Health endpoints reference

| Endpoint | Auth | What it proves |
|---|---|---|
| `backend:8000/healthz` (in-network) | none | backend process is alive |
| `backend:8000/readyz` (in-network) | none | backend can reach its dependencies (per-dependency detail in body) |
| `https://<domain>/healthz` | none | frontend Caddy answers (static `ok` — does **not** prove the backend) |
| `https://plugins.<domain>/health` | none | registry alive |
| `agent-daemon:8002/health` (in-network) | none | agent daemon alive (never exposed publicly, by design) |
| `backend:8000/metrics` | bearer, `admin.observe` | full Prometheus metrics |

The backend has no host port in prod; probe it from inside: `dc exec -T backend curl -fsS http://localhost:8000/readyz`.

## 20. Monitoring stack down

Symptom: Grafana unreachable or panels empty. The monitoring kit is deliberately separate — the app does not depend on it, so this is never user-facing.

```bash
cd /srv/theourgia/prod
docker compose --env-file .env -f deploy/monitoring/docker-compose.monitoring.yml ps
curl -s http://127.0.0.1:9090/api/v1/targets | python3 -m json.tool | grep -E '"health"|"scrapeUrl"'
```

1. `theourgia-backend` target down with 401: the scrape token expired — session tokens live 7 days. Re-mint per `deploy/monitoring/README.md`.
2. All targets down / network errors: the external app network name changed (compose project rename). `docker network ls | grep theourgia-internal`, set `THEOURGIA_APP_NETWORK` in `.env`, recreate the kit.
3. Grafana up but dashboard missing: provisioning volume paths — `docker compose ... logs grafana | grep -i provision`.
