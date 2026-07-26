# H13 — The Workshop, rebuilt: Hellenic sign-craft, a real talisman composer, a real circle builder

**Request opened:** 2026-07-26
**Requested by:** Soror Ευ. Α. (via theourgia-claude)
**Scope:** full redesign of three Workshop surfaces exposed as façades by the 2026-07-26
usability review (30 screenshots on file): the sigil generator, the talisman designer, and
the magical circle builder. Two adjacent tools (magic squares, tool registry) are being
repaired in code and need no design. All five breakpoints per the H12 contract.

## The ask, in one breath

> When I sit down to craft a seal, a talisman, or a circle, the tool must do real work —
> compute my isopsephy, derive my charaktêres, compose my layers, render my Greek — and
> at the end hand me a file I can print, engrave from, or chalk from at the altar. No
> control that does nothing; no export that exports nothing.

## Why now

The review found polished chrome wired to no engines: six sigil "modes" rendering one
identical polyline, a talisman canvas hardcoded to a demo, inscriptions that never reach
the circle preview, dead export menus everywhere. Meanwhile the operator's own craft —
documented in her grimoire's sign-and-sealcraft practice — is Hellenic, not Western:
**charaktêres derived by grammar, name-wings (△ invoke / ▽ banish), isopsephy-driven
seals, the seven Greek vowels, the Ephesia Grammata.** The backend already computes
Milesian isopsephy (`/api/v1/gematria`); the magic-squares engine is real. Engines for
seal-craft, composition, and SVG/PDF export are being built in parallel — this handoff
designs the surfaces they deserve.

## Hard rules (all three surfaces)

- **Export is the point.** Every surface ends in real SVG + PDF (print-scaled, with a
  physical-size control — mm/inches — and, for the circle, tiled printing that works).
  A design that cannot leave the browser is a façade.
- **Greek is first-class.** Polytonic Greek renders correctly in every inscription,
  ring, and seal (the operator works in «ΕΚΑΤΗ ΦΩΣΦΟΡΟΣ ΕΝΟΔΙΑ», not Latin).
- **No dead chrome.** If a control is shown, it works. Claims match capability.
- **Save → library → reopen → edit** round-trips on all three.
- Anti-gamification carry-forwards; engraving SVG icons; no emoji; H12 token discipline.

## Surface 1 · Sign-craft (successor to the sigil generator)

Two wings, Hellenic first:
- **Hellenic sign-craft (primary):** (a) **Isopsephy seal** — enter a name/phrase in
  Greek, the tool computes its isopsephy live (show the arithmetic), derives a seal by
  the operator's documented grammar (number → geometry: kamea-path on the relevant
  square, or digit-reduction ring positions); (b) **Charaktêres composer** — build
  character-glyphs from the documented stroke grammar (ring-terminals on strokes),
  arrange into a signum; (c) **Name-wings** — a name/word set in ascending (△ invoke)
  or descending (▽ banish) wing form, letter-by-letter; (d) **Vowel ring** — the seven
  vowels arranged by planetary attribution around a seal; (e) **Ephesia Grammata**
  band as an outer inscription option.
- **Western modes (secondary wing, honest):** Spare letter-elimination and kamea-path
  sigils — only the modes with real engines; the fake ones are removed, not redesigned.
- Every mode: live preview, parameters visible, the derivation shown (the operator is
  a scholar — show the work), export, save to library with derivation metadata.

## Surface 2 · Talisman composer

- **Layer model for a two-faced physical disc** (front/back): base shape + material
  note; kamea layer (pull any saved/Agrippa square — real embed, not a picture);
  seal layer (pull any saved sign-craft seal); inscription rings (Greek); planetary
  glyph layer; free placement, reorder, show/hide per layer. Live composite preview,
  both faces.
- **Election panel:** link a saved election/datetime (the operator's Oct 15 Jupiter
  election is the acceptance case) — display its chart context read-only on the design.
- **Engraving spec export:** the deliverable is a maker-ready sheet — front SVG, back
  SVG, at physical size, plus a spec block (materials, election datetime, intent line).
- **Lifecycle chrome:** consecration link (existing rite records), recharge cadence
  display + next-due (backend lands in parallel), retirement state — designed here,
  worn lightly (a strip, not a dashboard).

## Surface 3 · Circle builder

- Rings that hold their **real inscriptions** (Greek-capable, per-ring font-size auto
  or manual), cardinal orientation marks, quarter/station markers the operator can
  label (her compass: the four stations), centre sigil slot (pull from sign-craft
  library), preset save/load that actually round-trips.
- **Chalk/tape mode:** export at real floor scale — tiled PDF (A4/Letter) with
  overlap marks that genuinely assemble, plus a radius/segment measurement sheet for
  drawing by cord-and-chalk.
- Honest usage panel: real linked workings only; empty state if none.

## Out of scope

Engine internals (parallel build), magic-squares + tool-registry repairs (code-only),
recharge scheduling backend, any new divination content.
