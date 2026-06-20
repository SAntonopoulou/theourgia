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

### Status

Project is in **planning phase**. No runnable code yet. Implementation begins with Phase 00 (Foundations).
