/**
 * SigilLibraryPanel — slide-in drawer listing past sigils.
 *
 * 4-col responsive grid (min 120px / col). Tapping a thumb opens
 * the sigil read-only with an "Edit a new version" affordance —
 * implementing the H05 §S2.1 committed-make rule.
 */

import { type CSSProperties } from "react";

import { LIBRARY_DEMO_NAMES, LIBRARY_HEADER, LIBRARY_HELP_TAIL } from "./copy.js";

export interface SigilLibraryEntry {
  id: string;
  title: string;
  /** SVG path data (the engine's already-rendered curve). Optional —
   *  the panel falls back to a placeholder mark when absent. */
  thumbPath?: string;
  /** Pre-formatted short date label ("3 Jun"). */
  date?: string;
}

const SCRIM_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  justifyContent: "flex-end",
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.5)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
  height: "100%",
  overflowY: "auto",
  background: "var(--bg)",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line-2)",
  boxShadow: "-2px 0 30px rgba(0,0,0,.4)",
  padding: "24px 26px 40px",
};

export interface SigilLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  /** The practitioner's sigils. When absent, the demo seed renders. */
  sigils?: readonly SigilLibraryEntry[];
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

function demoEntries(): SigilLibraryEntry[] {
  return LIBRARY_DEMO_NAMES.map((name, i) => ({
    id: `demo-${i}`,
    title: name,
    date: `${i + 3} Jun`,
  }));
}

export function SigilLibraryPanel({
  open,
  onClose,
  sigils,
  onOpen,
  className,
  style,
}: SigilLibraryPanelProps) {
  if (!open) return null;
  const entries = sigils ?? demoEntries();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sigil library"
      data-component="sigil-library-panel"
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div className={`scroll ${className ?? ""}`} style={{ ...PANEL_STYLE, ...style }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              margin: 0,
            }}
          >
            {LIBRARY_HEADER}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              color: "var(--ink-mute)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            margin: "0 0 18px",
          }}
        >
          <span style={{ color: "var(--ink-soft)" }}>{entries.length}</span>
          {LIBRARY_HELP_TAIL}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 14,
          }}
          data-library-grid
        >
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-library-entry={entry.id}
              onClick={() => onOpen?.(entry.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                alignItems: "center",
                padding: 10,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: "pointer",
              }}
            >
              <svg
                viewBox="0 0 280 280"
                width="100%"
                style={{ aspectRatio: "1" }}
                aria-hidden="true"
              >
                {entry.thumbPath ? (
                  <path
                    d={entry.thumbPath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={3}
                  />
                ) : (
                  <circle
                    cx={140}
                    cy={140}
                    r={80}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                )}
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--ink)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {entry.title}
              </span>
              {entry.date ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-mute)",
                  }}
                >
                  {entry.date}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
