/**
 * Horary engine — typed shapes + the Hellenistic 5-step workflow.
 *
 * The chart itself is cast on the backend (Swiss Ephemeris from
 * `{lat, lng, timestamp}` — that's heavy astronomy code that lives
 * server-side). The frontend ships the typed shape it expects back,
 * plus the 5-step interpretation workflow scaffolding so the surface
 * can walk the practitioner through the rite even before the chart
 * resolves.
 *
 * Per `Theourgia Divination Misc.dc.html` lines 349-355 + H04 §S3.5
 * gotcha: "Horary uses **whole-sign houses** and a real Hellenistic
 * workflow (sect → significators → perfection → reception →
 * witnesses) — not a flat 'answer'."
 */

export type Sect = "day" | "night";

export type HouseSystem = "whole-sign";

export interface HoraryPlacement {
  /** Pinyin / Latinised name (e.g. "Sun", "Mercury", "Saturn"). */
  planet: string;
  /** Unicode glyph (☉ ☽ ☿ ♀ ♂ ♃ ♄ ☋ ☊). */
  glyph: string;
  /** House number 1..12. */
  house: number;
  /** Sign number 0..11 (0 = Aries). */
  sign: number;
}

export interface HoraryInterpretation {
  querentSignificator: string;
  quesitedSignificator: string;
  perfection: {
    kind: "applying" | "none";
    /** Aspect type (e.g. "sextile", "trine"). Required when kind = "applying". */
    aspect?: string;
    note: string;
  };
  reception: string;
  witnesses: string;
  provisional: string;
}

/**
 * The full payload from `GET /api/v1/horary/cast`. Backend casts the
 * chart; frontend renders the wheel + walks the practitioner through
 * the workflow.
 */
export interface HoraryChart {
  id: string;
  question: string;
  lat: number;
  lng: number;
  /** ISO 8601 timestamp of the moment the question was understood. */
  timestamp: string;
  sect: Sect;
  houseSystem: HouseSystem;
  placements: readonly HoraryPlacement[];
  interpretation: HoraryInterpretation;
}

// ─── Workflow scaffolding ──────────────────────────────────────────

/** The five canonical steps of a Hellenistic horary judgement. The
 *  ordering matches the mockup (lines 349-355). The surface walks
 *  through these in order, each backed by the chart's interpretation
 *  fields. */
export type HoraryStep =
  | "sect"
  | "querent"
  | "quesited"
  | "perfection"
  | "reception";

export const HORARY_STEP_ORDER: readonly HoraryStep[] = [
  "sect",
  "querent",
  "quesited",
  "perfection",
  "reception",
];

/** Display metadata for each step. Used by the surface's step-by-step
 *  workflow panel. */
export const HORARY_STEP_META: Record<
  HoraryStep,
  { number: number; title: string }
> = {
  sect: { number: 1, title: "Sect" },
  querent: { number: 2, title: "Querent" },
  quesited: { number: 3, title: "Quesited" },
  perfection: { number: 4, title: "Perfection" },
  reception: { number: 5, title: "Reception & witnesses" },
};

/** Pull the value-line + commentary line per step from the chart's
 *  interpretation. The surface renders these alongside the step's
 *  number + title. */
export function horaryStepText(
  chart: HoraryChart,
  step: HoraryStep,
): { value: string; note: string } {
  const i = chart.interpretation;
  switch (step) {
    case "sect":
      return {
        value: chart.sect === "day" ? "Day chart" : "Night chart",
        note:
          chart.sect === "day"
            ? "The Sun is above the horizon; the diurnal planets — Sun, Jupiter, Saturn — carry the most weight in judgement."
            : "The Sun is below the horizon; the nocturnal planets — Moon, Venus, Mars — carry the most weight in judgement.",
      };
    case "querent":
      return { value: i.querentSignificator, note: "" };
    case "quesited":
      return { value: i.quesitedSignificator, note: "" };
    case "perfection":
      return {
        value:
          i.perfection.kind === "applying"
            ? `By applying ${i.perfection.aspect ?? "aspect"}`
            : "No perfection within orb",
        note: i.perfection.note,
      };
    case "reception":
      return {
        value: i.reception,
        note: i.witnesses,
      };
  }
}
