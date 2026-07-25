# Theourgia — Agent Developer Onboarding · SUPPLEMENT for Designer Handoff H12 (The Keybearer's Record)

> **Read the base docs + H01–H11 supplements first.** H12 restructures the navigation around the operator's
> daily practice and adds the **four missing practice surfaces** plus an upgraded home. Six files: the new
> nav component, a nav spec surface answering the posed design question, and the four practice surfaces.
> Adds **12 aliased tokens** and **5 new rules (66–70)** on top of the carry-forward 1–65.

---

## S0 · The answer to the posed design question

> *"Switcher vs collapsible vs separate landing page?"*

**A switcher at the sidebar foot.** One control, two wings.

- **Why not collapsible.** A collapsed section still spends sidebar height on its header, and the moment it
  opens you are back to a scrolling sidebar — the clutter returns exactly when you are using it.
- **Why not a landing page.** A separate page adds a hop before every platform task and makes the platform
  feel severed from the vault rather than adjacent to it. The switcher keeps both wings in one muscle memory.
- **What the switcher buys.** The practice wing is unscrolled on a 1080p laptop; the platform wing is one tap
  away; the phone drawer inherits the identical control with no second pattern to learn; and **nothing is
  deleted — every route survives**.

**Link budget: 31 links / 10 sections → 17 links / 4 sections** in the practice wing (14 routes moved to the
platform wing, 5 tools behind a "More tools" disclosure, 3 new surfaces added).

---

## S1 · Delivery shape (non-breaking)

**`PracticeNav.dc.html`** is the restructured nav — the successor to `VaultNav`. **`VaultNav.dc.html` is left
untouched** in this package so the ~40 existing surfaces keep rendering; at integration `PracticeNav` replaces
it wholesale. The `active` prop contract is a **superset** of the old keys (adds `astragaloi`, `ladder`,
`awaitingjudgment`), so no existing call site needs rewriting.

**`NavArchitecture.dc.html`** is the spec surface: the answer above, the link budget, all five breakpoints
framed side by side with live nav instances, the wing switch shown in both states, and the build contract.

### The nav's responsive contract (all five breakpoints)
Driven off a `data-nav-mode` attribute so tests and spec surfaces can force a state; real media queries set
the default.

| Breakpoint | Width | Behaviour |
|---|---|---|
| Phone | < 640 | Off-canvas drawer (284px) over a scrim, opened by the topbar hamburger. Carries whichever wing is active, same foot switcher. Targets ≥44px. |
| Tablet | 640–1024 | **64px icon rail.** Section headers become hairlines; every item keeps an accessible name + tooltip. Tapping the mark expands a 284px overlay. Implemented in the helmet of **all five surfaces**, not just the spec surface — the `640–1024` band sets `grid-template-columns:64px 1fr`, hides the hamburger, and collapses `.pn-label`; the drawer's `translateX` band is scoped to `max-width:640px` so the two never overlap. |
| Small desktop | 1024–1280 | 224px sidebar, labels visible — the tightest full-label width; 17 links still do not scroll. |
| Desktop | 1280–1680 | 248px sidebar — the reference width. |
| Ultrawide | > 1680 | Sidebar stays 248px; **the content column is capped, not stretched** (a working never spans the whole desk). Extra space becomes gutter. |

### Wing contents
- **Practice wing (default).** Practice: Today · Journal · Daily rite · Practice log — Reference: Magical
  beings · Library · Calendar — Workbench: Divination · **Astragaloi** · Sigils · Talismans · Magical circle ·
  Tool registry (+ "More tools": magic squares, voces magicae, gematria, transliteration, voces library) —
  Study: Synchronicities · **Tetraktys ladder** · **Awaiting judgment** · Analytics.
- **Platform wing.** Publishing (6) · Network (4) · Platform (4).

---

## S2 · New tokens — 12 aliases, no new hues

The rite stations, the two gates, and the ladder spheres are **states, not scores**: they borrow the existing
state family so nothing in the practice surfaces can read as a reward or a punishment.

`--lunar/-soft` (= `--moon`) · `--station-done/-soft` (= `--peer-ok`) · `--station-due/-soft` (= `--accent`) ·
`--station-missed/-soft` (= `--ink-mute`) · `--gate-pass/-soft` (= `--peer-ok`) · `--gate-fail/-soft`
(= `--warn`) · `--gate-open/-soft` (= `--ink-mute`) · `--sphere-current/-soft` (= `--accent`) ·
`--sphere-done/-soft` (= `--peer-ok`) · `--sphere-locked` (= `--ink-mute`) · `--covenant/-soft/-line`
(= `--seal`).

**`--station-missed` and `--gate-fail` are deliberately not `--danger` and not red.** A missed dusk station is
an absence; a failed gate is a finding. `--danger` appears **zero times** across all six files.

### On the inline-style vs token-class constraint
The handoff asks these surfaces to model the way out of inline-style debt. The DC mockup format *requires*
inline styles (class-based CSS delays first paint, and these files must stream). We honour the spirit instead:
**every value in every surface body is `var(--token)` — zero raw hex** — and repeated patterns are declared
once as custom properties in the helmet token block. The mapping to the React app's token classes is 1:1;
treat the mockups as modelling token *discipline*, and use `theourgia.tokens.css` classes in the app.

---

## S3 · New rules (66–70)

**66 — The daily rite has four stations, and dusk is the one that must be kept.** Dawn / Noon / Dusk / Night.
The streak counts if dusk is done; the other three are kept or not without penalty. Rendered: the dusk card
carries a `minimum viable` chip and the only primary CTA; the section subhead states the rule in words.

**67 — A cast is a transcription, not a roll.** Astragaloi entry is tap-to-record the faces a physical throw
showed. An RNG mode exists, is visually separated behind a dashed frame, and **every simulated cast is marked
`simulated` in history for as long as it is kept**.

**68 — Knucklebone faces are 1 / 3 / 4 / 6.** There is no two and no five. Rendered as pip clusters drawn per
face; the entry grid offers exactly four faces and says so in words.

**69 — Intent is a covenant, not a form field.** Declared before, sealed with its hour and signed with the
operator's key, and thereafter unrewritable. Rendered in `--covenant` with a sealed rail, the fingerprint, and
the verbatim frame *"cannot be rewritten"*. The point is that the later self cannot move the mark.

**70 — Both channels of a reading are shown together, and neither is the answer.** The oracle verse (god +
hexameter + valence) and the ladder reading (sum → sphere + octave band + element) sit side by side, followed
by the operator's own interpretation field with the line *"the two channels above are what the system can say.
What it means is yours."*

**Carry-forward, load-bearing here:** anti-gamification (no play counts, no percentage bars, no badges, no
celebration animation; the rite streak is the operator's own and is framed *"a record, not a scoreboard"*) ·
sealed styling for oaths and initiations · engraving SVG icons, no emoji · WCAG 2.2 AA, ≥24px targets,
reduced-motion, RTL, 200% zoom.

---

## S4 · Surface catalog

**`PracticeNav.dc.html`** — the nav component. Props `active` / `wing` / `navMode`. Foot switcher, "More
tools" disclosure, quiet Awaiting-judgment count (the only number in the practice wing — a workload, not a
score).

**`NavArchitecture.dc.html`** — Surface 1's spec: the answer, the rejected alternatives, the link budget, the
five breakpoint frames (live nav instances at forced modes), both wings side by side, and the build contract.

**`TodayPracticeDashboard.dc.html`** *(worked example)* — the upgraded home. Above the fold: **lunar-day chip**
(Attic day + phase + Hekatean observance state, e.g. *"Deipnon tonight — dark moon · Hekatombaion 29"*), the
**four-station rite row** (mounting the orphaned `LiberResh` family, relabeled Dawn/Noon/Dusk/Night, dusk
marked minimum-viable), the **sun-arc diagram** and **streak grid**, then quick capture + planetary hour, the
**due row** (talisman recharges, offerings, curriculum, undischarged verdicts), and recent entries carrying an
`awaiting judgment` chip. Phone-first: stations stack, chips wrap.

**`AstragaloiCasting.dc.html`** — five knucklebones, faces 1/3/4/6, 56 casts, sums 5–30. Transcription framing
up top; the question; the five-bone face grid with a live sum; RNG separated; then **the reading in two
channels** (oracle verse + ladder reading), the operator's own interpretation with a linked declared intent,
and a filterable history where each cast links to its journal entry. Phone-first.

**`TwoGateVerdict.dc.html`** — the covenant flow. Demo toggle: **Undeclared / Sealed / Judged**. Intent
declaration → sealed record (rule 69). **Gate 1 — did it work? (repeatable)** and **Gate 2 — is it true?
(coherent)**, each pass/fail/open with notes and a date stamp. Practice-module **install-by-proof** chips
(candidate → testing → installed / rejected) with the transition control. The **Awaiting judgment** queue
lives here and is linked from Study in the sidebar.

**`TetraktysLadder.dc.html`** — `/order/ladder`. The tetraktys figure (10 points in 4 rows) **is** the
navigation: current sphere lit, walked spheres marked, locked spheres dimmed, the serpent path
10→9→8→7→4→5→6→3→2→1 drawn as a dashed line. Selecting a point loads its detail: name/number, curriculum
items (readings / practices / deliverables) with dated evidence links, gate requirements with countersign,
and the oath/initiation record in sealed styling. Progress is a phrase — *"Sphere 9 · second month"* — never a
bar.

---

## S5 · QA additions
- [ ] **`--danger` zero times**; `--station-missed` / `--gate-fail` are amber/grey, never red.
- [ ] **Nav**: 17 links / 4 sections unscrolled at 1080p; all five breakpoints behave per the table; the rail
  keeps accessible names; every old route still reachable; nothing deleted.
- [ ] **Today**: lunar chip present with observance state; four stations with dusk marked minimum-viable and
  the streak rule stated; sun arc + streak grid mounted; due row includes undischarged verdicts.
- [ ] **Astragaloi**: only faces 1/3/4/6 are offerable; no d6 2/5 pips anywhere; transcription framing before
  the RNG affordance; simulated casts marked in history; both channels shown together; operator's own reading
  field present.
- [ ] **Verdict**: intent sealed with hour + fingerprint and unrewritable; both gates each pass/fail/open with
  notes + stamp; queue surfaces undischarged verdicts; module states are the four named ones.
- [ ] **Ladder**: serpent order correct; locked spheres dimmed and their curriculum sealed; oath in sealed
  styling; **no bars, badges, percentages, or celebration**.
- [ ] Every value `var(--token)`, no raw hex in surface bodies; engraving SVG icons; no emoji.

## S6 · Open questions back to the build side
None block design. Notes: (1) wire points are as the handoff states (`/api/v1/astragaloi/*`, verdict fields on
workings, `/api/v1/curriculum/*`, events-feed extensions) — the surfaces assume those shapes and the data doc
records them. (2) The `LiberResh` component family is mounted for the first time here; the four-station
relabel (Dawn/Noon/Dusk/Night) is a prop-level rename, not a fork. (3) `useNarrowLayout` should be replaced by
the `data-nav-mode` contract so the nav's five states are testable without a viewport harness. (4) The
astragaloi oracle corpus (56 verses + valences) is content the operator supplies; the surface renders whatever
the table holds and does not synthesise a verse.

*Pair with `agent_data_and_components_H12.md` for the data contracts, the four API sketches, component
signatures, the tokens table, and a worked example (TodayPracticeDashboard).*
