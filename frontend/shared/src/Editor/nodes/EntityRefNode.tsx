/**
 * Tiptap node — entityRef.
 *
 * Inline reference to a magickal being (god, daemon, angel, ancestor,
 * unified-view). Stored attributes: `entityId` + `displayName` +
 * `kind`. Renders as a small pill that resolves at read-time against
 * the entities collection (B99 wires the picker + live resolver — for
 * B97 it renders the display attrs verbatim).
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { type CSSProperties } from "react";

export type EntityRefKind = "god" | "daemon" | "angel" | "ancestor" | "unified";

const KIND_COLOR: Record<EntityRefKind, string> = {
  god: "var(--c-entity)",
  daemon: "var(--c-entity)",
  angel: "var(--c-entity)",
  ancestor: "var(--c-entity)",
  unified: "var(--accent)",
};

function EntityRefView({ node, updateAttributes, editor }: NodeViewProps) {
  const entityId: string = node.attrs.entityId ?? "";
  const displayName: string = node.attrs.displayName ?? "";
  const kind: EntityRefKind = (node.attrs.kind as EntityRefKind) ?? "god";
  const editable = editor.isEditable;

  const wrap: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: "var(--r-sm)",
    background: "var(--bg-3)",
    border: "1px solid var(--line)",
    fontFamily: "var(--font-serif)",
    fontSize: 15,
    color: "var(--ink)",
    verticalAlign: "baseline",
  };

  return (
    <NodeViewWrapper
      as="span"
      data-block="entityRef"
      data-entity-id={entityId}
      data-kind={kind}
      style={wrap}
    >
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: "50%", background: KIND_COLOR[kind] }}
      />
      {editable ? (
        <input
          type="text"
          value={displayName}
          onChange={(e) => updateAttributes({ displayName: e.target.value })}
          placeholder="Entity name"
          aria-label="Entity display name"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: "inherit",
            padding: 0,
            minWidth: 40,
            width: `${Math.max(displayName.length, 8)}ch`,
          }}
        />
      ) : (
        <span>{displayName || "—"}</span>
      )}
    </NodeViewWrapper>
  );
}

export const EntityRefNode = Node.create({
  name: "entityRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      entityId: { default: "" },
      displayName: { default: "" },
      kind: { default: "god" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-block='entityRef']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-block": "entityRef" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityRefView);
  },
});
