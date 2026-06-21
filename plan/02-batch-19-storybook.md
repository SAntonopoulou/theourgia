# Phase 02 — Batch 19: Storybook stand-up + Docs tradition cycler

> **Scope:** Phase 02 DoD items — "Component library: every component documented in Storybook with controls" (per `02-frontend-foundations.md`) — plus closing the `docs/site` loose end (tradition cycler header override). After this batch the design system is contributor-facing.

## Docs tradition cycler

- `docs/site/src/components/TraditionSelect.astro` — segmented Base/Hel/Thel control. Writes `data-tradition` to `<html>` and persists to `localStorage.theourgia.theme` (shared key with admin/public-site).
- `docs/site/src/components/ThemeSelect.astro` — override of Starlight's `ThemeSelect`. Renders `<TraditionSelect />` + the default Starlight component side by side. Wired via `components.ThemeSelect` in `astro.config.mjs`.
- `docs/site/src/styles/theourgia.css` — extended with `:root[data-tradition="hellenic"]` / `:root[data-tradition="thelemic"]` palette overrides (font-display, accent, semantic colors + bg/ink swaps under dark mode). Palettes derived verbatim from `Theourgia Docs.dc.html` lines 26-27.
- First-paint inline script in `astro.config.mjs head[]` applies the persisted tradition before any framework hydrates — mirrors `frontend/shared/src/tokens/first-paint.js` but for the docs-specific `data-tradition` attribute.

Aria-label is **"Tradition"** (not "Theme") to disambiguate from Starlight's adjacent dark/light "Theme" select for screen-reader users.

**Known issue (pre-existing, not caused by this batch):** docs `astro dev` returns HTTP 500 with `id.startsWith is not a function` from vite's SSR module loader. Path duplication in the error trace suggests an Astro 4.16 / @astrojs/sitemap 3.7 / pnpm hoisting interaction. `astro check` passes 0 errors. Reproducible without the cycler edits — needs an infra session.

## Storybook stand-up

- `frontend/shared/.storybook/main.ts` — Storybook 8.6.18 + `@storybook/react-vite` + addons: `essentials`, `interactions`, `a11y`.
- `frontend/shared/.storybook/preview.tsx` — imports `theourgia.tokens.css` + `theourgia.shared.css`; toolbar globals flip `data-theme` (Base/Hel/Thel) + `data-mode` (Dark/Light) on `<html>` via a decorator effect; backgrounds use the design's surface tokens.
- `pnpm --filter @theourgia/shared storybook` boots in ~2s; `pnpm --filter @theourgia/shared build-storybook` produces a static build in ~10s.

### Stories shipped (29 files; ~115 stories incl. autodocs)

**Foundations** (3)
- Tokens (Palette / TypeScale / Radii)
- Glyphs (Atlas of every name in the engraving sprite + Sizes row)
- CelestialBand (Athens summer solstice / Portland winter solstice / Compact variant)

**Primitives** (15)
- Button, IconButton — every variant × every size, with icon slots + loading + disabled
- Chip — display / toggle / removable / glyph slot
- Badge — every tone with optional glyph (color-never-alone)
- Switch — on/off, label-position, disabled
- Banner — every tone, dismissible variant
- Card — static / interactive / grid
- Field — TextInput / NumberInput / TextArea / Select children × hint / error / required
- StatusDot — every status kind + a service-health row example
- EmptyState — every glyph + action slot + empty journal scenario
- Stat — plain / delta / negative delta / sparkline / row
- Progress — value bar / indeterminate / ritual-step series
- Skeleton — line / block / circle / entry placeholder composition
- SegmentedControl — 2-/3-option, glyphs, small size
- Tooltip — placement, delay

**Overlays** (7)
- ConfirmDialog — destructive / constructive / neutral
- AlertDialog — warning / danger / info
- PromptDialog — with validation
- Drawer — left / right
- Menu — identity picker / row actions / disabled
- Popover — date detail / share
- Toast — push tones / with undo action

**Chrome** (2)
- PublicChrome — default / with CTA / minimal
- VaultNav — Today / Journal / Divination / with identity

**Identity** (2)
- Avatar — initials / glyph / tonal / sizes / persona row
- ActingAsSwitcher — full set / single / no-archived (wrapped in `ActingAsProvider`)

### Drift caught during this batch

`VaultNav` default identity was hard-coded to `name: "Sophia"` — the user's legal name. Per `feedback_github_identity.md` + `user_magickal_name.md` (CRITICAL), the maintainer's legal name must not appear in committed demo code. Fixed in:

- `frontend/shared/src/VaultNav/VaultNav.tsx` (default identity → "Aspasia"; jsdoc example also updated)
- `frontend/shared/src/VaultNav/VaultNav.test.tsx` (test fixture → "Aspasia")
- `frontend/shared/src/Dialog/PromptDialog.test.tsx` (test fixtures → "Aspasia", all 4 occurrences)

All 329 shared tests still pass after the swap.

### Not yet storied (need provider wrappers)

- `VaultTopbar` — requires `TopbarProvider`, `ActingAsProvider`, and a router context; left as a follow-up because the meaningful story is the integration with `useTopbar()` from a sample route, which crosses workspace boundaries.
- `AppShell` — composes nav + topbar; its stories overlap with VaultTopbar's.

## Out of scope (next batches)

- **Visual-regression baseline** — Playwright + screenshot diffing against the storybook static build is the natural next step, but requires CI plumbing.
- **axe-core CI gate** — `@storybook/addon-a11y` is wired in dev; the CI gate (`storybook test-runner` or `axe-storybook-testing`) is the next batch.
- **Storybook deployment** — `docs/storybook.theourgia.com` subdomain hosting; needs Caddy + deploy script.
