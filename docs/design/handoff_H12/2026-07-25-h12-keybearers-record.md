# H12 — The Keybearer's Record: practice-first nav + the four missing practice surfaces

**Request opened:** 2026-07-25
**Requested by:** Soror Ευ. Α. (via theourgia-claude)
**Scope:** design fidelity for (a) a restructured navigation architecture that puts the
operator's daily practice first while keeping every platform feature reachable, and
(b) four new practice surfaces her system requires for the 8 Aug launch, plus one
upgraded home surface. Target: all five breakpoints (phone / tablet / small desktop /
desktop / ultrawide).

## The ask, in one breath

> When I open Theourgia I should land in *my practice* — today's lunar day, my four
> rite stations, what's due — with one tap to cast the bones, log a working with its
> declared intent, or check my grade progress. The platform's publishing, network,
> and plugin power should still be there, but in its own wing, not crowding my
> sidebar. And it must all work on my phone.

## Why now

The code-truth review (2026-07-25) found: 118/126 admin routes live-wired and green
suites, but the nav exposes ~31 links in 10 sections — the operator calls it
"extremely cluttered." A complete four-station daily-rite component family
(`shared/src/LiberResh/` — ReshNextAdoration, ReshStationCard, ReshStreakGrid,
SunArcDiagram) is built, tested, and **mounted nowhere**. Four practice capabilities
have no surface at all. Mobile-awareness (`useNarrowLayout`) is used in 5 of 639
files. Backend substrates are being extended in parallel (Attic lunar calendar,
astragaloi engine, two-gate verdict fields, curriculum model) — surfaces and
plumbing will meet in the middle.

## Surfaces to design

### Surface 1 · Navigation architecture (`VaultNav` restructure + "Platform wing")

- **Primary sidebar (default):** Practice · Reference · Workbench · Study — the
  operator's daily world. Tight, unscrolled on a 1080p laptop.
- **Secondary wing:** Publishing · Network · Platform (plugins/agents/registry) —
  reachable via one clearly-labeled affordance from the primary nav (e.g. a
  "Platform" switcher at the sidebar foot, or an app-grid button in the topbar).
  Design question for you: switcher vs collapsible vs separate landing page.
  Nothing is deleted; everything keeps a route.
- Must specify behavior at all five breakpoints (drawer on phone, rail on tablet?).

### Surface 2 · Today as the practice dashboard (upgrade of `/`)

Existing Today keeps quick-capture, planetary hour, recent entries, offerings due.
Add, above the fold:
- **Lunar-day chip:** Attic day-of-month + phase + any Hekatean observance state
  ("Deipnon tonight — dark moon", "Noumenia", "Agathos Daimon day") from
  `GET /api/v1/events`.
- **Four-station rite row:** mount the LiberResh family, relabeled for a
  four-station day (Dawn / Noon / Dusk / Night). Dusk is the "minimum-viable"
  station: the streak counts if dusk is done. Include the streak grid.
- **Due row:** talisman recharges due + practice items due (existing ledger cards).

### Surface 3 · Astragaloi casting (`/divination/astragaloi`, + method tab in DivinationMisc)

Five knucklebones, faces 1/3/4/6; 56 distinct casts; sums 5–30 (6, 29 impossible).
- Cast input: tap-to-enter five faces (or "record a physical cast" — this is a
  *transcription* of a real throw, not an RNG toy; design should honor that).
  Optional RNG mode clearly separated.
- Result card, two channels shown together: **(1) the oracle verse** — god name +
  hexameter verse + ✓/⏳/✗ valence; **(2) the ladder reading** — sum → sphere
  (1–10) with octave band (luminous ≤10 / embodied 11–20 / chthonic 21–30) and
  element ground. Space for the operator's own interpretation notes + linked
  question/intent.
- History list with filters; each cast links to a journal entry.

### Surface 4 · Two-gate verdict flow (on workings & practice modules)

The Record covenant: **declare intent before; judge after.**
- On a working/entry at creation: an "intent declared" field with timestamp lock
  (visually sealed once saved — it must *feel* like a covenant, not a form field).
- Later, a verdict affordance: **Gate 1 — did it work? (repeatable)** ·
  **Gate 2 — is it true? (coherent)** — each pass/fail/open with notes; verdict
  date-stamped. Entries carrying an undischarged verdict surface in a review queue
  ("awaiting judgment") — suggest where this queue lives.
- Practice modules (custom practices) carry an install-by-proof state:
  `candidate → testing → installed / rejected` — design the state chip + transition UI.

### Surface 5 · Tetraktys grade tracker (`/order/ladder`)

The operator's Order walks a 10-sphere tetraktys ladder in a fixed serpent order
(10→9→8→7→4→5→6→3→2→1) with stage-gates. Design:
- The tetraktys figure itself (10 points in 4 rows) as the navigation — current
  sphere lit, completed spheres marked, locked spheres dimmed; the serpent path
  drawn. This is sacred geometry: austere, not gamified. No badges, no confetti.
- Per-sphere detail: name/number, its curriculum items (readings, practices,
  deliverables), gate requirements, dated completion evidence links (journal
  entries), and the operator's oath/initiation record (sealed styling exists).
- A quiet overall-progress affordance (e.g., "Sphere 9 · second month") — no
  percentage bars.

## Constraints

- Anti-gamification invariants hold (no play counts, no streaks-as-pressure except
  the rite streak the operator herself defines, no celebration animations).
- Sealed content styling conventions apply to oaths/initiations.
- All five breakpoints; phone-first for Surfaces 2 and 3 (she logs from the temple).
- Tokens: `shared/src/tokens/theourgia.tokens.css` — prefer token classes over new
  inline styles; these five surfaces should model the way out of the inline-style
  debt, not add to it.
- Astragaloi iconography: knucklebone faces are 1/3/4/6 — do not draw d6 pips 2/5.

## Out of scope for H12

Backend contracts (being built in parallel; wire points will be
`/api/v1/astragaloi/*`, verdict fields on workings, `/api/v1/curriculum/*`,
events feed extensions). Existing surfaces' visual refresh. The Publishing/
Network/Platform wings' internal redesign (only their *entry point* is in scope).
