/**
 * MethodTablist — in-page `role="tablist"` for the four sub-methods.
 *
 * Verbatim from `Theourgia Divination Misc.dc.html` lines 98-102.
 * Renders 4 tabs with engraving glyphs (pendulum, biblio, horary,
 * scrying) + their labels. Active tab paints --accent-soft + accent
 * border.
 */

import { type CSSProperties } from "react";

import {
  DIVMISC_METHOD_OPTIONS,
  type DivMiscMethod,
} from "./copy.js";

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Engraving glyphs lifted verbatim from `subIcon()` (mockup lines
// 277-282).
const SUB_ICONS: Record<DivMiscMethod, React.ReactNode> = {
  pendulum: (
    <svg {...ICON_PROPS}>
      <path d="M12 3v9" />
      <circle cx="12" cy="16" r="3" />
      <path d="M5 5h14" />
    </svg>
  ),
  biblio: (
    <svg {...ICON_PROPS}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 4v16" />
    </svg>
  ),
  horary: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18" />
    </svg>
  ),
  scrying: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="11" r="7" />
      <path d="M9 19h6" />
    </svg>
  ),
};

const TAB_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 16px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const TAB_ON: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export interface MethodTablistProps {
  value: DivMiscMethod;
  onChange: (next: DivMiscMethod) => void;
  className?: string;
  style?: CSSProperties;
}

export function MethodTablist({
  value,
  onChange,
  className,
  style,
}: MethodTablistProps) {
  return (
    <div
      role="tablist"
      aria-label="Method"
      data-component="divmisc-method-tablist"
      className={className}
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {DIVMISC_METHOD_OPTIONS.map((opt) => {
        const on = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={on}
            data-method={opt.key}
            onClick={() => onChange(opt.key)}
            style={on ? TAB_ON : TAB_BASE}
          >
            <span
              style={{
                display: "flex",
                color: on ? "var(--accent)" : "currentColor",
              }}
              aria-hidden="true"
            >
              {SUB_ICONS[opt.key]}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
