# Phase 02 — Batch 17: Admin authoring surfaces (Editor, Templates, Scheduler, Newsletter Composer, Book Preview)

> **Scope target:** the 5 admin surfaces that compose the **authoring pipeline** — the Tiptap-based Editor with its custom magickal blocks, the shared block-template manager, the time-released content Scheduler, the split-pane Newsletter Composer (editor | live email preview), and the Book Preview (parchment print preview with crop / bleed / spread navigation).
>
> Per `feedback_follow_design_thread_deep.md`: the Editor is the load-bearing surface of the whole product. Every custom block (`ritualLog`, `quoteCitation`, `gematria`, `sensation`, `entityRef`, `sigil`, `chart`, `divination`) is referenced by other surfaces — get the design surface right here and the rest plugs in.
>
> This batch is the closest thing to "wiring pass" we get in the design-fidelity layer — the Editor's block surfaces are stub-rendered against shapes the wiring pass will hydrate (entityRef, sigil, divination etc.).

## Surfaces

| Surface | Route | `.dc.html` | Heaviest constraints |
|---|---|---|---|
| Editor | `/editor` | `Theourgia Editor.dc.html` | Tiptap with custom-block infrastructure. Slash-command menu. Multi-language input with auto font/RTL switching. Block round-trip with display surfaces (Essay, Today, etc.) |
| Templates | `/templates` | `Theourgia Templates.dc.html` | Save / load / share shared block templates. Template store. |
| Scheduler | `/scheduler` | `Theourgia Scheduler.dc.html` | Time-released content. By-date ↔ by-tradition toggle. Calendar picker that resolves Solstice / Beltane / planetary-hour symbols to dates via §10.7 ephemeris (real ② / ③) |
| Newsletter Composer | `/newsletter/compose` | `Theourgia Newsletter Composer.dc.html` | Split editor `\|` live email preview. Subject + preview text + body toolbar + parchment-rendered email. Audience selector + send-as identity. Test send / schedule / send now. |
| Book Preview | `/book/preview` | `Theourgia Book Preview.dc.html` | Author's print preview (Interior / Cover / Index toggle) + crop / bleed marks + spread navigation + Send to POD + Export print PDF. Real `@page` + `@media print`. |

## Editor — block infrastructure (this batch's biggest deliverable)

Per `agent_data_and_components.md §2` (Tiptap nodes):
- Built-in nodes / marks ship from Tiptap (paragraph, headings, lists, blockquote, code, image, link, table; bold/italic/etc.)
- **Custom nodes** that Theourgia adds (each is a Tiptap node with a serializable JSON shape):
  - `ritualLog` — opens a ritual workings panel (title, intent, steps, outcome)
  - `quoteCitation` — quote with citation back to `LibraryItem`
  - `gematria` — input expression → live computation
  - `sensation` — body-map diagram with marked points (`SensationDiagram` primitive)
  - `entityRef` — embed of an Entity (resolved via the alias graph)
  - `sigil` — saved sigil id, rendered inline
  - `chart` — astrology chart (resolves to an Editor-side ChartNode)
  - `divination` — embedded reading session

For this batch the Editor surface ships:
- Tiptap initialized with the built-in nodes
- A **stub** for each custom node — renders the node's shape from its JSON attributes, with a clear "wires up with Phase 0X" note
- The slash-command menu with all 8 custom blocks registered
- The language-toolbar primitive (auto-switches `lang=` + font for the next inline span)
- Round-trip: `JSON ↔ rendered` for each custom block (covered by unit tests in the wiring pass)

## Out of scope (later)

- **Real engines for the custom blocks** — gematria computation, kamea+traceSigil for the sigil node, ephemeris for the chart node, entity-alias graph lookup for entityRef. Each lands in its phase (06–08).
- **Plugin-extension nodes.** The plugin extension-point for custom Tiptap nodes is part of Phase 14; Batch 17 ships the 8 built-in custom nodes only.
- **Collaborative editing.** Yjs adapter is scaffolded in `agent_onboarding §3.5`; multiplayer enables in Phase 12 for shared rituals.
- **Send to POD + Export print PDF for Book Preview** — themed stubs (no actual POD wiring).

## Acceptance criteria

1. All 5 routes render against their `.dc.html` per the per-component ritual.
2. Editor: slash-command menu lists all 8 custom blocks; each insertion adds a placeholder node visible in the doc; toggling languages from the LanguageToolbar switches the lang attribute on subsequent input.
3. Templates: save / load / list works against localStorage (real backend lands with Phase 04).
4. Scheduler: by-date / by-tradition toggle visibly reshuffles the queue.
5. Newsletter Composer: edits to the subject / preview text / body reflect in the live email-preview pane within 60ms.
6. Book Preview: Interior / Cover / Index toggle, crop / bleed mark toggles, `@page` size + `@media print` strip the chrome on Print.
7. Drift list written before code for each surface.
8. No native dialogs; destructive actions route through `ConfirmDialog`.

## Memories the batch is expected to reinforce or add

- `feedback_follow_design_thread_deep.md` (the depth rule — Editor is the showcase for block round-trip semantics)
- A new memory if a Tiptap-custom-node pattern emerges that future block ports need to follow.
