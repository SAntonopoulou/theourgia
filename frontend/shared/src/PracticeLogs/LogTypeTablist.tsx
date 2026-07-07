/**
 * LogTypeTablist — in-page `role="tablist"` for the four practice
 * logs (dream · pathworking · āsana & breath · banishing).
 *
 * Verbatim from `Theourgia Practice Logs.dc.html` lines 97-101 and
 * `subIcon()` lines 281-286. Each tab carries a tradition-neutral
 * engraving glyph. Active tab paints --accent-soft + --accent border.
 */

import { type CSSProperties, useMemo } from "react";

import { useTablistKeys } from "../hooks/useTablistKeys.js";
import {
  PRACTICE_LOG_TABLIST_LABEL,
  PRACTICE_LOG_TABS,
  type PracticeLogTab,
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

// Engraving glyphs verbatim from .dc.html subIcon() lines 281-286.
const TAB_ICONS: Record<PracticeLogTab, React.ReactNode> = {
  dream: (
    <svg {...ICON_PROPS}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      <path d="M16 5l.6 1.6L18 7l-1.4.4L16 9l-.6-1.6L14 7l1.4-.4z" />
    </svg>
  ),
  path: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="4.5" r="2" />
      <circle cx="12" cy="19.5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M12 6.5v11M7.5 10.5l3-4M16.5 10.5l-3-4M7.5 13.5l3 4M16.5 13.5l-3 4" />
    </svg>
  ),
  asana: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="5" r="2" />
      <path d="M5 11l7-2 7 2M12 9v5M8 20l4-6 4 6" />
    </svg>
  ),
  banish: (
    <svg {...ICON_PROPS}>
      <path d="M12 3l2.4 5.6L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-.4z" />
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

export interface LogTypeTablistProps {
  value: PracticeLogTab;
  onChange: (next: PracticeLogTab) => void;
  className?: string;
  style?: CSSProperties;
}

export function LogTypeTablist({
  value,
  onChange,
  className,
  style,
}: LogTypeTablistProps) {
  const keys = useMemo(
    () => PRACTICE_LOG_TABS.map((t) => t.key),
    [],
  );
  const { onKeyDown, tabIndexFor } = useTablistKeys(keys, value, onChange);
  return (
    <div
      role="tablist"
      aria-label={PRACTICE_LOG_TABLIST_LABEL}
      data-component="practice-logs-tablist"
      className={className}
      onKeyDown={onKeyDown}
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {PRACTICE_LOG_TABS.map((tab) => {
        const on = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={tabIndexFor(tab.key)}
            data-tab={tab.key}
            onClick={() => onChange(tab.key)}
            style={on ? TAB_ON : TAB_BASE}
          >
            <span
              style={{
                display: "flex",
                color: on ? "var(--accent)" : "currentColor",
              }}
              aria-hidden="true"
            >
              {TAB_ICONS[tab.key]}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
