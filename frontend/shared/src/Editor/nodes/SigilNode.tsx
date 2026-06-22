/**
 * Tiptap node — sigil.
 *
 * Reference to a sigil row in the workshop. Renders the sigil via the
 * existing `workshop/sigil` engine when an `intent` + parameters are
 * present, or as a pending placeholder when a slot is empty (B98
 * lifted from the slash menu). B99 wires the Sigil Library picker.
 *
 * Persisted attrs:
 *   - sigilId:      string  (optional — points at /api/v1/sigils row)
 *   - intent:       string  (label shown above the rendered sigil)
 *   - hashSeed:     string  (deterministic seed; computed if absent)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { type CSSProperties } from "react";

const LINE = "var(--line)";

function SigilView({ node, updateAttributes, editor }: NodeViewProps) {
  const intent: string = node.attrs.intent ?? "";
  const sigilId: string = node.attrs.sigilId ?? "";
  const editable = editor.isEditable;

  // Minimal deterministic mark drawn from the intent string. The full
  // workshop engine ships in B90 — wiring it through here is B99.
  // For B97 we render a simple monogram so the block is visibly live.
  const seed = Array.from(intent).reduce((s, c) => s + c.charCodeAt(0), 0);
  const r = 40 + (seed % 20);
  const a = (seed * 137) % 360;
  const inputBase: CSSProperties = {
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
      data-block="sigil"
      data-sigil-id={sigilId}
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
          stroke="var(--c-working)"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 4.5l6.5 11.3H5.5z" />
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
          Sigil
        </span>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <svg width="80" height="80" viewBox="0 0 100 100" aria-label="Sigil" role="img">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          <path
            d={`M50 50 L${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}`}
            stroke="var(--ink)"
            strokeWidth="1.4"
          />
          <circle cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r="2.5" fill="var(--accent)" />
        </svg>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 4,
            }}
          >
            Intent
          </div>
          {editable ? (
            <input
              type="text"
              value={intent}
              onChange={(e) => updateAttributes({ intent: e.target.value })}
              placeholder="Intent of the sigil"
              aria-label="Sigil intent"
              style={{
                ...inputBase,
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                color: "var(--ink)",
              }}
            />
          ) : (
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink)" }}>
              {intent || "—"}
            </div>
          )}
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              fontStyle: "italic",
            }}
          >
            {sigilId
              ? `Linked to workshop sigil ${sigilId.slice(0, 8)}`
              : "Not linked to a workshop sigil yet — picker arrives in the next batch."}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const SigilNode = Node.create({
  name: "sigil",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      sigilId: { default: "" },
      intent: { default: "" },
      hashSeed: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='sigil']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "sigil" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SigilView);
  },
});
