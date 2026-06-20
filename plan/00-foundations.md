# Phase 00 — Foundations

> Establishing the substrate. Nothing user-facing ships in this phase. The deliverable is a repository, a development environment, and the discipline that the rest of the project rests on.

## Goal

Bring into existence a professional-grade open-source project skeleton that contributors can land in and be productive within an hour. Every subsequent phase relies on the conventions, tooling, and infrastructure established here.

## Dependencies

None. This is the foundation.

## Deliverables

### Repository
- GitHub repository created under chosen org/handle
- AGPL-3.0 `LICENSE`
- `README.md` (project pitch, quickstart, links to all docs) — must explicitly surface the **zero-telemetry policy** and the **AGPL-3.0 free-forever stance** as headline features, not fine print
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 with a project-specific addendum: explicitly affirms respect for divergent magickal practice (per Crowley, *we cannot become a centre of pestilence*). The CoC moderates behavior toward people, not the magickal traditions, methods, or opinions they hold. Within limits of human decency and applicable law, diverse practices coexist.
- `CONTRIBUTING.md` (how to land changes, code review norms, ADR process)
- `SECURITY.md` (vulnerability disclosure policy, contact, GPG key)
- `.gitignore`, `.gitattributes`, `.editorconfig`
- `CHANGELOG.md` (Keep a Changelog format)
- Issue templates and PR template
- `CODEOWNERS`

### Project layout
- Monorepo structure as documented in `ARCHITECTURE.md` §3
- Top-level configuration: `pyproject.toml` (backend), `package.json` workspaces (frontend), `docker-compose.yml`, `docker-compose.dev.yml`
- Empty placeholder directories with `.gitkeep` for `plan/`, `docs/`, `plugins/`, etc.

### Development environment
- Devcontainer (`.devcontainer/`) — VSCode-compatible, with Python, Node, Postgres, Redis preinstalled
- `docker-compose.dev.yml` — full stack runs with `docker compose up`
- Bootstrap script: `make dev` or `just dev` brings up the dev environment
- Pre-commit hooks (`.pre-commit-config.yaml`) — formatting, linting, secret scanning
- `.env.example` — every required environment variable documented

### Tooling
- **Python:** `pyproject.toml` with Ruff, mypy, pytest, pytest-cov, black-compatible Ruff config
- **TypeScript:** Biome config, TypeScript strict mode, Vitest, Playwright
- **Docker:** Multi-stage Dockerfiles for backend and frontend
- **Editor:** `.vscode/settings.json` and `.vscode/extensions.json` for recommended setup
- **Just / Make:** task runner (`justfile` recommended; recipes for `dev`, `test`, `lint`, `format`, `build`, `migrate`, `seed`)

### CI / CD (GitHub Actions)
- `ci.yml`: on every PR — lint, type check, test, build, security scan
- `nightly.yml`: nightly — extended test suite, dependency audit, license scan
- `release.yml`: tag-triggered — build images, publish to GHCR, generate changelog
- `docs.yml`: builds docs site, deploys preview on PRs
- All workflows pinned to commit SHAs, not tags (supply chain hygiene)

### Documentation infrastructure
- `docs/` set up with Astro Starlight
- `docs/adr/` — Architecture Decision Record directory; `0001-record-architecture-decisions.md` adopts MADR template
- `docs/user/`, `docs/admin/`, `docs/developer/` — initial skeletons
- Docs site deploys to `docs.theourgia.com` (subdomain Cloudflare-proxied)

### Quality gates
- All PRs require: passing CI, code review, no decrease in test coverage, no new security findings
- Conventional Commits enforced via commitlint
- Branch protection on `main`

### Architecture Decision Records (initial set)
- ADR-0001: Record architecture decisions
- ADR-0002: License is AGPL-3.0
- ADR-0003: Backend in Python + FastAPI + SQLModel + Alembic
- ADR-0004: Frontend public site in Astro; admin in React
- ADR-0005: PostgreSQL is the only supported database
- ADR-0006: Swiss Ephemeris over Skyfield for astrology
- ADR-0007: Tiptap as the editor foundation
- ADR-0008: Caddy as reference reverse proxy
- ADR-0009: Monorepo organization
- ADR-0010: Conventional Commits + semantic versioning

## Design notes

- Do not skip CI setup to "save time." It will be infinitely harder to add discipline retroactively.
- Devcontainer should `just work` — newcomers must be able to clone and run within 10 minutes on a clean machine.
- All scripts and config files have comments where their behavior isn't self-evident.
- License headers are not required on every file (per AGPL convention), but the LICENSE file is canonical.

## Risks

- **Risk:** Over-engineering tooling for a one-person team. **Mitigation:** Keep the tooling familiar (well-known tools, conservative configs). The project is open source and expects contributors from day one.
- **Risk:** Slow `docker compose up`. **Mitigation:** Use volume mounts for hot reload; multi-stage Docker builds with proper layer caching.

## Definition of Done

- [ ] Repository public, contains all listed files
- [ ] `git clone && just dev` produces a working local stack on a clean machine
- [ ] CI runs green on a representative PR
- [ ] Docs site deploys
- [ ] All ADRs filed
- [ ] At least one external contributor can read `CONTRIBUTING.md` and land a trivial PR end-to-end
- [ ] Security policy contact verified working
