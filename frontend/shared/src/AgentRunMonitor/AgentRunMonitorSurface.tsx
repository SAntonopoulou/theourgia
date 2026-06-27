/**
 * AgentRunMonitor — H10 Cluster C7 surface.
 *
 * Live view of a running task. Rule 55 — human-readable activity by
 * default; raw MCP trace behind a toggle (OFF by default).
 *
 * Rule 9 — token counts render in --font-mono numerals + fresh/resume
 * split (rule 58 critical signal even mid-run).
 */

import { useState, type CSSProperties } from "react";

import {
  type ActivityRowTone,
  BUTTONS,
  HEADERS,
  type HumanActivityRow,
  TOGGLES,
} from "./copy.js";

export interface AgentRunMonitorSurfaceProps {
  /** Human-readable activity rows (default view). */
  humanActivity: readonly HumanActivityRow[];
  /** Raw MCP trace text. Shown only when raw toggle is on. */
  rawActivity?: string;
  tokensTotal: number;
  tokensFresh: number;
  tokensResume: number;
  onHalt?: () => void;
  /** When true, the halt button is hidden (run already finished/halted). */
  finished?: boolean;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "24px 24px 40px",
};

const TILE_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 5,
};

const TILE_VALUE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 19,
  color: "var(--ink)",
};

function ActivityDot({ tone }: { tone: ActivityRowTone }) {
  const color =
    tone === "done"
      ? "var(--peer-ok)"
      : tone === "live"
        ? "var(--accent)"
        : "var(--ink-mute)";
  if (tone === "live") {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          marginTop: 2,
        }}
      />
    );
  }
  return (
    <span
      style={{ display: "flex", color, flex: "none", marginTop: 2 }}
      aria-hidden="true"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

export function AgentRunMonitorSurface({
  humanActivity,
  rawActivity = "",
  tokensTotal,
  tokensFresh,
  tokensResume,
  onHalt,
  finished = false,
  className,
  style,
}: AgentRunMonitorSurfaceProps) {
  const [rawOn, setRawOn] = useState(false);

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Token usage tiles */}
      <div
        style={{
          display: "flex",
          gap: 11,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
          }}
        >
          <div style={TILE_LABEL}>{HEADERS.tokensSoFar}</div>
          <div style={TILE_VALUE}>{formatTokens(tokensTotal)}</div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
          }}
          data-fresh-resume
        >
          <div style={TILE_LABEL}>{HEADERS.freshResume}</div>
          <div style={TILE_VALUE}>
            {formatTokens(tokensFresh)}{" "}
            <span style={{ color: "var(--ink-mute)", fontSize: 14 }}>
              / {formatTokens(tokensResume)}
            </span>
          </div>
        </div>
      </div>

      {/* Live activity */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {HEADERS.liveActivity}
        </span>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            role="switch"
            aria-checked={rawOn}
            aria-label={TOGGLES.viewRawActivity}
            onClick={() => setRawOn(!rawOn)}
            style={{
              position: "relative",
              width: 36,
              height: 21,
              borderRadius: 11,
              background: rawOn ? "var(--accent)" : "var(--bg-3)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: rawOn ? "var(--accent)" : "var(--line-2)",
              flex: "none",
              transition: "background .18s ease",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: rawOn ? 16 : 2,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: rawOn ? "var(--accent-ink)" : "var(--ink-mute)",
                transition: "left .18s ease",
              }}
            />
          </button>
          {TOGGLES.viewRawActivity}
        </label>
      </div>

      {!rawOn ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
          data-activity-mode="human"
        >
          {humanActivity.map((a, idx) => (
            <div
              key={idx}
              data-tone={a.tone}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                padding: "12px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <ActivityDot tone={a.tone} />
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                }}
              >
                {a.text}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <pre
          data-activity-mode="raw"
          style={{
            margin: 0,
            padding: "14px 16px",
            background: "var(--bg-sunk)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            lineHeight: 1.65,
            color: "var(--ink-soft)",
            whiteSpace: "pre-wrap",
          }}
        >
          {rawActivity}
        </pre>
      )}

      {/* Halt */}
      {!finished ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onHalt}
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BUTTONS.halt}
          </button>
        </div>
      ) : null}
    </div>
  );
}
