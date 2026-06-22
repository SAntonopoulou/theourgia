/**
 * GeoVerdict — right-side aside showing the read figure + meaning.
 *
 * Verbatim from `Theourgia Geomancy.dc.html` lines 136-151. Displays
 * the selected house's figure (name + meaning + attribution), a
 * three-column witnesses/reconciler summary, and the Save button.
 *
 * The figure name uses --accent, NOT a difficulty colour — per
 * §S3.1 even Carcer/Rubeus/Cauda Draconis render neutral.
 */

import { type CSSProperties } from "react";

import {
  type GeoFigure,
  type GeomancyShield,
  GEO_ATTRIBUTIONS,
  GEO_MEANINGS,
  figureName,
} from "../divination/index.js";
import {
  HOUSE_NUMERALS,
  HOUSE_TOPICS,
  LEFT_WITNESS_LABEL,
  RECONCILER_LABEL,
  RIGHT_WITNESS_LABEL,
  SAVE_CHART_LABEL,
} from "./copy.js";
import { GeoFigureView } from "./GeoFigureView.js";

export interface GeoVerdictProps {
  shield: GeomancyShield;
  selectedHouse: number;
  onSave?: () => void;
  className?: string;
  style?: CSSProperties;
}

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const SMALL_EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 4,
};

export function GeoVerdict({
  shield,
  selectedHouse,
  onSave,
  className,
  style,
}: GeoVerdictProps) {
  const figure = shield.houses[selectedHouse] as GeoFigure;
  const name = figureName(figure) ?? "—";
  const meaning = name in GEO_MEANINGS ? GEO_MEANINGS[name as keyof typeof GEO_MEANINGS] : "";
  const sub =
    name in GEO_ATTRIBUTIONS ? GEO_ATTRIBUTIONS[name as keyof typeof GEO_ATTRIBUTIONS] : "";
  const numeral = HOUSE_NUMERALS[selectedHouse] ?? "";
  const topic = HOUSE_TOPICS[selectedHouse] ?? "";

  const rwName = figureName(shield.rightWitness) ?? "—";
  const lwName = figureName(shield.leftWitness) ?? "—";
  const recName = figureName(shield.reconciler) ?? "—";

  return (
    <aside
      data-component="geo-verdict"
      className={className}
      style={{
        flex: "none",
        width: 340,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        padding: 22,
        alignSelf: "stretch",
        ...style,
      }}
    >
      <div style={EYEBROW}>
        House {numeral} · {topic}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ flex: "none" }}>
          <GeoFigureView figure={figure} color="var(--accent)" />
        </div>
        <div>
          <div
            data-figure-name
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              lineHeight: 1.05,
              color: "var(--accent)",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {sub}
          </div>
        </div>
      </div>
      <p
        data-meaning
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
          margin: "0 0 18px",
        }}
      >
        {meaning}
      </p>

      {/* Witnesses / Judge / Reconciler row */}
      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "14px 0",
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--line)",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={SMALL_EYEBROW}>{RIGHT_WITNESS_LABEL}</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
            }}
          >
            {rwName}
          </div>
        </div>
        <div>
          <div style={SMALL_EYEBROW}>{LEFT_WITNESS_LABEL}</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
            }}
          >
            {lwName}
          </div>
        </div>
        <div>
          <div style={SMALL_EYEBROW}>{RECONCILER_LABEL}</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
            }}
          >
            {recName}
          </div>
        </div>
      </div>

      <button
        type="button"
        data-action="save"
        onClick={onSave}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
        </svg>
        {SAVE_CHART_LABEL}
      </button>
    </aside>
  );
}
