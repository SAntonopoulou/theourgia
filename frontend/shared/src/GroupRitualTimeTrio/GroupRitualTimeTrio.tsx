/**
 * GroupRitualTimeTrio — the three-pin time primitive (H08 rule 23).
 *
 * Three clocks rendered together as a single visual unit: the
 * viewer's local clock + the shared UTC anchor + the viewer's
 * local planetary hour at that moment. Used by:
 *
 *   * Group Ritual Scheduler  (surface 8 — worked example)
 *   * Group Ritual Coordination (surface 9)
 *   * Group Ritual Post-Mortem (surface 10)
 *
 * THE invariants this primitive enforces:
 *
 *   1. **Never one clock — always three.** A participant in
 *      Reykjavík reading "21:30" with no UTC and no per-location
 *      planetary hour cannot coordinate. The component takes all
 *      three fields as required props.
 *   2. **The planetary hour is per-VIEWER.** An hour of Jupiter
 *      at Athens is NOT the same clock-span as at Reykjavík.
 *      The consumer computes the hour from the VIEWER's lat/long
 *      (Swiss Ephemeris, no approximation) and passes it in.
 *   3. **The current hour gets `--planetary-hour-now` chrome.**
 *      The gold-leaning accent variant in the token family pins
 *      "the hour you are in right now" so it reads at a glance.
 *      When the trio renders a past or future timestamp, the
 *      planetary-hour card uses regular `--bg-2` / `--line`
 *      chrome instead.
 *   4. **The UTC value renders in `--font-mono`.** The H08 brief
 *      is explicit — UTC is a literal timestamp; the local clock
 *      gets `--font-display`.
 */

import { type CSSProperties, type ReactNode } from "react";

/** The seven traditional planetary rulers. */
export type PlanetaryHourRuler =
  | "Saturn"
  | "Jupiter"
  | "Mars"
  | "Sun"
  | "Venus"
  | "Mercury"
  | "Moon";

/** Unicode glyph per ruler — used in the planetary-hour card. */
export const PLANETARY_HOUR_GLYPHS: Record<PlanetaryHourRuler, string> =
  {
    Saturn: "♄",
    Jupiter: "♃",
    Mars: "♂",
    Sun: "☉",
    Venus: "♀",
    Mercury: "☿",
    Moon: "☽",
  };

export interface GroupRitualTimeTrioProps {
  /** Local clock — caller pre-formatted. e.g.
   *  ``localPrimary: "20 Mar 2026 · 06:12"`` and
   *  ``localSecondary: "Europe/Athens (EET)"``. The component
   *  does NOT format — the consumer carries the localisation
   *  responsibility. */
  localPrimary: string;
  localSecondary: string;

  /** UTC anchor. e.g. ``utcPrimary: "04:12 UTC"``,
   *  ``utcSecondary: "20 Mar 2026"``. */
  utcPrimary: string;
  utcSecondary: string;

  /** Planetary-hour ruler — drives both the glyph and the
   *  "Hour of the {ruler}" label. */
  planetaryRuler: PlanetaryHourRuler;
  /** Pre-formatted "Nth hour of day"/"Nth hour of night" string,
   *  caller-localised. */
  planetarySecondary: string;
  /** When true, the planetary-hour card uses --planetary-hour-now
   *  chrome (the gold-leaning accent variant). */
  isCurrent: boolean;

  /** Optional eyebrow overrides. Default to the H08 brief copy:
   *  "Your local clock" / "UTC" / "Your planetary hour". */
  localEyebrow?: string;
  utcEyebrow?: string;
  planetaryEyebrow?: string;

  /** Compact mode renders three smaller centered cards. Used by
   *  the in-the-moment Coordination surface (surface 9) and the
   *  frozen Post-Mortem surface (surface 10). */
  compact?: boolean;

  className?: string;
  style?: CSSProperties;
}

export const GRTT_LOCAL_EYEBROW = "Your local clock";
export const GRTT_UTC_EYEBROW = "UTC";
export const GRTT_PLANETARY_EYEBROW = "Your planetary hour";
export const GRTT_HOUR_OF_PREFIX = "Hour of the ";

const TRIO_ROW: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const CARD_BASE: CSSProperties = {
  flex: 1,
  minWidth: 160,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  padding: "14px 16px",
};

const CARD_CURRENT: CSSProperties = {
  ...CARD_BASE,
  border: "1px solid var(--planetary-hour-now)",
  background: "var(--planetary-hour-now-soft)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

const PRIMARY_DISPLAY: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  color: "var(--ink)",
};

const PRIMARY_MONO: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 18,
  color: "var(--ink)",
};

const SECONDARY: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

function HourGlyph({
  ruler,
  isCurrent,
  compact = false,
}: {
  ruler: PlanetaryHourRuler;
  isCurrent: boolean;
  compact?: boolean;
}): ReactNode {
  return (
    <span
      data-glyph={ruler}
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-glyph)",
        fontSize: compact ? 15 : 18,
        color: isCurrent
          ? "var(--planetary-hour-now)"
          : "var(--ink-soft)",
      }}
    >
      {PLANETARY_HOUR_GLYPHS[ruler]}
    </span>
  );
}

/** Compact-mode style overrides — smaller cards, centered text,
 *  no secondary lines. */
const CARD_COMPACT: CSSProperties = {
  flex: 1,
  minWidth: 80,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  padding: "11px 12px",
  textAlign: "center",
};

const CARD_COMPACT_CURRENT: CSSProperties = {
  ...CARD_COMPACT,
  border: "1px solid var(--planetary-hour-now)",
  background: "var(--planetary-hour-now-soft)",
};

const EYEBROW_COMPACT: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 9,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 4,
};

const PRIMARY_DISPLAY_COMPACT: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink)",
};

const PRIMARY_MONO_COMPACT: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  color: "var(--ink)",
};

const TRIO_ROW_COMPACT: CSSProperties = {
  display: "flex",
  gap: 8,
};

const COMPACT_LOCAL_EYEBROW = "Local";
const COMPACT_UTC_EYEBROW = "UTC";
const COMPACT_PLANETARY_EYEBROW = "Planetary hour";
const COMPACT_HOUR_OF_PREFIX = "of the ";

export function GroupRitualTimeTrio({
  localPrimary,
  localSecondary,
  utcPrimary,
  utcSecondary,
  planetaryRuler,
  planetarySecondary,
  isCurrent,
  localEyebrow,
  utcEyebrow,
  planetaryEyebrow,
  compact = false,
  className,
  style,
}: GroupRitualTimeTrioProps) {
  const localEb =
    localEyebrow ??
    (compact ? COMPACT_LOCAL_EYEBROW : GRTT_LOCAL_EYEBROW);
  const utcEb =
    utcEyebrow ?? (compact ? COMPACT_UTC_EYEBROW : GRTT_UTC_EYEBROW);
  const planetaryEb =
    planetaryEyebrow ??
    (compact ? COMPACT_PLANETARY_EYEBROW : GRTT_PLANETARY_EYEBROW);
  const cardBase = compact ? CARD_COMPACT : CARD_BASE;
  const cardCurrent = compact ? CARD_COMPACT_CURRENT : CARD_CURRENT;
  const eyebrow = compact ? EYEBROW_COMPACT : EYEBROW;
  const primaryDisplay = compact ? PRIMARY_DISPLAY_COMPACT : PRIMARY_DISPLAY;
  const primaryMono = compact ? PRIMARY_MONO_COMPACT : PRIMARY_MONO;
  const rowStyle = compact ? TRIO_ROW_COMPACT : TRIO_ROW;
  const hourPrefix = compact ? COMPACT_HOUR_OF_PREFIX : GRTT_HOUR_OF_PREFIX;
  // Compact lets the planetary card stretch slightly so the
  // "of the {ruler}" line doesn't wrap on narrow viewports.
  const planetaryCardStyle = compact
    ? { ...(isCurrent ? cardCurrent : cardBase), flex: 1.2 }
    : isCurrent
      ? cardCurrent
      : cardBase;

  return (
    <div
      className={`grt-trio ${className ?? ""}`}
      data-block="time-trio"
      data-compact={compact}
      data-current={isCurrent}
      style={{ ...rowStyle, ...style }}
    >
      <div style={cardBase} data-card="local">
        <div style={eyebrow} data-field="eyebrow">
          {localEb}
        </div>
        <div style={primaryDisplay} data-field="primary">
          {localPrimary}
        </div>
        {!compact ? (
          <div style={SECONDARY} data-field="secondary">
            {localSecondary}
          </div>
        ) : null}
      </div>

      <div style={cardBase} data-card="utc">
        <div style={eyebrow} data-field="eyebrow">
          {utcEb}
        </div>
        <div style={primaryMono} data-field="primary">
          {utcPrimary}
        </div>
        {!compact ? (
          <div style={SECONDARY} data-field="secondary">
            {utcSecondary}
          </div>
        ) : null}
      </div>

      <div
        style={planetaryCardStyle}
        data-card="planetary"
        data-current={isCurrent}
      >
        <div style={eyebrow} data-field="eyebrow">
          {planetaryEb}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: compact ? "center" : "flex-start",
            gap: compact ? 5 : 7,
          }}
        >
          <HourGlyph
            ruler={planetaryRuler}
            isCurrent={isCurrent}
            compact={compact}
          />
          <span style={primaryDisplay} data-field="primary">
            {hourPrefix}
            {planetaryRuler}
          </span>
        </div>
        {!compact ? (
          <div style={SECONDARY} data-field="secondary">
            {planetarySecondary}
          </div>
        ) : null}
      </div>
    </div>
  );
}
