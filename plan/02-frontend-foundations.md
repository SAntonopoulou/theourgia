# Phase 02 — Frontend Foundations

> The frontend substrate: Astro for public surfaces, a React SPA for the admin/editor, the Tiptap-based authoring environment, the theming/design-system layer, and the i18n framework. Nothing magickal yet; everything later renders on top of this.

## Goal

Build a production-grade frontend foundation: a content-first public site, a richly interactive admin SPA, a block-based editor extensible by plugins, a design-token-driven theming system, and an internationalization framework. All accessibility, i18n, and multi-script typography requirements come online here.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — provides the API contract

## Deliverables

### 1. Astro public-site scaffold
- Astro 4+ project at `frontend/public-site/`
- Routes:
  - `/` — landing page (marketing copy + scientific illuminism manifesto)
  - `/docs/*` — documentation (Starlight integration or independent)
  - `/v/:vault_slug/*` — per-vault public face (blog, books, public profile)
  - `/h/:hub_slug/*` — per-hub public face
  - `/p/:slug` — publications (books, articles)
- Server-side rendering with edge-cacheable static fragments
- RSS / Atom / JSON Feed endpoints
- Sitemap generation
- OpenGraph + Twitter card metadata
- Reading-mode optimizations (typography, line length, dark mode, print stylesheet)
- Search (client-side initially; server-backed in Phase 04)

### 2. React admin SPA scaffold
- React 19 SPA at `frontend/admin/`, served at `/app/*`
- Routing: TanStack Router (data router with type-safe routes)
- Data fetching: TanStack Query, with the generated API client
- State: minimal Zustand or Jotai for cross-cutting UI state
- Auth integration: session token from Phase 01 → secure cookie + CSRF
- WebSocket client for realtime subscriptions
- Skeleton shell: top nav, side nav, command palette, breadcrumbs, layout regions
- Empty placeholder pages for each major surface (filled in subsequent phases)

### 3. Design system implementation
- Design tokens (from `note_to_design_claude.md` deliverables) wired in as CSS custom properties + Tailwind theme extension
- Component library at `frontend/shared/ui/`:
  - Typography primitives, buttons, inputs, selects, checkboxes, radios, switches
  - Modals, drawers, popovers, tooltips, dropdowns
  - Tables (data tables with sort/filter/pagination)
  - Cards, tags, badges, banners, toasts
  - Layout: stack, grid, divider, scroll-area
  - Navigation: tabs, breadcrumbs, command palette
  - Feedback: spinners, progress, empty states, error states
  - Date/time inputs (multi-calendar aware via Phase 03 hooks)
- All components: keyboard-accessible, ARIA-correct, themeable, RTL-aware
- Storybook (or Ladle) at `frontend/shared/storybook/` documenting every component
- Visual regression testing via Playwright + screenshot comparison

### 4. Tiptap editor foundation
- Tiptap 2+ at `frontend/admin/editor/`
- Built-in marks: bold, italic, underline, strikethrough, code, subscript, superscript
- Built-in nodes: paragraph, headings (1–6), lists, blockquote, code block, hr, image, link, table
- Custom node infrastructure: a `MagicalBlock` base class that plugins extend
- Slash-command menu (`/`) with extensible command registry
- Multi-language input: detection + automatic font/RTL switching per inline span
- Collaborative editing scaffolding (Yjs adapter; multiplayer enabled in Phase 12 for shared rituals)
- Toolbar / floating-menu UI
- Markdown import + export
- Paste handling (rich text and HTML sanitized via DOMPurify equivalent)

### 5. Template / page builder substrate
- Block schema spec: every block is a JSON-serializable node with type + attrs + children
- Drag-and-drop layout primitives (rows, columns, sections) atop `dnd-kit`
- Template store: save / load / share templates
- Themeco-Pro-style visual composer scaffold (full content fills in across Phases 04+)

### 6. Internationalization framework
- `i18next` with namespaces per module
- Translation files under `frontend/shared/i18n/{lang}/{ns}.json`
- Extract-and-merge script to keep translation files up to date with source strings
- Locale switcher in user preferences
- Locale-aware formatting hooks for dates (multi-calendar), numbers, currencies
- RTL detection and layout flipping
- Polytonic Greek, Hebrew with niqud, and Arabic shaping verified

### 7. Accessibility infrastructure
- Reduced-motion media query honored across all animations
- Focus-visible polyfill where needed; high-contrast focus rings
- Screen-reader-only utility class
- Skip-to-content link in layout
- Live regions for async updates
- `axe-core` automated accessibility tests in CI

### 8. Print stylesheets
- Reset for print, with editorial typography
- Page break controls for entries
- Print preview mode in editor

## Design notes

- The editor is one of the most heavily-used surfaces in the product. Invest in its UX even though most content extensions come later.
- Component library must work in **both** Astro islands and the React SPA. Avoid framework-specific globals; pass everything via props.
- Storybook is product documentation for contributors. Treat it like a deliverable, not a dev aid.

## Risks

- **Risk:** React 19 + Astro integration friction. **Mitigation:** Validate with a spike in Phase 00; pin versions; document escape hatches.
- **Risk:** Multi-script typography looks "fine" but is subtly wrong (line-height inconsistency between Greek and Latin, etc.). **Mitigation:** Type-specialist review of specimens before approval.
- **Risk:** Editor performance with large documents. **Mitigation:** Virtual scrolling for the editor; chunked loading for long entries.

## Definition of Done

- [ ] Astro site builds and deploys; landing + docs render
- [ ] React admin SPA builds; navigates between placeholder routes; talks to API
- [ ] Component library: every component documented in Storybook with controls
- [ ] Tiptap editor: round-trip a document with all built-in blocks; slash menu works
- [ ] i18n: English + a second language (e.g., Modern Greek) round-trip; RTL spot-check with Hebrew
- [ ] Accessibility: axe-core passes; manual keyboard navigation passes; screen reader spot-check passes
- [ ] Visual regression baseline captured
- [ ] All design tokens consumable from both Astro and React
- [ ] Print stylesheet renders a representative entry correctly
