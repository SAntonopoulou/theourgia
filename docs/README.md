# Theourgia — Documentation

This directory hosts:

- **`adr/`** — Architecture Decision Records (MADR format)
- **`user/`** — End-user documentation (how to use Theourgia as a magician)
- **`admin/`** — Self-hoster documentation (deploy, backup, operate)
- **`developer/`** — Developer documentation (contribute, build plugins, extend)

The docs site itself (Astro Starlight) lives in [`site/`](site/). It builds to a static site that deploys to `docs.theourgia.com`. Run `just docs-dev` from the repo root to serve it locally; `just docs-build` produces the production build.

## Status

**Planning phase.** ADRs will be authored as part of Phase 00. User / admin / developer docs grow alongside features per the discipline declared in [PROJECT_PLAN.md §7](../PROJECT_PLAN.md) — docs ship in the same PR as features.

## Documentation discipline

- User docs ship with features. No "we'll document it later."
- Developer docs ship with code. ADRs cover non-obvious decisions.
- README, FEATURES.md, CHANGELOG.md, and ADRs stay continuously synced with reality.
- The eventual site at `docs.theourgia.com` is built from this directory.
