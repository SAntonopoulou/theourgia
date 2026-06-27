/**
 * PluginSubmissionList — H10 Cluster A3 surface.
 *
 * Author-side dashboard. Rule 41 — no "promote to Official" CTA;
 * tier promotion is the maintainer-side flow only.
 *
 * Rule 40 — rejected + withdrawn entries STAY in the list with
 * strikethrough / tombstone chrome. Never deleted.
 */

import type { CSSProperties } from "react";

import {
  PREAMBLE,
  STATE_LABELS,
  type SubmissionState,
} from "./copy.js";

export interface SubmissionRow {
  id: string;
  name: string;
  version: string;
  /** Display-friendly date label ("today" / "4 days ago" / etc.). */
  submittedAt: string;
  state: SubmissionState;
  noteCount?: number;
}

export interface PluginSubmissionListSurfaceProps {
  rows: readonly SubmissionRow[];
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "22px 24px 48px",
};

const CHIP_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 11px",
  borderRadius: "var(--r-pill)",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  flex: "none",
};

function chipStyle(state: SubmissionState): CSSProperties {
  switch (state) {
    case "pending_review":
      return {
        ...CHIP_BASE,
        color: "var(--ink-mute)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--plugin-disabled-line, var(--line-2))",
      };
    case "under_review":
      return {
        ...CHIP_BASE,
        color: "var(--accent)",
        background: "var(--accent-soft)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
      };
    case "changes_requested":
      return {
        ...CHIP_BASE,
        color: "var(--warn)",
        background: "var(--warn-soft)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--warn-border)",
      };
    case "accepted_community":
    case "accepted_official":
      return {
        ...CHIP_BASE,
        color: "var(--peer-ok)",
        background: "var(--peer-ok-soft)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--peer-ok)",
      };
    case "rejected":
      return {
        ...CHIP_BASE,
        color: "var(--ink-mute)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--plugin-disabled-line, var(--line-2))",
      };
    case "withdrawn":
      return {
        ...CHIP_BASE,
        color: "var(--ink-mute)",
        background: "var(--tombstone-soft, var(--bg-3))",
      };
  }
}

function rowBorder(state: SubmissionState): string {
  if (state === "changes_requested") return "var(--warn-border)";
  if (state === "rejected" || state === "withdrawn") {
    return "var(--plugin-disabled-line, var(--line-2))";
  }
  return "var(--line)";
}

function nameColor(state: SubmissionState): string {
  return state === "rejected" || state === "withdrawn"
    ? "var(--ink-mute)"
    : "var(--ink)";
}

export function PluginSubmissionListSurface({
  rows,
  onOpen,
  className,
  style,
}: PluginSubmissionListSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 14,
        }}
      >
        {PREAMBLE}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: "20px 22px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            No submissions yet. Once you submit a plugin, it will appear
            here.
          </div>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              type="button"
              data-row={r.id}
              data-state={r.state}
              onClick={() => onOpen?.(r.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 17px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: rowBorder(r.state),
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: nameColor(r.state),
                      textDecoration:
                        r.state === "rejected" ? "line-through" : "none",
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.version}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    marginTop: 3,
                  }}
                >
                  Submitted {r.submittedAt}
                </div>
              </div>
              {r.noteCount && r.noteCount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--remote, var(--ink-mute))",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ‡
                  </span>
                  {r.noteCount} notes
                </span>
              ) : null}
              <span style={chipStyle(r.state)}>
                {r.state === "accepted_official" ? (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--peer-ok)",
                    }}
                  />
                ) : null}
                {r.state === "withdrawn" ? (
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    ‡
                  </span>
                ) : null}
                {STATE_LABELS[r.state]}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
