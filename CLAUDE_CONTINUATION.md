# Theourgia — Claude Code continuation kit

This file is the "pick up where we left off" briefing for any Claude
Code session on a fresh machine (Athens, anywhere). The repo is
already on GitHub at <https://github.com/SAntonopoulou/theourgia>;
all you need to clone it + read this file.

---

## State of the world (commit `c9db780`)

### Production

- **🟢 LIVE at https://theourgia.com** (deployed 2026-06-28)
- 8 prod containers under compose project `theourgia-prod`,
  isolated from the `theourgia` dev stack that serves dev.theourgia.com
- All 8 are healthy as of the last deploy
- Login flow: <https://theourgia.com/app/connection> → "Demo signin" →
  type magickal name (`Soror Ευ. Α.`)

### Test counts

| Service | Passing | Notes |
|---|---|---|
| backend | 2587+ | + 11 WebAuthn ceremony tests (b108-2cm); alembic head 0066 |
| agent-daemon | 198 | alembic head 0002 |
| registry | 34 | alembic head 0001 |
| vitest (shared) | 2923 | admin tsc clean |

### What's complete

| Task | Status |
|---|---|
| #189 Phase 16 agent daemon scaffold | ✅ |
| #190 Daemon DB persistence (DbAuditSink + repos) | ✅ |
| #191 Main backend → daemon HTTP bridge | ✅ |
| #194 Filesystem sandbox (bwrap, rule 59) | ✅ |
| #195 Phase 12.5 federation inbox + delivery worker | ✅ |
| #196 Phase 13 ActivityPub bridge | ✅ |
| #197 Deploy artefacts (compose + Caddy + scripts) | ✅ |
| #198 R2 buckets provisioned (3 buckets via MCP) | ✅ |
| #199 Production deployment runbook | ✅ |
| #200 H10 Cluster B (B1-B4 + B6-B7) wired live | ✅ b108-2cl |
| #201 WebAuthn backend (endpoints + credential table) | ✅ b108-2cm |
| #202 WebAuthn frontend (ceremony + enrolment surface) | ✅ b108-2cn |
| #205 Public footer pages (/vault /federation /hubs /self-host) | ✅ b108-2co |
| #206 Perf audit + vendor-chunk split | ✅ b108-2cp |
| H11 design request (auto-context: moon · weather · calendars) | ✅ 2026-07-05 opened |

### What's still open

| Task | Status | Notes |
|---|---|---|
| #192 Frontend H10 A-cluster (8 surfaces) | **8/8 ✓** | Complete — A1-A4 author-signed · A5-A7 maintainer-signed · A8 author-signed |
| #193 Frontend H10 C-cluster (12 surfaces) | **12/12 ✓** | Complete — all C-cluster surfaces live |
| #200 Frontend H10 B-cluster (7 surfaces) | **6/7 ✓** | B5 KeyRotation is federation-signing-key rotation (envelope resigning + DID doc republish); WebAuthn credentials now live at `/settings/webauthn`. B5 needs its own backend + surface batch. |
| #204 Retire demo signin | pending | Waits on prod deploy + first WebAuthn enrolment. Delete `POST /api/v1/auth/demo-signin` + the fallback button on `/connection` once every prod user has ≥1 credential. |

---

## H10 surfaces wired so far (26 of 27)

| Surface | Route | Backing endpoint |
|---|---|---|
| A1 RegistryPublicHome | `/app/registry` | `GET /api/v1/registry/plugins` |
| A2 PluginSubmissionForm | `/app/registry/submit` | `POST /api/v1/registry/author/submissions` (signed) |
| A3 PluginSubmissionList | `/app/registry/submissions` | `GET /api/v1/registry/author/submissions` (signed) |
| A4 PluginSubmissionDetail | `/app/registry/submissions/:id` | `GET /api/v1/registry/author/submissions/:id` (signed) |
| A5 RegistryReviewQueue | `/app/registry/review` | `GET /api/v1/registry/maintainer/queue` (signed) |
| A6 RegistryReviewDetail | `/app/registry/review/:id` | `POST /api/v1/registry/maintainer/submissions/:id/decide` (signed) |
| A7 TierPromotion | `/app/registry/promote/:pluginId` | `POST /api/v1/registry/maintainer/plugins/:id/promote` (signed) |
| A8 VulnerabilityAdvisorySubmit | `/app/registry/advisory` | `POST /api/v1/registry/author/advisories` (signed) |
| C1 AgentsHome | `/app/agents-home` | `GET /api/v1/agents/installs` + `/audit` |
| C2 AgentMarketplace | `/app/agents-marketplace` | `GET /api/v1/registry/plugins` |
| C3 AgentInstall | `/app/agents-marketplace/:slug` | `POST /api/v1/agents/installs` |
| C4 AgentCapabilityReview | `/app/agents/:installId/capabilities` | `GET /api/v1/agents/installs/:id` + audit |
| C5 AgentByoKeySettings | `/app/agents-keys` | `GET /api/v1/agents/installs` |
| C6 AgentTaskComposer | `/app/agents/:installId/compose` | `POST /api/v1/agents/runs` |
| C7 AgentRunMonitor | `/app/agents/runs/:runId` | `GET /api/v1/agents/runs/:runId` + audit |
| C8 AgentTranscriptViewer | `/app/agents/runs/:runId/transcript` | `GET /api/v1/agents/audit` |
| C10 AgentCostDashboard | `/app/agents-cost` | `GET /api/v1/agents/audit` |
| C11 AgentActivityLog | `/app/agents-activity` | `GET /api/v1/agents/audit` |
| C9 AgentMemoryReader | `/app/agents/:installId/memory` | `GET/PUT /api/v1/agents/installs/:id/memory/*` |
| C12 AgentTrustReview | `/app/agents/:installId/trust` | `GET /api/v1/agents/audit` + delete-install |
| B1 AccountSettings | `/app/settings` | client-side hub (localStorage for inheritance toggle) |
| B2 DataExportRequest | `/app/settings/data-export` | `POST /api/v1/me/data-export` (archive returned inline as download blob) |
| B3 AccountDeletion | `/app/settings/delete-account` | `POST /api/v1/me/account/delete` + `…/reactivate` (30-day grace) |
| B4 PerUserAuditLog | `/app/settings/audit` | `GET /api/v1/me/audit` + CSV via `myAuditCsvUrl` |
| B5 KeyRotation | `/app/settings/keys` | **Placeholder** — needs WebAuthn |
| B6 SessionsAndDevices | `/app/settings/sessions` | `GET /api/v1/me/sessions` + revoke + revoke-others |
| B7 AccessibilityAndMotion | `/app/settings/accessibility` | localStorage prefs (no backend for v1) |

---

## Backend endpoints summary

All under `/api/v1/`:

| Endpoint | Methods | Purpose |
|---|---|---|
| `/agents/installs` | GET, POST | List + create installs |
| `/agents/installs/:id` | GET, DELETE | Single install / delete |
| `/agents/installs/:id/state` | PATCH | inactive ↔ active ↔ paused ↔ cost_capped |
| `/agents/runs` | POST | Start a run |
| `/agents/runs/:id` | GET, DELETE | Snapshot / terminate |
| `/agents/runs/:id/stream` | GET (SSE) | Transcript stream |
| `/agents/runs/:id/cost` | POST | Cost sample report |
| `/agents/audit` | GET | Per-user audit log (rule 9 scoped to vault_did) |
| `/registry/plugins` | GET | Proxy to registry list |
| `/registry/authors/:did` | GET | Proxy to registry author profile |
| `/federation/inbox` | POST | Phase 12.5 inbox (HTTP-signature verified) |

Daemon endpoints (internal, accessed only by the backend bridge):
- `/runs`, `/installs`, `/audit`, `/mcp` (SSE + JSON-RPC) — see
  `agent-daemon/theourgia_agent/api/routers/`

---

## How to pick up the H10 wiring

The wiring pattern is now well-established. Per surface:

1. **Check the surface's prop types** in
   `frontend/shared/src/<SurfaceName>/<SurfaceName>Surface.tsx`
2. **Re-export the types** from `frontend/shared/src/index.ts` if not
   already (other routes follow this pattern — search for examples)
3. **Write the route** at `frontend/admin/src/routes/<Name>Route.tsx`
   following the patterns in:
   - `AgentRunMonitorRoute.tsx` (read + mutation)
   - `AgentActivityLogRoute.tsx` (filtered read)
   - `AgentInstallRoute.tsx` (write-flow)
4. **Mount the route** in `App.tsx` (add the import + Route element)
5. **Add backend endpoint** if needed — pattern in
   `backend/theourgia/api/routers/v1/agents.py` proxying to
   `core/agents/daemon_client.py`
6. **Run admin tsc** to verify, then push, then deploy with:
   ```
   ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225
   cd /srv/theourgia/prod && git pull
   docker compose -f docker-compose.yml -f docker-compose.agent-house.yml --env-file .env build frontend
   docker compose -f docker-compose.yml -f docker-compose.agent-house.yml --env-file .env up -d --no-deps frontend
   ```

---

## Remaining surfaces — what each needs

### Cluster B (1 of 7 still open, distinct from WebAuthn)

| Surface | What's missing |
|---|---|
| B5 KeyRotation | Federation-key rotation. The surface at `/settings/keys` is currently a Placeholder; the real feature needs (a) backend endpoint that generates a new Ed25519 keypair, (b) an envelope-resigning worker that touches every outbox entry, and (c) DID doc republish so peers learn the new key. Copy at `frontend/shared/src/KeyRotation/copy.ts` describes the 4-step wizard. WebAuthn is orthogonal — passkey management lives at `/settings/webauthn`. |

### WebAuthn — shipped, deploy pending

Backend + frontend end-to-end. Prod requires:
1. Set `THEOURGIA_WEBAUTHN_RP_ID=theourgia.com` in `/srv/theourgia/prod/.env`
2. Set `THEOURGIA_WEBAUTHN_ORIGIN=https://theourgia.com` in same
3. `alembic upgrade head` (0065 → 0066)
4. Rebuild + redeploy backend + frontend containers
5. First user enrols via `/settings/webauthn`, then signs in via
   `/connection` → "Sign in with passkey"
6. Once every user has ≥1 credential, delete
   `POST /api/v1/auth/demo-signin` and the "Demo signin" button

### Cluster A + Cluster C

All shipped. See the routes table above for the live mappings.

### Public footer

All four pages shipped (`/vault` · `/federation` · `/hubs` ·
`/self-host`). Index footer updated to point at them.

---

## Infrastructure cheat-sheet

### Servers + SSH

```
host: 178.105.106.225 (commons.sakurastudios.eu)
user: theourgia
key:  ~/.ssh/agent-house-access-theourgia
```

The host is multi-tenant agent-house. Theourgia owns port range
8100–8199. Caddy snippets live at `/etc/caddy/Caddyfile.d/`:

- `theourgia.caddy` → theourgia.com (prod, port 8190)
- `dev-theourgia.caddy` → dev.theourgia.com (dev, port 8100 backend)
- `plugins.theourgia.caddy` → plugins.theourgia.com (port 8193) —
  **needs DNS A/CNAME for `plugins.theourgia.com` before usable**

### Stacks

| Stack | Compose project | Where | Containers |
|---|---|---|---|
| Prod | `theourgia-prod` | `/srv/theourgia/prod` | 8 containers (backend · daemon · registry · frontend + 3 DBs + redis) |
| Dev | `theourgia` | `/srv/theourgia/backend` | 3 containers (backend + DB + redis); static assets at `/srv/theourgia/dev/{public,admin}` |

### Deploy commands

```bash
# On the prod host
cd /srv/theourgia/prod
git pull
docker compose -f docker-compose.yml -f docker-compose.agent-house.yml --env-file .env build [service]
docker compose -f docker-compose.yml -f docker-compose.agent-house.yml --env-file .env up -d --no-deps [service]

# Migrations (per service)
docker compose -f docker-compose.yml -f docker-compose.agent-house.yml --env-file .env run --rm [backend|agent-daemon|registry] alembic upgrade head
```

### R2 buckets (provisioned, awaiting tokens)

| Bucket | Purpose |
|---|---|
| `theourgia-media` | Phase 11 media uploads |
| `theourgia-backups` | Phase 01 restic backups |
| `theourgia-plugins` | Phase 14 plugin tarballs |

All WEUR. **Generate API tokens via Cloudflare dashboard** — see
`docs/ops/R2_BUCKETS.md`.

### Pending DNS

- `plugins.theourgia.com` → no record yet → add CNAME to
  `theourgia.com` on Cloudflare (DNS only, grey cloud)

---

## Open design request

**H11 · Journal auto-context** — moon phase, weather, planetary hour,
multi-calendar chip all auto-captured on every journal entry. Design
request opened 2026-07-05 at
`docs/design-requests/2026-07-05-h11-journal-auto-context.md`. Six
surfaces + five honesty rules (nos. 61-65). Substrate (Swiss
Ephemeris, calendars, location) already exists; needs Open-Meteo
adapter + 3 frontend surfaces + Entry model columns.

## Open conversations from this session

1. **Footer links on the public site go to "nonsense"** (anchors that
   point at the homepage). Mapping table in
   `docs/ops/OVERNIGHT_HANDOFF.md`. To rectify: build dedicated pages
   for /vault, /federation, /hubs, /self-host then update
   `frontend/public-site/src/pages/index.astro`.
2. **Demo signin is Phase 02-era** — WebAuthn is the v1.1 upgrade per
   the project plan. To improve: implement WebAuthn ceremony in
   `backend/theourgia/api/routers/v1/auth.py` (the migration path is
   "demo signin still works, WebAuthn is additive").
3. **The user uses Claude Max, not the Anthropic API** — the daemon's
   subprocess path doesn't inject an API key when none is provided,
   so the claude CLI uses Max subscription auth. Verify on first run
   by logging into claude CLI on the host as the daemon's user.
4. **Registry LEAD maintainer is provisioned.** `did:vault:theourgia.com/soror-eu-a`
   was inserted directly into the registry DB during b108-2cj; the
   server-side Ed25519 signer reads its key from
   `/run/secrets/theourgia-author-soror-eu-a.pem` (bind-mounted from
   `/home/theourgia/secrets/` with POSIX ACL for container UID 1000).
   `THEOURGIA_AUTHOR_DID` / `THEOURGIA_MAINTAINER_DID` are set in
   prod `.env`. A2-A8 routes verified end-to-end with empty arrays
   (no submissions yet).

---

## Style + project conventions

Already in `CLAUDE.md` / memory but worth re-stating:

- **Total frontend rewrite** — every frontend file rewrites against
  the design system; no shortcuts.
- **Match the design exactly** — non-negotiable. Every value, every
  SVG element, every transition, every editorial copy verbatim from
  `.dc.html`.
- **Style Guide voice overrides mockup jargon** — expand "a11y" /
  "i18n" / "RTL" to plain language in user-facing labels.
- **No emojis in commits or code** unless the user asks. (One in the
  README "🟢 LIVE" was the user's celebration; not the default.)
- **GitHub identity is SAntonopoulou** — pre-push hook enforces.
- **Co-author trailer** on every commit:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Honesty by construction** — surface what filtered, what was
  refused, what was halted. Verbatim daemon copy when relaying refusal.

---

## Memory pointers

The auto-memory index is at
`~/.claude/projects/-home-sophia-Documents-development-theourgia/memory/MEMORY.md`.

Key entries:
- `project_phase_16_daemon.md` — full daemon scaffold history
- `project_h10_sprint_close.md` — H10 surfaces shipped
- `feedback_match_design_exactly.md` — the most-cited convention
- `feedback_total_frontend_rewrite.md` — scope of frontend work
- `user_magickal_name.md` — CRITICAL: docs use `Soror Ευ. Α.` ONLY

These are persistent across sessions; they survive any wipe of
working memory.

---

## Resume command for Athens

Once you've cloned the repo on the Athens machine:

```bash
cd theourgia
cat CLAUDE_CONTINUATION.md   # (this file)
cat docs/ops/DEPLOYMENT_RUNBOOK.md
cat docs/ops/OVERNIGHT_HANDOFF.md   # 2026-06-28 morning state
git log --oneline -20   # recent work
```

Then start Claude Code in the repo root. The auto-memory will load
the project context; this file gives you the open threads.

**The work is at a pause-able place** — no half-broken commits, all
tests green, prod live. You can come back whenever. Safe travels. ✈️

Co-Authored-By: Claude Opus 4.7 (1M context)
