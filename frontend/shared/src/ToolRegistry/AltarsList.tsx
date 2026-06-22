/**
 * AltarsList — vertical list of altar rows (max-width 760).
 *
 * Each row: 72×72 altar glyph tile (accent-soft radial gradient) +
 * name + optional "permanent" pill (care palette) + tool count +
 * workings count + chevron.
 */

import { type CSSProperties } from "react";

import {
  ALTAR_PERMANENT_PILL,
  DEMO_ALTARS,
  type AltarRecord,
} from "./copy.js";

const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "16px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
};

const PERMANENT_PILL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  padding: "2px 8px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--care-line)",
  borderRadius: "var(--r-pill, 20px)",
  background: "var(--care-soft)",
  color: "var(--care)",
};

function AltarTile() {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "var(--r-md)",
        background:
          "radial-gradient(ellipse at 50% 40%, var(--accent-soft), var(--bg-sunk))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        color: "var(--accent)",
      }}
    >
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9h16l-1.5 9.5a1 1 0 0 1-1 .8H6.5a1 1 0 0 1-1-.8z" />
        <path d="M6 9V7a6 6 0 0 1 12 0v2M9 13v3M15 13v3M12 12v5" />
      </svg>
    </div>
  );
}

export interface AltarsListProps {
  altars?: readonly AltarRecord[];
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function AltarsList({
  altars = DEMO_ALTARS,
  onOpen,
  className,
  style,
}: AltarsListProps) {
  return (
    <div
      data-component="tool-registry-altars-list"
      className={className}
      style={{
        maxWidth: 760,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      {altars.map((altar) => (
        <button
          key={altar.id}
          type="button"
          data-altar-row={altar.id}
          onClick={() => onOpen?.(altar.id)}
          style={ROW_STYLE}
        >
          <AltarTile />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                }}
              >
                {altar.name}
              </span>
              {altar.permanent ? (
                <span data-pill="permanent" style={PERMANENT_PILL}>
                  {ALTAR_PERMANENT_PILL}
                </span>
              ) : null}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                marginTop: 3,
              }}
            >
              {altar.toolCount} tools · {altar.workings}
            </div>
          </div>
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-mute)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      ))}
    </div>
  );
}
