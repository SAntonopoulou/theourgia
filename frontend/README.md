# Theourgia — Frontend

The Theourgia frontend, organized as a pnpm workspace with three packages:

- **`public-site/`** — Astro 4+ application for public-facing surfaces (landing page, per-vault blogs, book sales pages, RSS, docs).
- **`admin/`** — React 19 SPA for the vault dashboard and editor (Tiptap, drag-and-drop template builder, divination workbench, all admin surfaces).
- **`shared/`** — design system, shared UI components, i18n strings, and TypeScript types (auto-generated from the FastAPI OpenAPI schema).

## Status

**Planning phase.** Workspace skeleton in place; minimal package boundaries declared. Implementation begins with Phase 02 (Frontend Foundations) — see [../plan/02-frontend-foundations.md](../plan/02-frontend-foundations.md).

The visual design system is being authored externally and will land into `shared/` when ready.

## Development

From the **repository root**:

```bash
just install-frontend   # pnpm install -r
just lint-frontend      # Biome
just typecheck-frontend # tsc per workspace
just test-frontend      # vitest per workspace
just test-e2e           # Playwright
```

## Layout

```
frontend/
├── README.md (you are here)
├── public-site/    Astro public application — see plan/02
├── admin/          React SPA admin — see plan/02
└── shared/         Design tokens, UI components, i18n, types
```

## License

[AGPL-3.0-only](../LICENSE).
