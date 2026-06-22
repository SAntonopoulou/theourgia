/**
 * Tiptap node — sensation.
 *
 * Body silhouette with up to N labelled points. Stored as an attribute
 * `points: { y: number; color: string; label: string }[]`. The
 * silhouette path is the same shape as the static port for parity.
 * Atom node.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

const LINE = "var(--line)";

export interface SensationPoint {
  y: number;
  color: string;
  label: string;
}

const DEFAULT_POINTS: SensationPoint[] = [];

const SILHOUETTE_PATH =
  "M40 6c6 0 10 5 10 11s-4 11-10 11-10-5-10-11 4-11 10-11Z " +
  "M33 30h14c3 0 5 2 6 6l5 26c1 3-3 5-4 1l-5-21v36l4 58c0 4-6 4-7 0l-6-44-6 44c-1 4-7 4-7 0l4-58V42l-5 21c-1 4-5 2-4-1l5-26c1-4 3-6 6-6Z";

function SensationView({ node, editor }: NodeViewProps) {
  const points: SensationPoint[] = node.attrs.points ?? DEFAULT_POINTS;
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      data-block="sensation"
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
          stroke="var(--c-divination)"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2.5" />
          <path d="M12 7.5v8M7 11h10M9 21l3-5 3 5" />
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
          Sensation diagram
        </span>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", gap: 16, alignItems: "center" }}>
        <svg
          width="64"
          height="128"
          viewBox="0 0 80 160"
          style={{ flex: "none" }}
          aria-label="Body silhouette"
          role="img"
        >
          <path d={SILHOUETTE_PATH} fill="var(--ink)" opacity=".14" stroke="var(--ink-soft)" strokeWidth="1" />
          {points.map((p, i) => (
            <circle key={i} cx="40" cy={p.y} r="4.5" fill={p.color} />
          ))}
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 9,
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          {points.length === 0 ? (
            <span style={{ color: "var(--ink-mute)", fontStyle: "italic" }}>
              {editable
                ? "No sensation points yet. Use the Sensation diagram primitive to author one."
                : "No sensation points."}
            </span>
          ) : (
            points.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: "50%", background: row.color }}
                />
                {row.label}
              </div>
            ))
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const SensationNode = Node.create({
  name: "sensation",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      points: {
        default: DEFAULT_POINTS,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-points");
          if (!raw) return DEFAULT_POINTS;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : DEFAULT_POINTS;
          } catch {
            return DEFAULT_POINTS;
          }
        },
        renderHTML: (attrs: { points: SensationPoint[] }) => ({
          "data-points": JSON.stringify(attrs.points ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='sensation']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "sensation" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SensationView);
  },
});
