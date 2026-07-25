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
  /** Display-label override — H12's Dawn/Noon/Dusk/Night relabel is a
   *  prop-level rename, not a fork. Defaults to the static meta label. */
  label?: string;
  adoration: ReshAdoration;
  /** Minute-of-day for the station this date. */
  stationMin: number;
  /** Minute-of-day in UTC (i.e. local − tz offset). */
  stationMinUtc: number;
  /** True if this is the next upcoming station. */
  isNext?: boolean;
  /**
   * Rule 66 (H12): the minimum-viable station — dusk by default. Carries
   * the `minimum viable` chip and the ONLY primary CTA in its row. Pass
   * explicitly (`true`/`false`) on all four cards to adopt the rule:
   * with `false` the action button stays quiet even when `isNext`;
   * leave `undefined` for the pre-H12 behaviour (isNext drives the
   * accent button).
   */
  isMinimum?: boolean;
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
  label,
  adoration,
  stationMin,
  stationMinUtc,
  isNext = false,
  isMinimum,
  isFaded = false,
  observation,
  statusText,
  onMarkObserved,
  className,
  style,
}: ReshStationCardProps) {
  const observed = !!observation;
  // Rule 66: when the surface states the rule (isMinimum given), only the
  // minimum-viable station may carry the primary CTA.
  const primaryAction = isMinimum === undefined ? isNext : isMinimum;
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
              {label ?? RESH_STATION_META[station].label}
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

      {isMinimum ? (
        <div
          data-minimum-viable
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 10,
            padding: "1px 8px",
            borderRadius: "var(--r-pill, 999px)",
            background: "var(--accent-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--accent)",
          }}
        >
          minimum viable
        </div>
      ) : null}

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
              background: primaryAction ? "var(--accent)" : "transparent",
              color: primaryAction ? "var(--accent-ink)" : "var(--ink-soft)",
              borderWidth: primaryAction ? 0 : 1,
              borderStyle: "solid",
              borderColor: primaryAction ? "transparent" : "var(--line-2)",
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
