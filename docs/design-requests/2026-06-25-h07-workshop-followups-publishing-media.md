# Design Handoff Request — H07 (Workshop follow-ups + Tier 5: Phase 10 Publishing + Phase 11 Media)

**Date opened:** 2026-06-25
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Scope rationale:** H06 (Tier 4 · Phases 08 + 09) covered ten surfaces. The build side burned through it faster than expected — the H06 foundation (tokens · VaultNav restructure · `LinguisticTabs` · `AnalyticsTabs`) landed in one batch (`e5b6583`), with the ten surface ports queued one-per-batch behind it. **This request is intentionally larger than H06** so that several sprints of frontend work proceed without a designer-blocked pause. Three thematic clusters (~21 surfaces) shipped together would unblock the build side for an estimated 6-8 weeks.

**Format expected:** Per-surface `.dc.html` files + `agent_data_and_components_H07.md` supplement + `agent_onboarding_H07.md` supplement, dropped into `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H07/handoff_H07/`. Same folder convention as H05 / H06.

---

## How to read this document

This handoff **locks every product decision**. The designer is not asked to choose between alternatives; the designer's job is to render the locked decisions with the project's voice and visual rigor — exactly as H04 + H05 + H06 filled their locked structure with `.dc.html` surfaces.

Where this document says "the surface holds X", X is required and non-negotiable. Where it says "the editorial voice fills the slot", the designer writes the prose to the project's style guide within the slot.

If a question genuinely remains open after this document, raise it back to the build side — **do not pick a direction yourself**.

---

## What just shipped (the context the designer inherits)

Since the H06 request was opened (2026-06-23), the build side closed:

- **Phase 07 backend** (B103-B107) — five domain models (sigil · magic_square · talisman · circle · tool · altar · voce_magicae · voce_recording) across Alembic 0033 → 0037. 152 new tests. 7 Agrippa planetary squares + 5 PD circle presets + 32 PD voces (PGM + Sefer Yetzirah + Lemegeton + Heptameron + Sanskrit) ship as immutable constants.
- **B108 — Workshop frontend wiring** — `frontend/shared/src/api/types.ts` + `endpoints.ts` mirror every Phase-07 schema. Five of six Workshop surfaces persist live: Sigil · Magic Squares · Voces · Magical Circle · Talisman. Sealed talismans round-trip through the new `crypto/vaultCrypto.ts` substrate (PBKDF2-SHA256 @ 600k iterations + AES-256-GCM with embedded per-row salt). The passphrase never leaves the device.
- **H06 received + foundation in** — bundle at `/home/sophia/design-handoffs/theourgia/2026-06-25-H06/handoff_H06/`. Tokens (`--chart-1…6`), VaultNav restructure, `LinguisticTabs` (4 tabs), `AnalyticsTabs` (3 tabs) shipped at commit `e5b6583`. The ten H06 surface ports are queued.

**Test counts at H07 open:** 1748 vitest passing · 557/557 visual · 543/557 a11y (97.5%) · 1625 backend tests · Alembic at 0037.

**Repo state to inspect before designing:**

- All tokens in `frontend/shared/src/tokens/theourgia.tokens.css` — including the new `--chart-1…6` family added with H06.
- The H05 Workshop surfaces in Storybook — the Tool Registry create modals (surfaces 1-2 below) compose with the registry's existing visual language.
- The H06 surface bundle (10 `.dc.html` files) at `/home/sophia/design-handoffs/theourgia/2026-06-25-H06/handoff_H06/`. The Per-Study Page in particular is the worked example for "long-form content + Tiptap editor + chart palette" — Phase 10's book editor surfaces should feel like its long-form cousins.
- The Editor surface (`/editor`) with all 8 custom block nodes live — Phase 10's Publication Editor surfaces compose the same Tiptap editor for chapter bodies.
- The Daily Practice tracker + Practice Logs at `/daily-practice` + `/practice-logs` — the Phase 11 audio library surface composes with these (linking a recording to a working).

---

## Carry-forward standing rules (numbers 1-14 unchanged from H06)

These survive every sprint and override any later design instinct.

1. **Token-first.** Every value comes from `theourgia.tokens.css`. New tokens added only when the existing palette genuinely cannot express a need; new tokens land in the H07 supplement with a one-line rationale.
2. **`--danger` is reserved for the Visibility → Public downgrade rung — nothing else.** Phase 10 has potential red-flag moments (revoking access, refunding a purchase, taking down a publication). These use **`--warn` family**, NOT `--danger`. The user has been emphatic about this for every prior sprint.
3. **Tradition-neutrality at the chrome level.** Theme tokens (`hellenic`, `thelemic`, base + dark/light) override the palette. Phase 10 publishing surfaces will be public-facing; the designer must not let any single tradition's typography dominate the chrome of those public pages.
4. **`.dc.html` is the source of truth.** Match exactly per the per-component ritual (section inventory · CSS var cross-check · verbatim editorial copy · default state · variant completeness · `--danger` audit). Expand dev numeronyms in user-facing labels.
5. **Sealed-content discipline.** Anything backed by encryption defaults sealed and shows count only — zero plaintext leak. Use the `--seal*` family for the chrome. Applies to: sealed entries that appear in publications (must NOT be readable), sealed media (count-only in galleries), sealed pilgrimage sites (count-only on the map).
6. **Wellbeing copy is verbatim from designer.** Never red even for "negative" states. Opt-in only, off by default.
7. **Citation chrome on every traditional artefact.** When a surface displays text/imagery the practitioner did not author, the source surfaces via the `‡` `CitationKindBadge` from B54. Phase 10 books and Phase 11 media that include public-domain reference material must carry it.
8. **Ritual / committed-make moments.** Any H07 surface that produces a permanent artefact (a published book, a paid product, a public pilgrimage map) treats publication as a deliberate moment. Re-publishing an already-public work is an explicit "publish a new version" affordance, not a silent overwrite.
9. **Quiet stats.** Where a surface shows accumulated work or numerical findings ("47 purchases this month", "23 photos in this gallery"), the chrome is muted: small number + `--ink-mute` label. No celebration, no badges, no streaks. **Doubly important on Phase 10 — money is the most common trigger of UX gamification.**
10. **Honesty rules** (H07-specific elaborations spelled out per surface).
11. **WCAG 2.2 target-size floor.** Every interactive element ≥ 24×24 px. Tiny inline buttons are no longer acceptable.
12. **Body color inherits.** The body rule in `theourgia.shared.css` establishes `color: var(--ink); background: var(--bg)`. Surfaces should NOT rely on element-level `color` declarations to "fix" black-on-dark.
13. **Editor block embed parity.** Where any H07 surface produces an artefact that can also appear *inside* the Editor's body, there is already a Tiptap node for the block form. Examples spelled out per surface.
14. **Scientific illuminism stance, not oracular.** Carried forward from H06 — Phase 10 publication stats + Phase 11 media counts must follow the same n-shown / no-gamification rules.

## New cross-cutting rules earned in B108 + H06 implementation

15. **Mode B encryption is now a substrate.** `frontend/shared/src/crypto/vaultCrypto.ts` ships PBKDF2 + AES-GCM with an in-band salt envelope. Any H07 surface that produces a sealed artefact (a sealed publication PDF, a sealed media attachment, a sealed pilgrimage location) uses this substrate. Passphrase capture follows the H05 pattern: an in-dialog passphrase input with `autoComplete="new-password"`, Save disabled until non-empty, help copy "Encrypts on this device only. The passphrase is never sent to the server."
16. **Surface ↔ route contract.** Every save callback emits a payload that maps 1:1 to the backend `Create<Domain>Input`. The Workshop wiring proved the pattern: surface generates SVGs and structured composition, route is a thin mapper to `apiMethods.create<Domain>`. Phase 10 + 11 surfaces follow the same shape.
17. **Real money is sober.** Phase 10 publishing surfaces handle payments. The chrome must NOT use celebratory language for transactions ("Cha-ching!", "You earned $X!"). Receipts are matter-of-fact. Earnings are reported as quiet stats. Refunds are not framed as failures.

---

## Backend status going in

**Phase 07 backend ✅ shipped.** **Phase 08-09 backends unbuilt** (H06 surfaces land first, then backend). **Phase 10 backend unbuilt.** **Phase 11 backend unbuilt.**

`plan/10-publishing-and-monetization.md` and `plan/11-media-library.md` enumerate the tables the build side anticipated. The designer is not bound to that anticipation. If a `.dc.html` requires a column the plan did not anticipate, the build side will add it during implementation. Conversely, if the designer's `.dc.html` does not use a column the plan anticipated, the build side drops it.

The only architectural choices already locked at backend level:

- **Stripe Connect** uses **standard accounts** (NOT express). Each practitioner's sales go to their own Stripe account; Theourgia takes no cut. The designer renders the Stripe onboarding hand-off and the connection-status UI; Stripe handles the rest in their hosted flow.
- **DRM-free always.** No platform-level DRM on PDFs / EPUBs. Optional polite-watermarking with buyer email may appear in a publication's footer. The designer must not introduce DRM-feeling chrome (no "view limit" badges, no "license check" interstitials).
- **EXIF stripped by default.** Phase 11 uploads strip EXIF metadata on ingest. A per-upload toggle lets the practitioner opt to retain it; the toggle is OFF by default. The designer renders the toggle but does NOT default it to ON.
- **Pilgrimage map location precision is user-configurable per-site.** A site may be saved at exact coordinates, district-level (~1 km), region-level (~10 km), country-level, or unmapped. Default is region-level. The map view honors the recorded precision — does not auto-upgrade to exact even if exact is stored.
- **Newsletter subscribers are double-opt-in.** No "magic link to claim" without an email confirmation step. The designer renders the confirmation-pending state.
- **Network publishing (cross-hub) is OUT OF SCOPE for H07.** Phase 12 (Federation) handles cross-vault publication discovery. H07 designs per-vault publishing only — but plans data shapes so a future federation aggregator can read them without backfill.

---

## What needs design — the 21 surfaces in three clusters

### Cluster A · Workshop follow-ups (3 surfaces · Phase 07 carry-over)

The H05 Workshop bundle deliberately scoped only the registry-view + composition surfaces. Three follow-up modals are needed before the Workshop frontend is fully closed.

---

### 1. `Theourgia New Tool.dc.html` (modal)

**Why this surface exists:** The H05 `Tool Registry` surface emits an `onNew(view="tools")` intent when the practitioner clicks the "+ New tool" CTA, but provides no in-surface form for field capture. B108-2e queued this modal.

**Layout:** Centered modal (~520px wide). Scrim with a single dismiss path (Esc / scrim click / Cancel button).

**Fields the modal collects (in order):**

1. **Name** — text input, required, max 240 chars.
2. **Kind picker** — radio-style grid of the 14 ToolKind values (athame · wand · chalice · pentacle · censer · bell · sword · lamp · mirror · bowl · statue · robe · cingulum · other). Each kind shows its sprite icon + label. "Other" reveals a free-text name field below.
3. **Materials** — chip-style tag input (typing "+ Enter" creates a new chip). Optional.
4. **Dimensions** — a fieldset with four labeled number inputs: `length_cm`, `width_cm`, `height_cm`, `weight_g`. All optional.
5. **Provenance** — multi-line text (max 1000 chars). Optional.
6. **Acquisition date** — `<input type="date">`. Optional. Defaults blank.
7. **Current location** — single-line text (max 480 chars). Optional. Placeholder copy: "On the working altar · in the cupboard · …"

**Consecration is NOT a field on this modal.** Per the H05 honesty rule, consecration is set only via the `/tools/{id}/consecrate` sub-resource and requires linking to a real working entry. The modal's footer mentions: "Consecration is recorded separately — link a working entry from the tool's detail view."

**Validation:** Save is disabled until Name + Kind are filled. Empty optional fields submit as `null` (not empty string).

**Honesty rules:**

- Photos are NOT uploaded from this modal. Per the H05 split, photo capture is a separate affordance on the Tool detail view — keeps the create modal small and the upload flow consistent with Phase 11.

**Editorial voice slot:** Modal title is "New tool". Save button is "Save to vault". Cancel is "Cancel". Footer microcopy as above.

---

### 2. `Theourgia New Altar.dc.html` (modal)

**Why this surface exists:** Analogue of (1) for altars.

**Layout:** Centered modal (~520px wide).

**Fields:**

1. **Name** — text input, required, max 240 chars.
2. **Description** — multi-line text (max 2000 chars). Optional.
3. **Permanent altar** — toggle switch. Default OFF (matches backend `is_permanent: false`). Help copy: "Permanent altars carry forward across workings; temporary altars belong to one occasion."
4. **Tools** — a multi-select chip picker drawing from the practitioner's existing tools (the registry list). Empty state: "No tools yet — add some on the Tool Registry first." Selection is reorder-able; the order persists as the render order on the diagram.
5. **Arrangement diagram (optional)** — drag-drop SVG upload area, OR "Skip for now" link. Maximum 1 MB. Help: "Sketch from above; orient north up. Optional."

**Honesty rules:**

- Linked workings are NOT captured in this modal. Adding a working link happens from the altar's detail view (same pattern as tool consecration).

**Editorial voice slot:** Modal title "New altar". Save button "Save altar". Permanent toggle copy as above.

---

### 3. `Theourgia Custom Square Builder.dc.html` (modal)

**Why this surface exists:** The H05 `Magic Squares` surface ships seven Agrippa planetary squares + a "Custom" placeholder. The custom path is currently a generator (the surface auto-generates a valid n×n square for whatever order the practitioner picks). Practitioners need a way to **author** a custom square cell-by-cell so they can save their own (e.g., reconstructing a square from a manuscript). The B91 → B92 "Save as sigil" cross-surface handoff already supports planetary squares; this modal extends it to custom squares so the Sigil Generator can use them in Kamea mode too.

**Layout:** Centered modal (~640px wide).

**Fields:**

1. **Name** — text input, required, max 240 chars.
2. **Order** — radio buttons 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10 / 11 / 12. Default 4. Selecting an order re-builds the editable grid below.
3. **Editable grid** — n×n grid of number inputs (1-based, max value n²). Each cell defaults to 0. The grid is keyboard-navigable: Arrow keys move between cells; Tab moves left-to-right and down.
4. **Live magic-constant feedback** — quiet stat under the grid showing: `Row sums: 15 · 15 · 15 ✓` (each row sum, with ✓ if equal to n(n²+1)/2). Same for columns and both diagonals. Failing sums render in `--ink-mute`, not `--danger`. **This is observation, not validation gating.** Save is allowed even when sums don't align; the row's `is_magic: false` is recorded honestly.
5. **Attribution** — single-line text (max 480 chars). Optional. Help copy: "If this square is from a published source, cite it here."

**Honesty rules:**

- "Save" is not "Save as valid magic square." The server stores whatever cell values the practitioner enters and computes `is_magic` separately. A square with `is_magic: false` displays an `--ink-mute` "Sums do not align" note in the registry list — never `--danger`.
- The H05 "Save as sigil" cross-surface handoff currently refuses custom squares (queued in the resume-state list). This modal's existence unblocks that — the Sigil Generator's Kamea mode will accept any saved magic square (planetary fixture or custom).

**Editorial voice slot:** Modal title "Build a magic square". Save button "Save square". Help copy as above.

---

### Cluster B · Phase 10 — Publishing & Monetization (10 surfaces)

These extend the H02 Editor experience to publication artefacts. Phase 10 is about the practitioner choosing to bring their work outside their private vault.

The publishing experience must feel different from the journal experience: journal is sacred + private + ungated; publishing is public + considered + sometimes paid. Tone is **considered**: every committed moment (publishing, pricing, refunding) is treated as a deliberate ritual moment, not a quick click.

---

### 4. `Theourgia Publications.dc.html`

**Why this surface exists:** Per-vault index of every publication (books · essays · posts · pages). The vault owner's home for "everything I've published or am drafting."

**Layout:**

- Topbar: title "Publications" + subtitle "Books · essays · newsletters from this vault" + theme/mode switcher (same as H06 surfaces).
- Filter row beneath: All / Drafts / Published / Paid / Free / By type chips.
- Main: card grid of publications. Each card shows: cover image (or generated typographic cover from title), title (`--font-display`), author(s), publication kind chip (book · essay · post · page), state chip (draft · scheduled · live · withdrawn), price (or "Free"), purchase count (only if paid and live; quiet stat), `‡` if licensed CC / PD.
- Empty state: a sober two-line illustration + copy: "No publications yet. Start with an essay — it composes from any working you've already written." + CTA "Start a new essay."
- "+ New publication" CTA top-right opens a picker: Book · Essay · Post · Page.

**Honesty rules:**

- A "withdrawn" publication is NOT deleted. The card shows it as `--ink-mute` with a "Withdrawn" chip; the backend retains the row and the purchase records for any buyers. Withdrawn is a soft state, not a destroy.
- The purchase count is a **quiet stat** — no celebration even when the number is high.

**Editorial voice slot:** Each chip's label + the empty-state copy.

---

### 5. `Theourgia Publication Editor.dc.html`

**Why this surface exists:** Compose the body of a publication. The Tiptap editor from B97-B100 is the substrate; this surface wraps it with publication-specific chrome (title, cover, table of contents for multi-chapter books, autosave indicator).

**Layout:**

- Topbar with title + breadcrumb back to Publications + autosave indicator (the same component pattern as the Editor surface's body autosave).
- Left rail (260px, collapsible to icon-only): chapter list (for books; absent for single-body kinds). Drag-reorder. "+ Add chapter" CTA.
- Main: the Tiptap editor (full-width within main column, ~720px content area). Includes ALL 8 custom block nodes from B97-B100 (`ritualLog`, `quoteCitation`, `gematria`, `sensation`, `entityRef`, `sigil`, `chart`, `divination`).
- Right rail (300px, collapsible): publication metadata — cover image upload, summary (3 sentences max), language picker, license picker (CC-BY / CC-BY-SA / CC-BY-NC / CC-BY-NC-SA / CC-BY-ND / CC-BY-NC-ND / All rights reserved / Public domain / Custom), tag chips.
- Footer status bar: word count · chapter count · last saved · publish state chip.

**Honesty rules:**

- The editor displays sealed entries the practitioner references in their publication via the `entityRef` or `gematria` blocks as a `[sealed checkpoint · count only]` block. Sealed content does NOT auto-decrypt to be included in a public publication. The author must either (a) explicitly unseal and copy-paste, or (b) accept the count-only embed.
- Save state is the same debounced auto-save from B99b. No "Saved!" celebration toast on every keystroke — the autosave indicator goes from `Saving…` to `Saved` to invisible.

**Editorial voice slot:** Chapter list empty state. License picker help text per option.

---

### 6. `Theourgia Publication Settings.dc.html`

**Why this surface exists:** Once the body is drafted, the practitioner configures **how** it ships: visibility, scheduling, attribution.

**Layout:** Single-column form (~720px). Sections separated by hairline rules.

**Sections:**

1. **Identity** — title, slug (auto-derived from title, editable), authors (multi-select from the vault's identity table — supports multi-author on a single publication).
2. **Cover & summary** — cover image (drag-drop, accepts SVG / JPEG / PNG / WebP), summary (3 sentences, character count shown), reading-time estimate (computed, displayed as quiet stat).
3. **Schedule** — radio: "Publish now" · "Schedule for…" (datetime picker). Help copy: "Scheduled publications appear in your vault's public face at the chosen moment."
4. **Distribution** — checkboxes for what feeds the publication appears in: vault's public catalog · RSS · ActivityPub announcement (Phase 13 stub — disabled with "Available when Federation ships"). Newsletter-include toggle if newsletter is connected.
5. **Discoverability** — language, tags (overlap with editor rail; this is the canonical source), tradition tags (drawn from the practitioner's traditions; multi-select).

**Honesty rules:**

- The slug field shows a small `‡`-style chip near it: "URLs are stable forever — pick a slug you can live with." There is no "regenerate slug" once a publication has been live (this is a soft hint, not an enforced lock; the backend allows changes but issues a 301 redirect from old to new).
- Tags vs tradition tags are distinct. Free-text tags are practitioner-coined; tradition tags are picked from a controlled list of named traditions in the vault — to avoid drift.

**Editorial voice slot:** Section headings, help copy, scheduling description.

---

### 7. `Theourgia Pricing & Distribution.dc.html`

**Why this surface exists:** The publication's commercial settings. This is the sober-money surface.

**Layout:** Single-column form (~720px).

**Sections:**

1. **Pricing model** — radio: "Free" (default) · "One-time purchase" · "Pay what you wish" · "Subscribe to read" (only available if the practitioner has subscription tiers configured).
2. **Stripe Connect status** — embedded card showing connection state:
   - **Not connected** — explainer text + "Connect Stripe" CTA (links to Stripe Connect onboarding in a new tab); Stripe-required disclosure: "Sales go directly to your Stripe account. Theourgia takes no cut."
   - **Connected, awaiting verification** — `--info-soft` card with the Stripe-side requirements list (verbatim from Stripe's API).
   - **Active** — `--seal-soft` card with the connected account email + "Disconnect" link in `--ink-mute`.
3. **Price** — currency picker (USD · EUR · GBP · CAD · AUD · JPY) + amount input. For "Pay what you wish": min amount + suggested amount.
4. **Refund policy** — radio: "Standard 14-day full refund" (default) · "No refunds" · "Custom policy" (text area). Help copy: "Refunds are issued via Stripe directly; Theourgia does not retain payment data."
5. **Watermarking** — toggle: "Add buyer's email to the publication footer (polite reminder, not DRM)". Default OFF. Help: "DRM-free always. This is a courtesy attribution, not a lock."

**Honesty rules:**

- "No refunds" copy carries a help line: "Some jurisdictions require statutory refund rights regardless of the seller's policy. Check your local consumer protection law."
- The watermarking toggle's default is OFF and the help copy actively de-emphasizes it. Theourgia is DRM-free; this toggle exists for practitioners who want it, not as a recommended default.

**Editorial voice slot:** Stripe disclosure copy, refund-policy help, watermarking help.

---

### 8. `Theourgia Reader.dc.html` (public-facing surface)

**Why this surface exists:** The reader experience for a published book or essay. Public, no auth required (or auth-required if "Subscribe to read"). Reads PDF for downloadable publications, renders Tiptap HTML for in-browser publications.

**Layout:**

- Topbar with the publication's title + author + a small Theourgia footer ("Published via Theourgia · author's vault"). The chrome is intentionally minimal — the publication's typography dominates.
- For Tiptap-rendered publications: typography-first layout, generous line-length (66 char measure), `--font-serif` body, drop caps optional. The chrome is sparse (no sticky topbar; reading is uninterrupted).
- For PDF publications: an in-browser PDF viewer (PDF.js or analogue) with download CTA.
- Right rail (only when viewport is wide and the user is signed in to a Theourgia vault): "Read more from this vault" — three other publications by the same vault.
- Footer: license + author byline + (if watermarked) buyer email + "Powered by Theourgia (AGPLv3)".

**Honesty rules:**

- The reader surface **does not track read state** by default. Per the privacy ethos, no "X% read" indicator unless the reader is signed in AND has opted into reading stats on their vault settings.
- For paid publications: the download CTA shows "Download · $X.XX" if the user has not purchased; clicking opens Stripe Checkout. Once purchased (Stripe webhook lands), the CTA becomes "Download". The cryptographically signed download URL is single-use; rebuilding it requires Stripe Customer Portal access.

**Editorial voice slot:** Footer attribution copy. "Read more from this vault" eyebrow.

---

### 9. `Theourgia Subscription Tiers.dc.html`

**Why this surface exists:** Recurring monthly support for a practitioner's ongoing publications (newsletters · podcasts · paywalled essays). Per the project ethos, tiers are gated content; they are NOT exclusive merchandise.

**Layout:** Single-column form (~720px). Sections separated by hairlines.

**Sections:**

1. **Connect Stripe** (same component as surface 7 §2).
2. **Tier list** — sortable list of tiers (~3 max recommended; the form supports up to 5 but warns above 3 with a quiet stat: "Practitioners with 1-3 tiers convert higher than those with more"). Each tier card has:
   - Tier name (e.g., "Witnesses", "Patrons", "Stewards") — editable
   - Monthly price + annual price (annual = monthly × 10 by default; editable)
   - Description (2-3 sentences) — what subscribers get
   - Included publications — multi-select from existing Subscribe-to-read publications
   - Reorder handle (drag) — order is display order on the public page
   - "Disable tier" toggle — disabled tiers do not appear on the public page; existing subscribers continue to receive their content
3. **Pause subscriptions** — toggle at the bottom: "Pause new subscriptions" + help copy "Existing subscribers continue to access their content. New signups are turned off."
4. **Public preview** — a small live preview of how the tier table appears on the public vault page.

**Honesty rules:**

- Subscription metrics (active count, MRR) are NOT on this surface. They appear on the Subscribers Dashboard (surface 10) as quiet stats only.
- Annual price defaults to a 2-month discount (price × 10) but the practitioner can override to no-discount or steeper-discount.

**Editorial voice slot:** Tier naming guidance ("Practitioner-coined; avoid 'Bronze/Silver/Gold' gamification language"). Pause-subscriptions help copy.

---

### 10. `Theourgia Subscribers.dc.html`

**Why this surface exists:** The vault's view of its subscribers. Sober dashboard, no leaderboard, no engagement scoring.

**Layout:**

- Topbar with title + subtitle + theme/mode switcher.
- Top row of quiet stats (4 cards): Active subscribers · Monthly recurring revenue · Lifetime revenue · Churn (rolling 30-day).
- Below: data table with columns: Subscriber email (or magickal name if linked to a Theourgia vault) · Tier · Active since · Status (active · paused · cancelled · failed payment).
- Filter chips above the table: All · Active · Paused · Cancelled · Failed payment.
- Per-row action menu (kebab): View Stripe customer link · Manually refund (opens Stripe portal) · Mark as test subscriber (excludes from MRR stats).
- Footer: small `‡` chip linking to "Subscriber data is in your Stripe account — Theourgia does not retain payment data beyond webhook events."

**Honesty rules:**

- "Failed payment" subscribers are shown in `--warn` (NOT `--danger`). Stripe handles dunning; the surface reports state, doesn't drive action.
- The "Manually refund" action does NOT execute inline. It opens the Stripe Customer Portal — refunds happen in Stripe's environment, by design.

**Editorial voice slot:** Quiet-stat labels. Footer `‡` text. Filter chip labels.

---

### 11. `Theourgia Newsletter Editor.dc.html`

**Why this surface exists:** Email-channel publication. Composed in the same Tiptap editor, with newsletter-specific delivery chrome.

**Layout:** Mirror of surface 5 (Publication Editor) but with a different right rail:

- Right rail (300px): **Newsletter metadata** — subject line (with character-count quiet stat targeting "≤ 60 chars for previews"), preview text (the snippet after the subject in most email clients), recipient list (radio: All subscribers · A specific tier · A test list), send mode (radio: Draft · Schedule · Send now), reply-to email.
- Below the rail: a "Test send to me" CTA that delivers a single-recipient preview to the practitioner's own email.

**Honesty rules:**

- "Send now" is a committed-make moment. The CTA opens a confirm modal with the recipient count + the first 3 lines of body + "Send to N subscribers" confirm button. NO `--danger` styling — this is consequential but not destructive; use `--warn-soft` background.
- Scheduled newsletters can be cancelled before send time but not after. The Schedule path shows the deadline in the practitioner's local timezone with a "Cancel before X" note.

**Editorial voice slot:** Confirm modal copy. Test-send CTA label. Send-mode help copy.

---

### 12. `Theourgia Per-Vault Public Page.dc.html` (public-facing)

**Why this surface exists:** Every vault has a public face — magickal-name's published works, optional bio, subscription tier table, RSS feed link. This is the surface a non-Theourgia visitor lands on.

**Layout:**

- Top: vault hero — magickal name (`--font-display`, large), optional pronouns line, optional one-paragraph bio, optional links (website / mastodon / etc.).
- Below: tabs: Publications · Newsletter · Support.
  - **Publications**: grid of public publications (cover · title · author · price/free chip · `‡` if PD/CC). Sortable: Newest · Oldest · Popular (only if practitioner opts in to public popularity stats; otherwise the option is hidden).
  - **Newsletter**: signup form (email input + tier picker if tiered + double-opt-in disclaimer) + recent issues list (the most recent 5).
  - **Support**: subscription tier table (rendered from surface 9), one-time tip jar option (if the practitioner enables it on Pricing).
- Footer: "Hosted on Theourgia · AGPLv3" + the vault's chosen license badge.

**Honesty rules:**

- The "Popular" sort is opt-in per the practitioner's vault settings. Default is "Newest" with "Popular" hidden.
- Email signup is double-opt-in: the form acknowledges submission with "Check your email to confirm" — no claim that the user is subscribed until confirmation.

**Editorial voice slot:** Hero bio placeholder, tab labels, signup confirmation copy, footer credit.

---

### 13. `Theourgia Print Preview.dc.html`

**Why this surface exists:** Book-grade print-quality preview. A practitioner publishing a book wants to see what a print-on-demand PDF would look like before exporting.

**Layout:** Center-and-fit page-spread renderer.

- Top toolbar: page-size picker (US Letter · US Trade 6×9 · UK Royal Octavo · A5 · A4), trim/bleed indicator toggle, page-number toggle, chapter break style picker, font-substitution warnings (if any glyphs in the manuscript don't ship with the chosen body font).
- Centre: scrollable spread view (always shows two pages side-by-side, like an open book; first/last page is single-side).
- Right rail: typography settings — body font (limited to `--font-serif`, `Cardo`, `Frank Ruhl Libre`, `GFS Didot`, `Cinzel`, plus uploaded custom-font dropdown), heading scale (3 presets: Compact · Standard · Generous), drop caps toggle, footnote style (Inline · Margin · Endnotes).
- Export CTA (footer): "Export print PDF" — opens a job (showing progress; long-running, may take 30-60s).

**Honesty rules:**

- Font-substitution warnings are observational, not gating. They say "These glyphs in your manuscript are not available in your chosen body font: [list of 3 characters]. They will be rendered in the substitution font [Noto Sans Symbols by default]." The export still succeeds.

**Editorial voice slot:** Substitution-warning copy. Heading-scale preset names.

---

### Cluster C · Phase 11 — Media Library (8 surfaces)

Phase 11 is the texture of practice — photos, audio recordings, video, the landscape of pilgrimage. The library must feel like an archive (sober, organized, attentive) rather than a feed (timeline, sticky-attention).

---

### 14. `Theourgia Media Library.dc.html`

**Why this surface exists:** Per-vault index of every media asset. The vault's home for "everything I've captured."

**Layout:**

- Topbar with title + filter row.
- Filter row: type chips (All · Images · Audio · Video · Documents · Sealed-only-shown-as-count), search input ("Search captions, alt-text, tags…"), sort dropdown (Newest · Oldest · Largest · Captured-at order if EXIF retained).
- Main: a responsive grid (~6 columns at 1440px, scales down). Each card shows: thumbnail (or generic glyph for non-image), filename, captured-at if available, duration if audio/video, size, sealed chip if encrypted, link-count quiet stat ("linked to 3 workings").
- Empty state: "Drop files here to start your media library" + drag-drop catch zone behind the whole grid.
- "+ Upload" CTA top-right opens surface 16.

**Honesty rules:**

- Sealed media is shown as a count-only placeholder card (`--seal-soft` background + "Sealed media · 3 files" label). The practitioner can NOT see thumbnails of sealed images from the library — they must open the detail view to decrypt.

**Editorial voice slot:** Empty-state copy. Filter chip labels.

---

### 15. `Theourgia Media Detail.dc.html`

**Why this surface exists:** Single-asset focused view. Different layouts for image vs audio vs video, but shared chrome.

**Layout (image variant):**

- Left/centre: lightbox-style viewer with prev/next nav, zoom, fullscreen toggle.
- Right rail (340px): metadata — filename, dimensions, mime, size, captured-at (with EXIF chip if EXIF was retained), uploaded-at, location chip (if location stored and not sealed), tags, alt-text, caption, sealed toggle (with the SealUnlock substrate), linked workings + entries + entities (multi-select chips).
- Below the viewer: an "Annotations" tab — markers can be placed on the image with notes ("this is where I placed the sigil"). Markers persist as data on the asset.
- Image-manipulation tools (small): crop · rotate · brightness/contrast. Non-destructive; edits saved as named variants.

**Layout (audio variant):** Waveform player with timestamp scrubber, transcription panel (if a transcription was uploaded or auto-generated; both optional), same right-rail metadata.

**Layout (video variant):** Embedded video player (HLS for self-hosted; or iframe for federated/Vimeo/PeerTube), chapter markers if defined, same right-rail metadata.

**Honesty rules:**

- Sealed media: the viewer area shows the SealUnlock dialog with the help copy "This media is encrypted. Your passphrase decrypts it on this device only." After unsealing, the asset displays normally; closing the surface re-seals (the decrypted bytes are not cached).
- The `Insert into entry` CTA at the top right embeds the asset as a Tiptap node in a chosen entry. For sealed assets, the embedded reference IS the sealed reference — opening the entry later will require unsealing again.

**Editorial voice slot:** SealUnlock copy. Empty-state caption placeholder.

---

### 16. `Theourgia Upload.dc.html` (modal)

**Why this surface exists:** The ingestion flow. Single modal, multi-file capable.

**Layout:** Wide modal (~720px). Three phases:

1. **Pick / drop** — drag-drop catch zone plus "Choose files…" button. Shows a list of selected files with thumbnails + size + a remove-X per file.
2. **Configure** (per-file) — for each file: alt-text (required for images for a11y; soft-blocking — uploads can proceed with a flag "missing alt-text" but the UI nudges), caption (optional), tags, **EXIF strip toggle** (default ON; help copy: "Strips metadata that could include location. Recommended for any image you may publish."), location precision picker (only when EXIF location is detected: Exact · ~1km · ~10km · Country · Drop entirely), seal toggle (default OFF; passphrase capture appears when ON).
3. **Upload** — progress bar per file + a "Cancel" button. Failed uploads (size limit, mime block) show in `--warn` per row with the reason; the rest proceed.

**Honesty rules:**

- EXIF strip is **ON by default**. The toggle is visible but the off-state requires an explicit action — privacy-by-default.
- Sealed uploads encrypt client-side BEFORE network transfer. The progress bar reflects the local encryption + upload phases distinctly.

**Editorial voice slot:** EXIF strip help text. Per-phase eyebrows.

---

### 17. `Theourgia Audio Library.dc.html`

**Why this surface exists:** Audio-specific browse. Easier than wading through a mixed-media library when you're looking for a specific voce recording or a ritual recording.

**Layout:**

- Topbar + filter row (similar to Media Library but audio-specific filters: type — voce / working / lecture / other; duration buckets — <1min / 1-5min / 5-30min / 30min+; tradition tag filter).
- Main: a list (NOT a grid — audio doesn't benefit from a grid). Each row shows: small play button → embeds an inline mini-player (no modal pop), title (filename or caption), duration, captured-at, linked-voce / linked-working chips, sealed chip if applicable.
- Right rail: a persistent mini-player at the bottom for the currently-playing audio. Persists across navigation within the audio library (so the user can keep listening while scanning the list).

**Honesty rules:**

- Audio that's linked to a sealed voce stays linkable but the underlying voce content is not exposed.
- No "play count" stat. Listening is a private act.

**Editorial voice slot:** Filter-row labels, mini-player accessibility labels.

---

### 18. `Theourgia Pilgrimage Map.dc.html`

**Why this surface exists:** Geographic view of recorded practice locations — pilgrimage sites, places of working, ancestral sites.

**Layout:**

- Topbar with title + subtitle + theme/mode switcher.
- Main: a Leaflet (or equivalent OSS) map filling the centre. Default zoom: practitioner's recorded country (or world if none recorded). Tile provider: OSM (default) with a `‡` attribution chip.
- Markers: one per recorded site. Marker style varies by site kind (sacred site · ancestral · place-of-working · pilgrimage · other). Sealed sites show as count-only "+N sealed sites" badges in their region, NOT as individual sealed markers.
- Right rail (280px, collapsible): site list (filtered to viewport bounds). Click → centres the map + opens the detail (surface 19).
- Floating "+ Add place" CTA bottom-right opens surface 20.
- Privacy controls top-left: precision picker (per-marker view: Show all as recorded · Quantize all to ~1km · Quantize all to ~10km · Quantize all to country · Hide map entirely).

**Honesty rules:**

- Each site's stored precision is honored: markers do not auto-upgrade to higher precision than what was recorded. If a site was saved as "country-level", the marker shows as the country's centroid, NOT as a guessed-exact location.
- The "Hide map entirely" view exists for practitioners who do not want any geographic data persisted-visible to themselves on this device (e.g., shared computer concerns).
- Map tile loads go through OSM. Theourgia does NOT proxy tile requests — there is a `‡` link explaining "Map tiles are fetched from OpenStreetMap. Your viewport is visible to OSM as a normal map user. To avoid this, use 'Hide map entirely'."

**Editorial voice slot:** Privacy-control labels. The `‡` map-tile explanation.

---

### 19. `Theourgia Sacred Site.dc.html` (modal / detail panel)

**Why this surface exists:** Detail view for a single recorded site.

**Layout:** Modal (~600px) OR side panel (slide-in from the right) — designer chooses which feels more natural on the map context.

**Sections:**

1. **Name** + site-kind chip + precision chip ("Stored as ~1km").
2. **Location** — coordinates display (according to stored precision) + small map snippet.
3. **Story** — multi-line text. Optional. The practitioner's notes on the site.
4. **Linked workings** — list of journal entries that reference this site.
5. **Linked media** — small thumbnail strip of media tagged with this site.
6. **Edit / Re-quantize precision** — opens surface 20 with current values pre-filled.

**Honesty rules:**

- Re-quantizing precision LOWER (e.g., from exact to ~10km) is allowed and irreversible-at-the-data-level — the surface warns that the precise coords will be discarded.
- Re-quantizing UPWARD is not allowed (you can't fabricate precision you didn't have). The picker disables higher options than the originally stored precision.

**Editorial voice slot:** Precision-warning copy. Site-kind chip labels.

---

### 20. `Theourgia Add Place.dc.html` (modal)

**Why this surface exists:** The capture flow for a new recorded site.

**Layout:** Modal (~640px).

**Fields:**

1. **Name** — required, max 240 chars.
2. **Site kind** — radio (sacred site · ancestral · place-of-working · pilgrimage · other-with-text).
3. **Location** — one of:
   - Type a search box (free-text geocoder); results show as candidates.
   - Click a point on a small embedded map.
   - Enter coordinates manually.
   - "I don't want to record exact location" — sets precision to country-level only, with country picker.
4. **Precision** — radio (Exact · ~1km · ~10km · Country · Unmapped). Default: ~1km. Help copy: "Recorded precision affects how this place is shown to you AND in any exports."
5. **Story** — multi-line text. Optional.
6. **Linked workings** — multi-select from recent workings.
7. **Seal this site** — toggle. Default OFF. When ON, the SealUnlock substrate is invoked; the site's coordinates + story are encrypted client-side.

**Honesty rules:**

- Default precision is **~1km, NOT exact**. Privacy-by-default.
- The geocoder shows a `‡`-style note "Search is provided by Nominatim (OSM). Your query is visible to them."

**Editorial voice slot:** Precision help text. Geocoder `‡` note.

---

### 21. `Theourgia iCal Feed.dc.html`

**Why this surface exists:** Compose a `.ics` feed of practice events for export to external calendars (Apple Calendar, Google Calendar, Outlook).

**Layout:** Single-column form (~640px).

**Sections:**

1. **Feed name** — text input.
2. **What to include** — checkbox list:
   - Daily Practice reminders (next due, recurring)
   - Working entries (committed-make moments)
   - Pilgrimage / sacred-site reminders (anniversaries)
   - Lunar events (full moons · new moons)
   - Planetary hour markers (the practitioner's chosen tradition's hour boundaries)
   - Custom — text area for cron-like syntax
3. **Visibility** — radio: Private (auth-required URL) · Public (anyone with the URL can subscribe).
4. **Generated URL** — read-only chip showing the iCal URL with a copy button. Below: a regenerate-URL link (invalidates the existing URL).
5. **Connected calendars** — list of clients that have subscribed (rolling 30-day; quiet stat).

**Honesty rules:**

- Sealed entries do NOT appear in iCal feeds — even in private feeds. The sealed checkpoint count is replaced by a single event "N sealed entries today" (count only).
- Regenerating the URL invalidates ALL subscribers — surfaces a confirm dialog.

**Editorial voice slot:** Visibility help text. Confirm-regenerate copy.

---

## What the designer should produce

Mirroring H04 + H05 + H06 deliverable shape:

1. **`Theourgia <Surface Name>.dc.html`** × 21 — one per surface above. Each must render correctly across base / hellenic / thelemic themes and dark / light modes. Compose `VaultNav`, the H06 `LinguisticTabs` / `AnalyticsTabs` (only where relevant), and existing tablists / drawers via `dc-import` where applicable.
2. **`agent_data_and_components_H07.md`** — supplement with TS shapes for the new components, the API sketches the build side will turn into FastAPI routes + Alembic migrations, and any new tokens added. Worked example expected: **Publication Editor** (surface 5) composes the most existing primitives (Tiptap editor + autosave + entity refs + visibility chip) AND introduces the deepest new structure (publication + chapter model + cover upload).
3. **`agent_onboarding_H07.md`** — supplement covering the H07 surface catalog + any new cross-cutting patterns earned during the H07 batch + open questions back to the build side (if any genuinely remain).
4. **`tokens/` (only if new tokens required)** — only when the existing token palette genuinely cannot express a need. Each new token gets a one-line rationale. Likely candidates:
   - `--money-*` family (a sober green / muted gold for transactional confirmation states — NOT `--success`, which carries too much "completion" weight; NOT `--accent`, which is the brand gold).
   - `--map-*` family (marker colours for the four site-kinds).
   - Possibly nothing else — the chart palette + care palette + seal palette should cover most needs.

**Drop location:** `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H07/handoff_H07/`. The build side picks it up automatically on the next session.

---

## What is NOT in this handoff (and why)

- **Federation / cross-vault publication discovery.** Will land with the Federation phase (Phase 12) via an H08 handoff. The H07 designer plans data shapes so a future federation aggregator can read them without backfill, but no UI for cross-vault discovery.
- **ActivityPub publishing surface.** Phase 13 (after Federation). H07 stubs the "Announce on ActivityPub" toggle on Publication Settings but the surface itself is deferred.
- **Plugin registry UI.** Phase 14. H07 does not include plugin / extension surfaces.
- **Refund automation.** Refunds are issued via Stripe's portal, NOT via Theourgia. The surface stub is deliberate.
- **In-app printing of books via a third-party POD service** (e.g., Lulu / IngramSpark API integration). H07 designs the print-preview surface; actual POD integration is a later phase.
- **Comment moderation UI.** Phase 10 plan §6 mentions comments. They're out of scope for H07 — too much surface area; will warrant its own H08+ handoff.
- **Per-vault storage quota UI.** The backend tracks quota; the alert when approaching it is a small banner on Media Library (and the upload modal). A full storage-management surface is deferred.

---

## A nuance on tone the designer must carry

The H07 surfaces span three emotionally distinct domains:

- **Workshop follow-ups** are practical craft surfaces. Tone: matter-of-fact. Same as H05.
- **Publishing surfaces** are considered-output surfaces. Tone: deliberate. Bringing work out of the vault is a meaningful step — the chrome treats it as one, but never as ceremonial in a way that feels performative. **Money is sober.** No celebration in receipts; no "earned!" badges; quiet stats for all numerical reports.
- **Media surfaces** are archival surfaces. Tone: organizational + reverent for sacred sites. The pilgrimage map carries actual weight — it represents real places the practitioner has been. The chrome respects that weight without being heavy-handed.

All three share the wellbeing-adjacent restraint: never breathless, never gamified, never oracular.

The H07 designer is asked to hold this distinction throughout the 21 surfaces. If a publishing-chrome moment feels like Substack's "🎉 Your post is live!" — redesign it. If a pilgrimage marker feels like a video game treasure chest — redesign it. If a media upload feels like an Instagram story preview — redesign it.

The middle path is sober, attentive, and **trusts the practitioner to take their work seriously without performative chrome**.

---

## Cross-cutting tokens already in the codebase the designer should reuse

- `--seal*` family — sealed publications, sealed media, sealed pilgrimage sites
- `--warn*` family — failed payments, missing alt-text nudges, font substitution warnings, scheduled-send confirms (NEVER `--danger` for these)
- `--info*` family — Stripe verification pending state, scheduled publication state
- `--care*` family — wellbeing-adjacent reminders (the rare "you haven't backed up your vault in N days" style nudge — should be care-toned, not warning-toned)
- `--ink-mute` — every quiet stat label
- `--chart-1…6` — already added (H06); reuse for tier visualizations on subscription pages, sales sparklines (sober only), media-kind dispersion charts
- `--ot-*` family — not applicable to H07 (those are Oracle-specific)

If a new colour is needed (likely the money + map families), each one earns one line of rationale in the H07 tokens supplement.

---

## Status check-in cadence

The build side reads this file on each new session and checks `/home/sophia/design-handoffs/theourgia/` for new bundles. When H07 lands, the build side opens the next sprint, wires Phase 10 + Phase 11 backends in parallel with the surface ports (the H05 → Phase 07 backend pattern proved this works without blocking), and updates this document in place with a "Last designer drop received" line.

The H06 handoff is still mid-port (10 surfaces queued behind the foundation that shipped at `e5b6583`). H07 can drop in parallel — the build side will interleave H06 surface ports with H07 once H07 lands, prioritizing whichever cluster the user finds most urgent in the moment.

**Last build-side update:** 2026-06-25 — H07 request opened. Phase 07 backend was fully shipped between H05 and H07 (commits `a17ab36` → `e16a9ed`). H06 foundation shipped at `e5b6583`; 10 H06 surface ports queued.
