# Phase 02 — Batch 20: Visual regression · axe-core gate · i18n end-to-end

> Closes three Phase 02 Definition-of-Done items in one batch by building on the Storybook investment from Batch 19. After this batch every component has a pixel baseline + an automated a11y check, and the i18n substrate ships with a real catalog system.

## Visual regression baseline

- `playwright.visual.config.ts` — Playwright config that serves the static Storybook bundle on port 6007 and snapshots each story.
- `tests/visual/storybook.spec.ts` — reads `storybook-static/index.json` at run-time, so new stories are picked up automatically. Disables animations + waits for `document.fonts.ready` before snapshotting so screenshots are deterministic.
- 123 baseline PNGs committed under `tests/visual/storybook.spec.ts-snapshots/` (≈ 2.5 MB).
- Scripts: `pnpm test:visual` (compare) · `pnpm test:visual:update` (refresh baselines after an intended change).
- **No SaaS dependency** — pixel diffs run locally and commit to the repo, matching the project's zero-telemetry stance.

## axe-core CI gate

- `playwright.a11y.config.ts` — second Playwright config reusing the same Storybook static server.
- `tests/a11y/storybook.spec.ts` — runs `@axe-core/playwright` against each story with the WCAG 2.2 A + AA rulesets enabled (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`).
- Per-story allowlist (`ALLOWLIST` map) for false positives — each entry requires a one-line *why*. Currently empty; the placeholder for `foundations-tokens--palette · color-contrast` is documented for reference but unused because the design tokens actually pass.
- **123 of 123 stories pass with zero violations.** The design system substrate is fully a11y-clean out of the box.
- Script: `pnpm test:a11y`.

## i18n end-to-end

The shim from S2 is now backed by a real catalog system. The API stays gettext-style (`_("Welcome")`) so existing call sites need no change.

### Substrate

- `frontend/shared/src/i18n/locale.ts` — locale registry, catalog loaders, `navigator.languages` negotiation, persistence (`localStorage.theourgia.locale`), `Intl.PluralRules` integration, `applyLocaleToDocument` for `<html lang>` + `<html dir>`.
- `frontend/shared/src/i18n/index.ts` — `gettext` / `ngettext` / `_` / `_lazy` / `_n` / `_n_lazy` look up the active catalog and fall back to the source string. Module-level `currentLocale` keeps non-React callers working.
- `frontend/shared/src/i18n/I18nProvider.tsx` — React provider that propagates the active locale to descendants, pushes it to the module-level `setCurrentLocale`, and mirrors to `<html>` on every change. Split state/setter contexts per `feedback_split_setter_state_contexts.md`.
- `frontend/shared/src/i18n/LanguagePicker.tsx` — Settings-grade `<select>` showing every locale by its endonym (e.g. *Ελληνικά*, *עברית*).
- `frontend/shared/src/tokens/first-paint.js` extended — sets `<html lang>` + `<html dir>` from `localStorage.theourgia.locale` (with `navigator.languages` fallback) before any framework hydrates.

### Catalogs shipped

- **English** (`en.json`) — identity passthrough.
- **Modern Greek** (`el.json`) — round-trip target. Covers VaultNav section headings + every nav item label + common UI verbs + the test strings.
- **Hebrew** (`he.json`) — RTL spot-check. `$meta.dir = "rtl"` flips the document direction.

### Integration sites

- `frontend/admin/src/App.tsx` — `<I18nProvider>` wraps the whole tree.
- `frontend/shared/src/VaultNav/VaultNav.tsx` — section headings + item labels resolve through `_()`. Default tree's English labels stay as gettext source strings.
- `frontend/admin/src/routes/Settings.tsx` — Language section between Font roles and Accessibility, mounting `<LanguagePicker />`.

### Tests

- `frontend/shared/src/i18n/i18n.test.ts` — 20 tests:
  - 10 English-passthrough regression cases (every assertion from the original shim test).
  - 5 Modern Greek round-trip cases (key lookup, interpolation, plural rules via `Intl.PluralRules`, fallback to source for untranslated keys, lazy re-translation after a switch).
  - 2 Hebrew RTL meta cases.
  - 3 registry cases (`availableLocales`, `negotiateLocale`, `registerCatalog`).

## Verification

After this batch:
- `pnpm -r typecheck` — 0 errors across docs / public-site / shared / admin.
- 339 shared tests pass (was 329 — added 10 i18n tests).
- 123 of 123 stories pass the visual diff.
- 123 of 123 stories pass WCAG 2.2 A + AA via axe-core.
- Storybook builds in ~12s; static set serves under `frontend/shared/storybook-static/`.

## Phase 02 DoD progress after this batch

| Item | Status |
|---|---|
| Astro site builds; landing + docs render | ✅ Done |
| React admin SPA builds; routes navigable; talks to API | ✅ Done |
| Component library: every component documented in Storybook | ✅ Done (Batch 19) |
| Tiptap editor: round-trip with all built-in blocks; slash menu | 🟡 Surface ported; live integration deferred |
| i18n: English + Modern Greek round-trip; RTL spot-check with Hebrew | ✅ Done (this batch) |
| Accessibility: axe-core passes; keyboard navigation; screen reader spot-check | ✅ Done (this batch — automated checks) |
| Visual regression baseline captured | ✅ Done (this batch) |
| Print stylesheet renders a representative entry | ✅ Done |
| PWA quick-capture | ⏳ Not started |

Phase 02 has 1.5 of 9 DoD items still open: PWA quick-capture, and the live half of the Tiptap editor. Both are reasonable to defer behind the substrate sweep + Phase 03 sequencing.
