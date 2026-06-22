/**
 * StreakGrid35 — five-week (35-cell) practice history grid.
 *
 * Verbatim from `gridEl()` in `Theourgia Daily Practice Tracker.dc.html`
 * (lines 283-296). Seven columns wide × five rows tall; each cell is
 * 26×26 px; gap 5px. The last cell is today and gets a 3px accent ring
 * via box-shadow.
 *
 * Status palette (H04 §S3.4 — never red):
 *   done → solid --accent
 *   skip → --skip-soft tint with a dashed --line-2 border
 *   miss → --bg-3 with a thin --line border (the calm "not kept" state)
 */

import { type CSSProperties } from "react";

import type { CompletionStatus } from "../practice/index.js";
import { STREAK_CELL_TITLE } from "./copy.js";

export interface StreakGrid35Props {
  /** Exactly 35 statuses, oldest first, today at index 34. */
  history: readonly CompletionStatus[];
  /** Accessible label override; defaults to "Five-week record". */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function StreakGrid35({
  history,
  ariaLabel = "Five-week record",
  className,
  style,
}: StreakGrid35Props) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-component="streak-grid-35"
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 26px)",
        gap: 5,
        ...style,
      }}
    >
      {history.map((v, i) => {
        const isToday = i === history.length - 1;
        const cellStyle: CSSProperties = {
          width: 26,
          height: 26,
          borderRadius: 4,
          boxSizing: "border-box",
        };
        if (v === "done") {
          cellStyle.background = "var(--accent)";
          cellStyle.borderWidth = 1;
          cellStyle.borderStyle = "solid";
          cellStyle.borderColor = "var(--accent)";
        } else if (v === "skip") {
          cellStyle.background = "var(--skip-soft)";
          cellStyle.borderWidth = 1;
          cellStyle.borderStyle = "dashed";
          cellStyle.borderColor = "var(--line-2)";
        } else {
          cellStyle.background = "var(--bg-3)";
          cellStyle.borderWidth = 1;
          cellStyle.borderStyle = "solid";
          cellStyle.borderColor = "var(--line)";
        }
        if (isToday) {
          cellStyle.boxShadow =
            "0 0 0 2px var(--bg), 0 0 0 3px var(--accent)";
        }
        return (
          <div
            key={i}
            data-cell-status={v}
            data-today={isToday ? "true" : undefined}
            title={STREAK_CELL_TITLE[v]}
            style={cellStyle}
          />
        );
      })}
    </div>
  );
}
