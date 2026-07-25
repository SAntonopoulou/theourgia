# Theourgia — Handoff H12 Package (The Keybearer's Record)

Practice-first navigation plus the four missing practice surfaces and an upgraded home — six `.dc.html` files
for the 8 Aug launch. Adds **12 aliased tokens** and **5 rules (66–70)** on top of the carry-forward 1–65.

## Cover note
> Your design question is answered in `NavArchitecture.dc.html` and in S0 of the onboarding doc: **a switcher
> at the sidebar foot.** The practice wing goes from 31 links / 10 sections to 17 / 4 and sits unscrolled on a
> 1080p laptop; the platform wing is one tap away with every route intact. All five breakpoints are specified
> and shown live. The four new surfaces mount the orphaned `LiberResh` family, honour the transcription nature
> of a cast (faces 1/3/4/6 only), make the declared intent feel like a covenant rather than a field, and draw
> the tetraktys as austere navigation with no bars or badges. `--danger` appears zero times; a missed station
> and a failed gate are amber or grey, never red. — design side

## Files
- **`PracticeNav.dc.html`** — the restructured nav (successor to `VaultNav`). Props `active` / `wing` /
  `navMode`. Foot wing-switcher, "More tools" disclosure, quiet Awaiting-judgment count.
- **`NavArchitecture.dc.html`** — Surface 1's spec: the answer, the rejected alternatives, the link budget,
  five breakpoint frames with live nav instances, both wings, and the build contract.
- **`TodayPracticeDashboard.dc.html`** — Surface 2 *(worked example)*: lunar-day chip, four-station rite row
  with dusk as the minimum-viable station, sun arc + streak grid, due row, quick capture, planetary hour.
- **`AstragaloiCasting.dc.html`** — Surface 3: transcription-first five-bone entry (faces 1/3/4/6), the
  reading in two channels (oracle verse + ladder), the operator's own interpretation, filterable history.
- **`TwoGateVerdict.dc.html`** — Surface 4: sealed intent covenant, Gate 1 (did it work?) and Gate 2 (is it
  true?), practice-module install-by-proof states, and the Awaiting-judgment queue.
- **`TetraktysLadder.dc.html`** — Surface 5: the tetraktys figure as navigation with the serpent path, per-
  sphere curriculum and gates with dated evidence, sealed oath/initiation record.

`VaultNav.dc.html` is included **untouched** so the existing ~40 surfaces keep rendering; `PracticeNav`
replaces it at integration (its `active` contract is a superset). Open any file directly in a browser —
they resolve `PracticeNav` / `support.js` / `tokens/` beside them.

## Read the docs first (`docs/`)
- **`agent_onboarding_H12.md`** — the answer to the design question, the delivery shape, the five-breakpoint
  table, wing contents, the 12 tokens, rules 66–70 verbatim, the surface catalog, and the QA list.
- **`agent_data_and_components_H12.md`** — data contracts, the four API sketches, component signatures, the
  tokens table, and the worked example (TodayPracticeDashboard).
- **`2026-07-25-h12-keybearers-record.md`** — the source handoff.

## Demo toggles
Nav wing switch + "More tools" are live in both panels of `NavArchitecture`. `TwoGateVerdict` has an
**Undeclared / Sealed / Judged** stage toggle. `AstragaloiCasting` has a live five-bone entry (tap faces; the
sum and the gate on "Read the cast" update) plus a Simulate control. `TetraktysLadder`'s figure is clickable —
select any sphere to load its detail; locked spheres return sealed curriculum.

## On the inline-style constraint
The handoff asks these surfaces to model the way out of inline-style debt. The DC mockup format requires
inline styles (class CSS delays first paint and these files must stream), so we honour the spirit instead:
**every value is `var(--token)` — zero raw hex in any surface body** — and repeated patterns are declared once
in each helmet's token block. The mapping to `theourgia.tokens.css` classes is 1:1; use the classes in the app.

## Invariants honoured
Anti-gamification (no play counts, no percentage bars, no badges, no celebration; the streak is framed *"a
record, not a scoreboard"* and is the operator's own dusk rule) · sealed styling for oaths, initiations, and
the intent covenant · `--danger` zero times · engraving SVG icons, no emoji · knucklebone faces 1/3/4/6 with
no d6 2/5 pips anywhere · WCAG 2.2 AA, ≥24px targets (≥44px in the drawer), reduced-motion, RTL, 200% zoom ·
all five breakpoints, phone-first on Today and Astragaloi.

---
*Where the base docs and this supplement disagree, the supplement wins for anything in this package. Backend
contracts are out of scope and being built in parallel; the data doc records the shapes these surfaces render
against at the wire points the handoff names.*
