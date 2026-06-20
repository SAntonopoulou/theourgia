# Phase 02 — Batch 1: Token layer, Glyph, and core primitives

> First implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the bedrock of the design-system implementation — workspace dependencies installed, the design-system tokens wired with a no-flash first-paint theme, the Glyph component over the engraving sprite, and the most essential primitives from `Theourgia Foundations.dc.html`. By the end of this batch, opening `Theourgia Foundations.dc.html` next to our React render should show visual parity for the components we ship; the unshipped primitives stay as "still in the mockup, not in React yet" and land in Batch 2.

## Why this scope (not "all primitives")

The full primitive set in `agent_data_and_components.md` §9.1 is ~17 components. Shipping all of them in one batch would be a multi-thousand-line PR that's hard to review and harder to test rigorously. Splitting by "what every other primitive depends on" puts the smaller, foundational set in Batch 1 and lets Batch 2 build the rest on top of a verified base.

Bedrock primitives (Batch 1):
- **Glyph** — used by literally every other primitive
- **Button** + **IconButton** — base interaction; multiple variants
- **Field + TextInput** — the input wrapping pattern that TextArea / Select / NumberInput will repeat in Batch 2
- **Switch** — checkbox-like primitive
- **Chip** — used in filter rails and badges
- **Card** — the surface primitive every page composes from
- **Badge** — labels on cards
- **EmptyState** — every collection in the product needs this
- **Skeleton** — every loading state needs this

Deferred to Batch 2:
- SegmentedControl, TextArea, Select, NumberInput, Avatar, Medallion, Stat, Progress, StatusDot

Deferred to Batch 3 (overlay family):
- Dialog, Toast, Banner, Drawer, Menu, Tooltip, Popover, CommandPalette, QuickCapture

Deferred to Batch 4 (app shell):
- AppShell, VaultNav, PublicChrome, ModeLayout, the responsive drawer mechanism, PrintSheet

## Dependencies

- The existing pnpm workspace at the repo root (already in place: `frontend/admin`, `frontend/public-site`, `frontend/shared`).
- Phase 01 substrates already shipped — S10 user-settings (theme + a11y prefs land here) and S2 i18n (every label flows through `_()`).
- The design-system handoff at `/home/sophia/design-handoffs/theourgia/2026-06-21-design-system/` — the visual source of truth (`Theourgia Foundations.dc.html` is the acceptance reference).

## Workspace setup (zero code in this section — just installs / configs)

**`frontend/shared`:** add React + token CSS file + Tailwind preset + Biome inheriting from root + vitest + @testing-library/react + happy-dom. Exports:
- `@theourgia/shared` — the main barrel (Glyph + primitives + types)
- `@theourgia/shared/tokens` — the CSS file as an asset import + the typed token constants
- `@theourgia/shared/tailwind` — re-export of the Tailwind preset
- `@theourgia/shared/i18n` — existing slot (i18n helpers; populated later)

**`frontend/admin`:** add React 19 + React-DOM + Vite + the React Vite plugin + Tailwind + the preset from shared + TypeScript strict + Biome + vitest. Configure Vite to serve a smoke "Foundations" page that renders the primitives.

**`frontend/public-site`:** add Astro 4 + Tailwind + the preset from shared + TypeScript strict + Biome + vitest. Configure Astro to serve a smoke "/foundations" page mirroring the admin smoke page.

(The full Astro/React integration — routing, the API client, the auth flow — is later batches. Batch 1 is the smoke verifier.)

## Tokens

Copy the design-system handoff's token assets into `frontend/shared/src/tokens/`:
- `theourgia.tokens.css` — the ~70 CSS variable definitions (the `:root` + the `[data-theme]` × `[data-mode]` × `[data-contrast]` × `[data-cvd]` override blocks)
- `tailwind.theourgia.preset.js` — maps the CSS vars onto Tailwind theme keys
- `theourgia-icons.svg` — the 24-symbol engraving sprite

Re-exported via `@theourgia/shared/tokens`.

### First-paint theme script (no-flash)

Inline `<script>` injected at the top of both `<html>`s, before any framework hydrates. Single source at `frontend/shared/src/tokens/first-paint.js`. Both apps reference it (Astro injects into base layout, admin's `index.html` includes it). The script:

1. Reads `theourgia.theme` / `theourgia.mode` / `theourgia.contrast` / `theourgia.cvd` from `localStorage`.
2. Validates each against the allow-list (base/hellenic/thelemic, dark/light, normal/high, normal/safe).
3. Sets the corresponding `data-*` attributes on `<html>`.
4. Falls through to `data-theme="base" data-mode="dark"` if anything is missing or invalid.

After the user logs in, an effect rehydrates from their S10 user-settings (`ui.theme`, `ui.mode`, `a11y.high_contrast`, `a11y.cvd_safe`) and updates both `<html>` attributes and `localStorage` so the next first-paint matches. That wiring lives in a tiny `useTheme()` hook in shared, but the actual rehydration only fires once the auth flow lands in a later batch — Batch 1 just wires the localStorage path.

## Glyph component

```ts
// @theourgia/shared/Glyph
type GlyphName = "journal" | "library" | "scroll" | /* ... 24 names ... */;

interface GlyphProps {
  name: GlyphName;
  size?: number;        // default 20; ≤16 bumps stroke to ~2 for legibility
  title?: string;       // accessible name (SR-only); omit for purely decorative
  className?: string;
}
```

Renders `<svg><use href="#theo-${name}"/></svg>` with `currentColor`. The sprite is injected once at the root of each app (Astro layout + admin `App.tsx`).

A separate `subjectGlyphs/` module exposes planetary / zodiac / element / lunar — for Batch 1 we ship just the wrapper that consults the same sprite for these names (additions to the SVG come per the designer's flagged TODO; for now any subject-glyph name with no `<symbol>` falls back gracefully).

## Primitives (one component per file, colocated test)

For each primitive: TypeScript-strict React component, props match the §9.1 signature, styling via Tailwind utility classes that resolve to the token preset, accessibility attributes per §11 of `agent_onboarding.md`. Each component has a `.test.tsx` next to it covering: renders, variants, disabled state, click / keyboard interaction where applicable, ARIA attributes.

| Component | File | Variants / props highlights |
|---|---|---|
| `Glyph` | `src/Glyph/Glyph.tsx` | name, size, title |
| `Button` | `src/Button/Button.tsx` | variant: primary / secondary / ghost / danger / quiet; size: sm / md / lg; iconStart / iconEnd; loading; disabled |
| `IconButton` | `src/Button/IconButton.tsx` | glyph + required `label` for screen readers |
| `Field` | `src/Field/Field.tsx` | label + hint + error wrapper; owns the a11y wiring (htmlFor + aria-describedby) |
| `TextInput` | `src/Field/TextInput.tsx` | goes inside Field; standard input wrapper |
| `Switch` | `src/Switch/Switch.tsx` | checked + onChange + label; aria-checked |
| `Chip` | `src/Chip/Chip.tsx` | label, glyph?, selected, onToggle, removable |
| `Card` | `src/Card/Card.tsx` | as?, interactive?, children — the surface primitive |
| `Badge` | `src/Badge/Badge.tsx` | tone: neutral / info / success / warning / danger / trust; glyph? |
| `EmptyState` | `src/EmptyState/EmptyState.tsx` | glyph, title, body, action? — humane voice (translatable copy) |
| `Skeleton` | `src/Skeleton/Skeleton.tsx` | kind: text / circle / rect — for collection loading states |

All copy that flows to users runs through the existing `_()` substrate (`@theourgia/shared/i18n`). For Batch 1 the i18n module exports a pass-through `_(s) => s` as a placeholder — the backend's i18n substrate already exists, the frontend will wire its mirror in Batch 3 alongside the API client.

## Smoke "Foundations" verifier page

Both `apps` get a route that renders every Batch 1 primitive in a grid that mirrors `Theourgia Foundations.dc.html`. The pattern:

- `admin` at `/foundations` (dev-only — not in the production sidebar; flagged by env)
- `public-site` at `/foundations` (similar — dev-mode only)

The verifier renders the same primitives next to a small caption naming each. Opening this in `pnpm --filter @theourgia/admin dev` and visually comparing against the design-system `.dc.html` open in another browser tab is the acceptance test for the batch.

## Tests

Per-component tests at minimum:
- Renders without crashing in every variant
- Disabled / loading states render correctly
- Click handlers fire
- Keyboard interaction works (Enter / Space on Button, Switch; focus visible on Tab)
- ARIA attributes set correctly (role, aria-checked, aria-pressed, aria-disabled, aria-describedby)
- Translatable copy flows through `_()`

Workspace-level tests:
- `pnpm --filter @theourgia/shared test` runs vitest with happy-dom
- Both apps' configs validate (`tsc --noEmit` + `astro check` pass)
- Biome passes (`biome check .` from repo root)
- The first-paint script in isolation: small assertion that given specific `localStorage` values, the right `data-*` attributes are set on a JSDOM root

End-of-batch:
- `pnpm -r test` from repo root runs clean
- `pnpm typecheck` passes
- `biome check .` passes
- Backend tests still pass (`uv run pytest` in `backend/`)

## Acceptance criteria

1. `pnpm install` from repo root succeeds and links all three frontend packages.
2. `pnpm --filter @theourgia/admin dev` boots and serves the Foundations verifier at `/foundations`.
3. `pnpm --filter @theourgia/public-site dev` boots and serves Foundations at `/foundations`.
4. Theme/mode/a11y switching via the four `data-*` attributes on `<html>` re-skins the verifier page live, with no JS bundle hot-reload (CSS-only).
5. `localStorage.setItem("theourgia.theme", "hellenic"); reload` lands on hellenic with no FOUC (no flash of base theme).
6. Each primitive's tests pass and cover the row above.
7. No native dialogs / hardcoded hex / English-source strings outside `_()` in any of the new code.
8. Biome + tsc clean across the workspace.

## What this batch deliberately does NOT do

- Real auth / login / API integration (later batches; the verifier page is unauthenticated)
- Routing for any product surface (landing, today, journal, etc. — later)
- The overlay family (Batch 3)
- The app shell + responsive drawer (Batch 4)
- Storybook / visual-regression infrastructure (later; the smoke verifier substitutes for now)
- Per-script font @font-face declarations beyond Cardo / Inria / JetBrains Mono (the per-script faces from §5 land when content surfaces actually render them — Batch 1 just ensures the token roles are in the CSS)
- Subject-glyph expansion (planetary / zodiac etc.) — the designer's flagged TODO; lands when a content surface actually needs them

## Risks + mitigations

- **Tailwind preset wiring quirks.** The token preset declares the colors / fonts as functions of CSS vars. First time this is wired, expect some `tailwind.config.js` fiddling. Mitigation: start with `theourgia.tokens.css` alone, get a single colored Button working with raw CSS-var refs, then layer the Tailwind preset on top.
- **No-flash first paint.** Two apps to get right (Astro and Vite). Mitigation: write the first-paint script once in shared; Astro injects via base layout, admin via `index.html`. Test by setting localStorage and force-reloading.
- **TypeScript strict + React 19.** Some library types may not be ready for React 19. Mitigation: pin compatible versions of @types/react / @types/react-dom; if a library is blocking, swap or wrap with a thin shim.
- **Scope creep into "all 17 primitives."** Sticking to the Batch 1 list above is what makes this reviewable. Mitigation: explicit cut line; SegmentedControl, Avatar, Stat, Progress, etc. wait for Batch 2.

## Plan-doc-discipline

This doc is the spec for the batch. Any deviation during implementation requires updating this doc before committing. Per the "minimize inline code" discipline: if a new shared concern surfaces during implementation, add it to the shared package or scope it correctly — don't inline it in an app.
