/**
 * PracticeCard — single practice's full <article> in the Daily
 * Practice Tracker surface.
 *
 * Composition (top→bottom, verbatim from `Theourgia Daily Practice
 * Tracker.dc.html` lines 141-191):
 *
 *   • Title row: h3 name + cadence pill + optional entity pill
 *   • Optional intention (italic serif)
 *   • Large streak number (right-aligned) + streakLabel
 *   • Capture row: status icon + headline + sub + actions
 *       - pending → Mark complete / Note a skip
 *       - done    → Undo
 *       - skipped → Mark complete instead
 *   • Two grids row: 35-cell streak grid + last-7 dots
 *
 * The wellbeing copy in the capture row (especially the skipped sub)
 * is verbatim per H04 §S3.4 — never improvise.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  type CompletionStatus,
  type TodayStatus,
  countKept,
} from "../practice/index.js";
import { Last7DaysDots } from "./Last7DaysDots.js";
import { PRACTICE_STATUS_HEADLINE, PRACTICE_STATUS_SUB } from "./copy.js";
import { PracticeStatusIcon } from "./PracticeStatusIcon.js";
import { StreakGrid35 } from "./StreakGrid35.js";

export interface PracticeCardProps {
  /** Unique id (stable for tests + onComplete/onSkip dispatch). */
  id: string;
  /** Practice name, e.g. "Morning grounding". */
  name: string;
  /** Cadence in human terms, e.g. "Daily at dawn". */
  cadenceHuman: string;
  /** Optional first-person intention. Renders italic serif when present. */
  intention?: string | null;
  /** Optional linked-entity name + glyph. */
  entity?: { name: string; glyph: string } | null;
  /** Today's status — drives the capture row buttons + status icon. */
  status: TodayStatus;
  /** Trailing-done streak count (computed by the caller via the
   *  `streak()` helper in practice/index.ts). */
  streak: number;
  /** Per-practice eyebrow under the streak ("day streak", "kept in
   *  a row" etc — designer's choice per practice). */
  streakLabel: string;
  /** 35-day history, oldest first. */
  history: readonly CompletionStatus[];

  onComplete?: (id: string) => void;
  onSkip?: (id: string) => void;
  onReset?: (id: string) => void;

  className?: string;
  style?: CSSProperties;
}

const TITLE_PILL_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-pill, 20px)",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-soft)",
};

const ENTITY_PILL_STYLE: CSSProperties = {
  ...TITLE_PILL_STYLE,
  borderColor: "var(--div-soft)",
  color: "var(--div)",
};

const PRIMARY_BUTTON_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 18px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
};

const NEUTRAL_BUTTON_STYLE: CSSProperties = {
  padding: "9px 15px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const UNDO_BUTTON_STYLE: CSSProperties = {
  ...NEUTRAL_BUTTON_STYLE,
  borderColor: "var(--line)",
  color: "var(--ink-mute)",
};

const CHECK_ICON = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.5 4.5L19 6.5" />
  </svg>
);

const CADENCE_GLYPH: ReactNode = (
  <span
    style={{
      fontFamily: "var(--font-glyph)",
      color: "var(--accent)",
      fontSize: 11,
    }}
    aria-hidden="true"
  >
    ↻
  </span>
);

export function PracticeCard({
  id,
  name,
  cadenceHuman,
  intention,
  entity,
  status,
  streak,
  streakLabel,
  history,
  onComplete,
  onSkip,
  onReset,
  className,
  style,
}: PracticeCardProps) {
  const kept = countKept(history);

  return (
    <article
      data-component="practice-card"
      data-practice-id={id}
      data-status={status}
      className={className}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        padding: "22px 24px",
        ...style,
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 7,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {name}
            </h3>
            <span style={TITLE_PILL_STYLE}>
              {CADENCE_GLYPH}
              {cadenceHuman}
            </span>
            {entity ? (
              <span style={ENTITY_PILL_STYLE} data-entity-pill>
                <span
                  style={{
                    fontFamily: "var(--font-glyph)",
                  }}
                  aria-hidden="true"
                >
                  {entity.glyph}
                </span>
                {entity.name}
              </span>
            ) : null}
          </div>
          {intention ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 15.5,
                lineHeight: 1.5,
                color: "var(--ink-soft)",
                margin: "0 0 4px",
              }}
            >
              {intention}
            </p>
          ) : null}
        </div>
        <div style={{ flex: "none", textAlign: "right" }}>
          <div
            data-streak
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              lineHeight: 1,
              color: "var(--ink)",
            }}
          >
            {streak}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginTop: 3,
            }}
          >
            {streakLabel}
          </div>
        </div>
      </div>

      {/* Capture row */}
      <div
        data-capture-row
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          margin: "18px 0 20px",
          padding: "14px 16px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg)",
        }}
      >
        <span style={{ display: "flex", flex: "none" }}>
          <PracticeStatusIcon status={status} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink)",
            }}
          >
            {PRACTICE_STATUS_HEADLINE[status]}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {PRACTICE_STATUS_SUB[status]}
          </div>
        </div>
        {status === "pending" ? (
          <>
            <button
              type="button"
              data-action="complete"
              onClick={() => onComplete?.(id)}
              style={PRIMARY_BUTTON_STYLE}
            >
              {CHECK_ICON}
              Mark complete
            </button>
            <button
              type="button"
              data-action="skip"
              onClick={() => onSkip?.(id)}
              style={NEUTRAL_BUTTON_STYLE}
            >
              Note a skip
            </button>
          </>
        ) : null}
        {status === "done" ? (
          <button
            type="button"
            data-action="reset"
            onClick={() => onReset?.(id)}
            style={UNDO_BUTTON_STYLE}
          >
            Undo
          </button>
        ) : null}
        {status === "skipped" ? (
          <button
            type="button"
            data-action="complete-instead"
            onClick={() => onComplete?.(id)}
            style={NEUTRAL_BUTTON_STYLE}
          >
            Mark complete instead
          </button>
        ) : null}
      </div>

      {/* Grids row */}
      <div
        style={{
          display: "flex",
          gap: 30,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            Last five weeks · {kept} of 35 kept
          </div>
          <StreakGrid35 history={history} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            Last seven days
          </div>
          <Last7DaysDots history={history} />
        </div>
      </div>
    </article>
  );
}
