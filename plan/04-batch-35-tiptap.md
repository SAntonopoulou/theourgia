# Batch 35 — Tiptap live integration + custom blocks

**Status:** B97 + B98 + B99a shipped 2026-06-23. B99b (pickers + persistence + visibility/publish) follows.

The H02 Template Designer (B61) already ships the 20-block catalog and the
backend already stores entry bodies as Tiptap JSON (Batch 30). Batch 35 makes
the Editor surface itself **live** — replacing the design-fidelity static port
in `frontend/admin/src/routes/Editor.tsx` with a real Tiptap 3 editor instance
whose 6 custom node types round-trip via the existing API shape.

## What B99a shipped (chart + divination Tiptap nodes)

Per the design decisions confirmed for B99 (parametric over reference · modal pickers · auto-save + Publish · static result attrs):

- **`chart` node** — atom · React NodeView. Stores `{ title, description, snapshot: { placements, houses, aspects } | null }`. When `snapshot` is present, renders via the existing shared `<Chart>` component at 240 px. When `null`, renders a friendly placeholder explaining that the picker arrives in B99b. Title + description are inline-editable.
- **`divination` node** — atom · React NodeView. Stores `{ kind, seed, question, spread?, cards?, lines? }`. The reading is **immutable history** per the design decision: the picker (B99b) draws the cards / casts the lines, copies the result into the node, and never re-derives.
  - **Tarot body** renders the drawn cards as a flex row of position + name labels.
  - **I Ching body** renders the cast hexagram (SVG lines: solid for yang, broken for yin) plus the King-Wen number + English name + Chinese name + pinyin from the existing engine's `hexagramName(num)`.
- **3 new slash commands**: `/chart` (inserts empty), `/tarot` (3-card spread with random deterministic seed), `/iching` (six-line cast with random deterministic seed). The two divination commands compute their snapshot inline at insert time so the inserted block is already populated.
- **`pickTarotSnapshot(spread, seed)`** and **`pickIchingSnapshot(seed)`** — exported helpers for the future pickers (and used by the slash commands today).
- **Tests** — 5 new vitest cases (tarot determinism · tarot variance across seeds · iching range + count · iching determinism · chart snapshot round-trip). Total 23 in Editor.test.tsx (+5 from B98).
- **Stories** — `Editor · chart + tarot + iching nodes (B99a)` story showing a full reading-log document with all three new blocks populated.

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

## What B99b will add (next batch)

Confirmed design decisions:
- **Wire format**: add `EntryDetailRecord` returned by `GET /api/v1/entries/{id}`; lean `EntryRecord` stays on list endpoints.
- **Picker UX**: modal (matches `ElectionPickerModal` family from B93).
- **Node depth**: static result attrs (already in place from B99a for divination; chart picker will compute snapshot once + store it).
- **Persistence cadence**: debounced auto-save (~1s) + explicit Publish CTA for state transitions.

Scope:
- Entity picker modal: opens when `entityRef` is inserted with empty attrs; lists entities + unified views; on select, fills `entityId` + `displayName` + `kind`.
- Library picker modal: opens when `quoteCitation` is inserted with empty `citation` field; lists library entries; on select, copies the citation string.
- Chart picker modal: lets user pick kind / datetime / location / system; fetches `/api/v1/astro/chart`; copies the response into the node's `snapshot` attr.
- Divination picker: pre-existing tarot/iching commands already populate at insert; this batch adds spread / question UI inside the existing `DivinationNode` NodeView (or surfaces it via the divination commands' suggestion popovers).
- `EntryDetailRecord` type + `client.entries.detail(id)` + `client.entries.patchBody(id, body)` endpoints.
- TiptapEditor accepts `entryId?: string`; mounts with `setContent(JSON.parse(body))` from `entries.detail(id)`; debounced PATCH on `editor.onUpdate`. Topbar "Saved · just now" badge tracks save state.
- Visibility chip becomes interactive: click → popover with 3 options (Personal · Friends · Public); raising to Public opens `RungUpModal` for confirmation; setting Sealed opens `SealUnlock` to encrypt body client-side.
- Publish CTA: fires `POST /api/v1/entries/{id}/publish`; Toast on success.

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
