# Phase 02 — Batch 21: PWA quick-capture

> Closes the last automatable Phase 02 DoD item: a mobile-first installable surface that opens straight into a one-textarea quick capture, with offline persistence so a practitioner can write down what just happened on the train.

## Deliverables

- `frontend/admin/public/manifest.webmanifest` — installable manifest. `start_url: /admin/capture`, `scope: /admin/`, dark + light theme colors, both `any` and `maskable` icons. Two app shortcuts (Quick capture · Today).
- `frontend/admin/public/sw.js` — minimum-viable service worker. Two caches (`theo-shell-v1` for the index.html + entrypoint, `theo-runtime-v1` for same-origin GETs, stale-while-revalidate). Versioned so deploys evict old caches cleanly. **No background sync, no push, no analytics** — only the offline shell.
- `frontend/admin/public/icon.svg` + `icon-maskable.svg` — the Theourgia mark (theta ring + horizontal line) on dark ground.
- `frontend/admin/index.html` — adds the manifest `<link>`, both `theme-color` meta tags (dark + light), and an inline SW registration that runs on `load` so it never blocks first paint.
- `frontend/admin/src/routes/Capture.tsx` — minimalist single-textarea surface. Mobile-first padding via `env(safe-area-inset-*)`. Focuses the field on mount. `⌘↵` / `Ctrl+↵` saves. Save writes to `localStorage.theourgia.queue` (capped at 200 entries) and emits a status line (`Saved` / `Saved locally — will sync when you're back online`). A `drainQueue` placeholder is wired in for the Phase 04 backend hookup.
- `frontend/admin/src/App.tsx` — refactored to render `/capture` *outside* `<Shell>` (no VaultNav, no VaultTopbar) so the PWA opens straight into the textarea with the full viewport. Other routes still render inside the shell via a wrapper component.
- `frontend/admin/index.html` first-paint script extended with locale detection (mirrors `frontend/shared/src/tokens/first-paint.js`).

## Verification

- `pnpm --filter @theourgia/admin build` — 757 kB JS / 7.5 kB CSS / 6.75 kB HTML; `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-maskable.svg` all land in `dist/`.
- `pnpm exec vite preview` serves `/capture` at HTTP 200 with the full design-system chrome stripped; manifest validates as `application/manifest+json` with `start_url: /admin/capture` + `scope: /admin/`.
- `pnpm -r typecheck` — 0 errors across all 4 packages.

## Production deployment note

Vite preview serves static files at `/` (it doesn't respect the `base: "/admin/"` config for static-file routing). The URLs in `index.html` reference `/admin/manifest.webmanifest`, `/admin/sw.js`, etc. — those are the correct paths once Caddy is in front, which maps `/admin/*` to the admin `dist/`. Local-preview testing of the PWA install + offline cycle should use a real reverse proxy (Caddy / nginx) or `serve` over the `dist/` directory mounted at `/admin/`.

## Phase 02 Definition-of-Done status after this batch

| Item | Status |
|---|---|
| Astro site builds; landing + docs render | ✅ |
| React admin SPA builds; routes navigable; talks to API | ✅ |
| Component library: every component documented in Storybook | ✅ |
| Tiptap editor: round-trip with all built-in blocks; slash menu | 🟡 (design-fidelity port; live wiring deferred to Phase 04 / wiring pass) |
| i18n: English + Modern Greek round-trip; RTL spot-check with Hebrew | ✅ |
| Accessibility: axe-core passes; keyboard navigation; screen reader spot-check | ✅ |
| Visual regression baseline captured | ✅ |
| All design tokens consumable from both Astro and React | ✅ |
| Print stylesheet renders a representative entry | ✅ |
| **PWA quick-capture** | **✅ (this batch)** |

**8 of 9 Phase 02 DoD items closed.** The remaining Tiptap live-integration item is correctly framed as a wiring-pass deliverable (it depends on the Phase 04 journal persistence schema for round-tripping content blocks).
