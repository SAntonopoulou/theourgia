# Phase 02 — Batch 5: AppShell + routing

> Fifth implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the responsive application chrome — AppShell + VaultNav + PublicChrome — plus a router with placeholder routes for every authenticated surface the design calls out. After this batch, the admin SPA stops being a single smoke page and starts being a real navigable application with shell + routes.

## Why this scope

Batches 1–4 shipped 30 primitives + the smoke page. To make those primitives compose into something a person could use, we need:

1. **A shell** — the persistent chrome: top header (brand + theme toggle + user menu), left sidebar (or top tabs on mobile) with route links, main content area.
2. **A router** — so each surface has a real URL the user can deep-link to and the browser back/forward work.
3. **Placeholder routes** — one per planned surface, so we can verify the navigation works and the shell adapts. Each placeholder is an EmptyState with the surface's name + glyph.

Three new shared components plus a routing-aware admin scaffold:

- **AppShell** — the top-level container that renders the header + sidebar (when authenticated) + main; responsive (sidebar collapses into a Drawer-triggered hamburger on narrow viewports).
- **VaultNav** — the authenticated sidebar; route links + active state highlighting.
- **PublicChrome** — the unauthenticated header (brand + theme toggle); used by the public-site and the admin's login surface.

Routes scaffolded in admin (each is a placeholder using EmptyState):

- `/` — Today / Home
- `/journal` — Journal index
- `/library` — Library
- `/entities` — Entities
- `/divination` — Divination
- `/sigil` — Sigil studio
- `/circle` — Circle builder
- `/talisman` — Talisman designer
- `/analytics` — Analytics ("scientific illuminism")
- `/settings` — Settings
- `/foundations` — Foundations smoke page (preserved; dev-only marker in the nav)

Out of scope (later):

- **PrintSheet** — print-specific layout; lands when a content surface needs printable output (e.g. the talisman designer).
- **ModeLayout** — design system mentions this; deferring until we know what it means in code (likely RTL vs. LTR + per-script font wrapper; lands when a non-Latin-script content surface is built).
- **Real route content** — each route is a placeholder this batch; surface implementations come in subsequent batches.
- **Auth gating** — there is no real auth yet; the shell renders the VaultNav unconditionally for now.

## Dependencies

- All Batches 1–4 primitives (`@theourgia/shared` is the design system surface)
- A new dep: `react-router-dom@^7` (declarative routing, React 19 compatible)
- No backend changes; nothing here calls the API

## Components

### `AppShell`
```ts
interface AppShellProps {
  /** Whether the user is in an authenticated vault session. */
  authenticated: boolean;
  /** The active route's content. */
  children: React.ReactNode;
}
```

Layout:
- Desktop (≥ 768px): horizontal grid — VaultNav (sidebar, 240px) | main content. Header above.
- Mobile (< 768px): single column. Header at top with a hamburger that opens VaultNav as a Drawer.
- The mobile detection uses a `useMediaQuery("(min-width: 768px)")` hook (small inline implementation; ~10 lines).

### `VaultNav`
```ts
interface VaultNavItem {
  to: string;
  label: string;
  glyph: GlyphName;
  badge?: string | number;
}
interface VaultNavProps {
  items: VaultNavItem[];
  /** Called when the user picks an item (for closing the mobile drawer). */
  onNavigate?: () => void;
}
```

- Uses `NavLink` from react-router-dom for active-state styling
- Each item: glyph + label + optional Badge
- Sticky to the viewport; scrolls internally if items overflow

### `PublicChrome`
```ts
interface PublicChromeProps {
  /** Right-side actions (typically a "Sign in" Button). */
  actions?: React.ReactNode;
}
```

- Brand wordmark on the left
- Inline theme toggle (cycles base/hellenic/thelemic) — uses the existing `setThemeState()` from tokens
- Mode toggle (dark/light)
- Right-side actions slot

## Tests

Per-component vitest tests:
- AppShell: renders header always; renders VaultNav inline when desktop and authenticated; renders hamburger Drawer when mobile
- AppShell: hamburger opens Drawer; click on item closes Drawer
- VaultNav: active route gets highlighted style; clicking a NavLink fires onNavigate
- VaultNav: badges render when supplied
- PublicChrome: brand visible; theme cycle button cycles through 3 themes; mode toggle flips dark↔light

Target ~25-30 new tests for the batch.

## Smoke vs. real routes

- Replace `frontend/admin/src/App.tsx` with a Router setup
- Add `frontend/admin/src/routes/` files for each placeholder
- Keep `Foundations.tsx` and link to it from VaultNav (marked dev-only)

## Test plan

- `pnpm test` — all existing + new pass
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm deploy:dev` — ships + curl-verify gate, including `/admin/journal` etc. (Vite's SPA fallback handled by Caddy's existing try_files)

## Acceptance criteria

1. New `@theourgia/shared` exports: `AppShell`, `VaultNav`, `PublicChrome`, `useMediaQuery`
2. Admin SPA renders a real app shell at every route
3. Browser back/forward + deep-link to `/admin/library` works (with Caddy SPA fallback already in place)
4. Mobile (DevTools narrow viewport) collapses the sidebar into a hamburger-triggered Drawer
5. Theme + mode toggles in the chrome update the data-attrs on `<html>` live
6. Tests pass, typecheck clean, lint clean
7. Deployed to dev.theourgia.com

## What this batch deliberately does NOT do

- Authentication / login flow — VaultNav always shows; "authenticated" flag is currently always true
- Per-surface content beyond an EmptyState
- Federation / multi-vault — single-vault assumption
- Server-side data — placeholder routes only
- PrintSheet, ModeLayout — deferred to Phase 03 or whenever a surface actually needs them

## Risks + mitigations

- **Caddy SPA fallback for /admin/journal etc.** — the Caddy snippet uses `try_files {path} /index.html` for `/admin*` already. Deep links should work.
- **react-router v7 + React 19 compat** — react-router 7.x officially supports React 19. If a peer-dep warning surfaces, log it and continue (no functional impact).
- **Mobile drawer + focus trap** — when the hamburger opens VaultNav as a Drawer, focus should land inside the drawer (Drawer already handles this); clicking a NavLink should call onNavigate to close the drawer + restore focus.

## Plan-doc-discipline

Same as prior batches. Any deviation updates this doc before commit.
