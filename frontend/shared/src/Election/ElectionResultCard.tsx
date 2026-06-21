/**
 * ElectionResultCard — one collapsible result row in the Election
 * Finder's scored-results list.
 *
 * Per `Theourgia Election Finder.dc.html`. Header row shows the
 * rank chip, the "when" + relative-when + pass summary, the score
 * (mono, in `--fail` tone if the row scored zero), a thin score
 * bar, the optional status badge ("Excellent", "Strong"), and a
 * disclosure chevron. Expanding reveals the per-constraint
 * breakdown (icon + constraint + reason + per-row score) plus an
 * action slot for "Add to calendar" / "Begin working here".
 *
 * The visual semantics:
 *   - A failing row (score ≈ 0) renders the score in `--fail` and
 *     the score bar at 0%. The row stays in the list so the user
 *     understands "this hour was tested and rejected".
 *   - Higher scores fill the bar progressively.
 */

import { type CSSProperties, type ReactNode } from "react";

import type { ElectionResult } from "./types.js";

export interface ElectionResultCardProps {
  result: ElectionResult;
  rank: number;
  open?: boolean;
  onToggle?: (next: boolean) => void;
  /** Slot for the row's action buttons (Add to calendar / Begin
   *  working here). Rendered below the breakdown when open. */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const FAIL_THRESHOLD = 0.001;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flex: "none",
        color: "var(--ink-mute)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ElectionResultCard({
  result,
  rank,
  open = false,
  onToggle,
  actions,
  className,
  style,
}: ElectionResultCardProps) {
  const failed = result.score < FAIL_THRESHOLD;
  const scoreColor = failed ? "var(--fail)" : "var(--ink)";
  const barPct = failed ? 0 : Math.max(0, Math.min(1, result.score)) * 100;

  return (
    <div
      className={className}
      data-component="election-result-card"
      data-result-id={result.id}
      data-rank={rank}
      data-failed={failed ? "true" : "false"}
      data-open={open ? "true" : "false"}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-2)",
        overflow: "hidden",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle?.(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "13px 15px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        <span
          data-rank-chip
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            flex: "none",
            borderRadius: "50%",
            background: failed ? "var(--bg-3)" : "var(--accent-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: failed ? "var(--line-2)" : "var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            color: failed ? "var(--ink-mute)" : "var(--accent)",
          }}
        >
          {rank}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {result.when}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {result.relativeWhen ? `${result.relativeWhen} · ` : ""}
            {result.passSummary ?? ""}
          </div>
        </div>
        <div style={{ flex: "none", textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 19,
              color: scoreColor,
              lineHeight: 1,
            }}
            data-score
          >
            {result.scoreString}
          </div>
          <div
            style={{
              width: 70,
              height: 5,
              borderRadius: 3,
              background: "var(--bg-sunk)",
              marginTop: 4,
              overflow: "hidden",
            }}
            data-score-bar
          >
            <div
              style={{
                width: `${barPct}%`,
                height: "100%",
                background: failed ? "var(--fail)" : "var(--accent)",
              }}
            />
          </div>
        </div>
        {result.badge ? (
          <span
            data-badge
            style={{
              flex: "none",
              padding: "3px 10px",
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: result.badge.color,
              background: `color-mix(in srgb, ${result.badge.color} 18%, transparent)`,
              color: result.badge.color,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {result.badge.label}
          </span>
        ) : null}
        <Chevron open={open} />
      </button>

      {open ? (
        <div
          style={{
            borderTop: "1px solid var(--line)",
            padding: "13px 15px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {result.breakdown.map((row) => (
              <div
                key={row.id}
                data-breakdown-id={row.id}
                data-breakdown-failed={row.failed ? "true" : "false"}
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    flex: "none",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: row.iconColor,
                    background: `color-mix(in srgb, ${row.iconColor} 16%, transparent)`,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                  }}
                >
                  {row.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {row.constraint}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {row.reason}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: row.failed
                      ? "var(--fail)"
                      : "var(--ink-soft)",
                    flex: "none",
                  }}
                >
                  {row.scoreString}
                </span>
              </div>
            ))}
          </div>
          {actions ? (
            <div
              style={{
                display: "flex",
                gap: 9,
                marginTop: 14,
                paddingTop: 13,
                borderTop: "1px solid var(--line)",
              }}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
