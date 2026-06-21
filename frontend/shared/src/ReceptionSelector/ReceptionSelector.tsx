/**
 * ReceptionSelector — five-pill scale for how an offering was received.
 *
 * Per Theourgia Offerings.dc.html: pills `none` / `faint` / `clear` /
 * `strong` / `overwhelming` with a glyph progression (empty circle →
 * progressively filled → rayed circle for "overwhelming"). Colors
 * resolve through `--rc-*`; "None is information too" — never red.
 *
 * Optional `hint` mode renders the per-level guidance copy below the
 * row.
 */

import { type CSSProperties } from "react";

export type ReceptionLevel =
  | "none"
  | "faint"
  | "clear"
  | "strong"
  | "overwhelming";

interface ReceptionMeta {
  k: ReceptionLevel;
  label: string;
  token: string;
  fill: number;
}

const RECEPTION: readonly ReceptionMeta[] = [
  { k: "none", label: "None", token: "--rc-none", fill: 0 },
  { k: "faint", label: "Faint", token: "--rc-faint", fill: 0.28 },
  { k: "clear", label: "Clear", token: "--rc-clear", fill: 0.55 },
  { k: "strong", label: "Strong", token: "--rc-strong", fill: 0.8 },
  { k: "overwhelming", label: "Overwhelming", token: "--rc-over", fill: 1 },
];

// Canonical hints from Offerings.dc.html — "None is information too"
// is the load-bearing piece of voice here.
const HINTS: Record<ReceptionLevel, string> = {
  none:
    "No reception is information too — it doesn't mean the offering failed.",
  faint: "A faint sense; noted without weight.",
  clear: "A clear reception, plainly felt.",
  strong: "Strongly felt — worth returning to in the notes.",
  overwhelming:
    "Overwhelming. Rare; record what made it so while it's fresh.",
};

export interface ReceptionSelectorProps {
  value: ReceptionLevel;
  onChange: (next: ReceptionLevel) => void;
  /** Show the per-level guidance copy below the row. */
  showHint?: boolean;
  className?: string;
  style?: CSSProperties;
}

function ReceptionGlyph({
  meta,
  size,
}: {
  meta: ReceptionMeta;
  size: number;
}) {
  const over = meta.k === "overwhelming";
  // Build a concentric circle filled proportionally to meta.fill,
  // with eight short rays for the "overwhelming" level (per the
  // designer's recGlyph()).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {over ? (
        <path
          d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2 2M17.8 17.8l2 2M19.8 4.2l-2 2M6.2 17.8l-2 2"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      ) : null}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {meta.fill > 0 ? (
        <path
          d="M12 5.5 A6.5 6.5 0 0 1 12 18.5 Z"
          fill="currentColor"
          transform={
            meta.fill < 1
              ? `scale(${Math.max(0.34, meta.fill)} 1)`
              : undefined
          }
          style={{
            transformOrigin: "12px 12px",
            opacity: meta.fill < 0.4 ? 0.6 : 1,
          }}
        />
      ) : null}
    </svg>
  );
}

export function ReceptionSelector({
  value,
  onChange,
  showHint = false,
  className,
  style,
}: ReceptionSelectorProps) {
  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Reception perceived"
      style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {RECEPTION.map((r) => {
          const on = value === r.k;
          const baseStyle: CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px",
            borderRadius: 999,
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: on ? "var(--ink)" : "var(--ink-soft)",
            background: on
              ? `color-mix(in srgb, var(${r.token}) 15%, transparent)`
              : "var(--bg-sunk)",
            border: `1px solid ${
              on
                ? `color-mix(in srgb, var(${r.token}) 45%, transparent)`
                : "var(--line)"
            }`,
            cursor: "pointer",
          };
          return (
            <button
              key={r.k}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(r.k)}
              style={baseStyle}
              data-level={r.k}
            >
              <span
                style={{
                  display: "flex",
                  color: on ? `var(${r.token})` : "var(--ink-mute)",
                }}
              >
                <ReceptionGlyph meta={r} size={14} />
              </span>
              {r.label}
            </button>
          );
        })}
      </div>
      {showHint ? (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
          }}
        >
          {HINTS[value]}
        </p>
      ) : null}
    </div>
  );
}

export { RECEPTION as RECEPTION_LEVELS };
