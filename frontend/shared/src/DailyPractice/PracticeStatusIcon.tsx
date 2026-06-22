/**
 * PracticeStatusIcon — the 30×30 circle that anchors the capture row.
 *
 * Verbatim from `statusIconEl()` in `Theourgia Daily Practice Tracker.dc.html`
 * (lines 314-319):
 *   done    → filled --accent circle with a check
 *   skipped → dashed --line-2 circle with a small --skip dash
 *   pending → outlined --line-2 circle, empty
 */

import { type CSSProperties } from "react";

import type { TodayStatus } from "../practice/index.js";

const SIZE = 30;

export interface PracticeStatusIconProps {
  status: TodayStatus;
  className?: string;
  style?: CSSProperties;
}

export function PracticeStatusIcon({
  status,
  className,
  style,
}: PracticeStatusIconProps) {
  const common: CSSProperties = {
    width: SIZE,
    height: SIZE,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };

  if (status === "done") {
    return (
      <span
        data-component="practice-status-icon"
        data-status="done"
        className={className}
        style={{ ...common, background: "var(--accent)", ...style }}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 6.5" />
        </svg>
      </span>
    );
  }

  if (status === "skipped") {
    return (
      <span
        data-component="practice-status-icon"
        data-status="skipped"
        className={className}
        style={{
          ...common,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "var(--line-2)",
          ...style,
        }}
      >
        <span
          style={{
            width: 12,
            height: 2,
            background: "var(--skip)",
            borderRadius: 2,
          }}
          aria-hidden="true"
        />
      </span>
    );
  }

  // pending
  return (
    <span
      data-component="practice-status-icon"
      data-status="pending"
      className={className}
      style={{
        ...common,
        borderWidth: 1.5,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
