# Theourgia — production deployment runbook

This runbook walks an operator through the first-time setup of a Theourgia
instance on a fresh server. After completion, the host serves:

- **theourgia.com**         — the magician-facing app (backend + frontend)
- **plugins.theourgia.com**  — the plugin registry (Phase 14) — *parked; see profiles below*
- Agent daemon (Phase 16)    — internal-only on the Docker network — *parked; see profiles below*

> **Kubernetes/Helm:** the Helm chart is archived (untested against the
> real deployment) at `.attic/helm/` — Compose is the supported path.

## Compose profiles — what runs by default

The default stack is the **core six**: `postgres`, `redis`, `backend`,
`celery`, `celery-beat`, `frontend`. The auxiliary services are parked
behind compose profiles and do NOT start with a plain
`docker compose up -d`:

| Profile       | Services                      |
|---------------|-------------------------------|
| `agents`      | `agent-daemon`, `agent-daemon-pg` |
| `marketplace` | `registry`, `registry-pg`     |

To run them, pass `--profile agents` / `--profile marketplace` to every
compose command, or set `THEOURGIA_PROFILES="agents marketplace"` (or a
subset) in the environment before running `scripts/deploy-prod.sh` —
the deploy script then also checks their secrets, runs their alembic
migrations, and verifies them. With no profiles active, the aux secrets
(`THEOURGIA_AGENT_DB_PASSWORD`, `THEOURGIA_AGENT_CONTROL_TOKEN`,
`THEOURGIA_AGENT_HKDF_SALT`, `THEOURGIA_REGISTRY_DB_PASSWORD`) may be
absent from `.env` without blocking startup.

If you only want dev preview at `dev.theourgia.com`, use
`scripts/deploy-dev.sh` instead — this runbook is the full prod path.

---

## 0. Prerequisites

You need:

- A Linux server with public IPv4 + IPv6
- A domain (`theourgia.com` in these examples — substitute your own everywhere)
- Cloudflare account with the zone added + an API token scoped to:
  `Zone:DNS:Edit` on that zone (used by Caddy for ACME DNS-01)
- An R2 bucket (or any S3-compatible storage) for media + backups
- A Stripe Connect account (for Phase 10 publishing — only needed if you ship paid content)
- SSH access to the server as a sudo-capable user
- Local: `pnpm`, `docker`, `git`

---

## 1. DNS records

Point all three domains at your server. On Cloudflare:

| Name                            | Type | Content              | Proxy |
|---------------------------------|------|----------------------|-------|
| `theourgia.com`                 | A    | _server IPv4_        | DNS only |
| `theourgia.com`                 | AAAA | _server IPv6_        | DNS only |
| `www.theourgia.com`             | CNAME | `theourgia.com`     | DNS only |
| `plugins.theourgia.com`         | CNAME | `theourgia.com`     | DNS only |

Set proxy to **DNS only** (grey cloud) — Caddy will terminate TLS itself
via the DNS-01 ACME challenge so the origin certificate is held by Caddy,
not Cloudflare.

Wait for propagation (`dig +short theourgia.com` should return your IP)
before continuing.

---

## 2. Server bootstrap

SSH in as a sudo-capable user. Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out + back in for the group change to take effect
```

Install Caddy with the Cloudflare plugin (the apt package does NOT bundle
plugins; use the `xcaddy` builder or download a custom build):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Install Caddy with the Cloudflare module (replaces the default binary):
sudo caddy add-package github.com/caddy-dns/cloudflare
sudo systemctl restart caddy
```

Create the systemd env file for Caddy's Cloudflare token:

```bash
sudo install -m 0640 -o caddy -g caddy /dev/null /etc/caddy/caddy.env
echo "CLOUDFLARE_API_TOKEN=your-token-here" | sudo tee /etc/caddy/caddy.env
```

Edit `/etc/systemd/system/caddy.service.d/override.conf`:

```ini
[Service]
EnvironmentFile=/etc/caddy/caddy.env
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart caddy
```

---

## 3. Clone the repo + first-run

```bash
sudo mkdir -p /srv/theourgia/prod
sudo chown $USER:$USER /srv/theourgia/prod
git clone https://github.com/SAntonopoulou/theourgia.git /srv/theourgia/prod
cd /srv/theourgia/prod
```

Bootstrap `.env`:

```bash
./scripts/first-run.sh
```

This generates the cryptographic secrets (HKDF salt, control tokens,
DB passwords, etc.) and writes them to `.env` with mode 0600. The script
prints a list of values that still need manual editing — open `.env`
and fill those in:

```bash
nano .env
```

The required manual values:

| Variable | What it is |
|---|---|
| `THEOURGIA_BASE_URL` | `https://theourgia.com` |
| `THEOURGIA_INSTANCE_ID` | `theourgia.com` |
| `ANTHROPIC_API_KEY` | Operator-level Claude key (BYO is per-magician later) |
| `STRIPE_API_KEY` / `_SECRET` | For Phase 10 publishing payouts |
| `RESTIC_REPOSITORY` / `_PASSWORD` | Phase 01 backup target |
| `AWS_ACCESS_KEY_ID` / `_SECRET` | R2 credentials |
| `CLOUDFLARE_API_TOKEN` | DNS-01 ACME for Caddy (same token as above) |
| `THEOURGIA_REGISTRY_BOOTSTRAP_MAINTAINER_DID` | Your DID for first registry LEAD |

---

## 4. Caddy site config

Copy the example Caddyfile to `/etc/caddy/Caddyfile`:

```bash
sudo cp /srv/theourgia/prod/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile  # replace theourgia.example.com → theourgia.com
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The bundled Caddyfile.example routes:

- `theourgia.com` → `127.0.0.1:8190` (frontend container, default port)
- `www.theourgia.com` → 301 redirect to apex
- `plugins.theourgia.com` → `127.0.0.1:8193` (registry container)

---

## 5. First deploy

From the repo root on the server:

```bash
./scripts/deploy-prod.sh
```

This will (for the core stack; add `THEOURGIA_PROFILES="agents marketplace"`
to include the parked services):

1. Validate that the required secrets are in `.env` (aux secrets only
   when their profile is enabled)
2. Build the Docker images for the active services
3. Take a pre-migration `pg_dump` of the main DB into `backups-manual/`
4. Run alembic migrations on the main database (plus agent-daemon /
   registry databases when their profiles are active)
5. Bring the stack up with `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
6. Verify the active services report `running`

If any step fails the script exits with the failing command's exit code.
Re-run with `--skip-pull` / `--skip-build` / `--skip-migrate` /
`--skip-dump` after fixing to skip the parts that already succeeded.

Alternative for a from-nothing host: `scripts/install.sh` is the
bootstrap installer (installs Docker, clones, runs first-run.sh, builds
and starts the stack, migrates, waits for `/readyz`). Download it, read
it, then run it — this runbook remains the reference for what it does.

---

## 6. Smoke-test

Once `deploy-prod.sh` reports "done":

```bash
curl -sSf https://theourgia.com/healthz

# Only if the marketplace profile is active:
curl -sSf https://plugins.theourgia.com/health
# Only if the agents profile is active (NOT externally exposed by design):
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile agents \
    exec agent-daemon curl -sSf http://localhost:8002/health
```

Each should return `{"status": "ok"}`.

---

## 7. Bootstrap the first user

The vault has no users on a fresh install. There is no CLI user-creation
script — the flow is entirely through the UI:

1. Set the operator allowlist in `.env` before first sign-in
   (single-operator gate — only listed magickal names can create a
   user; an empty allowlist leaves signup open):

   ```bash
   THEOURGIA_ALLOWED_MAGICKAL_NAMES=your-magickal-name-slug
   ```

2. Visit `https://theourgia.com/app/signin` and sign in with that
   magickal name. On a fresh install the app redirects you to the
   first-run wizard at `/app/setup` (welcome · magickal name ·
   tradition · calendars · review).

3. **Immediately set a password** at `/app/settings/password`. Until a
   password is set, the account signs in on magickal name alone.
   Optionally enrol a passkey at `/app/settings/webauthn`.

Only if the `marketplace` profile is active: the registry's first
maintainer is auto-created from
`THEOURGIA_REGISTRY_BOOTSTRAP_MAINTAINER_DID` the first time that DID
signs a request.

---

## 8. Updates

For routine code updates:

```bash
ssh user@theourgia.com
cd /srv/theourgia/prod
./scripts/deploy-prod.sh
```

The script handles `git pull` + rebuild + migrations + restart.

For schema-breaking releases (rare; Alembic alone covers most cases),
take a snapshot of the three Postgres volumes first:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker run --rm -v theourgia_postgres_data:/data -v $(pwd):/backup alpine \
    tar czf /backup/pg-vault-$(date +%F).tar.gz /data
docker run --rm -v theourgia_agent_daemon_data:/data -v $(pwd):/backup alpine \
    tar czf /backup/pg-daemon-$(date +%F).tar.gz /data
docker run --rm -v theourgia_registry_data:/data -v $(pwd):/backup alpine \
    tar czf /backup/pg-registry-$(date +%F).tar.gz /data
# then run deploy-prod.sh
```

---

## 9. Restore

Backups run automatically: celery beat schedules a restic backup to R2
(daily full cadence + hourly incremental), and each snapshot contains a
`pg_dump -Fc` archive of the main database at
`/var/spool/theourgia-backup/theourgia-db.dump`, plus the deploy dir
(`.env`, compose files, `backups-manual/`). The deploy script
additionally writes a local `backups-manual/pre-migrate-*.dump` before
every migration.

### 9a. Restore drill (run monthly — non-destructive)

A backup that has never been restored is not a backup. The drill never
touches the live database or live containers:

```bash
cd /srv/theourgia/prod
./scripts/restore-drill.sh          # list snapshots, restore latest,
                                    # validate the dump archive
./scripts/restore-drill.sh --load   # full drill: also load into a
                                    # throwaway postgres and count rows
```

What it does:

1. Lists restic snapshots (read-only; config from the same `.env` the
   deploy uses).
2. Restores the latest snapshot's dump dir to a temp dir
   (`--full` restores the whole snapshot; `--snapshot ID` picks one).
3. Verifies the dump with `pg_restore --list`.
4. `--load`: starts a throwaway `pgvector/pgvector:pg16` container
   named `theourgia-restore-test` on `127.0.0.1:55432`
   (`RESTORE_TEST_PORT` to change), loads the dump with
   `--no-owner --no-privileges`, and counts rows in `entry` and
   `"user"` — sanity-check those numbers against what you expect.
5. Prints PASS/FAIL and cleans up the temp dir + container
   (`--keep` preserves them for inspection).

Host `restic`/`pg_restore` binaries are used when present; otherwise it
falls back to the `restic/restic` and pgvector Docker images. If the
drill FAILs, treat it as a live incident: your backups are not
restorable.

### 9b. Real disaster recovery

Scenario: the server (or the postgres volume) is gone.

1. **Rebuild the host** through sections 0–4 of this runbook (server
   bootstrap, clone, Caddy). If `.env` is lost, recover it from the
   restic snapshot (it is included via the deploy-dir path) — you need
   `RESTIC_REPOSITORY` + `RESTIC_PASSWORD` + R2 credentials stored
   OUTSIDE the server (password manager) to bootstrap this.
2. **Fetch the dump** from the most recent snapshot:

   ```bash
   export RESTIC_REPOSITORY=... RESTIC_PASSWORD=... \
          AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_DEFAULT_REGION=auto
   restic snapshots                       # pick the snapshot to restore
   restic restore latest --target /srv/restore \
       --include /var/spool/theourgia-backup
   ```

3. **Start ONLY postgres** (never run migrations before the data is
   back):

   ```bash
   cd /srv/theourgia/prod
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres
   ```

4. **Load the dump** into the fresh database:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
       cp /srv/restore/var/spool/theourgia-backup/theourgia-db.dump postgres:/tmp/
   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
       exec postgres pg_restore -U theourgia -d theourgia \
       --no-owner --no-privileges /tmp/theourgia-db.dump
   ```

   (If the target DB is not empty — partial recovery — drop and
   recreate it first: `dropdb`/`createdb` from inside the container.)

5. **Deploy the code at the matching version**, then bring everything
   up:

   ```bash
   ./scripts/deploy-prod.sh   # runs alembic upgrade head on top of the
                              # restored data, then starts the stack
   ```

6. **Verify**: `curl -sSf https://theourgia.com/healthz`, sign in, and
   spot-check recent entries. Then run `./scripts/restore-drill.sh` to
   confirm the backup pipeline is producing snapshots again on the new
   host.

Point-in-time caveat: recovery is only as fresh as the last snapshot's
dump (hourly at best). Anything written after it is lost.

---

## 10. Tear down

To stop services without deleting data:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop
```

To remove everything **including data volumes** (irreversible):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

**Caddy can't reach origin.** The frontend / registry containers bind to
host loopback only. Check `docker compose ps` to confirm `127.0.0.1:8190`
and `127.0.0.1:8193` are listening: `sudo ss -tlnp | grep -E '(8190|8193)'`.

**Backend can't reach agent daemon.** Both must be on the
`theourgia-internal` Docker network. `docker compose exec backend ping
agent-daemon` should resolve. Container restart sometimes drops the
network; `docker compose up -d` re-attaches.

**Mode B key vault returns 401.** Check that `THEOURGIA_AGENT_HKDF_SALT`
on the daemon matches the salt used when keys were encrypted. Rotating
the salt requires re-encrypting every stored agent API key — there is no
salt re-derivation; the salt is part of the KDF input.

**Migrations fail with relation already exists.** A previous deploy got
to migrations but failed before restart. Re-run with `--skip-migrate`
and inspect `alembic current` per service to verify head matches the
deployed code.
