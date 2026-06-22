/**
 * Last7DaysDots — the row of seven small circles + day-letter labels
 * beneath the streak grid.
 *
 * Verbatim from `last7El()` in `Theourgia Daily Practice Tracker.dc.html`
 * (lines 297-313). Each circle is 24×24; gap 8px between days; day
 * labels are M T W T F S S in font-ui 10px.
 *
 *   done → filled --accent circle with a check
 *   skip → dashed --line-2 circle with a small --skip dash
 *   miss → outlined --line circle, empty
 */

import { type CSSProperties } from "react";

import type { CompletionStatus } from "../practice/index.js";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const CHECK = (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent-ink)"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.5 4.5L19 6.5" />
  </svg>
);

export interface Last7DaysDotsProps {
  /** The seven most recent days, oldest first, today last. */
  history: readonly CompletionStatus[];
  className?: string;
  style?: CSSProperties;
}

export function Last7DaysDots({
  history,
  className,
  style,
}: Last7DaysDotsProps) {
  // Always render exactly seven slots; callers may pass fewer (we left-pad
  // with `miss`) or more (we tail-slice).
  const slice = history.slice(-7);
  while (slice.length < 7) slice.unshift("miss");

  return (
    <div
      data-component="last-7-days"
      className={className}
      style={{ display: "flex", gap: 8, ...style }}
    >
      {slice.map((v, i) => {
        const dotStyle: CSSProperties = {
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        };
        let inner: React.ReactNode = null;
        if (v === "done") {
          dotStyle.background = "var(--accent)";
          inner = CHECK;
        } else if (v === "skip") {
          dotStyle.borderWidth = 1;
          dotStyle.borderStyle = "dashed";
          dotStyle.borderColor = "var(--line-2)";
          inner = (
            <span
              style={{
                width: 9,
                height: 1.5,
                background: "var(--skip)",
              }}
              aria-hidden="true"
            />
          );
        } else {
          dotStyle.borderWidth = 1;
          dotStyle.borderStyle = "solid";
          dotStyle.borderColor = "var(--line)";
        }
        return (
          <div
            key={i}
            data-day-status={v}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div style={dotStyle}>{inner}</div>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                color: "var(--ink-mute)",
              }}
            >
              {DAY_LETTERS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
