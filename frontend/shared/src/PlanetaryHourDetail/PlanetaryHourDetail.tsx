/**
 * PlanetaryHourDetail — selected/current hour card.
 *
 * Per `Theourgia Planetary Hours.dc.html`. A vertical color strip
 * along the top (the ruler's --pl-* color), then the planet glyph,
 * name, "day-hour 7 of 12 · daylight" ordinal line, a 3-column block
 * of Begins / Ends / Length, a wrap-row of "Favoured for" chips,
 * and a one-paragraph note.
 *
 * The "Now" badge appears when the selected hour is the current one.
 */

import { type CSSProperties } from "react";

import {
  CLASSICAL_PLANETS,
  type ClassicalPlanet,
  formatDuration,
  formatTime,
} from "../PlanetaryHourStrip/PlanetaryHourStrip.js";

export interface PlanetaryRulership {
  /** Free-text labels for "Favoured for" chips. */
  favours: string[];
  /** One paragraph of editorial copy. */
  note: string;
}

/** Designer-supplied default rulership notes — drawn directly from the
 *  mockup so editorial voice stays consistent across surfaces. */
export const DEFAULT_RULERSHIPS: Record<ClassicalPlanet, PlanetaryRulership> = {
  sun: {
    favours: ["Authority", "Health", "Success", "Patronage"],
    note: "The hour of the Sun favours matters of office, vitality and open success — anything that must be seen and acknowledged.",
  },
  venus: {
    favours: ["Love", "Art", "Concord", "Beauty"],
    note: "Venus rules union and grace — reconciliations, courtship, the making of beautiful things, and the easing of discord.",
  },
  merc: {
    favours: ["Letters", "Commerce", "Study", "Divination"],
    note: "Mercury governs the swift and the spoken — correspondence, contracts, learning, and the reading of signs.",
  },
  moon: {
    favours: ["Travel", "Dreams", "Tides", "The people"],
    note: "The Moon rules flux and the night-mind — journeys, the home, dreams, and works that move with the tide.",
  },
  sat: {
    favours: ["Binding", "Boundaries", "Endings", "Discipline"],
    note: "Saturn governs limit and duration — bindings, banishings, the setting of boundaries, and works meant to last or to close.",
  },
  jup: {
    favours: ["Increase", "Fortune", "Law", "Mercy"],
    note: "Jupiter rules expansion and favour — petitions to the great, matters of law, increase of wealth, and acts of generosity.",
  },
  mars: {
    favours: ["Vigour", "Severance", "Contest", "Courage"],
    note: "Mars governs force and the cut — the breaking of obstacles, contests and defence, surgery, and works that demand iron will.",
  },
};

export interface PlanetaryHourDetailProps {
  ruler: ClassicalPlanet;
  /** 0..11. Day-ordinal when isDay, night-ordinal when !isDay. */
  ordinalInArc: number;
  isDay: boolean;
  startMin: number;
  endMin: number;
  lengthMin: number;
  /** Whether this is the current planetary hour. */
  isNow?: boolean;
  /** Whether the user explicitly selected it (vs default-to-now). */
  isExplicitSelection?: boolean;
  /** Override the rulership chips + note. */
  rulership?: PlanetaryRulership;
  className?: string;
  style?: CSSProperties;
}

export function PlanetaryHourDetail({
  ruler,
  ordinalInArc,
  isDay,
  startMin,
  endMin,
  lengthMin,
  isNow = false,
  isExplicitSelection = false,
  rulership,
  className,
  style,
}: PlanetaryHourDetailProps) {
  const meta = CLASSICAL_PLANETS[ruler];
  const rs = rulership ?? DEFAULT_RULERSHIPS[ruler];

  const tag = isNow
    ? "Current hour"
    : isExplicitSelection
      ? "Selected hour"
      : "Current hour";

  return (
    <div
      className={className}
      data-component="planetary-hour-detail"
      data-ruler={ruler}
      data-is-now={isNow ? "true" : "false"}
      style={{
        background: "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* color strip */}
      <div
        aria-hidden="true"
        style={{ height: 4, background: meta.color }}
        data-color-strip
      />

      <div style={{ padding: "18px 20px" }}>
        {/* tag + "Now" pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            {tag}
          </span>
          {isNow ? (
            <span
              data-now-badge
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--accent-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                Now
              </span>
            </span>
          ) : null}
        </div>

        {/* glyph + name + ordinal */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--bg-3)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-glyph)",
              fontSize: 27,
              color: meta.color,
              flex: "none",
            }}
          >
            {meta.glyph}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 25,
                lineHeight: 1.05,
              }}
            >
              {meta.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 2,
              }}
            >
              {isDay ? "Day-hour " : "Night-hour "}
              {ordinalInArc + 1} of 12 · {isDay ? "daylight" : "night"}
            </div>
          </div>
        </div>

        {/* begins / ends / length */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: 16,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md, 8px)",
            overflow: "hidden",
          }}
        >
          {[
            { label: "Begins", value: formatTime(startMin) },
            { label: "Ends", value: formatTime(endMin) },
            { label: "Length", value: formatDuration(lengthMin) },
          ].map((cell, i) => (
            <div
              key={cell.label}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRight:
                  i < 2 ? "1px solid var(--line)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                {cell.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  marginTop: 2,
                }}
              >
                {cell.value}
              </div>
            </div>
          ))}
        </div>

        {/* favoured for */}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            margin: "16px 0 7px",
          }}
        >
          Favoured for
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {rs.favours.map((f) => (
            <span
              key={f}
              style={{
                padding: "4px 10px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: 999,
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* note */}
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--ink-mute)",
            margin: "14px 0 0",
            paddingTop: 13,
            borderTop: "1px solid var(--line)",
          }}
        >
          {rs.note}
        </p>
      </div>
    </div>
  );
}
