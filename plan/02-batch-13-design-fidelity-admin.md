# Phase 02 — Batch 13: Design-fidelity rebuild (admin SPA, shared primitives, tokens)

> **Scope target:** rebuild every shipped admin surface against the designer's `.dc.html` source of truth. Audit every shared primitive against the per-surface usage. Extract the shared CSS that the `.dc.html` `<style>` blocks all carried. Settle the topbar state-context split. Bring the admin chrome into alignment with `agent_onboarding.md` §8.
>
> **Why this happened off-cadence:** During Batches 1–12 we built primitives and surfaces from the design *system* (Foundations.dc.html + the primitive kit) but did not consistently read each per-surface `.dc.html`. Sophia called this out 2026-06-21: *"revise what you have made it doesn't match the design system."* Phase 02 batches 13+ now follow the **per-component ritual** (`feedback_read_dc_html_before_building.md`) — and the deep design thread (`feedback_follow_design_thread_deep.md`).

## What this batch includes

### Admin SPA — surfaces rebuilt against `.dc.html`

Every nav surface in the admin SPA was re-ported end-to-end:

- **Today** — `Theourgia Vault - Today.dc.html`
- **Journal** — `Theourgia Journal.dc.html` (date-grouped timeline, view tabs, faceted right rail, content-type colored left-edge bars)
- **Synchronicities** — `Theourgia Synchronicities.dc.html`
- **Entities** — `Theourgia Entities.dc.html` + `Theourgia Entity Profile.dc.html` (backend router registered)
- **Library** — `Theourgia Library.dc.html` (spine-coded rows, category filters, language facets)
- **Divination** — `Theourgia Divination.dc.html`
- **Sigil Studio** — `Theourgia Sigil Studio.dc.html`
- **Circle Builder** — `Theourgia Circle Builder.dc.html`
- **Talismans** — `Theourgia Talismans.dc.html`
- **Analytics** — `Theourgia Analytics.dc.html`
- **Ritual feed** — `Theourgia Ritual Feed.dc.html`
- **Hubs** — `Theourgia Hubs.dc.html`
- **Settings** — `Theourgia Settings.dc.html`
- **Foundations** — `Theourgia Foundations.dc.html` (design-system smoke page)
- **Calendar** — honest placeholder (no `.dc.html` shipped from the designer; Scheduler is the related-but-different content scheduler)

### Admin chrome (per `agent_onboarding.md` §8)

- `VaultNav` — left sidebar (one-axis scroll, horizontal scrollbar pinned hidden per `feedback_scroll_one_axis_only.md`)
- `VaultTopbar` + `TopbarContext` — the per-surface topbar slot
- `AppShell` — grid layout that hosts everything else
- `useTopbar(factory, deps)` — factory + deps pattern, so callers register declarative topbar slots

**Topbar context split.** Combined `{ state, setState }` context caused a Maximum-Update-Depth loop the first time we shipped it; identity changes on every state update re-ran effects. Fix: split into two contexts (`TopbarStateContext`, `TopbarSetterContext`). useState's setter is stable, so the setter context never changes identity. Documented in `feedback_split_setter_state_contexts.md`.

### Shared CSS extraction (`frontend/shared/src/tokens/theourgia.shared.css`)

The `<helmet><style>` blocks across the `.dc.html` set all carried the same set of resets and utility classes. Extracted to a single shared file imported by both admin global and public-site global. Includes:

- `*{box-sizing:border-box}` reset
- `body{margin:0; antialiasing; text-rendering}` baseline
- `:focus-visible` ring (2px accent, 2px offset — per the a11y rule)
- `::selection` accent-soft background
- `.scroll` custom scrollbar pattern
- `.om-aside` scrollbar-hiding utility
- `.om-shell` responsive grid block
- `[data-chip]` / `[data-vis]` `aria-pressed` selected-state rules
- `.nowdot` pulse animation
- `.sigil-line` SVG draw-in animation
- `.entry-row` hover rule
- `@media (prefers-reduced-motion: reduce)` global override

### Token additions (`frontend/shared/src/tokens/theourgia.tokens.css`)

- `--felt` — Divination "table felt" surface (added across base + Hellenic + Thelemic + light)
- `--air`, `--fire`, `--water`, `--earth` — elemental palette (Circle Builder + Talismans)
- Full zodiac glyph set
- `--font-greek: "Cardo", serif` (added 2026-06-21 during the public-site pass; documented here for completeness because the public site pulled this token down across multiple surfaces)

### Shared-primitive audit (Wave 1–5)

Every shared primitive was audited against actual `.dc.html` usage, not just Foundations.dc.html:

- **Button** — heights 30 / 38 / 46; primary `font-weight: 700`; outline secondary; ink-mute ghost; solid danger (`var(--danger)` without comma-fallback because jsdom can't parse the fallback)
- **IconButton** — same height ladder; square aspect
- **Badge** — pill + transparent + line + tone color
- **Chip** — `data-chip` attribute pattern; `accent-soft + line-2` selected state
- **StatusDot**
- **TextInput / NumberInput / Select / TextArea** — `bg + line-2`, padding `10/13`, height 38, radius `r-md` (8)
- **Switch** — 46×26 track + 20×20 thumb
- **Card** — `r-lg` (14) + 18 padding + no default shadow
- **Overlay primitive** + **ConfirmDialog / AlertDialog / PromptDialog** — 22 padding, font-display 21 title, font-ui 13.5 body, gap 10 footer
- **Toast** — 3px left tone bar + `0 10 26` shadow
- **Banner** — `color-mix` tinted background
- **Drawer** — 16 / 20 padding + ✕ close button

The audit caught several places where I'd built a primitive against my mental model rather than the design's actual usage (e.g. Button danger variant carried `var(--danger, #c2554a)` which broke under jsdom; size ladder wasn't 30/38/46 in earlier ship; chip selected-state didn't include the `line-2` border).

### Backend (Entities router)

The Entities admin surface required the backend router to be registered. Done in `backend/theourgia/api/routers/__init__.py`. `EntityRecord` + `listEntities` / `createEntity` / etc. added to `frontend/shared/src/api`. No other backend changes.

## Out of scope (later batches)

- **Remaining admin surfaces** — Editor, Identities, Lineage admin, Membership, Permissions, Bundles, Federation, Health, Wellbeing, Workshop, Sandbox, Templates, Scheduler, Oracle, Account, Agents, Transliterate, Book Preview, Newsletter Composer. These are in scope for the admin design-fidelity continuation batch (TBD).
- **Public-site rebuild** — covered in Batch 14.
- **Real backend wiring for the engines** — multi-week wiring pass (see `plan/02-frontend-foundations.md` resume notes).

## Per-component ritual (mandatory going forward)

Documented in `feedback_read_dc_html_before_building.md` and reinforced by `feedback_follow_design_thread_deep.md`. Every component / surface touch must:

1. Read the `.dc.html` end-to-end (slow, including the `<style>` block).
2. Read the `agent_onboarding.md` § for that surface.
3. Read sibling `.dc.html` files for any component the surface uses.
4. Grep for cross-cutting concerns referenced.
5. Write a drift list in words; check the implementation line by line.
6. Save lessons as feedback memories so the drift can't recur.

**No agents for design comparison.** Sophia 2026-06-21: *"you need to do a slow one by one comparison yourself and fix it not rely on your agents reports they missed the fine details."*

## Acceptance criteria

1. Every admin nav surface renders without console errors against its `.dc.html`.
2. AppShell grid lays out per §8 — VaultNav (one-axis scroll), VaultTopbar (per-surface registration via `useTopbar`), content region.
3. Shared CSS imported once in admin global and public-site global; no per-surface duplication.
4. Shared primitives match `.dc.html` usage (not just Foundations.dc.html).
5. The TopbarContext doesn't trigger the Maximum-Update-Depth loop (state + setter split).
6. No native `window.alert / confirm / prompt` anywhere — all dialogs route through Overlay primitives.
7. Memories saved for every reusable rule that emerged during this work.

## Memories that landed during this batch

- `feedback_read_dc_html_before_building.md` — the per-component ritual
- `feedback_match_design_exactly.md` — non-negotiable
- `feedback_total_frontend_rewrite.md` — multi-week scope acknowledgment
- `feedback_split_setter_state_contexts.md` — the topbar fix
- `feedback_scroll_one_axis_only.md` — the sidebar horizontal scrollbar fix
- `feedback_minimize_inline_code.md` — substrate routing rule
- `feedback_ui_modals_only.md` — no native dialogs
- `feedback_interactions_per_design_outline.md` — overlays per `Theourgia Overlays.dc.html` + Interaction Patterns
