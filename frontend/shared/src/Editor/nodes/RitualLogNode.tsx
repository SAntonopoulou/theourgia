/**
 * Tiptap node — ritualLog.
 *
 * A block of timestamped notes describing the unfolding of a working.
 * Stored as an attribute `entries: { time: string; text: string }[]`.
 * Atom node (NodeView owns the editing UI).
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, type CSSProperties } from "react";

export interface RitualLogEntry {
  time: string;
  text: string;
}

const DEFAULT_ENTRIES: RitualLogEntry[] = [];

const LINE = "var(--line)";

function RitualLogView({ node, updateAttributes, editor }: NodeViewProps) {
  const entries: RitualLogEntry[] = node.attrs.entries ?? DEFAULT_ENTRIES;
  const editable = editor.isEditable;

  const setEntry = useCallback(
    (i: number, patch: Partial<RitualLogEntry>) => {
      const next = entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
      updateAttributes({ entries: next });
    },
    [entries, updateAttributes],
  );

  const addEntry = useCallback(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    updateAttributes({ entries: [...entries, { time: `${hh}:${mm}`, text: "" }] });
  }, [entries, updateAttributes]);

  const removeEntry = useCallback(
    (i: number) => {
      updateAttributes({ entries: entries.filter((_, idx) => idx !== i) });
    },
    [entries, updateAttributes],
  );

  const inputStyle: CSSProperties = {
    background: "none",
    border: "none",
    outline: "none",
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "inherit",
    padding: 0,
    width: "100%",
  };

  return (
    <NodeViewWrapper
      data-block="ritualLog"
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        margin: "0 0 22px",
        overflow: "hidden",
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
          stroke="var(--c-working)"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
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
          Ritual log
        </span>
      </div>
      <div style={{ padding: "6px 16px 12px" }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: "10px 0",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              fontStyle: "italic",
            }}
          >
            No entries yet. {editable ? "Click below to add the first step." : null}
          </div>
        )}
        {entries.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 14,
              padding: "9px 0",
              borderBottom: i < entries.length - 1 ? `1px solid ${LINE}` : "none",
              alignItems: "center",
            }}
          >
            {editable ? (
              <>
                <input
                  type="text"
                  value={row.time}
                  onChange={(e) => setEntry(i, { time: e.target.value })}
                  aria-label={`Ritual log entry ${i + 1} time`}
                  style={{
                    ...inputStyle,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent)",
                    flex: "none",
                    width: 48,
                  }}
                />
                <input
                  type="text"
                  value={row.text}
                  onChange={(e) => setEntry(i, { text: e.target.value })}
                  aria-label={`Ritual log entry ${i + 1} text`}
                  style={{
                    ...inputStyle,
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink-soft)",
                    flex: 1,
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  aria-label={`Remove ritual log entry ${i + 1}`}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ink-mute)",
                    cursor: "pointer",
                    padding: 4,
                    minWidth: 24,
                    minHeight: 24,
                  }}
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent)",
                    flex: "none",
                    width: 48,
                  }}
                >
                  {row.time}
                </span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink-soft)" }}>
                  {row.text}
                </span>
              </>
            )}
          </div>
        ))}
        {editable && (
          <button
            type="button"
            onClick={addEntry}
            style={{
              marginTop: 8,
              padding: "5px 11px",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
              background: "transparent",
              border: `1px dashed ${LINE}`,
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
            }}
          >
            + Add step
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const RitualLogNode = Node.create({
  name: "ritualLog",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      entries: {
        default: DEFAULT_ENTRIES,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-entries");
          if (!raw) return DEFAULT_ENTRIES;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : DEFAULT_ENTRIES;
          } catch {
            return DEFAULT_ENTRIES;
          }
        },
        renderHTML: (attrs: { entries: RitualLogEntry[] }) => ({
          "data-entries": JSON.stringify(attrs.entries ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='ritualLog']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "ritualLog" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RitualLogView);
  },
});
