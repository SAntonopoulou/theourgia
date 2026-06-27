/**
 * SessionsAndDevices — H10 Cluster B6 surface.
 *
 * Rule 48 — the chrome speaks of devices, NEVER tokens. The session
 * IDs are passed through to callbacks but never rendered.
 */

import type { CSSProperties } from "react";

import { BUTTONS, CHIPS, type DeviceKind, HEADERS } from "./copy.js";

export interface SessionRow {
  id: string;
  /** Display label, e.g., "Your phone · Theourgia app · Berlin". */
  device: string;
  /** Geo string, e.g., "Berlin, DE". */
  geo: string;
  /** Last-seen friendly string. */
  lastSeen: string;
  kind?: DeviceKind;
}

export interface CurrentSession {
  device: string;
  /** Already friendly — e.g., "Active now". Default uses CHIPS.activeNow. */
  status?: string;
  kind?: DeviceKind;
}

export interface SessionsAndDevicesSurfaceProps {
  current: CurrentSession;
  others: readonly SessionRow[];
  onSignOut?: (sessionId: string) => void;
  onSignOutEverywhereElse?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

function DeviceIcon({ kind }: { kind: DeviceKind }) {
  if (kind === "phone") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  if (kind === "tablet") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function SessionsAndDevicesSurface({
  current,
  others,
  onSignOut,
  onSignOutEverywhereElse,
  className,
  style,
}: SessionsAndDevicesSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div style={SECTION_LABEL}>{HEADERS.thisDevice}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--peer-ok-border)",
          borderRadius: "var(--r-md)",
          background: "var(--peer-ok-soft)",
          marginBottom: 26,
        }}
      >
        <span style={{ display: "flex", color: "var(--peer-ok)", flex: "none" }}>
          <DeviceIcon kind={current.kind ?? "laptop"} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {current.device}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {current.status ?? CHIPS.activeNow}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 11px",
            borderRadius: "var(--r-pill)",
            background: "var(--peer-ok-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--peer-ok-border)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--peer-ok)",
            flex: "none",
          }}
        >
          {CHIPS.thisSession}
        </span>
      </div>

      <div style={SECTION_LABEL}>{HEADERS.otherSessions}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {others.length === 0 ? (
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
              padding: "16px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            This is your only active session. No other devices are signed in.
          </div>
        ) : (
          others.map((s) => (
            <div
              key={s.id}
              data-session={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 17px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span
                style={{ display: "flex", color: "var(--ink-mute)", flex: "none" }}
              >
                <DeviceIcon kind={s.kind ?? "laptop"} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {s.device}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    marginTop: 2,
                  }}
                >
                  {s.geo} · last seen {s.lastSeen}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSignOut?.(s.id)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  flex: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {BUTTONS.signOut}
              </button>
            </div>
          ))
        )}
      </div>

      {others.length > 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--line)",
          }}
        >
          <button
            type="button"
            onClick={onSignOutEverywhereElse}
            style={{
              marginTop: 14,
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
            {BUTTONS.signOutEverywhereElse}
          </button>
        </div>
      ) : null}
    </div>
  );
}
