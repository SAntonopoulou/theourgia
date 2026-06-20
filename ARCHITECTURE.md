# Theourgia — Architecture

This document describes the system architecture, trust model, data flow, deployment topology, and core technology choices. It is the source of truth for architectural decisions; per-phase plans elaborate within these constraints.

---

## 1. Top-Level Mental Model

Theourgia is a **single codebase** that can operate in three composable roles:

```
                 ┌──────────────────────────┐
                 │      Theourgia Node      │
                 │  (one deployment)        │
                 ├──────────────────────────┤
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │  Vault(s):       │   │     personal magician data
                 │   │  (1+ per node)   │   │     each = one magician
                 │   └──────────────────┘   │
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │  Hub(s):         │   │     group/order shared spaces
                 │   │  Local OTO Body  │   │     (0+ per instance)
                 │   └──────────────────┘   │
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │  Federation API  │   │     talks to other Theourgia
                 │   │  ActivityPub I/O │   │     and to the Fediverse
                 │   └──────────────────┘   │
                 └──────────────────────────┘
```

- A **vault** is one magician's personal data: journal, library, entities, etc.
- A **hub** is a group's shared space: a body / coven / order / sodality.
- A single instance can host any combination — pure vault (one magician on their laptop), pure hub (a community server), or mixed (a magician hosting their own vault plus the community's hub).
- Vaults and hubs communicate via the **federation protocol**.
- Public content can additionally be broadcast via **ActivityPub** to the wider Fediverse.

This avoids creating two products. Same software, configurable role.

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend language | **Python 3.12+** | Rich scientific ecosystem (astronomy, crypto, NLP); mature async story |
| Backend framework | **FastAPI** | Async, typed, OpenAPI-native, modern best practices |
| ORM | **SQLModel** | Pydantic+SQLAlchemy unification; works hand-in-hand with FastAPI |
| Migrations | **Alembic** | Industry standard for SQLAlchemy-based stacks |
| Database | **PostgreSQL 16+** | Required. No SQLite — vector search, JSONB, full-text, partitioning all matter |
| Search | **PostgreSQL FTS + `pgvector`** | Avoids second datastore; semantic + lexical in one place |
| Cache / queue | **Redis 7+** | Sessions, rate limits, Celery broker |
| Background jobs | **Celery** with Redis broker | Mature, well-known, supports cron + retries |
| Astronomy | **Swiss Ephemeris (`pyswisseph`)** | Industry-standard precision; we use Astrodienst's free AGPL-3.0 dual-license path (qualifies automatically since Theourgia is AGPL). Attribution rendered in chart output and about page. See [NOTICE](NOTICE) and [plan/03 §Swiss Ephemeris licensing](plan/03-time-and-cosmos.md) |
| Cryptography | **`cryptography`** + **`libsodium`** (`PyNaCl`) | High-level primitives; audited |
| Frontend public | **Astro 4+** | Content-first, islands of interactivity, light, easy to fork |
| Frontend admin / editor | **React 19** | Heavy interactivity needs; runs as Astro islands or standalone SPA |
| Editor | **Tiptap** (ProseMirror-based) | Extensible block model for custom magical content blocks |
| Styling | **Tailwind CSS 4** | Design-system-friendly; broad community ecosystem |
| Build | **Vite** | Underneath Astro and React tooling |
| Type checking | **mypy** (backend) + **TypeScript strict** (frontend) | Catches whole classes of bugs |
| Linting / formatting | **Ruff** (Python) + **Biome** (TS/JS/JSON) | Fast, modern, single-tool |
| Testing | **pytest** + **Playwright** + **Vitest** | Unit + integration + E2E |
| Reverse proxy | **Caddy 2** | Automatic HTTPS, simpler than Traefik for this use case |
| Container | **Docker + Docker Compose** | Primary deployment story |
| CI/CD | **GitHub Actions** | Free for OSS, ubiquitous |
| Docs site | **Astro Starlight** | Same stack as main app; clean docs theme |

### Why not Next.js
Astro + a React SPA gives us Next.js's strengths (SSR for public content, full React for admin) without binding to Vercel's deployment model or React Server Components. Self-hosters get a simpler story.

### Why not Skyfield
Skyfield is excellent and MIT-licensed, but since we're AGPL we can use Swiss Ephemeris — which is the canonical reference in astrology software, has arcsecond precision, and matches what other astrology programs use. Reproducibility across tools matters.

## 3. Repository Layout (proposed)

```
theourgia/
├── PROJECT_PLAN.md
├── ARCHITECTURE.md
├── README.md
├── LICENSE                       AGPL-3.0
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── Caddyfile.example
├── .github/
│   └── workflows/                CI: lint, test, type-check, security scan
├── docs/                         Astro Starlight site (theourgia.com/docs)
│   ├── user/
│   ├── admin/
│   ├── developer/
│   └── adr/                      Architecture Decision Records
├── backend/
│   ├── pyproject.toml
│   ├── alembic/
│   ├── theourgia/
│   │   ├── core/                 framework code (auth, plugins, encryption, federation)
│   │   ├── modules/              feature modules (journal, entities, divination, …)
│   │   ├── api/                  FastAPI routers
│   │   ├── workers/              Celery tasks
│   │   └── plugins/              built-in plugins
│   └── tests/
├── frontend/
│   ├── public-site/              Astro app (theourgia.com + per-vault sites)
│   ├── admin/                    React SPA (vault dashboard, editor)
│   ├── shared/                   Shared UI components, types, i18n
│   └── tests/
├── plugins/                      Reference plugins (external would live in user repos)
│   ├── divination-tarot/
│   ├── divination-iching/
│   └── …
└── plan/                         Per-phase implementation plans
```

## 4. Data Model — High-Level Entities

These are the principal database tables. Each phase plan elaborates fields.

**Identity & access:**
- `user` — credentials, 2FA secrets, recovery codes
- `session` — active sessions with device fingerprint
- `vault` — a magician's namespace (one user can own multiple vaults)
- `hub` — a network's namespace
- `membership` — links users to vaults (owner / collaborator) and hubs (member / officer / admin)
- `private_viewer` — magician-issued credentials for trusted readers
- `audit_event` — immutable log

**Content:**
- `entry` — universal journal entry (rich content; many subtypes via discriminator)
- `entry_revision` — version history
- `template` — custom entry templates
- `tag` — flexible tagging
- `attachment` — files (images, audio, video, PDFs)
- `body_snapshot` — body sensation diagrams

**Time & astrology:**
- `chart` — saved astrological charts (natal, transit, electional)
- `event` — calendar events (eclipses, ingresses, festivals)
- `election_query` — saved election-finder searches

**Magical beings:**
- `entity` — gods / spirits / angels / demons / saints / ancestors
- `offering` — discrete offering events
- `contract` — pacts with terms and fulfillment
- `oath` — vows to self / tradition / body / deity
- `initiation` — grade records (zero-knowledge by default)

**Library & references:**
- `book` — library catalog entries
- `book_note` — per-book notes and highlights
- `quote` — quotable passages (with `book` reference)
- `correspondence_table` — user-defined correspondence systems
- `correspondence` — table cells
- `recipe` — incense / oil / wash formulae

**Divination:**
- `deck` — tarot/oracle decks
- `card` — cards in a deck (with art and meanings)
- `spread` — reading layouts
- `reading` — divination session (tarot, I Ching, geomancy, runes, pendulum, bibliomancy, scrying, horary)

**Practice:**
- `ritual_template` — reusable ritual scripts
- `working` — instance of a ritual / spell / operation (linked to entities, intentions, outcomes)
- `dream` — dream journal entries
- `pathworking` — Tree of Life journey logs
- `servitor` — chaos magic servitors
- `body_practice` — asana / pranayama logs

**Workshop:**
- `sigil` — generated sigils (with seed, mode, parameters)
- `talisman` — designed talismans
- `circle_design` — magical circle SVG definitions
- `tool` — magical tool registry

**Linguistic:**
- `cipher` — gematria ciphers (user-extensible)
- `gematria_index` — denormalized for cross-journal search

**Analytics:**
- `synchronicity` — quick-capture synchronicity events
- `outcome_rating` — multi-axis ratings on workings
- `saved_query` — analytics query definitions

**Publishing:**
- `publication` — books, articles for sale or free distribution
- `purchase` — Stripe payments
- `newsletter` — issues
- `subscription` — reader subscriptions

**Media:**
- `media_asset` — images, audio, video
- `pilgrimage_site` — sacred site visit log

**Federation:**
- `federation_peer` — known other Theourgia instances
- `sync_state` — per-peer, per-entity sync watermarks
- `network_post` — content shared into hubs
- `activitypub_actor` — when AP is enabled
- `activitypub_activity` — inbox/outbox

**Plugins:**
- `plugin_install` — installed plugins per vault/hub
- `plugin_setting` — plugin configuration

**Multi-identity (pseudonymity):**
- `identity` — per-vault author identities (legal name, magickal name(s), order name, ancestor name)
- `entry_identity` — which identity authored each entry/post/publication

**Entity merge (alias graph):**
- `entity_alias` — typed relationships between entities (`same-as`, `aspect-of`, `aspect-includes`, `syncretic-with`, `epithet-of`)
- `entity_view` — user-defined named unified views (saved unions of entity_ids for display-time merge)

**Lineage attestation:**
- `attestation` — declarable claims about lineage / initiation / affiliation
- `attestation_signature` — Ed25519 signatures from third parties (lodge masters, teachers) verifying attestations

**Bundles & sharing:**
- `bundle` — installed bundles per vault (manifest, source, signature, install date, opt-in update channel)
- `bundle_subscription` — networks subscribed to upstream bundles
- `bundle_tombstone` — withdrawn bundles still installed locally; new fetches see this

**Time-released content:**
- `scheduled_publication` — entries/posts/publications scheduled to release at a future timestamp or upon a trigger (posthumous, curriculum unlock)

**Digital inheritance:**
- `executor` — designated digital executors with encrypted key-shares and time-locked unlocks
- `checkin_policy` — "if I don't log in for N months, notify [person]" rules
- `memorial_state` — vault-level transition to memorial mode after trigger

**AI agents (Phase 16):**
- `agent` — per-vault registered agent instances (type, capabilities, memory_dir, cost_cap, model)
- `agent_session` — spawn history with token usage
- `agent_capability_grant` — per-agent capability allowlist (explicit consent record)
- `agent_audit_event` — every MCP call logged per-agent

## 5. Security & Trust Model

### Threat model
- **Adversary 1: External attacker.** Wants to read private journal content. Mitigated by transport encryption, strong auth, encryption at rest, optional zero-knowledge mode.
- **Adversary 2: Compromised host operator.** A network hub operator who decides to read members' private content. Mitigated by zero-knowledge mode (operator literally cannot decrypt) and by clear visibility model (members control what is shared).
- **Adversary 3: Legal compulsion.** Subpoena of host operator. Mitigated by zero-knowledge mode and by encouraging self-hosting on user-controlled hardware.
- **Adversary 4: Malicious plugin.** A third-party plugin exfiltrating data. Mitigated by capability-based plugin sandbox, signed releases, and visibility into what plugins are doing.

### Encryption modes

Per-content-item, user chooses:

**Mode A — Server-side encryption at rest.** Standard. The server has keys, can decrypt for the user, supports server-side full-text search. Default for most users.

**Mode B — Zero-knowledge client-side encryption.** Content is encrypted in the browser with a key derived from a passphrase the server never sees. The server stores ciphertext. Server-side full-text search becomes impossible (client-side or encrypted-search workarounds only). Lost passphrase = lost data. Used for `initiation`, `oath`, sensitive workings, and any content the user marks "Sealed."

Both modes coexist in the same vault.

### Auth
- Argon2id password hashing
- TOTP 2FA with QR provisioning + backup codes
- Optional WebAuthn / passkeys
- Session tokens with rotation and device-list management
- Rate limiting and account-lockout policies on sensitive endpoints

### Visibility model
Every content item has a `visibility` enum:

- `personal` — only the vault owner sees it (default for journal entries unless overridden)
- `viewer` — vault owner + named private-viewer accounts
- `network:{id}` — owner + members of the named hub(s)
- `public` — world-readable
- `sealed` — like `personal` but zero-knowledge encrypted

Visibility is enforced at the API gateway, in the database queries via row-level security, and on the frontend. Defense in depth.

### Federation security
- Federation messages are HTTP signed (Ed25519 keys per instance)
- Vault-to-hub sync uses capability tokens with explicit per-content scopes
- Hubs cannot pull content vaults haven't pushed; pull-without-push is impossible
- ActivityPub layer only handles `public` content; never sees `viewer` / `network` / `sealed`

### GDPR compliance (built-in by design)
Theourgia self-hosted instances are GDPR-compliant by default; tooling is provided to help network hub operators be compliant for their members:

- **Right to access** — `GET /api/v1/me/export` produces a full structured archive of the user's data (JSON + MBF format)
- **Right to erasure** — `DELETE /api/v1/me` with documented limits: federated content lives on per other parties' sovereignty (tombstones propagate); legal-hold exceptions documented
- **Data portability** — all exports in readable, machine-parseable formats (JSON, MBF, BibTeX where applicable)
- **Privacy by design** — minimal collection, encryption at rest, no third-party trackers
- **DPIA template** for network hub operators in `docs/admin/dpia-template.md`
- **Breach notification runbook** in `docs/admin/security-incident-runbook.md`
- **Cookie consent UI** for public surfaces; also enforces zero-telemetry promise (no analytics scripts visible to consent at all)
- **Data minimization** baked into schema review process

### Pseudonymity / multi-identity
A vault supports multiple author identities — legal name, magickal name(s), order name, ancestor name, ritual-context names. Each entry, post, publication, comment is authored under one chosen identity. The platform:

- **Per-content identity selection** at authoring time
- **Selective disclosure per network** — different identities exposed to different hubs (legal-name to one, magickal name to another)
- **Default public identity** chosen per surface (vault homepage, blog, publications)
- **Identity verification cryptography** — each identity has its own keypair for the lineage attestation system
- **Maintainers in documentation are referred to by chosen identity only** — see project conventions

### Closed-tradition handling
Bundles and content can declare themselves as belonging to closed traditions (active living indigenous practices, sworn-secret material, etc.):

- **`closed-tradition` flag** on bundles and entries
- **Default-block public sharing** of flagged content
- **Respect-source notice** surfaced to importers explaining the source tradition's preference
- **AI agent exclusion** — flagged content invisible to agents (Phase 16) regardless of user-granted scope
- **No policing** — we are not arbiters of who may practice what; we enable practitioners to easily honor source-tradition requests
- **Provenance preserved** — closed-tradition origin metadata cannot be stripped from bundles

### Crisis-aware nudge (opt-in)
If sustained severe distress is logged in body/mood snapshots over time, an opt-in feature can surface a discreet, tone-conscious note about non-magickal supportive resources (therapists, crisis lines in the user's region). The feature:

- Is opt-in only; off by default
- Does not pathologize magickal practice — simply acknowledges that some experiences need other support too
- Suggests resources from a curated, regionally-aware list
- Can be disabled at any time

## 6. Federation Protocol (Theourgia native)

Designed to be simpler and more practitioner-shaped than ActivityPub.

### Concepts
- Each **instance** has an Ed25519 keypair and a stable URL.
- Each **vault** and **hub** has a unique identifier `did:theourgia:{instance}:{slug}`.
- **Capabilities** are signed tokens granting a specific party access to a specific scope on a specific object set.

### Operations
- `PUSH(vault → hub)`: vault publishes an item to a hub it is a member of, with selected visibility (e.g., `network:OTOLocalBody`).
- `PULL(hub ← vault)`: hub fetches updates from member vaults (where caps allow).
- `MIRROR(hub → public)`: hub republishes a member's `public` content under the hub's brand (with attribution).
- `INVITE(hub → email/ID)`: hub invites a magician to join (creating a membership awaiting acceptance).
- `RITUAL(hub: schedule)`: hub announces a group ritual to its members, with timezone-aware planetary-hour metadata.

### Transport
- HTTPS with HTTP Signatures (draft-cavage-http-signatures or RFC 9421)
- Content payloads are JSON; signed envelopes
- Webhook-style push + polling fallback

### Conflict resolution
- Last-writer-wins by signed timestamp for non-collaborative items
- CRDT-based merge (Yjs) for genuinely collaborative documents (e.g., shared ritual scripts)

### ActivityPub bridge
- The AP layer is a thin adapter: convert outgoing `public` `entry` and `newsletter` items into AP `Note` / `Article` objects, and convert incoming `Follow` / `Like` / `Announce` into Theourgia equivalents.
- AP is never the primary data model; it is a presentation layer for the wider Fediverse.

### Single Sign-On across networks
A first-class capability for federated identity. A magician can use one identity across all the Theourgia networks they participate in, with per-hub opt-in:

- **Theourgia SSO** — based on the federation protocol's per-instance keys
- **Per-network opt-in** — hubs choose whether to accept SSO authentication for joining or commenting
- **Used for**: requesting access to private networks, comment authentication on individual sites, auto-download authorization for subscribed bundles
- **Individual vault sites can opt in** for their own surfaces (comments, subscription, etc.)
- **No central authority** — there is no Theourgia SSO Server; identity provision is by the user's home vault instance

## 6.5 AI Agent Integration Layer (optional, opt-in)

Theourgia supports an opt-in AI agent layer for magicians who want to work alongside per-purpose Claude agents. Modeled on the daskalos pattern.

```
                    ┌──────────────────────────────────┐
                    │      Theourgia Vault             │
                    │  ──────────────────────────      │
                    │  ┌──────────────────────────┐    │
                    │  │  Agent daemon             │    │ ← scoped MCP server
                    │  │  (FastAPI + MCP / SSE)    │◄───┼── magician's external Claude Code
                    │  └────────┬─────────────────┘    │   (optional)
                    │           │                       │
                    │  ┌────────▼─────────────────┐    │
                    │  │  Host waker               │    │
                    │  │  (systemd --user)         │    │
                    │  └────────┬─────────────────┘    │
                    │           │ claude spawn         │
                    │  ┌────────▼─────────────────┐    │
                    │  │  Per-purpose agents       │    │
                    │  │  • divination companion   │    │
                    │  │  • scrying partner        │    │
                    │  │  • ritual aide            │    │
                    │  │  • study tutor            │    │
                    │  │  • correspondence helper  │    │
                    │  │  • synchronicity reviewer │    │
                    │  └───────────────────────────┘    │
                    └──────────────────────────────────┘
```

Key properties:

- **Opt-in entirely** — zero-AI mode is the default; the daemon is an optional service
- **User-supplied keys** — BYO Anthropic API key or Claude subscription; Theourgia never holds central keys; never bills
- **Capability-scoped MCP** — each agent has an explicit, user-granted capability allowlist
- **Sealed content unreachable architecturally** — the daemon has no decryption keys for `sealed` content; even if compromised it cannot expose zero-knowledge data
- **Closed-tradition exclusion** — flagged content is excluded from all agent MCP queries regardless of granted scope
- **Per-purpose agents** — each agent is scoped to a purpose with its own memory directory
- **Cost controls** — per-agent and per-vault cost caps with hard cutoff
- **Magician-side MCP** — user's own Claude Code can connect to their Theourgia vault for terminal-based collaboration
- **Resume window** — follow-up wakes use `claude --continue` for ~20× input token reduction
- **Per-MCP-call audit log** — every action an agent takes is logged in human-readable form

Full design and implementation plan: [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md).

## 7. Plugin Architecture

### Extension points
Plugins can extend:
- **Calendars** (new calendar systems)
- **Astrology** (new traditions, dignities, techniques)
- **Divination** (new systems beyond bundled tarot/I-Ching/geomancy/runes)
- **Sigil generators** (new modes)
- **Ciphers** (new gematria schemes)
- **Correspondence systems** (importable / community-maintained tables)
- **Entry block types** (Tiptap nodes for the editor)
- **Dashboards / analytics** (custom widgets)
- **Exporters** (new output formats)
- **Notifications** (new channels: email, Matrix, Signal, etc.)
- **Federation message types** (new event kinds)

### Plugin contract
- Plugins are Python packages installable via pip and frontend bundles loaded dynamically
- Each plugin declares its extension points and required capabilities in a manifest
- Capabilities are checked against a sandbox policy at install/load time
- Plugins are versioned and signed
- Plugins can declare database migrations (Alembic), which run in their own schema namespace

### Sandbox
- Backend plugins run in-process but only have access to capability-scoped APIs (no raw filesystem, network, or DB access)
- Frontend plugins are loaded as ES modules with restricted globals
- Plugin permissions are surfaced to the user at install time (like browser extension permissions)

### Registry
- A community-maintained plugin registry (a Theourgia network hub serving plugin metadata)
- Plugins downloadable from GitHub releases by default; registry is an index
- Vulnerability disclosure process documented

## 8. Frontend Architecture

### Public site (Astro)
- Each vault and hub has a public face under a configurable path
- Static-by-default with islands for: divination demos, gematria calculator on landing page, etc.
- SEO and RSS-friendly
- Tailwind + design tokens

### Admin / editor (React SPA)
- Routes: `/app` for vault dashboard, `/hub/:id` for hub admin
- React 19 with TanStack Query for data
- Tiptap editor with custom magical blocks
- Drag-and-drop entry template builder (custom; based on `dnd-kit`)
- React Router (data router mode)
- Realtime updates via WebSocket subscription for collaborative editing and federation event surfacing

### Shared
- TypeScript types generated from FastAPI OpenAPI schema (orval or similar)
- Shared design system (delivered separately by the design team)
- i18n via `i18next` with namespaces per module

## 9. Deployment Topology (reference for `theourgia.com`)

```
Internet
  │
  ▼
Cloudflare (DNS, proxy, DDoS, WAF, CDN)
  │   theourgia.com → orange-cloud proxy
  ▼
Hetzner VPS (Caddy)
  │
  ├── frontend (Astro static + admin SPA build) — served by Caddy
  │
  ├── api.theourgia.com → FastAPI (uvicorn workers behind Caddy)
  │
  ├── postgres   (bound 127.0.0.1 / internal Docker network ONLY)
  ├── redis      (bound 127.0.0.1 / internal Docker network ONLY — NEVER external)
  ├── celery workers (internal only)
  │
  └── object storage: Cloudflare R2 (primary) — for media + backups
         Hetzner Object Storage / Backblaze B2 / MinIO as alternatives
```

- DNS at Squarespace → Cloudflare nameservers (or CNAME flattening) → Cloudflare → Hetzner origin
- TLS terminated at Caddy (Let's Encrypt via DNS-01 since Cloudflare proxy is in front)
- **Backups: Restic → Cloudflare R2 from day one, daily, encrypted with a passphrase the operator controls.** Restic supports S3-compatible backends, so alternative R2-style targets are drop-in replacements.

### Hosting flexibility — two reference paths

**Path A (Cloudflare-assisted, recommended for theourgia.com and most self-hosters):**
- Cloudflare DNS + proxy + CDN + R2 backups
- Hetzner (or any) VPS as origin
- Lowest operational complexity; best caching and DDoS protection

**Path B (fully sovereign, no Cloudflare):**
- Self-hosted DNS or third-party non-Cloudflare DNS
- Caddy reverse proxy with its built-in caching for CDN-equivalent behavior
- Local internal Redis (still internal-only) for application caching
- Backups to S3-compatible target of the operator's choice (Hetzner, Backblaze, MinIO, even an external Restic repository on a NAS)
- Slightly higher operational complexity; full sovereignty

Both paths are first-class. Documentation and reference configs ship for both.

### Network exposure invariants (security-critical)
- **Redis is never bound to a public interface.** Reference compose files enforce this; documentation calls it out repeatedly.
- **PostgreSQL is never bound to a public interface.** Same.
- **Celery workers and the metrics endpoint are internal-only.**
- The only externally-facing ports are 80 and 443, terminated at Caddy.

## 10. Observability

- Structured logs (JSON) to stdout
- Optional Prometheus metrics endpoint
- Reference Grafana dashboards
- Health check endpoints
- Error tracking via Sentry (self-hosted Sentry is an option; opt-in)

## 10.5 Testing Strategy

Theourgia maintains rigorous test coverage at every phase. Tests are written when features are built — not in a separate "testing pass."

### Test types

| Type | Coverage | Tooling |
|---|---|---|
| **Unit** | Individual functions / components | pytest (backend), Vitest (frontend) |
| **Integration** | Cross-component (FE↔BE, federation↔AP, plugin↔host, agent↔MCP) | pytest with fixtures, Playwright |
| **Regression** | Previously-fixed bugs + known-fragile interactions | pytest, Vitest |
| **End-to-end** | Critical user flows (login, write, publish, federate, divination, group ritual, deploy) | Playwright |
| **Property-based** | Crypto, astronomy, gematria ciphers, encryption round-trips | Hypothesis (Python) |
| **Migration** | Every Alembic migration round-trips against populated DB | pytest + Alembic test harness |
| **Security** | RLS policies, sealed-content exclusion, zero-telemetry verification | dedicated suites |

### Execution model

**v0.x (current era):**
- `just test` runs the full local suite
- On deploy to dev server, smoke tests verify health, routes, federation round-trips, migrations
- No formal GitHub Actions CI/CD gating (small team, fast iteration)
- Test discipline is unchanged; only the automation harness is local-first

**Post-v1.0:**
- GitHub Actions becomes the canonical gate
- Every PR runs the full suite (lint, type-check, unit, integration, regression, security scan)
- Deploys gated on green CI
- Same tests as v0.x; only the runner moves

### Definition of Done implications

Every phase's Definition of Done requires:
1. Tests written for all new functionality
2. All tests pass locally
3. Smoke tests pass on dev-server deploy
4. Post-v1.0: passes CI on every PR

No PR merges without green tests at the maturity level the project is at.

## 11. Compatibility and Migration

- Database migrations always include a forward and (when feasible) backward direction
- Plugin DB migrations namespaced per-plugin
- Federation protocol versioned with capability negotiation
- API versioned (`/api/v1`, `/api/v2`); deprecation policy documented

## 12. Non-Goals

To prevent scope creep, these are explicitly **not** in scope:
- A hosted SaaS version (revisit after federation is mature)
- Native mobile apps (responsive web + PWA only)
- A built-in payment processor (Stripe is the only payment integration; users use their own Stripe accounts)
- Built-in machine learning models for divination interpretation (anti-pattern; magic is not autocompletion)
- AI-generated content insertion (the practitioner writes; the tool serves)
- Cryptocurrency / "spiritual NFT" features
