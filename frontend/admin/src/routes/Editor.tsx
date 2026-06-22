/**
 * Editor admin — entry composer (Tiptap-based).
 *
 * Live Tiptap editor + 6 custom block nodes per
 * ``Theourgia Editor.dc.html`` from the base 50-bundle. Composes the
 * shared `TiptapEditor` — the format toolbar, slash menu, and the
 * 6 custom node implementations all live in the shared module.
 *
 * Custom blocks shipping in B97 (Batch 35 wave 1):
 *   · ritualLog · quoteCitation · gematria · sensation · entityRef ·
 *     sigil
 *
 * Chart + Divination blocks + Library / Entities pickers + the
 * /api/v1/entries persistence pipeline land in B99.
 */

import { TiptapEditor, useTopbar } from "@theourgia/shared";

const LINE = "var(--line)";

function VisibilityChip() {
  return (
    <div
      role="status"
      aria-label="Visibility · Sealed"
      style={{
        display: "flex",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
      }}
    >
      <span style={{ padding: "6px 11px", color: "var(--ink-soft)" }}>Personal</span>
      <span
        style={{
          padding: "6px 11px",
          borderLeft: `1px solid ${LINE}`,
          background: "var(--accent-soft)",
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="1.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Sealed
      </span>
    </div>
  );
}

const SEED_DOC = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Invocation of the Agathos Daimon" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text:
            "Began with the banishing by the Lesser Ritual of the Pentagram, then the Bornless preliminary invocation. The temple settled quickly tonight — the candle flames steadied at the third circumambulation.",
        },
      ],
    },
    {
      type: "ritualLog",
      attrs: {
        entries: [
          { time: "14:12", text: "Banishing — LRP, all quarters" },
          { time: "14:18", text: "Bornless preliminary invocation" },
          { time: "14:31", text: "Conjuration — third call, presence felt" },
        ],
      },
    },
    {
      type: "quoteCitation",
      attrs: {
        sourceText: "Ἐγώ εἰμι ὁ Ἀκέφαλος δαίμων…",
        sourceScript: "el",
        translation: "“I am the Headless daemon, seeing with my feet.”",
        citation: "Papyri Graecae Magicae, PGM V. 96–172",
      },
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "At the name of the " },
        {
          type: "text",
          marks: [{ type: "lang", attrs: { script: "el" } }],
          text: "ἀγαθὸς δαίμων",
        },
        {
          type: "text",
          text:
            " the air thickened and a faint citrus scent rose — recorded below in the sensation map. I held the image of the serpent crowned until the vision steadied.",
        },
      ],
    },
    {
      type: "gematria",
      attrs: { word: "ἀγαθοδαίμων", script: "greek", also: "also: ἡ σφραγίς · 989" },
    },
    {
      type: "sensation",
      attrs: {
        points: [
          { y: 8, color: "var(--accent)", label: "Crown · pressure" },
          { y: 38, color: "var(--c-divination)", label: "Throat · cool" },
          { y: 58, color: "var(--c-working)", label: "Solar plexus · heat" },
        ],
      },
    },
  ],
};

export function Editor() {
  useTopbar(
    () => ({
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-mute)",
          }}
        >
          <span>Journal</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink-soft)" }}>Workings</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink)" }}>Untitled draft</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 8,
              fontSize: 11.5,
              color: "var(--c-synchronicity)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-synchronicity)" }} />
            Saved · just now
          </span>
        </div>
      ),
      before: <VisibilityChip />,
      after: (
        <button
          type="button"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          Publish
        </button>
      ),
    }),
    [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, margin: "0 -28px" }}>
      <TiptapEditor initialDoc={SEED_DOC} placeholder="Begin writing…" />
      <style>{`
        .theourgia-editor {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          min-height: 0;
        }
        .theourgia-editor .ProseMirror {
          padding: 44px 28px 120px;
          outline: none;
          max-width: 720px;
          margin: 0 auto;
        }
        .theourgia-editor .ProseMirror h1 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 40px;
          line-height: 1.1;
          color: var(--ink);
          margin: 0 0 32px;
        }
        .theourgia-editor .ProseMirror p {
          font-family: var(--font-serif);
          font-size: 19px;
          line-height: 1.7;
          color: var(--ink);
          margin: 0 0 22px;
          text-wrap: pretty;
        }
        .theourgia-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--ink-mute);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
