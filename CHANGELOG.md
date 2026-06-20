# Changelog

All notable changes to Theourgia will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — 2026-06-20 (initial planning corpus + scope expansion)

**Planning corpus:**
- [PROJECT_PLAN.md](PROJECT_PLAN.md) — vision, 19-category feature overview, **17-phase index**, resolved decisions, glossary
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, trust model, federation protocol, plugin substrate, AI integration layer, GDPR provisions, multi-identity, closed-tradition handling, testing strategy
- [FEATURES.md](FEATURES.md) — **canonical feature catalog** (~200 features across 19 categories with status tracking)
- [plan/](plan/) — **seventeen per-phase implementation plans (00 through 16)**, each detailed enough to resume work cold after context loss
- [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) — new dedicated phase for AI agent integration via the daskalos pattern

(Design briefs for the design team are maintained as external handoff documents — see project archives — and are not part of the public repository.)

### Added — 2026-06-20 (Swiss Ephemeris licensing pre-flight)

- [NOTICE](NOTICE) — third-party attribution file at repo root, listing Swiss Ephemeris (Astrodienst AG) and JPL DE441 planetary ephemeris (NASA/JPL) with required attribution text
- [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) — explicit "Swiss Ephemeris licensing" section replacing the prior brief risk-note; documents AGPL path, obligations, what is and is not restricted, implementation deliverables, risk mitigations
- [ARCHITECTURE.md](ARCHITECTURE.md) §2 — Swiss Ephemeris row expanded with licensing context

Status confirmed: Theourgia qualifies for the free AGPL-3.0 path with Swiss Ephemeris. Paid SaaS / commercial-use scenarios remain on the free path as long as Theourgia stays AGPL.

### Added — 2026-06-20 (SaaS posture committed explicitly)

- PROJECT_PLAN.md §8 item 4 — explicit commitment that any future hosted SaaS keeps the code AGPL-3.0 forever; revenue model is hosting fees + small profit margin only; no proprietary forks ever; competing hosted instances by other operators are by design.

### Added — 2026-06-20 (Phase 00, Batch 1 — project skeleton + tooling)

Phase 00 (Foundations) opens. First batch lays the monorepo skeleton and tooling configurations such that `just install` + `just check` will work end-to-end once dependencies are installed.

**Top-level configuration:**
- `.gitattributes` — line-ending normalization, binary classification, linguist hints
- `.python-version` (3.12) and `.nvmrc` (Node 22)
- `.env.example` — fully documented environment variable template
- `justfile` — task runner with recipes for install, dev, lint, format, typecheck, test, migrate, build, docs, security, identity verification
- `pyproject.toml` — root workspace with Ruff, mypy, pytest, and coverage configuration shared across the Python parts of the monorepo
- `package.json` + `pnpm-workspace.yaml` — Node workspaces (frontend + docs)
- `tsconfig.json` — strict TypeScript baseline shared by frontend workspaces
- `biome.json` — JS/TS lint+format with a11y rules and the `useSortedClasses` Tailwind helper
- `.pre-commit-config.yaml` — pre-commit hooks (gitleaks, ruff, biome, hadolint, markdownlint, conventional-commit message check)
- `.markdownlint.json` — markdown lint config

**Backend skeleton:**
- `backend/pyproject.toml` — package manifest with planned dependencies (FastAPI, SQLModel, Alembic, asyncpg, Redis, Celery, cryptography, pyswisseph, etc.) and dev group (pytest, hypothesis, mypy, ruff, pip-audit)
- `backend/theourgia/__init__.py`, `__about__.py`, `__main__.py` — package skeleton with version metadata
- `backend/tests/__init__.py`, `conftest.py`, `test_smoke.py` — pytest discovery + initial smoke tests
- `backend/README.md` — package documentation

**Frontend skeleton:**
- `frontend/shared/` — design system / shared components / i18n package skeleton
- `frontend/public-site/` — Astro public site package skeleton
- `frontend/admin/` — React admin SPA package skeleton
- `frontend/README.md` and per-package READMEs

**Docs scaffolding:**
- `docs/README.md` — directory map
- `docs/adr/README.md` + `docs/adr/template.md` — MADR-style ADR template ready for Batch 2 ADR authoring
- `docs/user/`, `docs/admin/`, `docs/developer/` directories scaffolded with `.gitkeep`

**Other:**
- `plugins/README.md` — reference plugin directory map
- `scripts/verify-identity.sh` — git identity guard (runnable via `just verify-identity`)

### Added — 2026-06-20 (Phase 00, Batch 2 — containers + dev environment)

Phase 00 Batch 2 lands the container + devcontainer story. End state: a contributor with VS Code + Dev Containers extension can clone the repo, "Reopen in Container," and have a fully-installed dev environment within minutes. `just dev` brings up the full stack (Postgres, Redis, backend with hot reload, Astro public-site dev server, React admin dev server). `just up-prod` is the production analogue.

**Container images:**
- `backend/Dockerfile` — multi-stage Python image (`base` → `deps` → `dev` → `prod`); uv-based dep install with build-cache mounts; non-root user in prod; tini for PID 1; healthcheck via curl
- `frontend/Dockerfile` — multi-stage Node + Caddy image (`base` → `deps` → `build` → `public-site-dev` / `admin-dev` / `prod`); pnpm with cache mounts; production target serves built static files via internal Caddy
- `frontend/Caddyfile.internal` — internal frontend container Caddy config; routes `/api/*` + `/federation/*` + `/.well-known/*` + `/users/*` + `/ws/*` to backend; admin SPA at `/app/*` with client-side routing; public site at `/`; security headers baked in
- `.dockerignore` (top-level) + `backend/.dockerignore` + `frontend/.dockerignore` — exclude secrets, build artifacts, VCS, editor configs, plan/docs from images

**Docker Compose:**
- `docker-compose.yml` — base stack: postgres + redis + backend + celery + celery-beat + frontend; internal `theourgia-internal` bridge network; named volumes for postgres + redis data; required env vars enforced via `${VAR:?msg}` syntax
- `docker-compose.dev.yml` — dev overrides: hot reload, source volume mounts, postgres + redis exposed on `127.0.0.1`, public-site (Astro dev) on port 4321, admin (Vite dev) on port 5173, dev-only sentinel secrets, prod frontend profiled out
- `docker-compose.prod.yml` — prod overrides: multi-worker uvicorn, no host ports for postgres/redis, internal frontend Caddy bound to `127.0.0.1:8190` (or `THEOURGIA_FRONTEND_HOST_PORT` override), JSON-file logging with size+rotation, no dev fallbacks for secrets

**Self-hoster reference:**
- `Caddyfile.example` — example host-level Caddyfile for single-tenant self-hosters (Cloudflare DNS-01, apex + www redirect, reverse-proxy to `127.0.0.1:8190`, security headers, optional docs subdomain stub)

**Devcontainer + editor:**
- `.devcontainer/devcontainer.json` — VS Code Dev Containers spec: composes the dev stack, adds a `devcontainer` workspace service, features for Python 3.12 / Node 22 / uv / pnpm / just / pre-commit / GitHub CLI / docker-outside-of-docker; recommended extensions; per-language formatter settings; forwarded ports
- `.devcontainer/docker-compose.devcontainer.yml` — workspace container override that mounts the source and the host Docker socket
- `.devcontainer/post-create.sh` — first-run setup: `uv sync`, `pnpm install`, `pre-commit install`, identity-guard check
- `.vscode/settings.json` — editor formatter / linter / interpreter settings aligned with project conventions
- `.vscode/extensions.json` — recommended extension list; `unwantedRecommendations` blocks Prettier / black to avoid conflicts with Biome / Ruff
- `.vscode/launch.json` — debug configurations for backend uvicorn and pytest (current file / all)
- `.vscode/tasks.json` — `just` recipe shortcuts as VS Code tasks

After this batch: cloning the repo and choosing "Reopen in Container" gets you a working environment with no manual dependency installation.

**Governance:**
- [AGPL-3.0 license](LICENSE)
- [Code of Conduct](CODE_OF_CONDUCT.md) — Contributor Covenant 2.1 with project-specific addendum on respect for divergent magickal practice
- [Contributing guide](CONTRIBUTING.md) (planning-phase scoped)
- [Security policy](SECURITY.md) with private vulnerability disclosure via GitHub Security Advisories
- README.md as community front page with visual roadmap, tech badges, About-Creator section
- Project hygiene: `.gitignore`, `.editorconfig`, pre-push identity guard hook

**Scope expansions confirmed:**
- **Magickal Bundle Format (MBF)** — comprehensive shareable artifact catalog (pantheons, tradition bundles, rituals, decks, sigil libraries, calendars, ciphers, symbolism systems, etc.); piecemeal sharing supported
- **Entity alias-graph merge model** — multi-source entities coexist without overwriting; user-curated relationships; unified views for display-time merge
- **AI agent integration** as Phase 16 — opt-in daskalos-pattern (daemon + waker + MCP); BYO Anthropic keys; never required
- **GDPR compliance** built in from architecture
- **Multi-identity / pseudonymity** per vault
- **Lineage attestation with cryptographic counter-signing**
- **Blog platform** distinct from magickal journal
- **Time-released content** (scheduled, posthumous, curriculum-unlock)
- **Single Sign-On across networks**
- **Admin permissions panel** with configurable user levels per hub
- **iCal/WebCal feed exports** including network group ritual feeds
- **Subscription billing** for newsletters and patron tiers
- **Print-quality book typography**
- **Closed-tradition flags** with default-block public sharing
- **Digital inheritance / memorial mode**
- **Sandbox-before-commit** for bundles and plugins
- **Official Theourgia plugin/bundle registry** with three trust tiers

**Architectural commitments:**
- Zero telemetry (verified by CI test)
- Modal-only alerts (no native browser dialogs; ESLint-enforced)
- Documentation from day one (synced with product, not retrofitted)
- User onboarding from day one (built alongside features)
- Testing discipline at every phase (unit, regression, integration, E2E, property-based)
- Cloudflare R2 backups from day one
- One-command deploys + one-click migrations with diff preview
- README continuously current as community page

### Added — 2026-06-20 (Phase 00, Batch 3 — CI workflows + GitHub templates)

Phase 00 Batch 3 lands the CI/CD scaffolding and GitHub contributor templates. During v0.x these workflows are **informational, not merge-blocking** (per PROJECT_PLAN §8); branch protection will require green CI after v1.0.

**CI workflows** (`.github/workflows/`):
- `ci.yml` — identity guard, Python lint+test, TS lint+typecheck, markdown lint, gitleaks, dep audit, Docker build smoke, no-telemetry placeholder
- `nightly.yml` — daily deep dep audits, AGPL license compatibility check, CycloneDX SBOM
- `release.yml` — tag-triggered multi-arch image publish to GHCR with provenance + SBOM; GitHub Release with notes from CHANGELOG

**Contributor templates** (`.github/`):
- `ISSUE_TEMPLATE/{config,bug_report,feature_request,tradition_feedback}.yml` — structured forms; security routed to private channels
- `pull_request_template.md` — type, phase, tests, docs/catalog updates, security, tradition-respectful review
- `CODEOWNERS` — @SAntonopoulou as default reviewer; governance docs explicit
- `dependabot.yml` — weekly Python + JS, monthly Actions + Docker

### Added — 2026-06-20 (Phase 00, Batch 4 — initial ten ADRs)

Phase 00 Batch 4 lands the ten initial Architecture Decision Records in `docs/adr/`. Each ADR captures a decision made during planning that contributors should understand without conversational context.

- [ADR-0001](docs/adr/0001-record-architecture-decisions.md) — Record architecture decisions (the meta-ADR)
- [ADR-0002](docs/adr/0002-license-agpl-3-0.md) — License is AGPL-3.0-only (with maintainer's copyleft commitment)
- [ADR-0003](docs/adr/0003-backend-python-fastapi-sqlmodel-alembic.md) — Backend stack: Python 3.12 + FastAPI + SQLModel + Alembic
- [ADR-0004](docs/adr/0004-frontend-astro-react.md) — Frontend split: Astro for public site + React 19 admin SPA
- [ADR-0005](docs/adr/0005-postgresql-only.md) — PostgreSQL is the only supported database
- [ADR-0006](docs/adr/0006-swiss-ephemeris-over-skyfield.md) — Swiss Ephemeris over Skyfield (reproducibility with established astrology tools)
- [ADR-0007](docs/adr/0007-tiptap-editor.md) — Tiptap as the rich-text editor foundation
- [ADR-0008](docs/adr/0008-caddy-reverse-proxy.md) — Caddy as the reference reverse proxy
- [ADR-0009](docs/adr/0009-monorepo.md) — Single monorepo organization
- [ADR-0010](docs/adr/0010-conventional-commits.md) — Conventional Commits + Semantic Versioning

ADRs are MADR-format, never edited after acceptance — to change a decision, write a superseding ADR.

### Added — 2026-06-20 (Phase 00, Batch 5 — Astro Starlight docs site scaffold)

Phase 00 Batch 5 lands a working Astro Starlight documentation site at `docs/site/`. The site builds, has the right sidebar shape (Start, User Guide, Admin Guide, Developer Guide, Concepts), and contains placeholder content that grows as phases land. Eventually deploys to `docs.theourgia.com`.

**Site scaffolding:**
- `docs/site/package.json` — `@theourgia/docs` workspace package; Astro 4.16 + Starlight 0.30
- `docs/site/astro.config.mjs` — Starlight integration with GitHub social link, edit-link to repo, last-updated timestamps, multi-locale-ready (English at launch), zero third-party scripts in head (point of pride)
- `docs/site/tsconfig.json` — extends `astro/tsconfigs/strict`
- `docs/site/src/content.config.ts` — content collections via Starlight's loader/schema

**Initial content (placeholders growing as phases land):**
- `src/content/docs/index.mdx` — splash homepage with hero, tagline, CTAs, four-card overview, status banner
- `src/content/docs/start/status.md` — current status + 17-phase roadmap table
- `src/content/docs/start/privacy.md` — explicit zero-telemetry commitment with detail, GDPR commitments, encryption modes
- `src/content/docs/concepts/architecture.md` — short overview pointing at canonical ARCHITECTURE.md
- `src/content/docs/concepts/features.md` — 19-category feature overview pointing at canonical FEATURES.md
- `src/content/docs/user/index.md`, `admin/index.md`, `developer/index.md` — placeholder index pages

**Workspace wiring:**
- `pnpm-workspace.yaml` updated — `docs/site` (was `docs`)
- `package.json` scripts — `docs:dev` / `docs:build` filter `@theourgia/docs`
- `justfile` — `docs-dev` / `docs-build` recipes use the filter
- `docs/README.md` updated to mention the Starlight site location

## Phase 00 complete (2026-06-20)

All five batches of Phase 00 (Foundations) are landed:

- **Batch 1:** Project skeleton + tooling configs ([commit 2c177a2](https://github.com/SAntonopoulou/theourgia/commit/2c177a2))
- **Batch 2:** Containers + dev environment ([commit 70586ed](https://github.com/SAntonopoulou/theourgia/commit/70586ed))
- **Batch 3:** CI workflows + GitHub templates ([commit cad065e](https://github.com/SAntonopoulou/theourgia/commit/cad065e))
- **Batch 4:** Initial ten ADRs + changelog catch-up ([commit 10b51f0](https://github.com/SAntonopoulou/theourgia/commit/10b51f0))
- **Batch 5:** Astro Starlight docs site scaffold ([commit 2d3f504](https://github.com/SAntonopoulou/theourgia/commit/2d3f504))

Phase 00 status: **done.** Phase 01 (Core Architecture) is next — database schema, authentication framework, encryption layer, plugin substrate, federation primitives, API contract.

### Status

Project remains in **planning phase** with **Phase 00 complete**. No runnable application code yet — the next phase produces the data layer and security foundation everything else builds on.

### Added — 2026-06-20 (Phase 01, Batch 1 — data layer foundations)

Phase 01 (Core Architecture) opens. First batch establishes the data layer foundations: settings, async DB engine, base model mixins, identity tables, audit log, the first Alembic migration with PostgreSQL extensions and RLS policy scaffolding, plus a stack of smoke + property tests.

**Core infrastructure:**
- `backend/theourgia/core/config.py` — `Settings` via `pydantic-settings`; secrets required in non-test environments enforced by `require_secrets_or_raise`; `get_settings` cached for process lifetime
- `backend/theourgia/core/ids.py` — UUIDv7 generator per RFC 9562 (time-ordered primary keys until stdlib ships v7)
- `backend/theourgia/core/timeutil.py` — timezone-aware helpers (`utcnow`, `utc_from_iso`, `to_iso`) that refuse naive datetimes
- `backend/theourgia/core/db.py` — async engine + sessionmaker via SQLAlchemy 2.x + asyncpg; FastAPI `get_session` dependency + standalone `session_scope` context manager

**Models:**
- `backend/theourgia/models/base.py` — `IDMixin` (UUIDv7), `TimestampMixin` (tz-aware created_at/updated_at), `SoftDeleteMixin`
- `backend/theourgia/models/identity.py` — `User`, `Session`, `Vault`, `Hub`, `Membership` (with `MembershipRole` enum: 3 vault roles + 5 hub roles), `PrivateViewer`
- `backend/theourgia/models/audit.py` — `AuditEvent` (append-only by app convention) with `AuditEventKind` and `AuditOutcome` enums

**Migration infrastructure:**
- `backend/alembic.ini` — Alembic config; reads URL from `theourgia.core.config`; post-write hook runs Ruff format on generated migrations
- `backend/alembic/env.py` — async-aware Alembic env; uses migration-role URL if set, falls back to app-role URL
- `backend/alembic/script.py.mako` — migration file template

**First migration** (`0001_initial_extensions_and_identity.py`):
- Enables PostgreSQL extensions: pgcrypto, citext, pg_trgm, unaccent, vector
- Creates enums (`membership_role`, `audit_event_kind`, `audit_outcome`)
- Creates identity tables (`user`, `session`, `vault`, `hub`, `membership`, `private_viewer`)
- Creates `audit_event` with an immutability trigger that raises on UPDATE/DELETE (DB-level enforcement of append-only convention)
- Enables Row-Level Security on all identity tables
- Defines RLS policies: user self-access, vault owner-write + member-read, hub member-read, membership self-read, private viewer owner+self-read, audit_event scoped read (own actor, own vault as owner, own hub as admin/officer)
- Foundation for content-table RLS policies that land in subsequent migrations

**Tests:**
- `test_uuid7.py` — version + variant bits, uniqueness, time-ordering, Hypothesis property test
- `test_timeutil.py` — UTC enforcement, ISO round-trip, naive-datetime rejection
- `test_config.py` — Settings defaults, cache behavior, secret-enforcement contract
- `test_models_identity.py` — round-trip instantiation of all identity + audit models, enum coverage, tz-awareness checks
- `conftest.py` — autouse fixture forcing `THEOURGIA_ENV=test` for the session

**README roadmap** updated: Phase 01 now `[~]` in-progress.

### Added — 2026-06-20 (Phase 01, Batch 2 — encryption layer)

Phase 01 Batch 2 lands the cryptographic foundation: both encryption modes, key management, KDF parameters, and a comprehensive test suite. **This is the most security-critical batch in the project.** Crypto review is part of Phase 01's Definition of Done; this code is written with that future review in mind.

**Two encryption modes:**
- **Mode A** — server-side AES-256-GCM. Per-vault data keys (DEKs) wrapped by a server master key derived from `THEOURGIA_MASTER_ENCRYPTION_KEY`. Server can decrypt; supports server-side search.
- **Mode B** — zero-knowledge XChaCha20-Poly1305 (libsodium). Key derived in the browser from a passphrase the server never sees. Production encrypt/decrypt happens client-side; the Python implementation is reference + test oracle + admin diagnostics.

**Crypto package** (`backend/theourgia/core/crypto/`):
- `types.py` — `EncryptionMode` enum, `EncryptionError` / `DecryptionError` / `InvalidEnvelopeError`
- `envelope.py` — versioned self-describing binary envelope: `[ver][mode][key_id 16B][nonce_len][nonce N][ciphertext+tag]`. Version byte allows future algorithm migration.
- `keys.py` — `MasterKey` (derived from secret via SHA-256, repr-safe), `DataKey`, `generate_data_key`, `wrap_data_key`, `unwrap_data_key`. Wrap uses deterministic nonce derived from key_id (single key per id, makes wrapping stable).
- `mode_a.py` — `encrypt`/`decrypt` API for server-side AES-GCM with optional AAD binding.
- `mode_b.py` — Python reference for libsodium XChaCha20-Poly1305 (frontend matches this contract).
- `kdf.py` — Argon2id (RFC 9106 hybrid) parameter generation and key derivation. INTERACTIVE-grade defaults (time_cost=3, memory_cost=64 MiB, parallelism=4). Strict validation.

**Models** (`backend/theourgia/models/crypto.py`):
- `VaultKey` — per-vault data key in wrapped form; `active` flag with partial unique index ensuring at most one active key per vault; rotation never deletes (old keys retained for old blobs).
- `SealedKdfParams` — Argon2id params per (user, scope); recovery fingerprint column for opt-in recovery flow.

**Migration** (`0002_encryption_tables.py`):
- Creates `vault_key` with partial unique index `uq_vault_key_one_active` (`UNIQUE ... WHERE active = true`)
- Creates `sealed_kdf_params` with unique `(user_id, scope)`
- Enables RLS on both tables with scope-appropriate policies (vault_key owner-write + member-read; sealed_kdf_params owner-only)

**Tests** (5 files, ~30 test functions including Hypothesis property tests):
- `test_crypto_envelope.py` — round-trip, version/mode rejection, length validation, property test across modes + sizes
- `test_crypto_keys.py` — master key from secret, repr leak-prevention, wrap/unwrap round-trip, tampering detection
- `test_crypto_mode_a.py` — round-trip, fresh nonce per encryption, wrong-key/tampered/AAD-mismatch rejection, empty + large plaintexts, property test
- `test_crypto_mode_b.py` — same shape as Mode A
- `test_crypto_kdf.py` — determinism, salt variance, parameter validation, key-length variants

**Security properties verified by tests:**
- Master / data keys never appear in `repr` or `str` output
- AEAD failures produce indistinguishable `DecryptionError` (key, tamper, AAD mismatch all surface the same way at the boundary)
- Nonce reuse impossible (random per encryption, distinct outputs verified)
- AAD binding prevents cross-row ciphertext swap
- Wrong envelope version is rejected
- Truncated / oversized inputs are rejected

### Added — 2026-06-20 (Phase 01, Batch 3 — authentication)

Phase 01 Batch 3 lands the authentication primitives: password hashing, TOTP 2FA + backup codes, opaque session/reset tokens, account lockout with exponential backoff.

**Auth package** (`backend/theourgia/core/auth/`):
- `passwords.py` — Argon2id password hashing (PHC format); INTERACTIVE-grade parameters; `verify_password` constant-time; `needs_rehash` for parameter upgrades on next login
- `tokens.py` — opaque random tokens (256 bits entropy via `secrets.token_urlsafe(32)`); stored as SHA-256 hex; `tokens_match` constant-time
- `totp.py` — RFC 6238 / RFC 4226 implementation using only stdlib (`hmac`, `hashlib`, `struct`); 160-bit base32 secrets; `otpauth://` provisioning URI for QR display; ±1 step skew tolerance on verify; **RFC 4226 §D test vector verified**
- TOTP backup codes — 10 codes per set, `XXXX-XXXX` format, hash-stored (SHA-256 of normalized form), constant-time match across all stored hashes
- `lockout.py` — exponential backoff ladder: 5 failures → 60s, 10 → 5min, 15 → 30min, 20 → 1h, beyond → up to 24h cap

**Models** (`backend/theourgia/models/auth.py`):
- `BackupCode` — one row per code; `code_hash` unique; `used_at` timestamp for one-time-use enforcement
- `PasswordResetToken` — single-use, short-lived; `token_hash` unique; explicit `expires_at`; `requested_from_ip` for audit

**Migration** (`0003_auth_tables.py`):
- Creates `backup_code` and `password_reset_token` tables
- Enables RLS with self-only policies on both (a user sees only their own codes/tokens)

**Tests** (4 files, ~50 test functions):
- `test_auth_passwords.py` — PHC format, round-trip, empty/malformed rejection, fresh salt per hash, rehash detection, property test
- `test_auth_totp.py` — secret length, code format, time-step verification, skew tolerance, provisioning URI fields, RFC 4226 test vector, backup code generation + normalization + constant-time verification
- `test_auth_tokens.py` — entropy, hash determinism, constant-time match
- `test_auth_lockout.py` — ladder monotonicity, threshold transitions, cap behavior, `is_locked` boundary conditions

**Security properties verified by tests:**
- Empty / malformed inputs never pass verification
- Each password hash uses a fresh salt
- Backup code verification is constant-time across all stored hashes (no early-exit timing leak)
- RFC 4226 known-answer test vector passes
- Lockout escalates monotonically and is bounded by `MAX_LOCKOUT`

Note: WebAuthn / passkey support is deferred to Batch 10 per the Phase 01 plan; TOTP is the 2FA path landed here.

### Added — 2026-06-20 (Phase 01, Batch 4 — authorization)

Phase 01 Batch 4 lands the application-layer authorization primitives: visibility model, scope vocabulary, pure permission checks, RLS GUC setter, and the audit log writer.

**Authz package** (`backend/theourgia/core/authz/`):
- `visibility.py` — `Visibility` enum (SEALED=5, PERSONAL=1, VIEWER=2, NETWORK=3, PUBLIC=4) with `is_private` / `is_publishable_outbound` / `is_sealed` predicates; `AT_LEAST_INTERNAL` and `PUBLISHABLE` convenience sets
- `scopes.py` — `Scope` string-enum with ~40 dotted scope names across 12 domains (entry, entity, vault, hub, session, user, key, sealed, plugin, federation, backup, audit, agent)
- `checks.py` — pure permission functions: `can_read_with_visibility` (full decision table across all 5 visibilities + ownership + private viewer + hub membership) and `can_write_with_visibility` (owner or vault collaborator only)
- `rls.py` — `set_current_user_id(session, user_id)` and `clear_current_user_id(session)` — set the `theourgia.current_user_id` GUC via `SET LOCAL` so RLS policies see the current viewer. Bound parameter (not string interpolation). Rejects non-UUID input defensively.
- `audit.py` — `build_audit_event` pure factory + `AuditLogger` session-wrapping persister. Validates field lengths (action ≤128 chars, ip_address ≤45 chars), clamps overlong user-agent strings rather than rejecting, deep-copies the detail dict so caller mutations don't affect the persisted row.

**Test infrastructure additions:**
- Recording-session doubles in `test_authz_rls.py` and `test_authz_audit.py` so the RLS setter and audit logger can be tested without a live database. Full integration with PostgreSQL + RLS policies lands when the postgres-test-fixture infrastructure is set up in a subsequent batch.
- `anyio` added to dev deps for async test execution

**Tests** (5 files, ~50 test functions):
- `test_authz_visibility.py` — enum value stability (persisted integers must never change), private/publishable/sealed predicates, convenience set membership
- `test_authz_checks.py` — exhaustive decision table for `can_read_with_visibility` (public ↔ everyone, personal ↔ owner only, sealed ↔ owner only, viewer ↔ private viewer credential, network ↔ hub membership intersection, network ↔ private viewer override, anonymous ↔ public only); write checks (owner or collaborator)
- `test_authz_scopes.py` — dotted-lowercase format, domain namespacing, uniqueness, critical scopes present
- `test_authz_rls.py` — GUC name format, SET LOCAL emitted with bound parameter, non-UUID rejection
- `test_authz_audit.py` — minimal + full event construction, detail dict copy semantics, all `AuditEventKind` values supported, all `AuditOutcome` values supported, action/ip_address length validation, user-agent clamping, AuditLogger persistence via session double

**Authorization architecture (now explicit):**
1. Application checks via `can_read_with_visibility` / `can_write_with_visibility` at the API boundary (Phase 01 Batch 5 will wire these into FastAPI dependencies)
2. Database checks via Row-Level Security policies (declared in earlier migrations, activated per-request via `set_current_user_id`)
3. Audit log via `AuditLogger` for security-relevant events (sealed reads, visibility downgrades, federation operations, plugin lifecycle)
4. Defense in depth: a bug in any single layer does not produce a security failure on its own.

### Added — 2026-06-20 (Phase 01, Batch 5 — FastAPI app + API contract)

**The platform exists as a runnable HTTP server.** Phase 01 Batch 5 lands the FastAPI application factory, lifespan, error handling, middleware, dependency injection, and the first endpoints (health, readiness, metadata).

**API package** (`backend/theourgia/api/`):
- `app.py` — `create_app()` factory and module-level `app` singleton. Customizes OpenAPI with bearer security scheme, license, contact, servers; exposes Swagger UI at `/api/docs` and OpenAPI JSON at `/api/openapi.json`. Production hides Swagger by default (machine clients still get the JSON).
- `lifespan.py` — startup validates required secrets (refuses to start without them in non-test envs); shutdown disposes the SQLAlchemy engine cleanly.
- `errors.py` — RFC 7807 `application/problem+json` translator. Defines `APIError` base + `UnauthorizedError` / `ForbiddenError` / `NotFoundError` / `ConflictError` / `ValidationFailedError` / `RateLimitedError` / `ServiceUnavailableError`. Catch-all handler logs full traceback but emits a generic Problem to clients (never leaks internals). Translates FastAPI `RequestValidationError` into a Problem with field-level summaries.
- `schemas.py` — `Problem` (RFC 7807 with `request_id` extension) and `Meta` (instance metadata response).
- `middleware.py` — `RequestIDMiddleware` (generates UUIDv7 if absent; accepts inbound if sane; echoes in `X-Request-ID`); CORS configured per-env (dev allows localhost frontend origins, production locked to `BASE_URL`).
- `deps.py` — dependency injection:
  - `get_db_session` (request-scoped async session)
  - `get_current_user` (extracts bearer, hashes via `hash_token`, looks up session row, checks revoked/expired, fetches user, **sets the RLS GUC on the session**)
  - `get_optional_current_user` (returns `None` on no/bad auth instead of raising)
  - `require_scope(scope)` factory (current impl: any authenticated user; tightens as resource routers land)
  - Convenience `Annotated` aliases: `DBSession`, `CurrentUser`, `OptionalCurrentUser`
- `routers/health.py` — `/healthz` (liveness, no deps) and `/readyz` (readiness, checks DB connectivity); both emit `Problem` on failure.
- `routers/v1/meta.py` — `/api/v1/meta` returning instance_id, version, api_version, environment, `telemetry: none`, license, source URL.
- Updated `__main__.py` to actually run uvicorn (replaces the planning-phase placeholder).

**Tests** (3 files, ~25 test functions using `httpx.ASGITransport`):
- `test_api_app.py` — app constructs; healthz returns ok; request-ID propagation (inbound passes, malformed dropped, absent generates UUIDv7); meta endpoint shape; OpenAPI schema with bearer security scheme; docs UI in non-prod; 404 returns Problem; CORS preflight allowed in dev.
- `test_api_errors.py` — every APIError subclass maps to the right HTTP status with `application/problem+json` content-type; Retry-After header preserved; **unhandled exceptions return generic 500 Problem without leaking internals**; FastAPI validation errors render as Problem with field summaries.
- `test_api_deps.py` — auth dependency: rejects missing/bad/revoked/expired tokens; accepts valid; **sets RLS GUC on success**; optional variant returns None instead of raising; scope dependency requires authentication.

**You can now:**
- Build and inspect the OpenAPI schema (`curl /api/openapi.json`)
- Probe liveness / readiness (`curl /healthz`, `/readyz`)
- Discover the instance via `/api/v1/meta`
- Raise project-defined error types and have them render as RFC 7807 Problems
- Authenticate any future endpoint via bearer-token dependencies with automatic RLS GUC setting

**Deferred to Batch 5b:** rate limiting (Redis-backed counter + sliding window) and idempotency-key middleware. These need Redis fixtures we don't have yet; the foundation here makes them drop-in additions.

**Phase 01 progress:** 5 of 10 batches done — *the halfway mark*. The runnable backend application now exists; subsequent batches add features (plugins, federation, backups, observability).

### Added — 2026-06-20 (Phase 01, Batch 6 — plugin substrate)

Phase 01 Batch 6 lands the plugin extension framework: manifest schema + parser, capability vocabulary, extension point taxonomy, in-process extension registry, plugin lifecycle state machine, sandboxed plugin context, and the discovery + activation loader.

**Plugin package** (`backend/theourgia/core/plugins/`):
- `manifest.py` — Strict Pydantic schema for `plugin.toml`. Validates name format (lowercase-hyphen, 2–64 chars), SemVer 2.0 version, entrypoint shape (`module:callable`), license string, theourgia-version range. Cross-field validators: `db.migrations` capability requires `entrypoint.migrations` path; duplicate caps / extension points rejected; `extra='forbid'` so typos fail loudly. Accepts both flat array and nested sub-section TOML styles for capabilities / extension_points / allowed_hosts.
- `capabilities.py` — `Capability` enum with 23 dotted-domain values (read, write, ui, db, network, fs, notif, federation, agent). `from_string` for round-trip parsing; `domain` property for grouping.
- `extension_points.py` — `ExtensionPoint` enum with 22 named hooks across time/cosmology, divination, linguistic, reference, workshop, UI, integrations, federation domains. Stable slug values; new points require ADR.
- `state.py` — `PluginState` enum + `allowed_transition` lookup. INSTALLED → ACTIVE/ERROR/UNINSTALLING; ACTIVE → INACTIVE/ERROR/UNINSTALLING; INACTIVE → ACTIVE/ERROR/UNINSTALLING; ERROR → recovery paths; UNINSTALLING is terminal.
- `registry.py` — Thread-safe `ExtensionRegistry` keyed by (plugin, point, name); singleton via `get_registry()`; tests use `reset_registry()` for isolation. Methods: `register`, `unregister_plugin`, `implementations_for`, `all_registrations`, `plugin_count`, `clear`.
- `context.py` — `PluginContext` capability-scoped sandbox passed to plugin setup. Exposes identity, granted capabilities (frozenset), namespaced logger (`theourgia.plugin.<name>`), settings, `register_extension`, `require_capability` / `has_capability`. Custom `CapabilityDeniedError`. `repr` never leaks settings.
- `loader.py` — `PluginLoader.activate(manifest, granted_capabilities)` imports the module, calls setup with a context, records teardown function if returned. Effective capabilities = granted ∩ manifest-requested (host cannot widen). Partial registrations rolled back if setup raises. `deactivate` calls teardown (logs but does not propagate teardown exceptions — gone means gone), unregisters extensions. `discover_manifests(root)` recursively finds `plugin.toml` files, sorted for determinism.

**Models** (`backend/theourgia/models/plugins.py`):
- `PluginInstall` — installed plugin per-vault; lifecycle state; manifest_json snapshot; signature + public_key for future Phase 14 verification
- `PluginCapabilityGrant` — explicit capability grants per plugin install; `granted_by_user_id` for audit
- `PluginSetting` — JSONB key/value per plugin install

**Migration** (`0004_plugin_tables.py`):
- Creates `plugin_state` and `plugin_capability` Postgres enums (must stay in sync with Python enums)
- Creates three tables with appropriate FKs, indexes, unique constraints
- RLS enabled on all three with policies routing through vault ownership

**Tests** (6 files, ~50 test functions):
- `test_plugin_manifest.py` — parse minimal + full; sub-section style accepted; bad capability/extension-point/SemVer/name rejected; duplicate detection; `db.migrations` requires migrations path; backend entrypoint format validation; load from file/directory; missing-file FileNotFoundError; extra field rejected
- `test_plugin_capabilities.py` — dotted-lowercase format, round-trip parsing, unknown rejection, domain property, uniqueness, critical caps present
- `test_plugin_state.py` — self-transitions forbidden, allowed transitions parameterized, UNINSTALLING terminal, INSTALLED→INACTIVE skip-forbidden, ACTIVE→INSTALLED reverse-forbidden
- `test_plugin_registry.py` — register + retrieve, duplicate (plugin,point,name) raises, same-name-different-plugins allowed, same-name-different-points allowed, unregister_plugin removes all, unknown unregister returns 0, all_registrations across points, clear empties, singleton + reset_registry
- `test_plugin_context.py` — identity, frozen capabilities (cannot mutate), `has_capability` / `require_capability`, logger namespace, settings retrieval, `register_extension` writes through, repr never leaks settings, error message contents
- `test_plugin_loader.py` — discover empty/nested/missing, activate imports + registers, granted capabilities clipped to manifest-requested, activate-twice rejected, missing module/callable raise, partial-registration rollback on setup exception, deactivate calls teardown + unregisters, deactivate-unknown raises, teardown exceptions logged but don't block removal

**Architectural posture:**
- Plugin contracts (manifest schema, extension point taxonomy, capability vocabulary) are stable now even though enforcement (process isolation, signed-release verification) finalizes in Phase 14
- Plugin authors can write against this API today; what hardens between now and Phase 14 is the runtime, not the surface
- Defense in depth applies here too: capabilities clipped at context construction, checked at use, RLS on persisted plugin tables, planned process isolation for high-risk caps

**Phase 01 progress:** 6 of 10 batches done.

### Added — 2026-06-20 (Phase 01, Batch 7 — federation primitives)

Phase 01 Batch 7 lands the cryptographic substrate for the Theourgia native federation protocol: per-instance Ed25519 keypair, HTTP message signatures (focused RFC 9421 subset), capability tokens (EdDSA-signed JWTs), DID identity helpers, and the ``.well-known/theourgia/actor`` publication endpoint. The full federation operations (Push, Pull, Mirror, Invite, RitualSchedule, …) land in Phase 12; this batch lands the primitives Phase 12 will compose.

**Federation package** (`backend/theourgia/core/federation/`):
- `identity.py` — DID syntax (``did:theourgia:host`` for instances, ``did:theourgia:host:vault:slug`` and ``did:theourgia:host:hub:slug`` for actors). ``make_instance_id``, ``make_actor_id``, ``parse_actor_id``, ``ActorKind`` enum. Strict regex validation of host + slug; lowercases hosts; rejects ``ActorKind.INSTANCE`` from ``make_actor_id`` (use the dedicated builder).
- `keys.py` — Ed25519 keypair management. ``generate_keypair``, ``load_or_create_keypair`` (idempotent; generates on first call, reuses thereafter; writes private key as PKCS8 PEM with mode 0600 via ``os.open(O_EXCL)``; recreates public-key file if absent). ``serialize_public_key`` / ``deserialize_public_key`` produce URL-safe base64 (no padding) of the 32-byte raw key — what we expose in ``.well-known/theourgia/actor``. ``InstanceKeypair`` repr never leaks key bytes. Permissive permissions on the private key file produce a logged warning. Loading a non-Ed25519 key raises.
- `http_signatures.py` — RFC 9421 focused subset. Covered components: ``@method``, ``@path``, ``host``, ``date``, ``content-digest``. Algorithm: Ed25519 only. Single signature label ``sig``. ``sign_request`` / ``verify_request`` / ``build_signature_base`` / ``content_digest_header``. Replay protection via ``SIGNATURE_MAX_AGE_SECONDS=300`` and ``SIGNATURE_MAX_FUTURE_SKEW_SECONDS=60``. Verifier rejects: missing signature headers, malformed signature input, unsupported algorithm, too-old or too-future signatures, keyid mismatch (when expected), tampered method / path / host / body (via Content-Digest), wrong public key.
- `capability_tokens.py` — EdDSA-signed JWTs. ``issue_capability_token`` / ``verify_capability_token`` / ``CapabilityToken`` dataclass. Claims: ``iss`` / ``sub`` / ``aud`` / ``cap`` / ``iat`` / ``nbf`` / ``exp`` / ``jti``. Issuance validates: all three actor fields parse as DIDs, capabilities list non-empty, TTL positive and ≤ 30 days. Verification validates: signature, expiry, not-before, audience (if expected), issuer (if expected), all claims present, all DIDs parseable, required capability (if specified). Default TTL = 1 hour. Replay-cache bookkeeping (``jti``) is the caller's responsibility — lands with federation operations in Phase 12.

**API endpoint:**
- `api/routers/well_known.py` — ``GET /.well-known/theourgia/actor`` returns ``{did, public_key, public_key_algorithm, api_base, software, software_version, protocol_versions}``. Unauthenticated (federation peers need to read this to verify signatures). Lazy-loads the instance keypair on first access; ``ServiceUnavailableError`` if key file unreadable.
- ``register_routers`` wires the well-known router under the ``federation`` tag.

**Tests** (4 files, ~50 test functions):
- `test_federation_identity.py` — instance/vault/hub DID construction and parsing, lowercase normalization, port allowance, rejection of bad hosts and slugs, round-trip
- `test_federation_keys.py` — keypair generation determinism, randomness, repr no-leak, serialize / deserialize round-trip, ``load_or_create`` idempotence, restrictive private-key permissions (no group/other), public-key recreation when missing, rejection of non-Ed25519 keys
- `test_federation_http_signatures.py` — sign / verify round-trip, tampered method / path / host / body detection, wrong public key, unsupported algorithm, too-old / too-future signatures, keyid mismatch, missing / malformed signature headers, signature base composition, body integrity via Content-Digest
- `test_federation_capability_tokens.py` — issue/verify round-trip, fresh ``jti`` per issue, wrong key fails, expired fails, audience / issuer mismatch fails, required-capability check, empty-capabilities / non-positive / absurd-TTL rejection, invalid-DID issuer rejection, empty-token rejection, iat / nbf / exp relationship

**Security properties verified by tests:**
- Key material never appears in ``repr`` / ``str``
- Replay window enforced (signatures > 5 min old refused)
- Future-skew bounded (signatures > 60 s ahead refused)
- AAD-equivalent guarantee for HTTP: tampering with any covered component (including body via Content-Digest) breaks the signature
- Algorithm pinning at verifier (no RSA / HMAC / "none" downgrade attacks)
- Capability tokens enforce structural validity of all DID claims before trusting them
- 30-day TTL ceiling on capability tokens (defense against indefinite-lifetime tokens leaking)

**Phase 01 progress:** 7 of 10 batches done. Remaining: backup tooling, observability, WebAuthn + scale tests + zero-telemetry verifier.
