# Batch 35 — Tiptap live integration + custom blocks

**Status:** B97 shipped (2026-06-23, Tiptap base wiring + 6 custom block nodes). B98/B99 follow.

The H02 Template Designer (B61) already ships the 20-block catalog and the
backend already stores entry bodies as Tiptap JSON (Batch 30). Batch 35 makes
the Editor surface itself **live** — replacing the design-fidelity static port
in `frontend/admin/src/routes/Editor.tsx` with a real Tiptap 3 editor instance
whose 6 custom node types round-trip via the existing API shape.

## What B97 shipped

- **`frontend/shared/src/Editor/`** — new shared module.
- 6 custom Tiptap nodes (atom + React NodeView):
  - `ritualLog` — timestamped log lines (live add/remove rows).
  - `quoteCitation` — source line + translation + citation chrome.
  - `gematria` — Greek isopsephy + Hebrew gematria with computed sum at render time.
  - `sensation` — body silhouette + labelled points (rendered from attrs).
  - `entityRef` — inline pill referencing a magickal being (picker arrives in B99).
  - `sigil` — block holding `sigilId` + `intent`; renders a deterministic mark until the workshop link is wired in B99.
- 2 inline marks: `lang` (script-aware font swap) + `smallCaps`.
- Slash menu (`SlashMenu` + `slashCommands.ts`): popover at the typed `/`, 6 commands, arrow-key + Enter + click navigation, query filter against title + key.
- Toolbar: Paragraph chip (block kind toggle wired in B98) · B/I/Sc/Link · inline lang chip (EN · ΕΛ · עב) · Insert-block CTA.
- `TiptapEditor` composes the above + exposes `initialDoc` + `onChange` for round-trip.
- 14 vitest cases: catalog shape · filter behaviour · schema registration · slash-command insertion · gematria sums (Greek + Hebrew) · JSON round-trip for ritualLog, gematria, and lang-marked text spans.
- 5 storybook stories: seeded doc · empty placeholder · read-only · slash menu open · slash menu filtered.
- Admin `Editor.tsx` rewritten to compose `TiptapEditor` against the same Agathos Daimon seed document.

## What B98 will add

- Polish the `/` trigger so it always opens the slash menu after a whitespace + slash sequence (current logic works on most cases; a few edge cases around nested-block start positions remain).
- The "Paragraph" chip in the toolbar becomes a real block-kind dropdown (Heading 1/2/3 · Paragraph · Quote · Code).
- Inline keyboard helper to insert the lang-marked span at the caret without armed-toggle state.

## What B99 will add

- `chart` Tiptap node (composes the existing CelestialBand chart engine for natal/horary).
- `divinationResult` Tiptap node (composes the Tarot / I Ching / Geomancy engines from Phase 06).
- Entity picker: `entityRef` opens a picker on insert that lists entities + unified views.
- Library picker: `quoteCitation` opens a picker on insert that lists library entries.
- `/api/v1/entries` persistence: load entry body via `GET /entries/{id}` → `setContent(JSON.parse(body))`; save via debounced `PATCH /entries/{id}` with `body = JSON.stringify(editor.getJSON())`.
- Visibility chip becomes interactive (rung-up modal when Personal → Public; SealUnlock when Sealed).
- Publish CTA — fires `POST /entries/{id}/publish`.

## Round-trip contract

The Tiptap JSON document survives:

```
backend storage (entry.body, text column with JSON)
       │
       │  GET /api/v1/entries/{id}
       ▼
   editor.setContent(JSON.parse(body))
       │
   user edits in the live editor
       │
   editor.getJSON()
       │
       │  PATCH /api/v1/entries/{id}
       ▼
   backend storage
```

Each custom block stores its content as **attrs** on the node, never as
inline pixels. The same JSON renders identically in the read view
(blog kind, public profile, book preview) because `renderHTML` is
defined on every node + mark.

## Cross-cutting rules honoured

1. **No raw hex** — every colour resolves through a `var(--token)`.
2. **No `--danger`** — empty-required-citation chrome in `quoteCitation` would use `--accent` border (citation field becomes load-bearing in B99 when the Library picker lands).
3. **No flattened bitmaps** — sigil block stores attrs + parametric shape; the workshop engine will render the SVG at view time once linked.
4. **Round-trip discipline** — every custom node defines both `parseHTML` and `renderHTML` so HTML-export → re-import is lossless.
5. **Sandboxed expression evaluator** — gematria value tables are pre-computed lookups; **no `eval`, no `Function`** at any point in the pipeline.

## Tests / gates at B97 close

- 1705 / 1705 shared vitest passing (+14 from sprint start)
- admin tsc clean
- 550 / 550 visual baselines (+5 from B97 Editor stories)
- 550 / 550 a11y baselines (axe-core WCAG 2.2 A + AA)
