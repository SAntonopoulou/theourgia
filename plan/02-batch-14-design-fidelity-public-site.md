# Phase 02 — Batch 14: Design-fidelity rebuild (public site, Starlight docs bridge, modes & print)

> **Scope target:** every public-facing surface ported end-to-end against its `.dc.html`. The Astro public site, the Starlight docs token bridge, the specialized full-bleed modes (Trance, Ritual), and the print sheets. Following the per-component ritual from Batch 13 (now mandatory).
>
> After this batch, the public-facing design surface is locked in. The remaining design-fidelity work is the admin-side: surfaces not in nav (Editor, Identities, Permissions, etc.) — Batch 15.

## What this batch includes

### Public site surfaces (`frontend/public-site`)

| Surface | Route | `.dc.html` |
|---|---|---|
| Landing | `/` | `Theourgia Landing.dc.html` |
| Blog | `/blog` | `Theourgia Blog.dc.html` |
| Essay | `/essay` | `Theourgia Essay.dc.html` |
| Profile | `/profile` | `Theourgia Profile.dc.html` |
| Hub detail | `/hub/[slug]` | `Theourgia Hub.dc.html` |
| Memorial | `/memorial` | `Theourgia Memorial.dc.html` |
| Lineage | `/lineage` | `Theourgia Lineage.dc.html` |
| SSO | `/sso` | `Theourgia SSO.dc.html` |
| Newsletter | `/newsletter` | `Theourgia Newsletter.dc.html` |
| Book | `/book` | `Theourgia Book.dc.html` |
| Style Guide | `/style-guide` | `Theourgia Style Guide.dc.html` |

Each follows the per-component ritual (`.dc.html` + `agent_onboarding.md` § + sibling cross-references + drift list + line-by-line fix). Editorial copy is **verbatim** from the designer.

### Shared chrome

- `components/PublicChrome.astro` — sticky header used by Landing / Blog / Essay (theme cycler + mode toggle + optional Subscribe CTA). Profile / Hub / Lineage / Newsletter / SSO / Book have **identity-scoped** chrome inline (their wordmark is the identity / order / press name, not "Theourgia") — built per surface because the shared chrome would force compromises.

### Decorative SVG ports (verbatim per `feedback_port_decorative_svgs_verbatim.md`)

- **Landing astrolabe** — 72-line outer ring of degree tick-marks at `stroke-width=".6" opacity=".45"` + 12 major spokes at `stroke-width=".8" opacity=".5"` + seven-pointed star + concentric inner rings. Verbatim from `Theourgia Landing.dc.html` lines 127–128 + 130–136.
- **Hub watermark** — pentagram + 2 concentric circles (top-right of hero).
- **Memorial flame** — candle SVG with `@keyframes flicker` 3.4s ease-in-out (paused under reduced-motion).
- **Trance breathing** — concentric circles SVG with `@keyframes breathe` 7s.
- **Print talisman** — 4×4 Jupiter kamea (16 cells), name-ring `textPath`, traced sigil path.
- **Print sigil** — traced sigil path over circles, anchor / endpoint glyphs.

### Demo-name substitutions (per `feedback_github_identity.md` + `user_magickal_name.md`)

The designer's demos put "Sophia" on three public surfaces where it would be the user's legal name on a public-facing page. Per the magickal-name rule, public web copy never carries her legal name. Swapped:

- **Memorial** (`/memorial`): `Sophia` → `Diotima` (1948–2026). Diotima is Plato's wise-woman teacher of Socrates — fits the Hellenic theurgist framing.
- **Lineage** (`/lineage`): `Sophia` → `Theophrastos`. Same identity as Profile, so the public site has one consistent demo persona across Profile + Lineage.
- **SSO** (`/sso`): vault owner + private-name identity → `Aspasia`. Historical Greek figure, fits the Hellenic theme, sidesteps the legal-name overlap.
- **Print sheets** (`/print/ritual-sheet` + `/print/talisman-sigil`): `Sophia · Adeptus Minor` → `Theophrastos · Adeptus Minor`.

Each swap is flagged in a code comment on the file so future readers see the substitution.

### Token additions

- **`--font-greek: "Cardo", serif`** in `frontend/shared/src/tokens/theourgia.tokens.css`. The designer's source declared `--font-greek` in each `.dc.html` `<style>` block; our shared tokens layer didn't define it. Added. Greek runs across Landing / Blog / Essay / Memorial now use `var(--font-greek)` (not `var(--font-display)`).
- **Defensive radius fallbacks stripped**. `var(--r-md, 8px)` / `var(--r-lg, 14px)` → `var(--r-md)` / `var(--r-lg)`. The tokens always resolve through the shared import; the fallbacks were drift.

### Docs site — Starlight token bridge (`docs/site`)

Per `Theourgia Docs.dc.html`'s gotcha note: *"Don't hand-author pages — wire the token theme into Starlight and let content come from markdown."*

- `docs/site/src/styles/theourgia.css` — token bridge:
  - Maps Theourgia surface tokens onto Starlight's `--sl-color-*` API (gray ramp, hairlines, bg/nav/sidebar, accent palette, text variants)
  - Both dark (default) and light variants
  - Editorial typography rules for `.sl-markdown-content` (Cardo headings, Cardo body, mono inline code, bg-sunk pre blocks)
  - Sidebar current-item: accent-soft background + inset accent border
  - TOC active item: accent text + border
- `docs/site/astro.config.mjs` — `customCss: ["./src/styles/theourgia.css"]`
- Starlight `data-theme="light|dark"` continues to own mode. Tradition cycler (Base/Hel/Thel) header override is the remaining follow-up.

### Specialized modes (`frontend/public-site`)

- `trance.astro` — Trance Mode: low-blue-light palette (warm near-black + amber), breathing-circle SVG, drifting ember orb, blinking caret on the scrying line, pause/end controls, live clock. Self-contained `<head>` (full-bleed, no public chrome).
- `ritual.astro` — Ritual Mode: LBRP 7-step script with huge Hebrew + transliteration + meaning per step. Step controls ≥44px touch. Pulsing "Listening" indicator. Keyboard advance (Space / ← / →). Tradition cycler included.

### Print sheets (`frontend/public-site/src/pages/print/`)

- `ritual-sheet.astro` — parchment A4 portrait, LBRP. Real `@page` + `@media print` (strips chrome + parchment surface; ink-economical output).
- `talisman-sigil.astro` — parchment A4 with Talisman ↔ Sigil specimen toggle. Talisman: Jupiter consecration (name-ring `textPath` + 4×4 kamea + traced sigil + correspondences table + consecration rite). Sigil: chaos-magic statement-of-intent + reduced letters + traced sigil + charging-and-forgetting rite. Print CSS hides the inactive specimen.

## Per-surface gotchas worth flagging for future readers

- **Identity-scoped chrome.** Profile, Hub, Lineage, Newsletter, SSO, Book each have their own header inline because PublicChrome's "Theourgia" wordmark would force compromises. If we later extract a shared `IdentityChrome.astro`, every parameter the current inline headers carry has to survive (logo SVG, wordmark, custom nav, custom CTA, theme cycler, mode toggle).
- **Persona-swap pattern (Profile + SSO).** All 3 / 4 personas SSR'd into the DOM. Switching is CSS-driven via `#profile-root[data-who=…]` rules. Inline `display:none` on non-default personas was buggy — the rule hides via `display: none !important` so the active one's natural `flex` / `block` is preserved.
- **Astro `getStaticPaths` runs in isolated module scope** (`feedback_astro_getstaticpaths_scope.md`). Hub detail (`/hub/[slug]`) defines its data array **inside** `getStaticPaths`. Outer-scope const declarations are not visible.
- **Email obfuscator hazard.** Newsletter subscribe input doesn't seed any example address (per `Theourgia Newsletter.dc.html` implementation note: "Keep the email-address placeholder from being mangled by any email-obfuscator").
- **Talisman name-ring `textPath`** uses `textLength="1068" lengthAdjust="spacing"` for even-distribution around the ring per the §10 spec.

## Out of scope (later batches)

- **Admin surfaces not in nav.** Editor, Identities, Lineage admin, Membership, Permissions, Bundles, Bundle Install, Federation, Health, Wellbeing, Workshop, Sandbox, Templates, Scheduler, Oracle, Account, Agents, Transliterate, Book Preview, Newsletter Composer. Batch 15.
- **Docs tradition cycler header override.** Small Starlight customization to add Base/Hel/Thel switcher to the docs header. Pairs with the cycler work in PublicChrome — same wiring, different shell.
- **Real backend wiring** — engines (tarot, I Ching, geomancy, runes, scrying, kamea, gematria, transliteration), ephemeris, tag aggregation, entity citation tracking, hub federation, sigil/talisman persistence, ContentType migration, Identity model, VisibilitySelector ACL, newsletter subscribe endpoint. **Multi-week** wiring pass (own phase or extended Phase 02 tail).

## Acceptance criteria

1. Every public route returns 200 and renders the design without console errors.
2. Editorial copy is verbatim from `.dc.html` (no paraphrases, no substituted phrasing).
3. Greek text uses `var(--font-greek)` and carries `lang="el"`; Hebrew uses `var(--font-hebrew)` + `dir="rtl"` + `lang="he"`; other scripts likewise.
4. Decorative SVGs match the source group-by-group (count the children — see `feedback_port_decorative_svgs_verbatim.md`).
5. No native dialogs; revoke / look-inside flows use themed overlays (`feedback_ui_modals_only.md`).
6. Demo-name substitutions are in place + commented on every surface that needed one.
7. Docs site builds clean (`pnpm exec astro check` → 0 errors).
8. Print sheets paginate to A4 portrait with `@media print` stripping the chrome.

## Memories that landed during this batch

- `feedback_match_design_exactly.md` — non-negotiable design fidelity
- `feedback_port_decorative_svgs_verbatim.md` — Landing astrolabe (originating case)
- `feedback_astro_getstaticpaths_scope.md` — Hub detail dynamic route fix
- `feedback_follow_design_thread_deep.md` — depth rule for the per-component ritual
- Updated `project_resume_state.md` end-of-batch
