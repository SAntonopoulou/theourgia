# ADR-0009: Single monorepo organization

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #repository, #organization, #workflow

## Context and problem statement

Theourgia consists of multiple coupled components: backend (Python), public-site frontend (Astro), admin frontend (React), shared design system, documentation site (Astro Starlight), reference plugins (multiple), and operational tooling (Docker, scripts, justfile). We must decide whether these live in one repository or several.

The decision affects: contributor onboarding, CI/CD complexity, release coordination, package-level versioning, code sharing across components, and the discoverability story.

## Decision drivers

- Self-hosters need to deploy the whole stack together — fragmented repos make this awkward
- Frontend and backend often change together (API contract changes ripple through both); atomic commits across boundaries matter
- Shared types (API client types) should be generated from a single source of truth
- Contributors should find the project in one URL, not navigate a federation
- Branch protection, CI configuration, governance docs should not be duplicated
- Plugin authors live elsewhere; reference plugins live with the core for trustability

## Considered options

1. **Single monorepo** — everything in `github.com/SAntonopoulou/theourgia`
2. **Multi-repo** — separate repos for backend, frontend, docs, each plugin
3. **Monorepo for core + separate plugin repos** — middle ground

## Decision

**Single monorepo.** Backend, frontend (public + admin + shared), docs, reference plugins, and operational tooling all live in `github.com/SAntonopoulou/theourgia`.

Third-party plugins live in contributors' own repositories and are registered with the registry (Phase 14) — they're not in this monorepo by design.

## Rationale

For a project of this scope and a small initial maintainer team, the monorepo win is mostly:

- **Atomic cross-cutting changes.** A change to the API contract that requires updating the OpenAPI schema, the generated client types, the React admin's call sites, and the Astro site's API calls all in one commit. Splitting these across repos makes this multi-PR coordination work, which is exactly the kind of friction that erodes contributor energy.
- **One place to find everything.** New contributors clone one repo, run one bootstrap (`just install` → `just check`), and have a working dev environment.
- **Shared governance.** One LICENSE, one CODE_OF_CONDUCT, one CONTRIBUTING, one CI configuration, one branch-protection rule set.
- **Shared tooling.** One Ruff config, one Biome config, one TypeScript baseline, one pre-commit config.
- **CHANGELOG coherence.** One CHANGELOG that captures the project's history; not three changelogs that drift.
- **Release coordination.** When backend and frontend release together, they share a tag.

The downsides of monorepos (CI runtime, repo size, build matrix complexity) are real but manageable at our scale. We use:
- **pnpm workspaces** for JS dependency hoisting and shared lockfile
- **uv workspaces** for Python (backend is the only Python workspace member for now)
- **Path-filtered CI jobs** (don't run Python lint on a PR that only changes frontend) — to be added once CI runtimes become noticeable
- **Build caching** in CI (GitHub Actions cache)

Multi-repo (option 2) suits projects where components have genuinely independent release cycles, different maintainer teams, or different lifecycles (e.g., a long-lived "core" with an experimental "frontier" repo). None of these apply here.

Monorepo + separate plugin repos (option 3) is what we do — reference plugins live in the monorepo for first-party trustability, third-party plugins live elsewhere.

## Consequences

### Positive
- One clone, one bootstrap, one CI
- Atomic cross-component changes are trivial
- Shared tooling, governance, license
- Lower discovery friction for newcomers

### Negative / trade-offs
- Repo size grows; eventually we may need to split if frontend assets balloon
- CI runtime grows with the codebase; mitigated by path-filtered jobs and caching
- Some IDE workflows (e.g., opening just one component) require workspace configuration

### Neutral
- Versioning: we use **single repository version** (one tag for the whole project at release time). Per-package independent versions are explicitly *not* used.
- Plugin marketplace will host plugins from contributors' own repositories; only reference plugins live here.

## Implementation notes

Repository layout (top-level directories):

```
theourgia/
├── backend/        FastAPI app, plugin host, agent daemon (Python)
├── frontend/       pnpm workspaces — shared, public-site, admin
├── docs/           User/admin/developer docs + ADRs + (eventually) Starlight site
├── plugins/        Reference plugins (first-party only)
├── plan/           Per-phase implementation plans
├── scripts/        Operational scripts (identity guard, backup helpers, …)
└── .github/        CI/CD workflows, issue/PR templates, CODEOWNERS, dependabot
```

Workspace coordination:
- `pyproject.toml` (root) declares the uv workspace; `backend` is currently the only member
- `package.json` + `pnpm-workspace.yaml` declare frontend workspaces (`frontend/shared`, `frontend/public-site`, `frontend/admin`, `docs`)
- `tsconfig.json` (root) is the shared strict baseline; per-workspace tsconfigs extend it

CI / release:
- One tag (`v0.1.0`, etc.) covers the whole project
- Docker images per component (`theourgia-backend`, `theourgia-frontend`) but same release tag

## References

- [pnpm workspaces](https://pnpm.io/workspaces)
- [uv workspaces](https://docs.astral.sh/uv/concepts/workspaces/)
- [PROJECT_PLAN.md §8 item 7 — repo organization](../../PROJECT_PLAN.md)
- [ARCHITECTURE.md §3 Repository Layout](../../ARCHITECTURE.md)
