/**
 * Tiptap node — gematria.
 *
 * Computes the isopsephy / gematria value of an input string in either
 * Greek or Hebrew. The display shows per-letter values, the total, and
 * an optional "also" line (other words with the same total).
 *
 * Computation happens at render time (no stored sum); the source word
 * and script are the persisted attributes.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { type CSSProperties } from "react";

import { LANG_FONT } from "../lang.js";

const LINE = "var(--line)";

const GREEK_VALUES: Record<string, number> = {
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϟ: 90,
  ρ: 100, σ: 200, ς: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700, ω: 800, ϡ: 900,
};

const HEBREW_VALUES: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50,
  ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400,
};

export type GematriaScript = "greek" | "hebrew";

const SCRIPT_FONT: Record<GematriaScript, string> = {
  greek: LANG_FONT.el,
  hebrew: LANG_FONT.he,
};

export function gematriaBreakdown(
  word: string,
  script: GematriaScript,
): { letter: string; value: number }[] {
  const table = script === "greek" ? GREEK_VALUES : HEBREW_VALUES;
  return Array.from(word)
    .map((ch) => {
      const norm = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const v = table[norm];
      return v === undefined ? null : { letter: ch, value: v };
    })
    .filter((x): x is { letter: string; value: number } => x !== null);
}

export function gematriaSum(word: string, script: GematriaScript): number {
  return gematriaBreakdown(word, script).reduce((acc, { value }) => acc + value, 0);
}

const SCRIPT_LABEL: Record<GematriaScript, string> = {
  greek: "Gematria · Greek isopsephy",
  hebrew: "Gematria · Hebrew",
};

function GematriaView({ node, updateAttributes, editor }: NodeViewProps) {
  const word: string = node.attrs.word ?? "";
  const script: GematriaScript = (node.attrs.script as GematriaScript) ?? "greek";
  const also: string = node.attrs.also ?? "";
  const editable = editor.isEditable;

  const breakdown = gematriaBreakdown(word, script);
  const total = breakdown.reduce((s, b) => s + b.value, 0);

  const inputBase: CSSProperties = {
    background: "none",
    border: "none",
    outline: "none",
    color: "inherit",
    fontFamily: "inherit",
    padding: 0,
    width: "100%",
  };

  return (
    <NodeViewWrapper
      data-block="gematria"
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
          <path d="M5 5h14M9 5v14M5 19h14" strokeLinecap="round" />
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
          {SCRIPT_LABEL[script]}
        </span>
        {editable && (
          <select
            value={script}
            onChange={(e) => updateAttributes({ script: e.target.value as GematriaScript })}
            aria-label="Gematria script"
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
            <option value="greek">Greek</option>
            <option value="hebrew">Hebrew</option>
          </select>
        )}
      </div>
      <div style={{ padding: 16 }}>
        {editable ? (
          <input
            type="text"
            value={word}
            onChange={(e) => updateAttributes({ word: e.target.value })}
            placeholder={script === "greek" ? "ἀγαθοδαίμων" : "אדני"}
            lang={script === "greek" ? "el" : "he"}
            aria-label="Gematria source word"
            style={{
              ...inputBase,
              fontFamily: SCRIPT_FONT[script],
              fontSize: 24,
              color: "var(--ink)",
              marginBottom: 12,
            }}
          />
        ) : (
          <div
            lang={script === "greek" ? "el" : "he"}
            style={{
              fontFamily: SCRIPT_FONT[script],
              fontSize: 24,
              color: "var(--ink)",
              marginBottom: 12,
            }}
          >
            {word || "—"}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {breakdown.map((b, i) => (
            <span key={`${b.letter}-${i}`}>
              {b.letter}·{b.value}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            borderTop: `1px solid ${LINE}`,
            paddingTop: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              color: "var(--accent)",
            }}
          >
            {total}
          </span>
          {editable ? (
            <input
              type="text"
              value={also}
              onChange={(e) => updateAttributes({ also: e.target.value })}
              placeholder="also: ἡ σφραγίς · 989"
              aria-label="Gematria also-equal note"
              style={{
                ...inputBase,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            />
          ) : (
            also && (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
                {also}
              </span>
            )
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const GematriaNode = Node.create({
  name: "gematria",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      word: { default: "" },
      script: { default: "greek" },
      also: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='gematria']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "gematria" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GematriaView);
  },
});
