/**
 * Tiptap node — quoteCitation.
 *
 * A blockquote with optional source-language line, translation, and
 * citation chrome. Atom node — attributes drive the rendered display.
 * Future B99 lifts the citation field to a Library picker.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { type CSSProperties, useState } from "react";

import { LibraryPicker } from "../LibraryPicker.js";
import type { LangScript } from "../lang.js";
import { LANG_FONT } from "../lang.js";

export interface QuoteCitationAttrs {
  sourceText: string;
  sourceScript: LangScript;
  translation: string;
  citation: string;
}

const DEFAULT_ATTRS: QuoteCitationAttrs = {
  sourceText: "",
  sourceScript: "el",
  translation: "",
  citation: "",
};

function QuoteCitationView({ node, updateAttributes, editor }: NodeViewProps) {
  const attrs = { ...DEFAULT_ATTRS, ...(node.attrs as Partial<QuoteCitationAttrs>) };
  const editable = editor.isEditable;
  const [pickerOpen, setPickerOpen] = useState(false);

  const sourceFont = LANG_FONT[attrs.sourceScript] ?? LANG_FONT.en;

  const inputBase: CSSProperties = {
    background: "none",
    border: "none",
    outline: "none",
    width: "100%",
    color: "inherit",
    fontFamily: "inherit",
    padding: 0,
  };

  return (
    <NodeViewWrapper
      data-block="quoteCitation"
      as="blockquote"
      style={{
        margin: "0 0 22px",
        padding: "4px 0 4px 24px",
        borderLeft: "2px solid var(--accent)",
      }}
    >
      {editable ? (
        <>
          <input
            type="text"
            value={attrs.sourceText}
            onChange={(e) => updateAttributes({ sourceText: e.target.value })}
            placeholder="Quote in source script"
            lang={attrs.sourceScript}
            aria-label="Quote source-language text"
            style={{
              ...inputBase,
              fontFamily: sourceFont,
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          />
          <input
            type="text"
            value={attrs.translation}
            onChange={(e) => updateAttributes({ translation: e.target.value })}
            placeholder="Translation"
            aria-label="Quote translation"
            style={{
              ...inputBase,
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              color: "var(--ink-soft)",
              marginTop: 6,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <input
              type="text"
              value={attrs.citation}
              onChange={(e) => updateAttributes({ citation: e.target.value })}
              placeholder="Source citation (e.g. PGM V. 96–172)"
              aria-label="Quote citation"
              style={{
                ...inputBase,
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                flex: 1,
              }}
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Pick from library"
              style={{
                padding: "4px 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                background: "transparent",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Pick from library
            </button>
          </div>
          <LibraryPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={(_book, formatted) => updateAttributes({ citation: formatted })}
          />
        </>
      ) : (
        <>
          {attrs.sourceText ? (
            <div
              lang={attrs.sourceScript}
              style={{
                fontFamily: sourceFont,
                fontStyle: "italic",
                fontSize: 21,
                lineHeight: 1.5,
                color: "var(--ink)",
              }}
            >
              {attrs.sourceText}
            </div>
          ) : null}
          {attrs.translation ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                color: "var(--ink-soft)",
                marginTop: 6,
              }}
            >
              {attrs.translation}
            </div>
          ) : null}
          {attrs.citation ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginTop: 10,
              }}
            >
              {`— ${attrs.citation} · cited`}
            </div>
          ) : null}
        </>
      )}
    </NodeViewWrapper>
  );
}

export const QuoteCitationNode = Node.create({
  name: "quoteCitation",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      sourceText: { default: "" },
      sourceScript: { default: "el" },
      translation: { default: "" },
      citation: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "blockquote[data-block='quoteCitation']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { "data-block": "quoteCitation" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteCitationView);
  },
});
