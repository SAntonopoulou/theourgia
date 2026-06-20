# ADR-0007: Tiptap as the rich-text editor foundation

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #frontend, #editor, #ux

## Context and problem statement

The journal editor is the most-used surface in Theourgia. Magicians write entries — ritual logs, dream records, divination sessions, magical record entries, blog posts — every day, sometimes for hours. The editor must:

- Be a pleasure to use (typographic care, keyboard-fluent, distraction-free)
- Support custom block types tailored to magickal practice (chart, sensation diagram, sigil, gematria, quote citation, entity reference, divination result, ritual step, voce magicae, …)
- Handle multi-script text (polytonic Greek, Hebrew with niqud, Arabic, Devanagari) inline with English
- Support slash-command insertion of all custom blocks
- Round-trip to a portable format (Markdown or structured JSON) for export and template sharing
- Support collaborative editing in some future phase (group rituals, shared correspondence drafts)
- Be open-source and AGPL-compatible

## Decision drivers

- Custom block extensibility (we will define ~15 magickal block types)
- Stable open-source license (we are AGPL; can't depend on proprietary editors)
- Mature accessibility primitives
- Collaborative editing path (CRDT or OT)
- Active maintenance + community
- React 19 compatibility (admin surface)
- Round-trip-able document model

## Considered options

1. **Tiptap** (ProseMirror-based wrapper) — extensible, framework-friendly
2. **Slate** (React-native, free-form schema) — flexible but more building from scratch
3. **Lexical** (Meta) — modern, fast; opinionated framework integration
4. **CKEditor 5** — feature-rich; commercial license for some features
5. **TinyMCE** — long-established; permissively licensed but feels dated
6. **ProseMirror directly** (no wrapper) — most powerful, steepest learning curve
7. **Custom contenteditable build** — full control, immense engineering cost

## Decision

**Tiptap (latest 2.x) as the editor foundation.**

## Rationale

Tiptap is a high-quality wrapper around **ProseMirror**, which is the most powerful and well-thought-out rich-text editing engine in open source. ProseMirror's transaction model, schema validation, and CRDT-friendly architecture (via Yjs) are the right primitives for what we want to build.

Tiptap brings several benefits over raw ProseMirror:
- Sensible defaults (we don't have to write every node and mark from scratch)
- First-class React integration that respects ProseMirror's model
- Extension system that maps cleanly onto our "custom magickal blocks" need
- Good documentation and a healthy community
- MIT-licensed (compatible with AGPL)

Each custom magickal block type becomes a Tiptap extension defining a ProseMirror node. The shape is well-understood; many projects have built domain-specific editors on Tiptap (Notion-like apps, scientific note-takers, academic publishers).

**Slate (option 2)** is React-native and flexible but less mature; we'd reinvent more.

**Lexical (option 3)** is fast and modern, but Meta-driven and less proven for our specific extension pattern. The React integration is opinionated in ways that conflict with TanStack Router patterns.

**CKEditor 5 (option 4)** is excellent but its plugin model and licensing of some features (real-time collaboration, certain extensions) is commercial. Doesn't fit our AGPL ethos.

**TinyMCE (option 5)** is stable but the developer experience is dated; custom blocks require more boilerplate.

**ProseMirror directly (option 6)** is the right call for engineering teams with deep editor expertise; for us, the Tiptap wrapper provides 80% of the value at 10% of the boilerplate.

**Custom contenteditable build (option 7)** is the wrong answer. Contenteditable is notoriously hard to make correct across browsers. Re-implementing what Tiptap+ProseMirror already gives us would consume months of work for no benefit.

## Consequences

### Positive
- Extension model fits our "custom magickal blocks" need perfectly
- ProseMirror's schema validation prevents the document from entering invalid states
- Yjs collaborative editing comes from the same upstream and is well-integrated
- AGPL-compatible (MIT license)
- React 19 supported

### Negative / trade-offs
- Tiptap-specific extension API; if Tiptap is abandoned (low probability given community size), we'd migrate to raw ProseMirror (manageable but non-trivial)
- ProseMirror's document model is JSON with a schema, not HTML or Markdown — we serialize for storage. The serialization format is well-documented and we own the schema, so this is stable.
- Initial learning curve for contributors writing extensions

### Neutral
- Document storage format: ProseMirror JSON in the database (`body` column), with a denormalized plaintext column for search
- Markdown / HTML / PDF export paths: implemented as serializers from ProseMirror JSON (standard pattern)
- Collaborative editing: enabled via Yjs adapter when we need it (Phase 12 for group rituals)

## Implementation notes

- Tiptap 2.x; plan to track major versions as they ship
- Custom block file layout: `frontend/shared/src/editor/blocks/<block-name>.ts`
- All custom blocks extend a common `MagicalBlock` base class for consistent chrome (selector, visibility, edit/view toggle, accessibility patterns)
- Slash-command menu lives in `frontend/shared/src/editor/slash/`
- Multi-script handling: inline Greek/Hebrew/Sanskrit marks tagged with `<greek>`, `<hebrew>`, `<sanskrit>` for proper font selection and i18n
- Server-side rendering of journal content: ProseMirror JSON → HTML using the official `prosemirror-model` serializer

## References

- [Tiptap documentation](https://tiptap.dev/)
- [ProseMirror documentation](https://prosemirror.net/)
- [Yjs collaborative editing](https://docs.yjs.dev/)
- [plan/02-frontend-foundations.md §4 Tiptap editor foundation](../../plan/02-frontend-foundations.md)
- [plan/04-journaling.md §2 Editor extensions](../../plan/04-journaling.md)
