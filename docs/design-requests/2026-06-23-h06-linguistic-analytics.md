# Design Handoff Request — H06 (Tier 4 · Phases 08 + 09 — Linguistic Tools + Synchronicity & Analytics)

**Date opened:** 2026-06-23
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Format expected:** Per-surface `.dc.html` files + `agent_data_and_components_H06.md` supplement + `agent_onboarding_H06.md` supplement, dropped into `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H06/handoff_H06/`. The build side will pick it up automatically on the next sprint.

---

## How to read this document

This handoff **locks every product decision**. The designer is not asked to choose between alternatives; the designer's job is to render the locked decisions with the project's voice and visual rigor — exactly as H04 + H05 filled their locked structure with `.dc.html` surfaces.

Where this document says "the surface holds X", X is required and non-negotiable. Where it says "the editorial voice fills the slot", the designer writes the prose to the project's style guide within the slot.

If a question genuinely remains open after this document, raise it back to the build side — **do not pick a direction yourself**.

---

## What just shipped (the context the designer inherits)

Three frontend sprints + the Tiptap editor + the a11y substrate sweep all closed since H05 was opened:

- **H01-H03 sprint (B50-B75)** — Phases 03 · 04 · 05 frontend coverage end-to-end. 71 shared primitives.
- **H04 sprint (B76-B86)** — Tier 1 (Daily Practice Tracker) + Tier 2 (Phase-06 Divination cluster).
- **H05 sprint (B89-B96)** — Tier 3 (Phase-07 Workshop): 6 surfaces (Sigil Generator · Magic Squares · Talisman Designer · Magical Circle · Tool Registry · Voces Magicae Recorder) + 6 SVG engines.
- **Batch 35 — Tiptap live editor (B97-B100)** — 8 custom block nodes (`ritualLog` · `quoteCitation` · `gematria` · `sensation` · `entityRef` · `sigil` · `chart` · `divination`) + 9 slash commands + 3 picker modals + interactive visibility chip + live chart fetcher. The editor now persists via debounced auto-save against `/api/v1/entries`.
- **Test infrastructure restoration (B101)** — the visual + axe-core a11y gates were rendering "No Preview" stubs for every story for months (root cause: `npx serve` clean-URL redirects stripped the iframe's query string). Now real. The sprite is injected into the Storybook preview so `<use href="#theo-*">` references actually render.
- **A11y debt remediation (B102 lineage)** — the restored gate revealed 286 real WCAG violations; comprehensive sweep closed 95% of them (286 → 14). Residual 14 are intentional design tradeoffs (color-mix muted-on-muted fades + brand-colour text labels).

**Test counts at H06 open:** 1722 vitest passing · 557/557 visual · 543/557 a11y (97.5%) · 1473 backend tests · Alembic at 0032.

**Repo state to inspect before designing:**

- All H04 + H05 tokens in `frontend/shared/src/tokens/theourgia.tokens.css`.
- The lifted ink-mute (`#a09680` base) and danger (`#d76a55` base) — every "muted text on dark surface" passes 4.5:1 contrast now. The designer should not lower contrast back below AA when picking text colors.
- The 6 H05 workshop surfaces in Storybook (`SigilGenerator`, `MagicSquares`, `TalismanDesigner`, `MagicalCircle`, `ToolRegistry`, `VocesMagicae`).
- The Editor surface (`/editor`) with all 8 custom block nodes live — the H06 surfaces sit alongside this surface; the designer should know how the Editor's pickers compose so the H06 surfaces can compose similarly.

---

## Carry-forward standing rules (all unchanged)

These survive every sprint and override any later design instinct:

1. **Token-first.** Every value comes from `theourgia.tokens.css`. New tokens added only when the existing palette genuinely cannot express a need; new tokens land in the H06 supplement with a one-line rationale.
2. **`--danger` is reserved for the Visibility → Public downgrade rung — nothing else.** Every "negative" state on H06 surfaces uses care-palette tokens. There is no destructive operation in the Linguistic / Analytics tier that warrants red.
3. **Tradition-neutrality at the chrome level.** Theme tokens (`hellenic`, `thelemic`, base + the dark/light modes) override the palette. Linguistic tools handle Greek + Hebrew + Arabic + Coptic + Sanskrit + English — none of which may dominate the chrome.
4. **`.dc.html` is the source of truth.** Match exactly per the per-component ritual (section inventory · CSS var cross-check · verbatim editorial copy · default state · variant completeness · `--danger` audit). Expand dev numeronyms in user-facing labels ("a11y" → "accessibility", "i18n" → "internationalisation", "RTL" → "right-to-left").
5. **Sealed-content discipline.** Anything backed by encryption defaults sealed and shows count only — zero plaintext leak. Use the `--seal*` family for the chrome.
6. **Wellbeing copy is verbatim from designer.** Never red even for "negative" states. Opt-in only, off by default. Pattern-detection messages ("your Mars-hour outcomes are markedly higher") are wellbeing-adjacent — they must be rendered as observations, never as encouragement or instruction.

## Cross-cutting rules earned in H04, H05, B102 (must carry forward)

The post-H03 sprints added these — they apply to every H06 surface:

7. **Citation chrome on every traditional artefact.** When a surface displays text/imagery the practitioner did not author (a public-domain gematria cipher reference, a historical voce from PGM IV.2785, a transliteration scheme attributable to a specific scholar), the source surfaces via the `‡` `CitationKindBadge` from B54. Small, muted, never dominant — but never absent.
8. **Ritual / committed-make moments.** Any H06 surface that produces a permanent artefact (a saved gematria study, a custom cipher definition, a saved query/study) treats save as a deliberate moment. Re-opening a saved item is read-only by default; the practitioner explicitly chooses "edit a new version" (creates a new row; the old version is retained).
9. **Quiet stats.** Where a surface shows accumulated work or numerical findings ("12 matches across 47 entries", "correlation 0.42, n=89"), the chrome is muted: small number + `--ink-mute` label. No celebration, no badges, no "well done."
10. **Honesty rules** (H06-specific elaborations spelled out per surface).
11. **WCAG 2.2 target-size floor.** Every interactive element ≥ 24×24 px. Tiny inline buttons are no longer acceptable. The B102e sweep enforced this — H06 must not regress it.
12. **Body color inherits.** The body rule in `theourgia.shared.css` now establishes `color: var(--ink); background: var(--bg)`. Surfaces should NOT rely on element-level `color` declarations to "fix" black-on-dark; the cascade does it now.

## New cross-cutting rule earned in Tiptap integration

13. **Editor block embed parity.** Where any H06 surface produces an artefact that can also appear *inside* the Editor's body (a gematria result, a saved query result), there is **already a Tiptap node** for the block form. The H06 surface must not produce an artefact shape that the Editor's block cannot represent — pick a shape that round-trips. Examples spelled out per surface.

## New cross-cutting rule for Phase 09 specifically

14. **Scientific illuminism stance, not oracular.** Phase 09 surfaces are about treating practice as evidence. They must:
    - Always show sample sizes alongside any finding.
    - Always show confidence intervals or "n is too small for confidence" when n < 10.
    - Never present a correlation as causation.
    - Never present an automated pattern detection as a recommendation. The surface says "this pattern is present in your data"; it does not say "you should therefore do X."
    - Reject the gamification reflex completely. No streaks-as-trophies, no graphs-as-leaderboards.

This stance is the defining feature of Theourgia's analytics layer. No other practitioner tool does this. **The H06 designer must hold this line tightly** — every analytics word that drifts toward oracle, encouragement, or gamification undoes the project's most distinctive promise.

---

## Backend status going in

**Phase 08 backend is unbuilt. Phase 09 backend is unbuilt.** This is intentional — designer pickup happens **first**, the `.dc.html` files inform the schema, then the build side authors the models + Alembic migrations + API + frontend wiring in one stack.

`plan/08-linguistic-tools.md` and `plan/09-synchronicity-and-analytics.md` enumerate the tables/columns the build side anticipated. The designer is not bound to that anticipation. If a `.dc.html` requires a column the plan did not anticipate, the build side will add it during implementation. Conversely, if the designer's `.dc.html` does **not** use a column the plan anticipated, the build side drops it.

The only architectural choices already locked at backend level:

- **Gematria is server-computed** for cross-journal search (the index is denormalised into `gematria_index` per cipher; querying scans the index, not raw entry text). For the single-text Calculator surface, computation is client-side via the existing `gematriaSum` / `gematriaBreakdown` engine already shipped in B97 — the same engine the Tiptap `gematria` block uses.
- **Transliteration is client-side** for the editor's hover-translit and the Transliteration Utility surface — round-trip integrity is enforceable in tests. Server provides only the cipher / scheme reference tables.
- **Synchronicity quick-capture is global**: the modal's keyboard shortcut binds at the AppShell layer, not per-surface. The designer specifies the modal; the build side wires the shortcut binding.
- **Analytics queries are async** for any filter that touches more than 1,000 rows. The query builder shows a "Running…" state during execution and surfaces the result when ready.
- **Network aggregate / federated analytics is OUT OF SCOPE for H06.** When the Federation phase (Phase 12) opens, an H08+ handoff will cover hub-side aggregation. H06 designs solo-vault analytics only — but should plan field shapes so the future hub aggregator can read them without backfill.

---

## What needs design — the ten Tier-4 surfaces

All ten surfaces live under two new top-level VaultNav sections:

**Linguistic** (new section, sits between Workshop and Settings):

- `gematria` — Gematria Calculator
- `gematria-search` — Cross-Journal Gematria Search (a sub-route of Search, or stand-alone; designer's call on the IA)
- `transliterate` — Transliteration Utility
- `voces-library` — Voces Magicae Library Browser (companion to the Recorder shipped in H05)

**Synchronicity** (new section, sits between Linguistic and Settings; OR may sit higher near Journal — designer's call):

- `synchronicities` — Synchronicity Log (replaces the existing placeholder route at `/synchronicities`)
- `analytics` — Analytics Dashboard
- `analytics/query` — Query Builder
- `analytics/studies` — Saved Studies Index
- `analytics/studies/:id` — Per-Study Page
- *(plus the global Synchronicity Quick-Capture modal — not a route)*

These do **not** share a single secondary-nav pattern. Linguistic tools cluster naturally (designer may choose a `BeingsTabs`-style cluster); Analytics is hierarchical (dashboard → study → query → results). The designer decides whether the Analytics surfaces use a sub-nav.

---

### 1. `Theourgia Gematria Calculator.dc.html`

**Anticipated backend:** `cipher` table (id · name · language · description · mapping (JSON character → integer) · source_citation · variant_of (nullable FK to base cipher) · user_defined (bool) · vault_id (nullable; null = bundled). Ships with the bundled ciphers enumerated in `plan/08-linguistic-tools.md` §1.

**Anticipated APIs:** `GET /api/v1/ciphers` · `POST /api/v1/gematria/compute` (text + cipher_ids → values).

**Surface layout (LOCKED — two-pane composition):**

- **Left rail (300px):** cipher picker. Vertical list grouped by language: Hebrew (mispar hechrachi · mispar gadol · mispar katan · mispar siduri · atbash · albam · ziruph) · Greek (isopsephy · ordinal) · English (Crowley ALW · NAEQ · Simple · Hebrew-mapped) · Arabic (abjad) · Sanskrit (Katapayadi · variants) · Coptic. Each row is a checkbox-style chip; multi-select. Above the list: a search box that filters by name. Below the list: "+ Define custom cipher" button that opens a modal.
- **Centre column (flex-1):** input text area at top (large, multi-line, monospace, script-aware via the LangMark token from B97) followed by a per-cipher results table. Each row of the table: cipher name + `‡` citation chrome (where bundled with source) + computed value (large, `--font-mono`) + per-letter breakdown (small, `--ink-mute`) + reductions (digit-sum, modulo).
- **Below the results table:** a "Cross-cipher resonance" panel — when two or more selected ciphers produce the same value for the same word/phrase, the panel surfaces it: "**989** in *Greek isopsephy* (ἀγαθοδαίμων) and *English Qabalah ALW* (Christ-bearer's gift) — resonance across two ciphers." Up to five resonances shown; "Show more" expands.

**Default state on open:** Empty input. Greek isopsephy + Mispar Hechrachi pre-selected (the two most commonly used ciphers in the project's tradition mix). Cross-cipher resonance panel hidden until at least one result is non-zero.

**Custom cipher definition modal (LOCKED):**

Opens from the left-rail "+ Define custom cipher" button.

- Name (text)
- Language (picker — Greek · Hebrew · Latin · English · Arabic · Sanskrit · Coptic · Custom — selecting Custom reveals a "Script direction" picker: LTR / RTL)
- Description (textarea)
- Source citation (text — optional, but if blank, the cipher is marked "Personal — not for shared studies")
- Mapping editor: a two-column grid (character | integer). Add row · remove row. Defaults to the source language's alphabet pre-populated with zeroes so the practitioner fills in values.
- "Variant of" picker (optional — pick an existing cipher to clone its mapping as starting values)

Save validates that the mapping covers every letter in the chosen language's alphabet (or marks it incomplete + warns). Custom ciphers live in the practitioner's vault only — they do not surface to other vaults.

**Honesty rules:**

- Custom ciphers with no citation are tagged "Personal — not for shared studies" in the cipher picker. They can be used for the practitioner's own work but excluded from Cross-Journal Search results scoped to shared studies (the picker shows a checkbox "include personal ciphers in this query" — defaults off).
- Letters not in the cipher's mapping are silently skipped from the computation. The breakdown shows skipped letters in `--ink-mute` italic ("ñ — not in this cipher") so the practitioner knows their input was partially read.
- Reductions (digit-sum, modulo) are computed but presented secondary to the raw value. The raw value is the cipher's actual statement; reductions are convenience views.

**Editor block parity:**

The Editor's `/gematria` slash command (shipped B97) inserts a `gematria` Tiptap node whose attrs are `{ word, script, also }`. The Calculator surface must produce a "Save as study" affordance that, on click, opens a Tiptap-doc preview: "If you embed this calculation in a working entry, it will render as this `gematria` block. Want to insert it into the current draft?" with a single button "Insert into current draft" (no-op when no current draft exists). The shape stored is the same — the Editor and the Calculator share the gematria block.

**Save / export:**

The Calculator does NOT save standalone gematria computations as their own rows. The artefact is either: (a) inserted into a journal entry via the Editor block parity flow above, or (b) ephemeral. Custom ciphers DO save (they're persistent assets). Export from the calculator: copy-to-clipboard for the per-cipher value table (markdown format) + "Insert into draft" as above.

---

### 2. `Theourgia Cross-Journal Gematria Search.dc.html`

**Anticipated backend:** `gematria_index` materialised view (entry_id · cipher_id · phrase · value · phrase_offset · last_seen_at). Refreshed incrementally on entry save. **API:** `POST /api/v1/gematria/search` (value + ciphers + match_type + delta + filter_by_entity + filter_by_date_range → entries[]).

**Surface layout (LOCKED — top-bar search + result list, the Library pattern):**

- **Top bar:** title + a "value input" (numeric, large, `--font-mono`) + cipher picker (multi-select dropdown of the same ciphers as the Calculator — pre-checks the practitioner's most-used) + match-type picker (segmented control: **Exact** · **Near (Δ)** · **Reduced (digit-sum)**). When **Near (Δ)** is selected, a slider appears below: Δ 0–10, default 3. When **Reduced (digit-sum)** is selected, a small note explains "Matches phrases whose digit-summed value equals your value's digit sum, regardless of cipher."
- **Filter row** (under the top bar): entity chip-filter (multi-select from the practitioner's entities) · date-range picker (last week / last month / last year / custom) · tradition chip-filter · "Include personal ciphers" checkbox.
- **Result list:** Each row is a card. Card contents: entry title + entry kind glyph + entry date + the matched phrase with the matching letters highlighted in `--accent` + the cipher name + the matched value. Tapping the card opens the entry in a new route. Empty state: "No phrases in your journal sum to **X**. Try a wider Δ or a different cipher." (designer fills the empty-state copy verbatim).
- **Right rail (300px, collapsible):** "Cross-cipher resonance map." When a single value matches across multiple ciphers (e.g., 418 in Greek + 418 in English Qabalah for different phrases), this panel surfaces all the phrases that hit that value across any cipher in the practitioner's journal. This is the defining magical-discovery feature; the chrome is reverent (per the standing rule), not celebratory.

**Default state on open:** Empty value, no results, the right rail collapsed. The search runs only when the value field is non-empty.

**Pagination:**

Results paginate at 25 per page (the standard for Library + Today). "Older results" button at the bottom loads the next page.

**Honesty rules:**

- The index is materialised; recently-saved entries (< 60 seconds old) may not appear until the index refreshes. The empty state notes "Some recent entries may not yet be indexed." (verbatim from designer).
- Sealed entries that match are listed with **count only** — the matched phrase is NOT shown ("3 sealed entries match · unlock to view"). Tapping a sealed match opens the SealUnlock dialog before revealing the phrase.
- Personal ciphers are excluded by default from the result count; the toggle is explicit.
- The cross-cipher resonance map is computed across the practitioner's selected ciphers only, not the full bundled set — to avoid overwhelming numerology.

**Editor block parity:** None — search is a query surface, not an artefact-producing one.

**Save / export:**

- "Save this search" affordance saves the value + filters as a named saved-query (in the same `saved_query` table the Phase 09 Query Builder uses; the two surfaces share the saved-query backing store).
- Export: CSV of the result list. The CSV column set: entry_id · entry_title · entry_kind · entry_date · phrase · cipher · value · context_url.

---

### 3. `Theourgia Transliteration Utility.dc.html`

**Anticipated backend:** None server-side beyond the cipher / scheme tables already in Phase 08. All transliteration is client-side via the existing transliteration engines (Greek ↔ Latin via the LangMark substrate from B97, Hebrew + Sanskrit + Arabic + Coptic via vendored standard schemes). The build side adds round-trip integrity tests per direction.

**Surface layout (LOCKED — three-column composition):**

- **Left column (260px):** source-script picker. Vertical list: Greek · Hebrew · Sanskrit · Arabic · Coptic · Latin. Below: an "Add direction" button (lets the practitioner add a non-standard pair, e.g., Aramaic ↔ Latin, which routes through a community scheme contribution flow — designer renders the button + tooltip; the build side will hide the action until contribution substrate ships).
- **Centre column (flex-1):** source-text input. Large multi-line input, script-aware font (LangMark applies the right `--font-greek` / `--font-hebrew` / etc.). Above the input: a "Paste source" button + an "IPA keyboard" toggle (when the picked direction supports IPA — see Voces Browser).
- **Right column (380px):** transliteration results. Vertical stack of scheme cards. Each card: scheme name + `‡` citation chrome + transliterated output (large, monospace) + a small "Copy" button. The scheme set rendered depends on the picked source script:
  - Greek: scholarly polytonic · monotonic · ALA-LC · Beta Code (4 cards)
  - Hebrew: SBL · ISO 259 · simplified phonetic (3 cards)
  - Sanskrit: IAST · ISO 15919 · Harvard-Kyoto (3 cards)
  - Arabic: ALA-LC · DIN 31635 · simplified (3 cards)
  - Coptic: standard scholarly only (1 card)
  - Latin (reverse — Latin to a script): the right column then shows the picked target's schemes (e.g., Latin → Greek → all four Greek schemes from the same direction).

**Default state on open:** Greek source picked. Empty input. Right column shows the four Greek schemes' empty cards.

**Round-trip integrity panel (LOCKED):**

Below the right column's scheme cards, a small panel: **"Round-trip check."** When the practitioner clicks it, the surface back-transliterates each scheme's output through its inverse and compares against the original. Each scheme card gets a small status indicator: ✓ (round-trips losslessly) · ◐ (round-trips with normalisation differences, e.g., accent normalisation) · ✗ (does not round-trip — diacritic loss, etc.). The indicator is informational, not a quality judgement.

**Honesty rules:**

- Schemes that genuinely cannot represent some source characters (e.g., Beta Code's loss of breathing marks under certain inputs) surface the loss in a small note below the affected card.
- The "Add direction" button is visible but the contribution flow doesn't ship in this batch. The button opens a "Coming with the community-contribution layer (Phase 14)" note.
- For any text the practitioner enters that contains characters outside the source script's alphabet, the transliteration engines pass them through verbatim. The surface notes "Characters outside the source script are passed through" so the practitioner knows the engine isn't silently swallowing them.

**Editor block parity:**

The Editor's `lang` mark (shipped B97) tags inline spans with a script. The Transliteration Utility's "Insert into current draft" affordance writes a paragraph that uses the lang-marked spans for the source and the chosen scheme's output. Single button: "Insert as lang-marked paragraph into current draft."

**Save / export:**

The utility itself does not save. Round-trip results are ephemeral. Copy-to-clipboard per scheme + Insert-into-draft as above.

---

### 4. `Theourgia Voces Magicae Library Browser.dc.html`

**Anticipated backend:** `voce_magicae_bundled` table (the bundled PD-eligible PGM voces from Phase 08, shared across vaults — read-only fixtures) + the existing `voce` + `voce_recording` tables from H05 (per-vault user-authored voces, shipped in B96). The Browser reads from both stores; the Recorder (H05) writes only to the per-vault store.

**Anticipated APIs:** `GET /api/v1/voces/bundled` (returns the bundled library) · `GET /api/v1/voces` (returns the practitioner's own + the bundled). The endpoints already exist after H05 for the per-vault store; the bundled endpoint is new.

**Surface layout (LOCKED — list-and-detail composition, mirrors the H05 Recorder's chrome):**

- **Top bar:** title + search input (searches voce name + source text + transliteration + IPA) + tradition filter (segmented: All · PGM · Hekate-tradition · Heptameron / Goetic · Solomonic · Thelemic · Vedic · Norse · Personal · ...) + source filter (segmented: All · Bundled · Personal).
- **Main viewport:** vertical list (NOT a card grid — same shape as H05's Recorder). Each row: voce text in source script (display font, ellipsis on overflow) · transliteration (smaller, italic) · planetary + elemental glyphs (right-aligned chips) · recording count badge ("3 community recordings" / "1 personal recording" / "no recording yet") · a small badge indicating Bundled vs Personal (a `‡` for Bundled to signal "from the canonical library").
- **Detail drawer (560px wide):** opens on tap. Composes the same sections as the H05 Recorder's drawer (Voce text · Source citation · Associations · Recordings · Used-in-workings).

**The Browser's drawer differs from the Recorder's in five ways:**

1. **Bundled voces are read-only** in the Browser drawer. No "+ Record new" button on a bundled voce — but the practitioner can fork the bundled voce into a personal one (creates a new row in the per-vault store, with `forked_from` pointing back to the bundled id). The drawer surfaces a "Fork into my library" button on bundled voces.
2. **Recordings on bundled voces are community-contributed** — multiple practitioners' recordings of the same canonical voce live in a `voce_recording_community` table (separate from `voce_recording` which is per-vault). The drawer's Recordings section shows community recordings as a list with practitioner-public-name + glyph + duration. Tapping plays. There is no rating UI in H06; community-recording ranking is deferred.
3. **A "Why I learned this voce" personal note field** is available on bundled voces — the practitioner attaches a personal note to a bundled voce without forking it. The note is private to the vault.
4. **A "Suggest correction" affordance** opens a modal: text field + reason picker (Pronunciation · Transliteration · Citation · Other) + the user's email field (optional). On submit, the correction queues for community review (deferred to Phase 14; the surface mounts the modal but the submit button surfaces a Toast "Correction queued — review pipeline ships with the community contribution layer (Phase 14)"). The button is visible to all practitioners.
5. **Pronunciation aids** — the drawer's Voce-text section gets a "Play pronunciation" button under the voce. When pressed, plays the practitioner's selected community recording. Below the button, a small "Slow" toggle that plays at 0.6× speed (useful for learning).

**Default state on open:** All filter, Source = All, search empty. The bundled library should populate the list at depth (~30 PGM voces ship as fixtures); the practitioner's own voces from the Recorder appear interleaved by name sort.

**Citation chrome:**

Every bundled voce carries `‡` with its source verbatim (e.g., "Papyri Graecae Magicae · PGM IV.2785–2890 · Hekate hymn — Preisendanz 1928"). The Browser's list row + drawer both show the badge. Forking a bundled voce into a personal one preserves the citation in the forked row.

**Honesty rules:**

- Bundled voces are immutable. The "Fork into my library" button is the only path to edit; it creates a separate row in the per-vault store.
- Community recordings of bundled voces play through but are NOT ascribed authority — they're contributions, not authoritative. A small note in the Recordings section: "Community recordings represent how individual practitioners voice this voce — not a canonical authority."
- Pronunciation aids are wellbeing-adjacent: the speed-down feature exists for learning, not for performance. No "speed up" toggle (would distort the voce).
- The "Suggest correction" flow is exposed but the review pipeline is honestly labelled as "Phase 14".

**Editor block parity:**

The Editor's `voce` slash command (queued for B99c-followup) inserts a Tiptap node referencing a voce by id. The Browser's drawer carries an "Insert reference into current draft" button.

**Save / export:**

- The Browser does not save. Forking a bundled voce hits the Recorder's API (the existing CRUD from H05).
- Per-recording audio download — same affordance as the Recorder.
- No bulk library export.

---

### 5. `Theourgia Synchronicity Quick-Capture.dc.html` (the global modal)

**Anticipated backend:** `synchronicity` table (id · vault_id · occurred_at · description · intensity (1–10) · category · structured_data (JSON) · linked_entry_ids (array) · linked_entity_ids (array) · linked_working_ids (array) · astro_snapshot (JSON — auto-captured at save) · weather_snapshot (JSON — opt-in) · location_snapshot (JSON — opt-in) · created_at).

**Anticipated APIs:** `POST /api/v1/synchronicities` · `GET /api/v1/synchronicities` (paginated) · `GET /api/v1/synchronicities/:id`.

**The modal is the surface — there is no full-page version.** The modal mounts globally at the AppShell layer via the QuickCapture pattern already used in B11 (the original "QuickCapture" primitive in Phase 02 wraps the same chrome). The H06 designer extends that primitive's variant set — not creating a new dialog from scratch.

**Trigger (LOCKED):**

A global keyboard shortcut (default `⌘+Shift+S` on macOS · `Ctrl+Shift+S` on Windows/Linux — the build side wires the binding through the AppShell). The shortcut opens the modal anywhere in the app. Additionally, a "+ Synchronicity" button lives in the VaultTopbar's "+" menu (next to "+ New entry").

**Modal layout (LOCKED — single column, 480px wide):**

- **Header:** "Capture a synchronicity" + close (×) button + auto-saved timestamp in `--ink-mute` (e.g., "Now · 14:32 · Sun in Aries · Hour of Venus" — the existing AutoStampChip from B54 supplies the chrome).
- **Body — vertical stack:**
  1. **Description** (textarea, autofocus, ~3 rows visible, expands). Placeholder: "What did you notice?"
  2. **Category** — segmented control of 10 options + Custom (the 10 from `plan/09-synchronicity-and-analytics.md` §1: number sequence · name occurrence · dream-spillover · animal omen · song lyric · overheard speech · weather · object encounter · electromagnetic · custom). Single-select. Selecting Custom reveals a text input for the category name. The categories carry small glyphs (designer renders — the existing glyph sprite from B95 should be extended in H06).
  3. **Structured data** (conditional on category):
     - When **Number sequence** is picked, a numeric input appears: "The number you noticed."
     - When **Name occurrence** is picked, an entity-picker chip appears: "The name." (multi-select from existing entities)
     - When **Animal omen** is picked, a small free-text field appears: "The animal."
     - When **Song lyric** / **Overheard speech** — the description field IS the structured data.
     - When **Object encounter** — a free-text field: "The object."
     - When **Electromagnetic** — a free-text field: "What you experienced (flickering bulb, radio static, dead battery, etc.)."
     - When **Weather** — auto-fills from the location snapshot if permission granted; otherwise free-text.
     - When **Dream-spillover** — a chip "Link the dream entry…" opens an entry picker scoped to dream-kind entries.
  4. **Intensity** — a 1-10 slider, defaults to 5. Tick marks at 1, 5, 10. Below the slider, a small label that updates in real-time: "Barely noticed" (1) · "Significant enough to record" (5) · "Striking — felt impossible to be coincidence" (10) — designer writes these verbatim per practice's wellbeing tone (matter-of-fact, never breathless).
  5. **Suggested context** — auto-populated chips: last entry written · last entity invoked · last working performed (if any happened in the last 24h). Each chip is a single-click toggle: tap to link. Already-linked context chips show as filled; unlinked as outlined.
  6. **Add details** (collapsed expander): linked entries · linked entities · linked workings · location override · weather override. Each is an optional add-link affordance.

- **Footer:** Cancel · "Capture" (primary). Hitting Enter from the description field with text present captures (designer specifies the keystroke handler in the modal's prop).

**Default state on open:** Description focused, category All, intensity 5, no structured-data fields visible (until category is picked), suggested-context chips populated.

**Auto-stamp:**

On Capture, the row is saved with `astro_snapshot` (computed server-side at save time via the existing Phase 03 ephemeris), `calendar_stamp` (also Phase 03), and `location_snapshot` (if user has previously opted-in to location). The modal does not show these stamps before save — the AutoStampChip in the header is the only indicator.

**Honesty rules:**

- Intensity is the practitioner's call, not the system's. Phase 09 analytics will surface "your high-intensity synchronicities tend to cluster around Mars-hour" — the surface must not autopopulate intensity for the practitioner.
- The suggested-context chips suggest, they do not auto-link. The practitioner explicitly taps to confirm each.
- A synchronicity captured via the modal is **not** a journal entry (separate table). It can be linked to entries, but lives in its own surface.

**Editor block parity:**

The Editor has no `synchronicity` block — synchronicities are not embedded inside entries; they reference entries from outside. This is deliberate (separates the practitioner's narrative entries from their structured-observation log).

**Save / export:**

Modal save creates the row + closes the modal. Quick-feedback: a small toast "Synchronicity captured" in the bottom-right (default Toast variant from B11). No "view it now" affordance from the toast — the practitioner returns to whatever they were doing. The synchronicity surfaces on the Synchronicity Log next time it's visited.

---

### 6. `Theourgia Synchronicity Log.dc.html`

**Anticipated backend:** as above. Reads the practitioner's own synchronicities; the table is per-vault.

**Surface layout (LOCKED — replaces the existing placeholder route at `/synchronicities`):**

- **Top bar:** title + filter chips (Category, Intensity threshold, Date range, Entity, Has linked entry, etc.) + "+ Capture" button that opens the Quick-Capture modal + a small "Search the log" input.
- **Main viewport:** a chronological vertical list. Day separators (display-font heading: "21 March 2026 · Mars in Aries · Hour of Mars" — the AutoStampChip pattern repeated per day). Under each separator, the synchronicities of that day as rows. Each row card holds:
  - Time of day in `--font-mono` left edge (e.g., "14:32")
  - Description (display font, 1-line ellipsis when long)
  - Category chip
  - Intensity dot (a single small dot, sized by intensity 1-10 → 4px-12px diameter, in `--accent` for intensity ≥7, `--ink-soft` for 4-6, `--ink-mute` for 1-3; this is the "quiet stat" rule applied to intensity)
  - Linked-entity chip(s) if any
  - "✦ open" affordance on the right edge
- **Tapping a card** opens a detail drawer (right side, 560px) showing all fields + the astro_snapshot + weather + location + a "View linked entries" affordance + an "Edit" affordance + a "Delete" (soft-delete) affordance.

**Pattern surfacing rail (LEFT side, 300px, collapsible — LOCKED):**

A persistent left rail surfaces **detected patterns** in the practitioner's recent synchronicities:

- "Your 14:** synchronicities cluster on Tuesdays · n=6 over the last 30 days."
- "Three name-occurrence synchronicities involve **Hekate** within 7 days of a Hekate working."

Each pattern is a small card with the observation + a "View matching log entries" button + a "Dismiss this observation" affordance (hiding it for 30 days). The rail's empty state: "Patterns will appear here once your log has enough data — typically 20+ synchronicities."

The pattern-detection chrome is **bound by the Scientific Illuminism rule** (cross-cutting rule #14). Every pattern card surfaces sample size and confidence. The wellbeing rule applies — no congratulation, no "great pattern recognition!". Just observations.

**Default state on open:** Today's synchronicities at top, scrollable history below. Pattern-surfacing rail expanded, ~3-5 patterns visible if the practitioner has ≥20 synchronicities, otherwise the empty-state copy.

**Honesty rules:**

- Soft-deleted synchronicities (cannot be hard-deleted from the surface) appear under a "Show recently deleted" toggle in the top-bar's overflow menu.
- The pattern surfacing is computed at periodic intervals (the build side will choose; nominally daily) — not real-time. A small "Patterns last refreshed: 2h ago" timestamp at the top of the rail makes this honest.
- A pattern with n < 5 is never surfaced. n < 10 surfaces with a "Small sample — interpret with caution" prefix.

**Editor block parity:** None. Synchronicities are external observations, not journal artefacts.

**Save / export:**

- Per-synchronicity export from the detail drawer: copy as markdown.
- Bulk export from the top-bar menu: full log as CSV / JSON.
- "Save this view as a study" — converts the current filter set into a saved-query, opening the Studies surface. This is the bridge between the Log and the Analytics layer.

---

### 7. `Theourgia Analytics Dashboard.dc.html`

**Anticipated backend:** Queries against the multi-axis tag substrate. Materialised aggregate views per common dimension (planetary hour × outcome rating, lunar phase × outcome, entity × working count, etc.) refreshed on a schedule.

**Anticipated APIs:** `GET /api/v1/analytics/digest/weekly` · `GET /api/v1/analytics/digest/recent` · `POST /api/v1/analytics/query` (synchronous for fast queries, async with job id for slow).

**Surface layout (LOCKED — card grid, similar to the Today rail but read-only and analytical):**

- **Top bar:** title + scope picker (segmented: **Today** · **This week** · **This month** · **This year** · **All time**). Defaults to **This week**.
- **Main viewport (12-column grid):** cards. The card set for the default **This week** view is fixed and ordered:
  1. **Recent activity** (full-width card, 12 columns) — small timeline: per-day count of entries · workings · divinations · synchronicities · practice logs as stacked bars. Hover reveals exact counts. The timeline X-axis is days; Y-axis is count.
  2. **Suggested patterns** (8 columns) — top 3 detected patterns this scope. Each pattern is a small card with: observation text + sample size + confidence band + "View matching" affordance. The same chrome as the Synchronicity Log's pattern rail but pulled from the broader index (entries + workings + divinations + synchronicities, not just synchronicities).
  3. **Quiet stats** (4 columns) — a vertical list: "47 entries this week" · "12 workings" · "3 divinations" · "8 synchronicities" — each a small line in `--ink-mute`. No badges.
  4. **Heatmap: outcome × planetary hour** (6 columns) — A small heatmap of outcome ratings × planetary hours. Each cell is a count; colour intensity is the average outcome rating in that cell. Click cell to drill into matching entries.
  5. **Heatmap: outcome × lunar phase** (6 columns) — same shape, lunar-phase axis. Click to drill.
  6. **Network glance** (12 columns, collapsible by default) — a small force-directed sketch of entity ↔ working co-occurrence in scope. Not a full network graph — this is a glance. Tap to open a separate "Network view" sub-route (a future H07 surface; the dashboard card stubs the affordance).
- **Right rail (260px):** "Studies you've saved." A vertical list of the practitioner's saved studies + "+ New study" button.

**Default state on open:** **This week** scope. All six cards rendered. Right rail with up to 5 saved studies + "+ New study".

**Citation chrome:**

The chart components themselves carry a small footer caption: "Computed from your local journal · n=<sample size> · query <query_id>" — quiet, informational, never dominant.

**Empty states (LOCKED):**

- Scope with fewer than 10 entries: each card shows "Not enough data this scope. Try a longer window." (verbatim from designer)
- Suggested patterns card with no patterns: "Patterns will surface as your record deepens. Typically 30+ workings before stable patterns appear."

**Honesty rules:**

- All chart values display their sample size and confidence interval (when applicable). The chrome is the same Tufte-aware restrained style — no gradient blasts, no rainbow palettes.
- The Suggested Patterns card never recommends actions. Each pattern card carries a small one-line clarification under the observation: "Observation only — not a recommendation. Patterns suggest where to look, not what to do."
- Network glance is a sketch, not a full graph — the surface notes this so the practitioner doesn't read too much into the simplification.
- Scope changes are non-destructive — the dashboard re-queries on scope change; existing cards refresh in place.

**Editor block parity:**

The Editor has no analytics block. Charts are not embedded into entries. The Per-Study Page surface (below) provides an "Insert chart into draft" affordance that writes a `chart` Tiptap node (the existing chart node shipped in B99a — extended to support analytics chart references).

**Save / export:**

- "Save this dashboard view as a study" — captures the scope + active cards + any drill-throughs into a new saved-study row.
- Per-card export: CSV of the chart's underlying data.

---

### 8. `Theourgia Query Builder.dc.html`

**Anticipated backend:** `saved_query` table (id · vault_id · name · description · query_expression (JSON — the AST) · last_run_at · last_run_count · created_at).

**Anticipated APIs:** `POST /api/v1/analytics/query` (run an ad-hoc query) · `POST /api/v1/analytics/queries` (save a query) · `POST /api/v1/analytics/queries/:id/run` (re-run a saved query).

**Surface layout (LOCKED — three-zone composition):**

- **Top bar:** title + "Load saved query…" picker + "Save this query" button (disabled until non-empty) + "Run" button.
- **Left rail (320px):** **Filter expression builder.** A vertical stack of filter rows. Each row is one filter. Row composition (LOCKED):
  - Axis picker — dropdown of all queryable axes. Axes grouped:
    - **Entries:** kind · created in [date range] · contains text · linked to entity · linked to working · linked to tradition · visibility · sealed (bool) · has gematria value [number]
    - **Workings:** kind · entity invoked · outcome rating ≥ N · time-to-manifest [range] · tradition · planetary hour · lunar phase · astrological condition [picker — see below]
    - **Synchronicities:** category · intensity ≥ N · linked entity · linked entry
    - **Divinations:** method · question contains [text] · outcome rating ≥ N
    - **Practice logs:** kind · cadence · streak ≥ N · last completed in [range]
    - **Tags:** tag matches · tradition_tag matches
    - **Body & state:** mood · energy · health notes contains [text]
  - Operator picker — depends on axis type: equals · not equals · contains · is in · is greater than · is less than · is within range · is empty · is not empty.
  - Value editor — depends on axis: numeric input · date range picker · text input · multi-select picker · entity picker · etc.
  - "Remove this filter" × button on the right edge.
  - Above each filter row: a small **Boolean connector** chip (AND · OR · NOT) — drag-or-pick to reorder. Default AND. The first filter has no connector.
- **Centre column (flex-1):** **Query preview + results.** Top: a small "this query reads as: …" sentence (in plain English: "Workings where entity is Hekate AND outcome rating ≥ 7 AND lunar phase is waning"). Below: when "Run" is clicked, the result list — same row shape as the Library / Synchronicity Log. Result count above the list.
- **Right rail (300px):** **Astrological condition picker** (modal-style — opens when an axis row picks "astrological condition"). Composes from the existing Phase 03 condition library: Moon in [sign] · Mercury retrograde · planet in [house] · aspect [orb] · sect · zodiacal releasing condition · etc. The right rail is where this picker mounts so the filter-row stays compact.

**Default state on open:** Empty query (one empty filter row with axis-picker open and unselected). "Run" is disabled.

**Saving a query (LOCKED):**

The "Save this query" affordance opens a small modal: name (text, required) · description (textarea, optional) · whether to materialize the result count daily (bool — defaults off; if on, the system runs the query daily and surfaces the count on the Studies index even when the user doesn't reopen it). Confirm saves.

**Honesty rules:**

- The plain-English render of the query is verbatim what the engine actually evaluates. Never paraphrase loosely.
- A query that hits more than 1,000 entries runs async with a "Running…" state. The result populates when ready. The surface notes "Queries against larger journals may take a moment."
- Empty result is honest: "No items match this query." (verbatim)
- The astrological condition picker uses the same Phase 03 ephemeris that the rest of the app uses. No "approximate" astrological filtering — the engine computes the same Swiss Ephemeris values.

**Editor block parity:**

- A "Save as study" affordance forks the current query into a study (see surface 9). Studies can be embedded into entries via the same Tiptap `chart` block (with chart kind = analytics).
- A "Copy query expression" affordance copies the JSON AST to clipboard for sharing — not yet implemented as a fully shareable artefact, but the affordance reserves the IA for the future Federation phase.

**Save / export:**

- Saved queries persist as `saved_query` rows.
- CSV of the result list.
- "Save as study" — wraps the query in a study with a name + narrative.

---

### 9. `Theourgia Saved Studies Index.dc.html`

**Anticipated backend:** `analytics_study` table (id · vault_id · name · description · saved_query_id (FK) · chart_kind · visualisation_config (JSON) · narrative (long text — practitioner's interpretation) · published_to_network (bool, default false) · last_run_at · last_run_count · created_at).

**Anticipated APIs:** `GET /api/v1/analytics/studies` · `POST /api/v1/analytics/studies` · `GET /api/v1/analytics/studies/:id` · `PATCH /api/v1/analytics/studies/:id` · `DELETE /api/v1/analytics/studies/:id` (soft).

**Surface layout (LOCKED — card grid):**

- **Top bar:** title + search input + "+ New study" button + filter chips (Mine · Shared with this network · Bundled examples).
- **Main viewport:** card grid (3 columns at desktop). Each card holds:
  - Study name (display font)
  - Description (one-line)
  - Last-run timestamp (small, `--ink-mute`)
  - Last-run sample size (small, "n=89") — quiet stat
  - A small thumbnail of the primary chart from the study (rendered server-side, cached)
  - "Open" affordance (tap card)
- **Empty state:** "Studies are the bridge between your queries and your interpretations. Save a query you keep running, give it a name, and start adding interpretation notes." (verbatim from designer)
- **Bundled examples (filter chip):** ships with template studies as enumerated in `plan/09-synchronicity-and-analytics.md` §5 — "Lunar phase efficacy study" · "Planetary hours outcomes ranking" · "Hekate workings cross-context analysis". Bundled studies show `‡` (the citation chrome — the source is the project, not the practitioner) and are read-only; the practitioner can fork them.

**Default state on open:** Mine filter, no search, all saved studies as cards. Bundled examples available behind their filter chip.

**Honesty rules:**

- A study with n < 10 carries a small "Small sample" badge in `--ink-mute`.
- A study that hasn't been run in 30+ days surfaces "Stale data — re-run?" affordance.
- Forked bundled examples link back to the source (`forked_from_bundled_id`) so the lineage is preserved. The fork is editable; the source is not.

**Editor block parity:**

A study can be embedded into a journal entry via the `chart` Tiptap node — the node's `chartKind` attr accepts `"analytics-study"` and `studyId` resolves at render time.

**Save / export:**

- Per-study export: full study (query + viz config + narrative) as JSON.
- "Publish to network" affordance (deferred — opens but explains the Federation phase).

---

### 10. `Theourgia Per-Study Page.dc.html`

**Anticipated backend:** as above. Reads a single study by id.

**Surface layout (LOCKED — long-form page, similar to the Editor surface's reading view):**

- **Top bar:** breadcrumb (Studies / This study's name) + "Edit" affordance + "Re-run" affordance + "Insert into current draft" + overflow menu (Export · Publish · Delete).
- **Page layout (LOCKED — single column, max-width 800px centred):**
  1. **Title** (display font, large)
  2. **Description** (italic, `--ink-soft`, small)
  3. **Last-run metadata** (small line: "Last run on 2026-06-22 · n=89 · runtime 0.4s · 14 ciphers, 3 entities" — quiet stat)
  4. **Primary chart** (full-width within the column, rendered from the study's `chart_kind` + `visualisation_config`)
  5. **The narrative** (long-form prose, practitioner-authored — this is the practitioner's interpretation of what the chart means in their practice)
  6. **Detail tables** — beneath the narrative, the per-row data backing the chart. Collapsible. Default collapsed.
  7. **Linked entries / workings / synchronicities** (the items the query returned) — each row is a tappable link to that item.
- **Right rail (240px):** **Re-run controls.** Date-range adjuster · scope toggle · "Refresh chart" button + a quiet "Last refreshed: X minutes ago" indicator.

**Chart rendering (LOCKED — Tufte-aware):**

The chart kinds supported in H06:

- **Timeline** (line / stacked bar of outcomes-over-time)
- **Heatmap** (axis × axis count or aggregate)
- **Histogram** (single axis distribution)
- **Scatter** (pair of continuous axes — e.g., intensity vs outcome rating)
- **Correlation matrix** (square heatmap of axis correlations)
- **Calendar heatmap** (date × value, year view)

Each chart kind has a fixed colour palette: a curated set of muted hues drawn from the existing token layer (`--accent`, `--ink-soft`, `--ink-mute`, plus a small extension of 5-8 muted hues if needed — the designer proposes the extension in the H06 supplement).

**Charts must:**

- Carry axis labels at all times (no axis-less charts).
- Carry a sample-size annotation (e.g., "n=89, σ=2.4 for the rating axis").
- Carry a one-line "What this chart shows" caption above (designer fills the verbatim explainer text per chart kind).
- Never use red as a meaningful colour (the `--danger` rule applies in charts too). Negative values use `--ink-mute` or a desaturated cool hue.

**Narrative editor (LOCKED — uses the Tiptap shared editor):**

The narrative section is a Tiptap editor (the same editor shipped in B97). Slash menu inserts: `/quote` · `/entityRef` · `/sigil` (rare) · `/gematria` (when the study references a gematria value) · `/chart` (recursive — a study's narrative can embed sub-charts from other studies, deferred but the IA reserves it).

**Honesty rules:**

- Re-running a study with a new date range creates a new version of the chart, never silently mutates the old one. The right-rail "Re-run" affordance shows a small "This will create a new chart snapshot" note. Previous snapshots are kept in a `study_run` audit table; the page shows the active snapshot.
- The narrative is the practitioner's, not the system's. Pattern detection's outputs (from the Analytics Dashboard) cannot be auto-inserted into the narrative — the practitioner must explicitly write or copy the observation into their narrative.
- The chart's data backing (the Detail tables section) is always available — no "the chart is the only truth" gestalt. The practitioner can verify what the chart aggregated.
- Bundled studies' narratives are written by the project team. Their authorship is surfaced with `‡` ("Bundled example · authored by the Theourgia team"). The practitioner's fork can rewrite the narrative entirely.

**Editor block parity:**

- "Insert into current draft" writes a `chart` Tiptap node with `chartKind: "analytics-study"` and `studyId`. The chart renders inline in the entry.
- The narrative IS a Tiptap document. Any custom block the Editor supports works here.

**Save / export:**

- Auto-save the narrative as the practitioner edits.
- Per-snapshot export: full study (query + chart + narrative) as JSON or as a printed PDF.
- "Publish to network" affordance — deferred, but the button mounts so the IA is rendered.

---

## What the designer should produce

Mirroring H04 + H05 deliverable shape:

1. **`Theourgia <Surface Name>.dc.html`** × 10 — one per surface above. Each must render correctly across base / hellenic / thelemic themes and dark / light modes. Compose `VaultNav`, `VaultTopbar`, and existing tablists / drawers via `dc-import` where applicable.
2. **`agent_data_and_components_H06.md`** — supplement with TS shapes for the new components, the API sketches the build side will turn into FastAPI routes + Alembic migrations, and any new tokens added (only if absolutely required — likely a small `--chart-*` family for the visualisation palette, and possibly a `--scope-*` family for the dashboard's scope chips). Worked example expected: **Per-Study Page** is the suggested worked example — it composes the most existing primitives (Tiptap editor, citation chrome, chart node, AutoStampChip) and introduces the deepest new structure (the study + snapshot model + the chart-rendering palette).
3. **`agent_onboarding_H06.md`** — supplement covering the H06 surface catalog + any new cross-cutting patterns earned during the H06 batch + open questions back to the build side (if any genuinely remain).
4. **`tokens/` (only if new tokens required)** — only when the existing token palette genuinely cannot express a need. Each new token gets a one-line rationale.

**Drop location:** `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H06/handoff_H06/`. The build side will pick it up automatically on the next sprint.

---

## What is NOT in this handoff (and why)

- **Network aggregate analytics (cross-magician).** Will land with the Federation phase (Phase 12). The H06 designer should plan field shapes so the future aggregator can read them without backfill, but **no UI for the aggregate surface**. The "Publish to network" affordance on studies + the "Suggest correction" flow on bundled voces are deliberately stubbed in H06 — they mount the IA but defer the actual cross-vault wiring.
- **Pattern detection automation tuning.** The H06 designer renders pattern cards. The build side decides the detection cadence + thresholds + multi-test correction (per `plan/09` Design notes). The designer does not specify Bonferroni vs FDR — that's a backend choice.
- **Community contribution workflow (review queues, moderation).** Deferred to Phase 14 (Plugin Ecosystem). The H06 surfaces stub the "Suggest correction" affordance + the "Contribute scheme" affordance but the review pipeline is honestly labelled as Phase 14.
- **Pronunciation guides as a separate surface.** Folded into Voces Library Browser (surface 4). The H06 designer does not produce a separate guide surface.
- **Per-cipher contribution flow.** The Calculator surface has a "Define custom cipher" modal for the practitioner's own use. Contributing a cipher to the shared library is Phase 14.

---

## A nuance on tone the designer must carry

The H06 surfaces span two emotionally distinct domains:

- **Linguistic Tools** are technical-craft surfaces. Tone: scholarly. The practitioner is a serious student of language; the surfaces should feel like a paleography reference or a Liddell-Scott lookup. Restrained. Precise. Citations matter. No mysticism in the chrome.
- **Synchronicity & Analytics** are observational-evidence surfaces. Tone: rigorous attention. The practitioner is treating their own practice as a dataset; the surfaces should feel like a research lab notebook, not a fortune-telling device. Sample sizes, confidence intervals, honest empty states.

Both tones share the wellbeing-adjacent restraint: never breathless, never gamified, never oracular. The two domains' chrome may differ slightly (Linguistic surfaces use more `--font-serif`-heavy typography; Analytics uses more `--font-mono` for numerical readouts), but the editorial discipline is the same.

The H06 designer is asked to hold this distinction throughout the 10 surfaces. If a piece of chrome feels like a slot machine, redesign it. If a piece of chrome feels like a Delphic priestess, redesign it. The middle path is sober, attentive, and **trusts the practitioner to draw their own conclusions**.

---

## Status check-in cadence

The build side reads this file on each new session and checks `/home/sophia/design-handoffs/theourgia/` for new bundles. When H06 lands, the build side opens the next sprint, wires Phase 08 + Phase 09 backends, and updates this document in place with a "Last designer drop received" line.

**Last build-side update:** 2026-06-23 — H06 request opened. Phase 07 backend authoring begins in parallel; the two efforts will not block each other. The H05 closer (`56d3235`) is the last sprint commit before H06 opens.
