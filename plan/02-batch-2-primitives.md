# Phase 02 — Batch 2: Second-tier primitives

> Second implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the nine primitives deferred from Batch 1 — the second-tier set that composes on top of Glyph + Field + Button. By the end of this batch, every non-overlay, non-shell primitive from `agent_data_and_components.md` §9.1 is live, and the `/foundations` smoke page renders all of them next to the Batch 1 set. Overlays (Batch 3) and the app shell (Batch 4) still wait.

## Why this scope

Batch 1 shipped 11 primitives (Glyph + Button/IconButton + Field/TextInput + Switch + Chip + Card + Badge + EmptyState + Skeleton) and verified them on `dev.theourgia.com`. Batch 2 finishes the primitive set so that Batch 3 (overlays) and Batch 4 (shell) don't have to build mini-form-controls inline when they need them.

The nine new primitives:

- **SegmentedControl** — pill-grouped option toggle; goes on the editor for visibility, on settings for theme/mode, etc.
- **TextArea** — multi-line text input; reuses the Field wiring
- **Select** — single-choice dropdown; reuses the Field wiring (native `<select>` — fancy combobox waits for the overlay batch)
- **NumberInput** — numeric input with optional min/max/step; reuses the Field wiring
- **Avatar** — identity photo OR generated glyph medallion; multiple sizes
- **Medallion** — entity/identity ring glyph (the visual underneath Avatar's fallback)
- **Stat** — label + value + optional sparkline + optional delta; the dashboard tile
- **Progress** — value/max bar with optional label; loading + collection-progress states
- **StatusDot** — small colored dot paired with text (color-never-alone rule)

Out of scope (still later batches):

- Overlays: ConfirmDialog, AlertDialog, PromptDialog, Toast, Banner, Drawer, Menu, Tooltip, Popover — **Batch 3**
- AppShell + responsive drawer + VaultNav + PublicChrome + ModeLayout + PrintSheet — **Batch 4**
- Domain-specific controls: VisibilitySelector, SensationDiagram, IdentityPicker, EntityRefPicker, LanguageToolbar, CelestialBand, CalendarDate, RingText, QuickCapture — **Phase 02 feature-surface batches**

## Dependencies

- Batch 1 primitives (`@theourgia/shared` already exports Glyph + Field + Button etc.)
- The same token CSS, sprite, and i18n shim — no new infrastructure
- Foundations smoke page already exists at `/foundations` in both apps — Batch 2 extends it

## Components

Each lands in `frontend/shared/src/<Name>/` with `Name.tsx` + colocated `Name.test.tsx` + `index.ts`. Token-driven styling via inline `style={{ var(--…) }}` (matching Batch 1's pattern). Every label that flows to users runs through `_()` from the i18n shim.

| Component | File | Props highlights |
|---|---|---|
| `SegmentedControl<T>` | `src/SegmentedControl/SegmentedControl.tsx` | `options: {value:T,label,glyph?}[]`, `value`, `onChange`, size?: sm/md, fullWidth? |
| `TextArea` | `src/Field/TextArea.tsx` | consumes Field context; rows? auto-grow? cols? |
| `Select` | `src/Field/Select.tsx` | consumes Field context; `options: {value,label}[]`, value, onChange |
| `NumberInput` | `src/Field/NumberInput.tsx` | consumes Field context; value, onChange, min?, max?, step? |
| `Avatar` | `src/Avatar/Avatar.tsx` | `identity: {name, photoUrl?, glyph?, tone?}`, size?: sm/md/lg/xl |
| `Medallion` | `src/Avatar/Medallion.tsx` | glyph: GlyphName, tone?: BadgeTone or "accent", size?: sm/md/lg/xl |
| `Stat` | `src/Stat/Stat.tsx` | label, value, spark?: number[], delta?: number, tone?: neutral/positive/negative |
| `Progress` | `src/Progress/Progress.tsx` | value, max, label?, size?: sm/md, indeterminate? |
| `StatusDot` | `src/StatusDot/StatusDot.tsx` | status: "ok" \| "warn" \| "error" \| "neutral" \| "pending", label (paired text) |

### Notes

- **Avatar / Medallion split.** Medallion is the pure ring-glyph component; Avatar is the higher-level wrapper that decides "photo or fallback medallion." This split lets entity profiles use Medallion directly without faking an identity object.
- **SegmentedControl is generic over the value type.** TS generics for type-safe option values.
- **TextArea / Select / NumberInput reuse Field's `useField()` context** — same wiring shape as TextInput. Field's clone-element happy path also still works for them.
- **Stat's spark / delta.** Spark is a tiny inline SVG line chart over the supplied numbers (no chart library; ~20 lines). Delta is rendered as `+12.4%` or `-3.1%` with tone-colored text.
- **StatusDot pairs with text always** per the color-never-alone rule from `agent_onboarding.md` §11. The component accepts a `label` prop and renders both, not just the dot.
- **Progress** uses the `<progress>` element so screen readers announce the value naturally. Custom styling via `::-webkit-progress-*` / `::-moz-progress-*` pseudo-elements through inline `<style>` (one global injection in the component, same SSR-safe pattern as Skeleton's pulse keyframes).

## Tests

Per-component vitest tests, colocated. Coverage targets (matching Batch 1's discipline — ~60–70 tests for the batch):

- Renders each variant / size
- Default values match spec
- `onChange` / `onToggle` fire with correct payload
- Keyboard interaction (Enter / Space / arrow keys on SegmentedControl)
- ARIA attributes (`role="radiogroup"` for SegmentedControl, `aria-valuenow` / `aria-valuemax` for Progress, `aria-label` paired with visible text for StatusDot)
- Field-aware inputs (TextArea / Select / NumberInput) pick up `aria-describedby` / `aria-invalid` from Field context
- Avatar falls back to Medallion when no photoUrl
- Medallion respects `tone` (color-paired via data-tone, mirrors Badge)
- Stat renders spark when array provided, omits when not; delta tone matches sign
- Progress indeterminate state renders without `aria-valuenow`

## Smoke page

Extend the existing `/foundations` smoke page in both apps:

- **admin** (`src/routes/Foundations.tsx`) — add new sections for each Batch 2 primitive, interactive where applicable (SegmentedControl with live state, NumberInput controlled, etc.)
- **public-site** (`src/pages/foundations.astro`) — static mirror; no interactive widgets but visual parity

## Test plan

- `pnpm --filter @theourgia/shared test` — all Batch 1 tests + new ~60 Batch 2 tests pass
- `pnpm typecheck` — clean across all four packages
- `pnpm lint` — Biome clean
- `pnpm build` — both apps build to static dist
- `pnpm deploy:dev` — ships to `dev.theourgia.com`; the script's curl-verify gate confirms `/`, `/foundations/`, and `/admin/` return 200
- Visual: open `dev.theourgia.com/foundations/` and `dev.theourgia.com/admin/` against the design's `Theourgia Foundations.dc.html`; eyeball parity (no new sections in the .dc.html — Batch 2 primitives extend our smoke page; the .dc.html's pre-existing Segmented and Status sections are visual references for those)

## Acceptance criteria

1. Nine new primitives shipped, each with tests + index.ts re-export + barrel inclusion in `@theourgia/shared`.
2. All Batch 1 tests still pass; ~60 Batch 2 tests pass; typecheck + lint clean.
3. `/foundations` in both apps now demonstrates every primitive (Batch 1 + Batch 2 = 20).
4. `pnpm deploy:dev` ships the new build and the curl-verify passes.
5. Commit pushed to `main`; commit message documents which primitives landed.

## What this batch deliberately does NOT do

- Overlays (Batch 3)
- App shell (Batch 4)
- Tooltip on Stat / Progress / etc. (waits for the overlay batch — Tooltip is an overlay)
- Combobox / autocomplete on Select (waits for overlay batch — needs Popover)
- Real chart library for Stat's sparkline (intentional — a hand-rolled SVG line is enough; no chart dep)
- Domain-specific controls (VisibilitySelector et al.) — those compose Batch 1+2 primitives but are feature-surface work later in Phase 02

## Risks + mitigations

- **SegmentedControl's TS generic.** TS-strict generics can fight React's component-prop typing. Mitigation: define the component as `<T extends string>` and let inference do the work; if the call sites get noisy, add a non-generic alternative for string-only use.
- **`<progress>` element styling.** Cross-browser styling of native `<progress>` is fiddly. Mitigation: ship the native version first (correct semantics, accessible), iterate visual fidelity later if needed; document the pseudo-element shim limitations in a comment.
- **Avatar identity prop shape.** The `identity` shape is going to grow (display name vs. magickal name, photo CDN URL, etc.). Mitigation: keep the prop minimal in Batch 2 (`name`, `photoUrl?`, `glyph?`, `tone?`); when the user model lands in a later batch, broaden via an additive change.

## Plan-doc-discipline

This doc is the spec. Any deviation during implementation updates this doc before commit. Same rules as Batch 1: minimize inline code, every cross-cutting concern routes through the substrate, all user-facing copy through `_()`.
