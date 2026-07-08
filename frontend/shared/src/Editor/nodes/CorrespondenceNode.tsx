/**
 * Tiptap node — correspondence.
 *
 * A compact table of correspondences (planetary · elemental · decan ·
 * Hebrew letter · tarot · scent · stone · herb, etc.) attached to a
 * subject the entry cares about (an entity, a working, a day, a hour).
 *
 * Persisted attrs:
 *   - subject: string          headline (e.g. "Saturn · Binah")
 *   - rows:    { key, value }[]  rows of the table
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

const LINE = "var(--line)";

interface Row {
  key: string;
  value: string;
}

const inputBase = {
  background: "none",
  border: "none",
  outline: "none",
  color: "inherit",
  fontFamily: "inherit",
  padding: 0,
  width: "100%",
} as const;

function CorrespondenceView({ node, updateAttributes, editor }: NodeViewProps) {
  const subject: string = node.attrs.subject ?? "";
  const rows: Row[] = Array.isArray(node.attrs.rows) ? node.attrs.rows : [];
  const editable = editor.isEditable;

  function setRow(idx: number, patch: Partial<Row>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    updateAttributes({ rows: next });
  }
  function addRow() {
    updateAttributes({ rows: [...rows, { key: "", value: "" }] });
  }
  function removeRow(idx: number) {
    updateAttributes({ rows: rows.filter((_, i) => i !== idx) });
  }

  return (
    <NodeViewWrapper
      data-block="correspondence"
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
        margin: "0 0 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-3)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Correspondences
        </span>
      </div>
      <div style={{ padding: 16 }}>
        {editable ? (
          <input
            type="text"
            value={subject}
            onChange={(e) => updateAttributes({ subject: e.target.value })}
            placeholder="Subject (e.g. Saturn · Binah)"
            aria-label="Correspondence subject"
            style={{
              ...inputBase,
              fontFamily: "var(--font-display)",
              fontSize: 20,
              color: "var(--ink)",
              marginBottom: 12,
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              color: "var(--ink)",
              marginBottom: 12,
            }}
          >
            {subject || "—"}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: editable ? "160px 1fr 28px" : "160px 1fr",
            gap: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}
        >
          {rows.map((r, i) => (
            <div key={`row-${i}`} style={{ display: "contents" }}>
              {editable ? (
                <>
                  <input
                    type="text"
                    value={r.key}
                    onChange={(e) => setRow(i, { key: e.target.value })}
                    placeholder="Attribute"
                    aria-label={`Correspondence key ${i + 1}`}
                    style={{ ...inputBase, color: "var(--ink-mute)" }}
                  />
                  <input
                    type="text"
                    value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })}
                    placeholder="Value"
                    aria-label={`Correspondence value ${i + 1}`}
                    style={{ ...inputBase, color: "var(--ink)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Remove correspondence row ${i + 1}`}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ink-mute)",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--ink-mute)" }}>{r.key}</span>
                  <span style={{ color: "var(--ink)" }}>{r.value}</span>
                </>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <button
            type="button"
            onClick={addRow}
            style={{
              marginTop: 10,
              padding: "6px 12px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-sm)",
              background: "var(--bg)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + Add attribute
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const CorrespondenceNode = Node.create({
  name: "correspondence",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      subject: { default: "" },
      rows: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-rows");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { rows: Row[] }) => ({
          "data-rows": JSON.stringify(attrs.rows ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='correspondence']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block": "correspondence" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CorrespondenceView);
  },
});
