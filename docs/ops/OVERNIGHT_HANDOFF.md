# Overnight handoff — 2026-06-28

Soror, good morning. Here's the honest state.

## What landed this session (13 commits)

**Daemon — Phase 16 is now wire-complete + DB-backed + sandboxed:**

| Commit | What |
|---|---|
| `b108-2bg` | Vault MCP client + dispatch (rule 52/53 filter at boundary, property-tested) |
| `b108-2bh` | JSON-RPC + SSE MCP transport (Bearer session auth) |
| `b108-2bi` | Launch planner (cap-evaluated, no API key leakage) |
| `b108-2bj` | Subprocess runner (SIGTERM→SIGKILL grace, transcript queue) |
| `b108-2bk` | Runs control API (POST/GET/DELETE/SSE-stream) |
| `b108-2bl` | Per-run cost accumulator + hard-halt at reservation overage |
| `b108-2bm` | Audit log emission + GET /audit (9 event types · alembic 0002) |
| `b108-2bn` | DB persistence: DbAuditSink + DbInstallRepo + DbRunRepo (real PG via docker-compose.test.yml) |
| `b108-2bo` | Main backend → daemon HTTP bridge (`/api/v1/agents/*`) |
| `b108-2bp` | Production deploy artefacts (compose · Dockerfiles · Caddy · scripts · runbook) |
| `b108-2bq` | bwrap filesystem sandbox (rule 59 enforced; integration-tested) |
| (R2)     | 3 buckets provisioned via Cloudflare MCP (theourgia-{media,backups,plugins} in WEUR) |
| (tsc fix) | H10 surface barrel re-exports namespaced so admin tsc is clean |

**Test counts (all passing as of last run):**
- Backend: **2508** (1 pre-existing CORS failure unrelated to this work)
- Agent daemon: **177**
- Registry: **34**
- Shared frontend (vitest): **2923**
- Admin tsc: **clean**

## What's ready to deploy

Everything needed for the operator to run **`./scripts/first-run.sh && ./scripts/deploy-prod.sh`** on a fresh server is in place:

- `docker-compose.yml` — base stack with **3 services + 3 DBs** added (agent-daemon + agent-daemon-pg + registry + registry-pg, plus the new agent_memory volume).
- `docker-compose.prod.yml` — prod overrides (workers, logging, ports).
- `agent-daemon/Dockerfile` + `registry/Dockerfile` — multi-stage builds; daemon prod image bundles **bubblewrap** for rule 59 sandbox.
- `Caddyfile.example` — adds the `plugins.theourgia.example.com` block.
- `.env.example` — every new var documented + `${VAR:?msg}` enforcement in compose so missing values fail at startup, not at runtime.
- `scripts/first-run.sh` — generates 7 strong secrets via `openssl rand`, refuses to overwrite existing .env.
- `scripts/deploy-prod.sh` — git pull + build + alembic upgrade on **all 3 DBs** + rolling restart + service-state verification.
- `docs/ops/DEPLOYMENT_RUNBOOK.md` — 9 sections covering DNS, server bootstrap, Caddy with the Cloudflare module, .env bootstrap, first deploy, smoke test, first user creation, updates with snapshot-before-schema-break, tear down, troubleshooting.
- `docs/ops/R2_BUCKETS.md` — the 3 R2 buckets I provisioned, plus the manual step for generating R2 API tokens (the MCP doesn't have token creation).

## What's NOT done (be honest about the gaps)

These were on the night's list but I made a judgment call to not start them with you asleep, because each is multi-hour and benefits from your design call when you wake up:

1. **Frontend H10 A+C live wiring** (#192, #193) — the 27 H10 surfaces exist in `frontend/shared/src/` and pass all tests, but the admin routes that mount them still use fixture data. Wiring is a per-surface task: add a TanStack Query call to `/api/v1/agents/*` (the bridge IS live) or `/api/v1/registry/*` (TBD bridge) and pass the result as props. **The Surface components themselves need no change.** This is the biggest remaining UI gap.

2. **Phase 12.5 federation inbox + delivery worker** (#195) — `core/federation/outbound.py` ships single-attempt deliveries; the inbox endpoint + retry worker need a design pass. Existing pieces (HTTP signatures, replay store, federation_nonce model) are ready to compose.

3. **Phase 13 ActivityPub bridge** (#196) — actor + inbox + outbox + WebFinger. `v1_activitypub.py` exists but is a stub; needs the full AP type system + translation layer.

4. **The actual `./scripts/deploy-prod.sh` execution** — I don't have SSH access to your production host (correctly so; that's an irreversible action best done with you watching). The script is ready to run; you'll execute it manually when convenient.

## How to actually deploy

When you're ready (could be tomorrow, could be next week):

```bash
# On your prod host (e.g., 178.105.106.225 if you reuse the dev host):
sudo mkdir -p /srv/theourgia/prod
sudo chown $USER:$USER /srv/theourgia/prod
git clone https://github.com/SAntonopoulou/theourgia.git /srv/theourgia/prod
cd /srv/theourgia/prod

# Bootstrap secrets
./scripts/first-run.sh
# Edit .env to add: BASE_URL, INSTANCE_ID, ANTHROPIC_API_KEY, STRIPE_*,
# RESTIC_REPOSITORY, AWS_ACCESS_KEY_ID, CLOUDFLARE_API_TOKEN,
# THEOURGIA_REGISTRY_BOOTSTRAP_MAINTAINER_DID (your DID)
nano .env

# Caddy site config (sudo)
sudo cp Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile  # s/theourgia.example.com/theourgia.com/g
sudo systemctl reload caddy

# Ship it
./scripts/deploy-prod.sh
```

The runbook (`docs/ops/DEPLOYMENT_RUNBOOK.md`) covers DNS, Caddy/Cloudflare plugin install, R2 token generation, first-user creation, and the snapshot procedure for schema-breaking updates.

## Open questions / decisions you'll want to make

- **Frontend wiring approach** — do you want the admin routes wired one-at-a-time as you use each H10 feature, or a single sweep? My take: one-at-a-time, since the bridge contract is now stable and the bridge tests prove the round-trip. Lower risk of breaking shipped surfaces.
- **Phase 12.5 inbox shape** — the federation outbound module landed Phase 12 with no retry/queue. The inbox is greenfield; worth a design call before building.
- **Phase 13 ActivityPub priority** — the H08 design has it spec'd. If you want federation with Mastodon/Pleroma instances at v1.0, this is the work. If "v1.0 federates with other Theourgia instances only" is acceptable, it can ship in v1.1.
- **First maintainer DID** — `THEOURGIA_REGISTRY_BOOTSTRAP_MAINTAINER_DID` in .env determines who can promote plugins / appoint other maintainers. Set this to your DID before first deploy.

## Memory entries I wrote/updated

- `project_phase_16_daemon.md` — updated with all 11 daemon commits + state summary
- `MEMORY.md` index — already had the Phase 16 pointer; no change needed

---

Sleep well. The substrate is ready when you are. 🌙

Co-Authored-By: Claude Opus 4.7 (1M context)
