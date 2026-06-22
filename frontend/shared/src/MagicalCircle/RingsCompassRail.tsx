/**
 * RingsCompassRail — left-side panel with two stacked groups.
 *
 *  · Rings: header with add/remove icons + a list of ring rows
 *    (numbered circle + label + kind preview).
 *  · Compass points: eyebrow + single-tradition note +
 *    5-row tradition picker (Archangels / Greek wind gods /
 *    Watchtowers / Vedic dikpalas / Custom).
 */

import { type CSSProperties } from "react";

import {
  COMPASS_DEFINITIONS,
  COMPASS_ORDER,
  COMPASS_POINTS_EYEBROW,
  COMPASS_TRADITION_NOTE,
  RINGS_EYEBROW,
  RING_KIND_PREVIEW,
  ringKindLabel,
  ringLabels,
  type CompassTradition,
  type RingKind,
} from "./copy.js";

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 280px",
  minWidth: 0,
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 16px",
  overflowY: "auto",
};

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const RING_ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 10px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
  cursor: "pointer",
};

const RING_ROW_ON: CSSProperties = {
  ...RING_ROW_BASE,
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

const COMPASS_ROW_BASE: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  textAlign: "left",
  cursor: "pointer",
};

const COMPASS_ROW_ON: CSSProperties = {
  ...COMPASS_ROW_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

const SMALL_ICON_BUTTON: CSSProperties = {
  width: 26,
  height: 26,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-sm)",
  color: "var(--ink-soft)",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

export interface RingsCompassRailProps {
  ringKinds: readonly RingKind[];
  activeRing: number;
  onPickRing: (index: number) => void;
  onAddRing: () => void;
  onRemoveRing: () => void;
  compass: CompassTradition;
  onPickCompass: (next: CompassTradition) => void;
  className?: string;
  style?: CSSProperties;
}

export function RingsCompassRail({
  ringKinds,
  activeRing,
  onPickRing,
  onAddRing,
  onRemoveRing,
  compass,
  onPickCompass,
  className,
  style,
}: RingsCompassRailProps) {
  const labels = ringLabels(ringKinds.length);
  return (
    <aside
      data-component="magical-circle-rail"
      className={`scroll ci-side ${className ?? ""}`}
      style={{ ...RAIL_STYLE, ...style }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={EYEBROW_STYLE}>{RINGS_EYEBROW}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            aria-label="Remove ring"
            data-action="remove-ring"
            onClick={onRemoveRing}
            disabled={ringKinds.length <= 1}
            style={{
              ...SMALL_ICON_BUTTON,
              opacity: ringKinds.length <= 1 ? 0.4 : 1,
              cursor: ringKinds.length <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Add ring"
            data-action="add-ring"
            onClick={onAddRing}
            disabled={ringKinds.length >= 6}
            style={{
              ...SMALL_ICON_BUTTON,
              opacity: ringKinds.length >= 6 ? 0.4 : 1,
              cursor: ringKinds.length >= 6 ? "not-allowed" : "pointer",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginBottom: 20,
        }}
      >
        {ringKinds.map((kind, i) => {
          const on = activeRing === i;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              data-ring-row={i}
              onClick={() => onPickRing(i)}
              style={on ? RING_ROW_ON : RING_ROW_BASE}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  flex: "none",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                >
                  {labels[i]} · {ringKindLabel(kind)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {RING_KIND_PREVIEW[kind]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...EYEBROW_STYLE, marginBottom: 6 }}>
        {COMPASS_POINTS_EYEBROW}
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--ink-mute)",
          lineHeight: 1.4,
          margin: "0 0 10px",
        }}
      >
        {COMPASS_TRADITION_NOTE}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {COMPASS_ORDER.map((key) => {
          const on = compass === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              data-compass-row={key}
              onClick={() => onPickCompass(key)}
              style={on ? COMPASS_ROW_ON : COMPASS_ROW_BASE}
            >
              {COMPASS_DEFINITIONS[key].label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
