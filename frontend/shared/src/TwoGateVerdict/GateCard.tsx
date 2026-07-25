/**
 * GateCard — one of the two gates of judgment.
 *
 *   Gate 1 · Did it work?  (repeatable)
 *   Gate 2 · Is it true?   (coherent)
 *
 * Three verdicts: pass / fail / open, plus a note. The card's border
 * follows the verdict; a fail is ``--gate-fail`` (an alias of
 * ``--warn`` — never ``--danger``). When the verdict is finalized the
 * controls disable and the judged stamp renders.
 */

import type { CSSProperties } from "react";

import type { GateResultWire } from "../api/types.js";
import { _ } from "../i18n/index.js";

export interface GateCardProps {
  /** "Gate 1" / "Gate 2" eyebrow. */
  num: string;
  /** The gate's question — "Did it work?" / "Is it true?". */
  question: string;
  /** The test in words — "Repeatable — …" / "Coherent — …". */
  test: string;
  value: GateResultWire;
  note: string;
  onChange?: (result: GateResultWire) => void;
  onNoteChange?: (note: string) => void;
  /** Finalized verdicts are immutable — everything disables. */
  disabled?: boolean;
  /** Judged stamp (e.g. "judged 22 Jul 2026") once available. */
  stamp?: string | null;
  className?: string;
  style?: CSSProperties;
}

const OPTION_DEFS: ReadonlyArray<{ key: GateResultWire; label: string }> = [
  { key: "pass", label: "It did" },
  { key: "fail", label: "It did not" },
  { key: "open", label: "Still open" },
];

const OPTION_TONES: Record<GateResultWire, { color: string; soft: string }> = {
  pass: { color: "var(--gate-pass)", soft: "var(--gate-pass-soft)" },
  fail: { color: "var(--gate-fail)", soft: "var(--gate-fail-soft)" },
  open: { color: "var(--gate-open)", soft: "var(--gate-open-soft)" },
};

export function GateCard({
  num,
  question,
  test,
  value,
  note,
  onChange,
  onNoteChange,
  disabled,
  stamp,
  className,
  style,
}: GateCardProps) {
  const borderColor =
    value === "pass" ? "var(--gate-pass)" : value === "fail" ? "var(--gate-fail)" : "var(--line)";
  return (
    <section
      data-component="gate-card"
      data-gate-result={value}
      className={className}
      style={{
        padding: "17px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor,
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
          {num}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 18,
            color: "var(--ink)",
          }}
        >
          {question}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {test}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {OPTION_DEFS.map(({ key, label }) => {
          const on = value === key;
          const tone = OPTION_TONES[key];
          return (
            <button
              key={key}
              type="button"
              data-gate-option={key}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange?.(key)}
              style={{
                flex: "1 1 auto",
                padding: "9px 11px",
                borderRadius: "var(--r-md, 8px)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? tone.color : "var(--line-2)",
                background: on ? tone.soft : "var(--bg)",
                color: on ? tone.color : "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                textAlign: "center",
                cursor: disabled ? "default" : "pointer",
                minHeight: 38,
                opacity: disabled && !on ? 0.55 : 1,
              }}
            >
              {_(label)}
            </button>
          );
        })}
      </div>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => onNoteChange?.(e.target.value)}
        placeholder={_("What happened, plainly…")}
        disabled={disabled}
        aria-label={_("{num} note", { num })}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          lineHeight: 1.55,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      {stamp ? (
        <div
          data-gate-stamp
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            marginTop: 10,
          }}
        >
          {stamp}
        </div>
      ) : null}
    </section>
  );
}
