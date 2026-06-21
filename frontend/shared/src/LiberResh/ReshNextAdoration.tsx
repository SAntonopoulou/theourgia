/**
 * ReshNextAdoration — hero card for the upcoming solar station.
 *
 * Per `Theourgia Liber Resh.dc.html`. A radial accent-tinted background
 * panel with: large station emblem on the left, "Next adoration · in
 * Xh Ym" eyebrow, station label + godform + facing direction,
 * italic Crowley invocation, large local time + UTC time on the
 * right, and an "Open full liturgy →" link slot.
 *
 * The countdown string is computed by the caller — this primitive
 * does not own a clock.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  type ReshAdoration,
  RESH_STATION_META,
  type ReshStation,
  formatMinute,
} from "./resh.js";

export interface ReshNextAdorationProps {
  station: ReshStation;
  adoration: ReshAdoration;
  /** Local minute-of-day for the upcoming station. */
  stationMin: number;
  /** UTC minute-of-day. */
  stationMinUtc: number;
  /** Pre-formatted countdown string ("2h 14m" or "47m"). */
  countdown: string;
  /** Slot for the "Open full liturgy →" affordance (a link, button,
   *  or null). The hero stays neutral about the navigation target. */
  liturgyAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ReshNextAdoration({
  station,
  adoration,
  stationMin,
  stationMinUtc,
  countdown,
  liturgyAction,
  className,
  style,
}: ReshNextAdorationProps) {
  const stationLabel = RESH_STATION_META[station].label;
  return (
    <div
      className={className}
      data-component="resh-next-adoration"
      data-station={station}
      style={{
        position: "relative",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, var(--accent-soft), var(--bg-2) 60%)",
        ...style,
      }}
    >
      <div
        style={{
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          gap: 22,
          flexWrap: "wrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: 74,
            height: 74,
            borderRadius: "50%",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            background: "var(--bg-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sun-warm)",
          }}
        >
          <svg
            width="40"
            height="40"
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

        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
            data-countdown
          >
            Next adoration · in {countdown}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 3,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              {stationLabel}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                color: "var(--accent)",
              }}
            >
              {adoration.godform}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              facing {adoration.direction}
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              margin: "9px 0 0",
              maxWidth: "46ch",
            }}
          >
            “{adoration.invocation}”
          </p>
        </div>

        <div
          style={{
            flex: "none",
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 24,
                color: "var(--ink)",
              }}
            >
              {formatMinute(stationMin)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {formatMinute(stationMinUtc)} UTC
            </div>
          </div>
          {liturgyAction}
        </div>
      </div>
    </div>
  );
}
