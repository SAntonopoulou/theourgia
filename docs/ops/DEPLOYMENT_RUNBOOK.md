# Theourgia — production deployment runbook

This runbook walks an operator through the first-time setup of a Theourgia
instance on a fresh server. After completion, the host serves:

- **theourgia.com**         — the magician-facing app (backend + frontend)
- **plugins.theourgia.com**  — the plugin registry (Phase 14)
- Agent daemon (Phase 16)    — internal-only on the Docker network

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

This will:

1. Validate that all required secrets are in `.env`
2. Build the three Docker images (backend, agent-daemon, registry, frontend)
3. Run alembic migrations against the three Postgres instances
4. Bring the stack up with `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
5. Verify the services report `running`

If any step fails the script exits with the failing command's exit code.
Re-run with `--skip-build` / `--skip-migrate` after fixing to skip the
parts that already succeeded.

---

## 6. Smoke-test

Once `deploy-prod.sh` reports "done":

```bash
curl -sSf https://theourgia.com/healthz
curl -sSf https://plugins.theourgia.com/health
# Agent daemon is NOT externally exposed by design.
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec agent-daemon \
    curl -sSf http://localhost:8002/health
```

All three should return `{"status": "ok"}`.

---

## 7. Bootstrap the first user

The vault has no users on a fresh install. Either:

a) Sign up via the UI at `https://theourgia.com/auth/sign-up` (single-user
   instances: you become the admin by default).

b) Pre-seed via the admin CLI:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
    python -m theourgia.scripts.create_user --handle soror-eu-a --admin
```

The registry's first maintainer is auto-created from
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

## 9. Tear down

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
