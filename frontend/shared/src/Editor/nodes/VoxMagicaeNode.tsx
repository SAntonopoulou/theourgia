/**
 * Tiptap node — voxMagicae.
 *
 * Inline embed of a vox magica. Stores the original text, transliteration,
 * language + optional citation + optional per-vault voceId (persistent
 * link to the Voces library). Renders the utterance prominently with an
 * IPA/pronunciation line beneath.
 *
 * Persisted attrs:
 *   - voceId:         optional server voce id
 *   - text:           original-script text
 *   - script:         "el" | "he" | "grc" | "sa" | "ar" | "cop" | "en"
 *   - transliteration: Latin-script rendering
 *   - ipa:            IPA line
 *   - citation:       source (PGM, Sefer Yetzirah, etc.)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

const LINE = "var(--line)";

export type VoceScript = "el" | "he" | "grc" | "sa" | "ar" | "cop" | "en";

const SCRIPT_FONT: Record<VoceScript, string> = {
  el: "var(--font-greek, var(--font-serif))",
  grc: "var(--font-greek, var(--font-serif))",
  he: "var(--font-hebrew, var(--font-serif))",
  sa: "var(--font-deva, var(--font-serif))",
  ar: "var(--font-arabic, var(--font-serif))",
  cop: "var(--font-coptic, var(--font-serif))",
  en: "var(--font-serif)",
};

const inputBase = {
  background: "none",
  border: "none",
  outline: "none",
  color: "inherit",
  fontFamily: "inherit",
  padding: 0,
  width: "100%",
} as const;

function VoxMagicaeView({ node, updateAttributes, editor }: NodeViewProps) {
  const text: string = node.attrs.text ?? "";
  const script: VoceScript = (node.attrs.script as VoceScript) ?? "grc";
  const transliteration: string = node.attrs.transliteration ?? "";
  const ipa: string = node.attrs.ipa ?? "";
  const citation: string = node.attrs.citation ?? "";
  const editable = editor.isEditable;
  const isRtl = script === "he" || script === "ar";

  return (
    <NodeViewWrapper
      data-block="vox-magicae"
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
          aria-hidden="true"
        >
          <path d="M12 4v16M8 8v8M16 8v8M4 11v2M20 11v2" strokeLinecap="round" />
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
          Vox Magica
        </span>
        {editable && (
          <select
            value={script}
            onChange={(e) => updateAttributes({ script: e.target.value as VoceScript })}
            aria-label="Vox script"
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              background: "var(--bg-2)",
              color: "var(--ink-soft)",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-sm)",
              padding: "2px 6px",
            }}
          >
            <option value="grc">Greek (classical)</option>
            <option value="el">Greek (modern)</option>
            <option value="he">Hebrew</option>
            <option value="sa">Sanskrit</option>
            <option value="ar">Arabic</option>
            <option value="cop">Coptic</option>
            <option value="en">Latin (English)</option>
          </select>
        )}
      </div>
      <div style={{ padding: 16 }}>
        {editable ? (
          <input
            type="text"
            value={text}
            onChange={(e) => updateAttributes({ text: e.target.value })}
            placeholder={script === "grc" ? "ΙΑΩ ΣΑΒΑΩΘ ΑΔΩΝΑΙ" : "vox"}
            lang={script === "grc" ? "el" : script}
            dir={isRtl ? "rtl" : "ltr"}
            aria-label="Vox text"
            style={{
              ...inputBase,
              fontFamily: SCRIPT_FONT[script],
              fontSize: 28,
              color: "var(--ink)",
              textAlign: isRtl ? "right" : "left",
              marginBottom: 10,
            }}
          />
        ) : (
          <div
            lang={script === "grc" ? "el" : script}
            dir={isRtl ? "rtl" : "ltr"}
            style={{
              fontFamily: SCRIPT_FONT[script],
              fontSize: 28,
              color: "var(--ink)",
              textAlign: isRtl ? "right" : "left",
              marginBottom: 10,
            }}
          >
            {text || "—"}
          </div>
        )}
        {editable ? (
          <input
            type="text"
            value={transliteration}
            onChange={(e) => updateAttributes({ transliteration: e.target.value })}
            placeholder="Transliteration"
            aria-label="Transliteration"
            style={{
              ...inputBase,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-soft)",
              marginBottom: 6,
            }}
          />
        ) : transliteration ? (
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-soft)",
              marginBottom: 6,
            }}
          >
            {transliteration}
          </div>
        ) : null}
        {editable ? (
          <input
            type="text"
            value={ipa}
            onChange={(e) => updateAttributes({ ipa: e.target.value })}
            placeholder="IPA (optional)"
            aria-label="IPA"
            style={{
              ...inputBase,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          />
        ) : ipa ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            /{ipa}/
          </div>
        ) : null}
        {editable ? (
          <input
            type="text"
            value={citation}
            onChange={(e) => updateAttributes({ citation: e.target.value })}
            placeholder="Source (e.g. PGM IV.930)"
            aria-label="Citation"
            style={{
              ...inputBase,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              borderTop: `1px solid ${LINE}`,
              paddingTop: 8,
            }}
          />
        ) : citation ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              borderTop: `1px solid ${LINE}`,
              paddingTop: 8,
            }}
          >
            {citation}
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

export const VoxMagicaeNode = Node.create({
  name: "voxMagicae",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      voceId: { default: null },
      text: { default: "" },
      script: { default: "grc" },
      transliteration: { default: "" },
      ipa: { default: "" },
      citation: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='vox-magicae']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block": "vox-magicae" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoxMagicaeView);
  },
});
