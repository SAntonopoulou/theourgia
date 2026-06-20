# ADR-0004: Frontend stack — Astro public site + React 19 admin SPA

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #frontend, #framework, #ux

## Context and problem statement

Theourgia has two very different frontend surfaces:

1. **Public site** — landing page, per-vault blogs, book sales, RSS, documentation. Content-heavy, mostly static, SEO-relevant, must be fast on first paint and accessible.
2. **Admin** — the magician's working environment. Dashboard, Tiptap editor, drag-and-drop template builder, divination workbench, analytics dashboards. Heavily interactive, lots of state, real-time updates via WebSocket.

These have *different optimization targets*. The right stack for one is wrong for the other.

## Decision drivers

- Content-first defaults for the public surface (best Core Web Vitals, RSS, sitemap, OpenGraph done by default)
- Rich interactivity for the admin surface
- Single shared design system across both surfaces
- Multi-script typography (polytonic Greek, Hebrew with niqud, Arabic, Devanagari) — must work on day one
- i18n from day one (per resolved decisions)
- Open-source contributor accessibility — frameworks people already know
- Avoid vendor lock-in (no Next.js / Vercel dependency)

## Considered options

1. **Next.js for both surfaces** — one framework, React Server Components, mature
2. **Astro for both surfaces** — works for content; struggles for very interactive surfaces
3. **Astro for public + React SPA for admin** — split-stack
4. **SvelteKit for both** — lighter, easier to fork
5. **Remix for both** — strong data-loading story
6. **Static-site generator (Eleventy / Hugo) + React SPA** — simpler tools

## Decision

- **Public site:** Astro 4+ (content-first, islands of interactivity, vendor-neutral)
- **Admin SPA:** React 19 with Vite (TanStack Router + TanStack Query + Tiptap)
- **Shared design system** in `frontend/shared/`: design tokens, UI components, i18n, generated API types

## Rationale

**Why Astro for the public site:**
- Static-first by default; best-in-class Core Web Vitals out of the box
- Islands architecture means interactive widgets (gematria calculator on landing page, etc.) don't drag down the whole page
- Vendor-neutral (no Vercel lock-in; ships to any static host)
- Built-in support for content collections, RSS, sitemap, OpenGraph
- Astro components are HTML-first which suits content-heavy editorial design

**Why React 19 for admin:**
- The admin is a real application — drag-and-drop, real-time, rich state, complex forms. React's ecosystem is the most mature for this.
- React 19 brings useful primitives (use, actions, optimistic state) without forcing us into Server Components (which couple us to specific runtimes)
- Tiptap (our editor choice — see [ADR-0007](0007-tiptap-editor.md)) has its richest integration in React
- TanStack ecosystem (Router, Query, Table, Virtual) covers most non-trivial UI needs

**Why split rather than unify:**
- One framework can be excellent for content OR for app, rarely both
- Next.js tries (option 1) but couples us to Vercel-shaped deployment and React Server Components have an opinionated, fast-moving model that conflicts with our self-host-first ethos
- The split lets each surface optimize for its target without compromise

**Shared layer (`frontend/shared/`):** design tokens are JSON/CSS-vars (framework-agnostic), UI primitives are written for both React and Astro consumption (Astro can render React components as islands), i18n strings are JSON files consumed by both, API types are generated from the FastAPI OpenAPI schema.

SvelteKit (option 4) is lovely and the maintainer might prefer it personally — but React's ecosystem depth in the editor and data-grid spaces tipped the decision. Remix (option 5) lost ground when it merged into React Router; the data-loading patterns are now available via TanStack Router. Eleventy/Hugo + React (option 6) loses the islands benefit and forces us to maintain two completely independent build systems.

## Consequences

### Positive
- Each surface optimizes for its target without compromise
- Astro's static output is trivially served by the internal Caddy in production; no JS runtime required for public visitors
- React's ecosystem covers Tiptap, drag-and-drop, real-time, charts, and accessibility primitives well
- Self-host-friendly: no Vercel, no React Server Components, no platform-specific deploy

### Negative / trade-offs
- Two build systems (Astro for public, Vite for admin) — more CI complexity
- Two routing models — public site uses Astro file-based, admin uses TanStack Router
- Contributors need to know both Astro and React conventions to work across the project
- Component code that wants to be shared must be written framework-agnostically (use design tokens, not framework-specific styles)

### Neutral
- TypeScript strict mode throughout (`tsconfig.json` enforced at workspace root)
- Biome for lint + format (replaces ESLint + Prettier)
- Vitest for unit tests; Playwright for end-to-end

## Implementation notes

- pnpm workspaces: `frontend/shared`, `frontend/public-site`, `frontend/admin`, `docs` (Starlight site)
- Shared design tokens published as CSS custom properties + a small typed TS module
- API client types generated from FastAPI's OpenAPI schema via orval or similar
- i18n: `i18next` with namespace per module; RTL handled at the layout level
- The Tiptap editor lives in admin only; public site renders the same content to HTML server-side via Astro
- "Modal-only alerts" rule (no `window.alert/confirm/prompt`) enforced by Biome lint rule

## References

- [Astro documentation](https://docs.astro.build/)
- [React 19 release notes](https://react.dev/blog/2024/12/05/react-19)
- [TanStack Router](https://tanstack.com/router)
- [ADR-0007: Tiptap as editor](0007-tiptap-editor.md)
- [plan/02-frontend-foundations.md](../../plan/02-frontend-foundations.md)
- [note_to_design_claude.md (external)](/) — design system brief
