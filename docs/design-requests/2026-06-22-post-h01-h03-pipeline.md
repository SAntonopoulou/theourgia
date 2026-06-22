# Design Handoff Request — Post H01-H03 Pipeline

**Date opened:** 2026-06-22
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Format expected:** Per-surface `.dc.html` files + an `agent_data_and_components_<handoff-id>.md` supplement, drop into `/home/sophia/design-handoffs/theourgia/<date>-<handoff-id>/` following the H01-H03 precedent.

---

## What just shipped (the context the designer needs to inherit)

The H01-H03 frontend wiring sprint closed on 2026-06-22. **71 shared primitives** across **22 modules** now exist in `frontend/shared/src/`. Phases 03 / 04 / 05 frontend coverage is end-to-end against the existing backend. Test counts: **960 vitest**, **360 visual regression**, **360 axe-core WCAG 2.2 A+AA** — all green.

Carry-forward conventions (these are non-negotiable and the designer must work within them):

- **Token-first.** Every colour/spacing/typography value comes from `frontend/shared/src/tokens/theourgia.tokens.css`. The H01-H03 sprint added the following families that downstream surfaces should reuse before inventing new ones: `--st-*`, `--g-*`, `--fest-*`, `--paper-*`, `--skin-*`, `--edge-*`, `--c-entity`, `--vis-*`, `--cs-*`, `--ss-*`, `--ts-*`, `--is-*`, `--at-*`, `--seal*`, `--verify*`, `--revoke*`, `--moon-light/dark`, `--sun-warm`, `--sky`, `--arc-day/night`, `--magick/--format/--mark`, `--hit/--hit-bg`, `--fail` (alias of `--danger`).
- **`--danger` is reserved for the Visibility → Public step only.** Every "negative" state in any new surface uses care-palette tokens (severed, broken, dissolved, abandoned, lent-out, decommissioned, breached, revoked all already follow this rule). Divination outcomes that the practitioner reads as "difficult" — Tower in tarot, Hexagram 23 in I Ching, Carcer in geomancy, Nauthiz in runes — are **never red**. Use muted tones; the meaning is supplied by the tradition's interpretation, not the chrome.
- **Tradition-neutrality.** Theme tokens (`[data-theme="hellenic"]`, `[data-theme="thelemic"]`, etc.) override the base palette. New surfaces must not hard-code a single tradition's iconography in the chrome — they can theme aesthetically, but practitioner content carries the tradition.
- **`.dc.html` is the source of truth.** Match it exactly per the existing per-component ritual (section inventory · CSS var cross-check · verbatim editorial copy · default state · variant completeness). Editorial voice overrides mockup jargon: expand dev numeronyms ("a11y", "i18n", "RTL") in user-facing labels.
- **Sealed-content discipline.** Anything backed by encryption must default-sealed (oaths + initiations already follow this). Sealed states show **count only, zero plaintext leak** — the UI mirrors what the server cannot read. Use `--seal` / `--seal-soft` / `--seal-border` for these.
- **Wellbeing rule.** Wellbeing copy is verbatim from the designer; never red even for "negative" states; opt-in only, off by default. The designer's prior pass on Phase 05 set this; new surfaces should ask before improvising care-related text.

---

## What needs design — priority order

The list is grouped by phase and ordered by the practitioner-visible impact. Numbers in `( )` are the backend batches that already shipped; "blocked" means the build side cannot start without the `.dc.html`.

### Tier 1 — Daily Practice Tracker (blocks nothing else; ship first)

**Surface name:** `Theourgia Daily Practice Tracker.dc.html`

The practitioner's self-designed ritual companion to Liber Resh. Liber Resh already has its full UI (B59: ReshStationCard · ReshStreakGrid · ReshNextAdoration · SunArcDiagram). Daily Practice is the same shape but for whatever ritual the practitioner sets themselves — morning grounding, daily devotion to a specific entity, a banishing routine, etc.

**What it composes from existing primitives**
- `ReshStreakGrid` (the heatmap is reusable as-is — feed it a different cadence)
- `ReshStationCard` (rename labels, reuse layout)
- Entry pipeline (`createEntry` from admin) for the "I did the practice" capture
- Daily reminder hooks (the substrate already exists for Liber Resh notifications)

**What the designer needs to invent**
- The "define your practice" form: name, cadence (daily/weekly/morning/before-sleep/etc.), optional intention, optional linked entity, optional linked offering recurring schedule.
- The dashboard at-a-glance: today's status (done / pending / skipped without judgement) + streak grid + "last 7 days" view.
- The capture moment — the "Mark complete" affordance and any optional note the practitioner adds.
- Empty state when no practice is defined yet.
- The cross-cutting: practitioner-defined custom practices coexist with Liber Resh; both appear on Today rail. The designer decides the visual hierarchy.

**Tone**: matter-of-fact, never gamified. Streaks are recorded; they are not celebrated with confetti. A skipped day is information, not failure.

---

### Tier 2 — Phase 06 Divination & Practice (backend complete in B44-B49; all frontend blocked)

These nine surfaces unlock the whole Phase 06 to user-visible. Every engine is fully implemented on the backend. The frontend is unbuilt — the designer is making the first impression for each.

#### 1. `Theourgia Tarot.dc.html` (B44 — engine shipped)

**Backend gives us:** card draws (full deck + custom decks supported), spreads (5 built-in — single card, three-card past/present/future, Celtic Cross, relationship spread, year-ahead), reversals support, deck attribution (PD Rider-Waite-Smith ships in-app), spread history.

**Surface must cover:**
- Deck picker (RWS default + user-uploaded decks via Plugins later; for now ship with RWS visible).
- Spread chooser (which of the five layouts).
- Draw moment — should feel ritual, not "click button to flip card." The designer decides the gesture (long-press to focus before reveal, breath-pacing animation, etc.).
- Card display — name + image + position label in the spread + reversed indicator + traditional meaning excerpt (PD source; backend provides) + practitioner's interpretation field.
- Save the spread as an entry (with auto-generated title from the spread + date).
- History view of past spreads.

**Notes:**
- The "card meaning" text is traditional public-domain Waite; the designer needs to display this with appropriate citation chrome (CitationKindBadge already exists — use the `‡` glyph for primary).
- Reversed cards: the visual cue is gentle — a rotation indicator, not red/danger.
- Spreads should be diagrammable (the Celtic Cross has 10 positions; the designer should sketch the layout per spread).

#### 2. `Theourgia I Ching.dc.html` (B45 — engine shipped)

**Backend gives us:** coin method + yarrow stalk method (the slower, more meditative one); 64 hexagrams with King-Wen numbering; changing lines + transformation hexagram; full text of the Wilhelm/Baynes translation (PD-eligible portions only) + Legge as fallback.

**Surface must cover:**
- Method picker (coin / yarrow). Yarrow takes longer; the surface should respect that — don't rush the practitioner.
- Per-line casting moment (six lines, bottom up — the design should make this rhythmic).
- Result: primary hexagram + changing lines + transformation hexagram. Standard Chinese-classical layout: hexagram name in Chinese + Pinyin + English, six-line glyph, judgment text, image text, line-by-line commentary for changing lines.
- Citation chrome for translation source.
- Save the consultation as an entry.

**Notes:**
- Hexagram 23 ("Splitting Apart") and 36 ("Darkening of the Light") are not red. Difficult readings are information.
- Trigram glyphs are public-domain Unicode (☰ ☱ ☲ ☳ ☴ ☵ ☶ ☷). The designer can use these directly.

#### 3. `Theourgia Geomancy.dc.html` (B46 — engine shipped)

**Backend gives us:** 16 figures (Via, Populus, Acquisitio, etc.); chart cascade (Mothers → Daughters → Nieces → Witnesses → Judge); 12-house chart for divinatory question; reconciler. The traditional method of casting (random points → reduce to even/odd) lives in the engine.

**Surface must cover:**
- Question entry (the question framing is part of the rite).
- Casting moment — points generation (the practitioner traditionally makes 16 lines of random dots; the surface should support both "I cast on paper, here are my four Mothers" entry and "generate for me" entry).
- The cascade visualisation — the build pyramid from Mothers up to Judge. This is a heavy visual surface; the designer should sketch the layout carefully.
- The 12-house chart with figures in each house.
- Judgment / interpretation panel (backend supplies traditional meanings; practitioner adds their own).
- Save the chart as an entry.

#### 4. `Theourgia Runes.dc.html` (B47 — engine shipped)

**Backend gives us:** Elder Futhark (24 runes); 3-rune and 5-rune draws; the "symmetric" runes (Isa, Sowilo, Gebo, etc. — runes that read the same right-side-up and reversed) are handled honestly (they have no reversed meaning, the engine reflects that).

**Surface must cover:**
- Draw size (1 / 3 / 5).
- Rune display — glyph + name + name in Old Norse + position meaning + traditional reading + symmetry note where applicable.
- Save as entry.

**Notes:** The "no reversal for symmetric runes" rule is important — the surface must not display a reversed indicator for those even if the user tries to mark one. Reflect the tradition accurately.

#### 5. `Theourgia Divination Misc.dc.html` (B48 — engines shipped)

Four lighter divination methods that can share a single surface (per the H01-H03 pattern of `BeingsTabs` clustering related domains):

- **Pendulum** — yes/no/maybe questions + log; calibration moment (which direction is yes for this pendulum today). Backend tracks per-session calibration.
- **Bibliomancy** — pick a text (user's library), specify a method (random page + finger / random line / verse-numbered), display the picked passage, log the practitioner's question + the passage as an entry.
- **Horary astrology** — moment-of-question chart. Hellenistic horary interpretation guide built into the surface: sect, signification, perfection conditions, planetary witnesses. The backend casts the chart from `{lat, lng, timestamp}`; the surface presents the interpretation workflow.
- **Scrying** — black mirror / crystal / water / fire scrying log. Has a **trance mode** (low-light UI, minimal chrome, big text field for vision capture). The capture is text + optional audio (audio substrate already exists from B34).

The designer decides whether these are a tabbed surface, a sub-route per method, or four separate dashboards. The current expectation is a single `BeingsTabs`-style cluster but the designer can override.

#### 6. `Theourgia Practice Logs.dc.html` (B49 — engine shipped)

This is the cross-cutting log surface for the practices Phase 06 cares about that aren't strict divinations:

- **Dream journal** — entry pipeline already exists; this is a specialised view + capture flow (timestamps the moment of waking, prompts for symbols / figures / felt sense, optional lucidity tag).
- **Pathworking** (Tree of Life journeys) — log entry per path traversed, the path's traditional symbolism, what the practitioner saw, integration notes.
- **Asana / pranayama tracker** — duration, asana name, breath ratio, post-practice notes. The backend tracks streak + duration cumulative.
- **Banishing / grounding log** — quick capture; "I did the LBRP at 14:23", with optional notes. Default-sealed if the practitioner asks (the substrate supports this).

The designer decides if this is one surface with sub-modes or four distinct dashboards. The current scope: four `BeingsTabs`-style sections under "Practice".

---

### Tier 3 — Phase 07 Workshop (backend not yet started; design can land first, build will follow)

These six are the long-anticipated "magician's workbench" surfaces. The backend hasn't been built yet — the design pass will inform the data model. If the designer can deliver these, the build side can backfill the schema + API + frontend together.

1. `Theourgia Sigil Generator.dc.html` — multi-method generator (Spare's banishment-of-vowels, Kamea-based, Rose Cross, harmonograph, formula-driven). Each method has its own panel; the designer should sketch a tabbed or step-wizard flow. Outputs an SVG sigil + the practitioner can sigh, charge, name, store it.
2. `Theourgia Magic Squares.dc.html` — Kamea (planetary magic squares of order 3-9) display + custom magical-square builder + path-tracing UI (the practitioner draws their planetary sigil over the square).
3. `Theourgia Talisman Designer.dc.html` — composes a sigil + the kamea + the elected timing (links to B60 Election Finder) + the material specification + the consecration ritual reference. Outputs a print-ready talisman card.
4. `Theourgia Magical Circle.dc.html` — circle builder. Inner / outer circles, watchtower / cardinal direction markers, names of God / divine names per quadrant per tradition, the practitioner's specific additions. Outputs a printable plan.
5. `Theourgia Tool Registry.dc.html` — list of practitioner's ritual tools (athame, chalice, wand, pantacle, censer, bell, etc.) with consecration date, lineage if applicable, photo, notes. CRUD surface, similar to Library.
6. `Theourgia Voces Magicae Recorder.dc.html` — capture voces magicae the practitioner uses, with pronunciation notes (IPA where possible), audio of their own pronunciation (audio substrate from B34), source citation, planetary/elemental associations. Browse + search + filter.

---

### Tier 4 — Phases 08 + 09 (backend not yet started; design lands when capacity allows)

These don't block anything immediate but the designer should be aware they're coming so they can sketch the data shape during workshop design.

**Phase 08 — Linguistic Tools** (~5 surfaces):
- Gematria calculator (multi-cipher: Greek isopsephy, Hebrew gematria, Latin, English-Qabalah, AIQ-BKR, Mispar Gadol)
- Cross-journal gematria search ("show me every entry where a name with the same gematria as X appears")
- Transliteration tool (Greek ↔ Latin, Hebrew ↔ Latin, etc.)
- Voces magicae reference library (browse-only)
- Pronunciation guides

**Phase 09 — Synchronicity & Analytics** (~5 surfaces):
- Synchronicity log (it has a placeholder route at `/synchronicities` today; the design will replace it)
- Multi-axis tag manager
- Query builder (the user's "scientific illuminism" surface)
- Visualisations (timeline, scatter, heatmap, network, etc.)
- Saved studies + cross-magician aggregate opt-in flow

---

### Tier 5 — Phases 10-16 (long arc; the designer should be aware but no rush)

The full pipeline so the designer can see where each handoff fits:

| Phase | Will need | When |
|---|---|---|
| 10 — Publishing & Monetization | Book composer (some primitives exist) · Newsletter composer (route exists) · Stripe Connect onboarding · Reader/subscriber views | After Phase 09 |
| 11 — Media Library | Image/audio/video library · iCal feed picker · Pilgrimage map view | After Phase 10 |
| 12 — Federation | Network hub directory · Group ritual coordinator · SSO chrome | After Phase 11 |
| 13 — ActivityPub | Fediverse interop chrome (mostly server-side, light UI) | After Phase 12 |
| 14 — Plugin Ecosystem | Plugin registry browser · Sandbox-before-commit UX | After Phase 13 |
| 15 — Hardening & Launch | Inheritance / memorial flow · Final a11y pass · Performance budget surfaces | After Phase 14 |
| 16 — AI Agent Integration | Daskalos pane · BYO-key onboarding · Agent permissions / observability | After Phase 15 |

---

## What the designer should produce for each surface

Per the H01-H03 precedent, each surface lands as:

1. **`Theourgia <Surface Name>.dc.html`** — a static, themed, fully marked-up mockup using the existing token layer. Should render correctly in all three themes (base / hellenic / thelemic) and both modes (dark / light). Designer can use `dc-import` to reuse existing surface chrome (`VaultNav`, `VaultTopbar`, `BeingsTabs`).
2. **`agent_data_and_components_<handoff-id>.md`** — supplement listing every new component the build side needs to ship, with its prop shape and which existing primitives it composes from.
3. **`note_to_design_claude_addendum.md` (or equivalent)** — any new cross-cutting patterns, tokens, or copy decisions that ripple beyond the immediate surface.

**Drop location:** `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-<handoff-id>/`. The build side will pick it up automatically on the next sprint.

---

## Open questions for the designer

The build side wants the designer's call on these before locking the design:

1. **Daily Practice Tracker scope.** Should it support more than one custom practice at a time, or is it strictly "one practice per practitioner, like a single chosen Resh routine"? Build side leans toward multiple practices, but the design will set the tone.
2. **Phase 06 clustering.** Do the four "misc divinations" (pendulum, bibliomancy, horary, scrying) share a `BeingsTabs`-style cluster, or do they each get their own top-level nav entry? Similarly for the four "practice logs" (dream, pathworking, asana, banishing).
3. **Tarot deck plurality.** Should the surface assume one active deck at a time, or let the practitioner switch decks mid-spread? (The Plugin Ecosystem will eventually distribute decks; this affects whether deck-switch is a permanent state or an in-session choice.)
4. **Workshop schema.** The Phase 07 backend isn't built yet. The designer's `.dc.html` for those surfaces will inform the data model. We will iterate.

---

## Cross-cutting standing requests

Things the designer should keep in mind across all these surfaces:

- **The Today rail keeps growing.** It currently holds: PlanetaryHourCard, TransitsCard, LunarPhaseWidget, QuickCapture, Recent entries, HoursOfDayCard, TodayLedgerCards, OnThisDayCard, MottoCard. Phase 06 will add divination capture moments. Phase 07 will add ritual-tool reminders. The designer may need to revisit the Today rail's visual hierarchy when it gets crowded.
- **The substrate sweep.** The build side has been routing every cross-cutting concern through dedicated substrates (email, i18n, events, notifications, uploads). New surfaces should not re-implement these; they should compose. The designer doesn't need to draw the substrates but should know "the audio attachment in scrying flows through the same upload chrome as the library quote audio."
- **Performance budgets.** Surfaces with large data (the geomancy 12-house chart, the gematria search results, the analytics visualisations) need lazy loading + virtual scrolling considered at design time. The designer should flag any surface where they expect &gt;100 rows / &gt;200 cards / heavy SVG.

---

## Status check-in cadence

The build side will read this file on each new session and check whether any Tier 1 / Tier 2 surfaces have arrived in `/home/sophia/design-handoffs/theourgia/`. When a tier completes, the build side opens the next sprint and updates this document in place.

**Last build-side update:** 2026-06-22 — Tier 1 + Tier 2 SHIPPED.

- **Tier 1 (Daily Practice Tracker) — shipped in B80** (`5ec138a`). Surface lives at `/daily-practice`.
- **Tier 2 (Phase 06 Divination & Practice) — shipped in B81-B86** (`26a9317`, `3177d8d`, `66e63e4`, `ed289aa`, `44853e5`, `984c3ff`). Six surfaces under OracleTabs.
- **Tier 3 (Phase 07 Workshop) — open as H05.** See [`2026-06-22-h05-workshop.md`](2026-06-22-h05-workshop.md) for the explicit per-surface request. Six surfaces: Sigil Generator · Magic Squares · Talisman Designer · Magical Circle · Tool Registry · Voces Magicae Recorder. The H05 request locks every product decision; the designer fills the structure with voice and visual rigor.
- **Tier 4 + Tier 5 — still queued.** A separate H06 request will open once H05 is in flight.
