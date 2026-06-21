/**
 * ReshStationCard — one of the four solar adoration stations.
 *
 * Per `Theourgia Liber Resh.dc.html`. Shows the station glyph, the
 * Crowley godform attribution and direction, the local + UTC time,
 * the verbatim Liber CC invocation (italicised), and an observed /
 * actionable footer:
 *   - observed → ✓ at HH:MM + optional note
 *   - actionable → "Mark observed" button + plain-text status hint
 *
 * The card is structurally tinted three ways:
 *   - `isNext` (the upcoming station)   → halo + accent button
 *   - past + not-observed (faded)        → opacity 0.62
 *   - everything else                    → flat var(--bg-2)
 *
 * No raw hex — every colour resolves through a token. The invocation
 * is the Crowley liturgy verbatim and lives on the Tradition object.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  type ReshAdoration,
  RESH_STATION_META,
  type ReshStation,
  formatMinute,
} from "./resh.js";

export interface ReshStationCardProps {
  station: ReshStation;
  adoration: ReshAdoration;
  /** Minute-of-day for the station this date. */
  stationMin: number;
  /** Minute-of-day in UTC (i.e. local − tz offset). */
  stationMinUtc: number;
  /** True if this is the next upcoming station. */
  isNext?: boolean;
  /** True if the station already passed without observation. */
  isFaded?: boolean;
  /** Observation record if the practitioner marked it today. */
  observation?: { atMin: number; note?: string };
  /** Plain-text status line shown next to the action button. */
  statusText?: string;
  onMarkObserved?: () => void;
  className?: string;
  style?: CSSProperties;
}

function StationEmblem({
  station,
  color,
}: {
  station: ReshStation;
  color: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 38,
        height: 38,
        flex: "none",
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        background: "var(--bg-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
      }}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={RESH_STATION_META[station].iconPath} />
      </svg>
    </span>
  );
}

function CheckBadge() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: "50%",
        background: "color-mix(in srgb, var(--success) 22%, transparent)",
        color: "var(--success)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
      }}
    >
      ✓
    </span>
  );
}

export function ReshStationCard({
  station,
  adoration,
  stationMin,
  stationMinUtc,
  isNext = false,
  isFaded = false,
  observation,
  statusText,
  onMarkObserved,
  className,
  style,
}: ReshStationCardProps) {
  const observed = !!observation;
  const iconColor = observed
    ? "var(--success)"
    : isNext
      ? "var(--sun-warm)"
      : "var(--ink-soft)";

  const cardStyle: CSSProperties = {
    background: isNext ? "var(--bg-3)" : "var(--bg-2)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: isNext ? "var(--line-2)" : "var(--line)",
    boxShadow: isNext ? "inset 0 0 0 1.5px var(--accent-soft)" : "none",
    borderRadius: "var(--r-lg, 14px)",
    padding: "15px 16px",
    opacity: isFaded ? 0.62 : 1,
    ...style,
  };

  return (
    <article
      className={className}
      data-component="resh-station-card"
      data-station={station}
      data-observed={observed ? "true" : "false"}
      data-is-next={isNext ? "true" : "false"}
      style={cardStyle}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <StationEmblem station={station} color={iconColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
              }}
            >
              {RESH_STATION_META[station].label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {adoration.direction}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--accent)",
              marginTop: 0,
            }}
          >
            {adoration.godform}
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15 }}>
            {formatMinute(stationMin)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-mute)",
            }}
          >
            {formatMinute(stationMinUtc)}Z
          </div>
        </div>
      </div>

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--ink-mute)",
          margin: "11px 0 12px",
        }}
      >
        “{adoration.invocation}”
      </p>

      {observed ? (
        <Footer>
          <CheckBadge />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--success)",
              }}
            >
              Observed at {formatMinute(observation!.atMin)}
            </div>
            {observation!.note ? (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  fontStyle: "italic",
                  marginTop: 1,
                }}
              >
                {observation!.note}
              </div>
            ) : null}
          </div>
        </Footer>
      ) : onMarkObserved ? (
        <Footer>
          <button
            type="button"
            onClick={onMarkObserved}
            data-mark-observed
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-md, 8px)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "none",
              background: isNext ? "var(--accent)" : "transparent",
              color: isNext ? "var(--accent-ink)" : "var(--ink-soft)",
              borderWidth: isNext ? 0 : 1,
              borderStyle: "solid",
              borderColor: isNext ? "transparent" : "var(--line-2)",
              cursor: "pointer",
            }}
          >
            Mark observed
          </button>
          {statusText ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {statusText}
            </span>
          ) : null}
        </Footer>
      ) : null}
    </article>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        paddingTop: 11,
        borderTop: "1px solid var(--line)",
      }}
    >
      {children}
    </div>
  );
}
