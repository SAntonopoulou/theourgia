# Phase 02 — Batch 18: Workshop + small tools (Workshop, Sandbox, Oracle, Transliterate)

> **Scope target:** the 4 remaining admin surfaces — Workshop (gematria + magical-squares + correspondences workbench), Sandbox (MBF imported-content isolated runtime), Oracle (daskalos / oracular interface), Transliterate (script transliteration tool). This batch closes the design-fidelity layer for the admin SPA.

## Surfaces

| Surface | Route | `.dc.html` |
|---|---|---|
| Workshop | `/workshop` | `Theourgia Workshop.dc.html` |
| Sandbox | `/sandbox` | `Theourgia Sandbox.dc.html` |
| Oracle | `/oracle` | `Theourgia Oracle.dc.html` |
| Transliterate | `/transliterate` | `Theourgia Transliterate.dc.html` |

## Per-component ritual + pre-ship checklist

Every surface follows:
1. Pre-code: read the `.dc.html` end-to-end + `agent_onboarding.md §` for the surface + grep sibling cross-references (`feedback_follow_design_thread_deep.md`)
2. Write drift list before code
3. **Pre-ship checklist** (A–E) per `feedback_pre_ship_drift_checklist.md` before declaring done

## Out of scope (wiring pass)

- Real gematria, kamea, transliteration **engines** — `/workshop` ships the surface; real computation in Phase 07/08
- Sandbox **isolation runtime** — design-fidelity port only; real bundle execution in the MBF runtime substrate
- Oracle's **daskalos AI integration** — agent wiring in Phase 16

## Ship log

- 2026-06-21 — All four surfaces shipped, `npx tsc --noEmit` clean on `admin/` and `shared/`. Pre-ship drift checklist (A–E) run on each:
  - **Workshop** — fixed builder icons to use `<circle>` + `<path>` element structure per source (`.dc.html` lines 122/127/132) instead of a flattened single-path approximation. Engines (Latin gematria a=1..z=800, Chaldean planetary hour rotation, PGM barbarous-name PRE/MID/SUF arrays, 8 Sortes oracles) ported verbatim from the source `<script>` block.
  - **Sandbox** — fixed "Running in isolation · {N} items" to hard-code 11 (matching source `itemCount: 11`, distinct from the 5 preview rows). Added `tone: "sandbox"` slot to shared `TopbarRegistration` + `VaultTopbar` to tint the topbar in `--sand-soft`/`--sand-line` per `Sandbox.dc.html` line 99; eyebrow chip + reinforce banner + hatched surround now layer the boundary signal.
  - **Oracle** — fixed two fallback strings (I Ching `primImage` and Geomancy `judgeMeaning`) to match the source verbatim. I Ching engine (3-coin cast, KW lookup) + Geomancy engine (Mothers → Daughters by transposition, Nieces by combination, Witnesses, Judge) ported verbatim. Custom token `--div: #7E91CE` mapped to `var(--c-divination)` (same hex in base/hellenic/thelemic themes per shared tokens).
  - **Transliterate** — Greek + Hebrew digraph maps ported verbatim, final-sigma normalization preserved, palette arrays match source order. `lang="el"`/`lang="he"` + `dir` attributes applied to the output span.

## Topbar substrate change

`TopbarRegistration.tone?: "sandbox"` added to `frontend/shared/src/VaultTopbar/TopbarContext.tsx` + `VaultTopbar.tsx`. The Sandbox route is currently the only consumer; when other tone variants are needed (e.g. Trance Mode, Ritual Mode are likely candidates from the design hand-off list), extend the union and add a styles branch.
