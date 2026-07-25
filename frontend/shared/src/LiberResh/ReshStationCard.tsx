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
 *
 * v1-068 layout hardening (the 960px crush): the time / position /
 * minimum-viable chips live in NORMAL flow in a wrapping header row —
 * never right-aligned blocks that bleed over the title when the card
 * narrows. Long invocations (the operator's real liturgy is a full
 * strophe per station) clamp to ~3 lines behind a per-card
 * "Show invocation" affordance; the verbatim text stays in the DOM
 * and expands in place.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

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

/**
 * Invocations at or under this length render whole (~3 lines at the
 * ~260px card floor); anything longer clamps to 3 lines behind the
 * per-card "Show invocation" toggle. The Thelemic Liber CC strophes
 * (~85 chars) stay untoggled; the operator's Hellenic liturgy (a full
 * strophe per station, 200–450 bytes of Greek) clamps.
 */
const INVOCATION_CLAMP_CHARS = 90;

/** Small pill chip — header metadata in normal document flow. */
const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
  padding: "1px 8px",
  borderRadius: "var(--r-pill, 999px)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-3)",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--ink-soft)",
  whiteSpace: "nowrap",
};

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
  // v1-068: long invocations collapse to ~3 lines until expanded.
  const invocationLong = adoration.invocation.length > INVOCATION_CLAMP_CHARS;
  const [invocationOpen, setInvocationOpen] = useState(false);
  const invocationClamped = invocationLong && !invocationOpen;
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
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
            }}
          >
            {label ?? RESH_STATION_META[station].label}
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
          {/* Chips — time, position, minimum-viable — in normal document
              flow, wrapping under the title. Never absolutely positioned,
              never a right-aligned block that collides with the name. */}
          <div
            data-station-chips
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 6,
            }}
          >
            <span data-chip-time style={chipStyle}>
              <span style={{ fontSize: 12, color: "var(--ink)" }}>
                {formatMinute(stationMin)}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--ink-mute)" }}>
                {formatMinute(stationMinUtc)}Z
              </span>
            </span>
            <span
              data-chip-direction
              style={{
                ...chipStyle,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {adoration.direction}
            </span>
            {isMinimum ? (
              <span
                data-minimum-viable
                style={{
                  ...chipStyle,
                  background: "var(--accent-soft)",
                  borderColor: "var(--line-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--accent)",
                }}
              >
                minimum viable
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ margin: "11px 0 12px" }}>
        <p
          data-invocation
          data-clamped={invocationClamped ? "true" : "false"}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--ink-mute)",
            margin: 0,
            ...(invocationClamped
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }
              : {}),
          }}
        >
          “{adoration.invocation}”
        </p>
        {invocationLong ? (
          <button
            type="button"
            data-invocation-toggle
            aria-expanded={invocationOpen}
            onClick={() => setInvocationOpen((o) => !o)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 5,
              padding: 0,
              background: "transparent",
              border: "none",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--accent)",
              cursor: "pointer",
            }}
          >
            {invocationOpen ? "Hide invocation" : "Show invocation"}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: invocationOpen ? "rotate(180deg)" : "none" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : null}
      </div>

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
        flexWrap: "wrap",
        gap: 9,
        paddingTop: 11,
        borderTop: "1px solid var(--line)",
      }}
    >
      {children}
    </div>
  );
}
