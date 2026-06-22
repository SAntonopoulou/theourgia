/**
 * GeomancySurface — full composition of the Phase-06 Geomancy
 * surface.
 *
 * The H04 supplement uses this as §E "the derived-cascade trap"
 * worked example: only the four Mothers are data; everything else
 * (Daughters, Nieces, Witnesses, Judge, Reconciler, the 12 houses)
 * is a pure derivation of `deriveShield(mothers)` from B78a, called
 * on every render. Nothing derived is ever stored — a stored
 * Daughter or Judge would silently contradict the Mothers after any
 * paper-edit.
 *
 * H04 §S3.1: Carcer / Rubeus / Cauda Draconis render NEUTRAL — the
 * difficulty lives in the meaning text, never in the chrome.
 *
 * H04 gotcha: the shield is render-heavy. The frame here scrolls
 * horizontally (overflow-x:auto) so the page doesn't widen.
 */

import { type CSSProperties, useState } from "react";

import {
  type GeoFigure,
  type GeoLine,
  deriveShield,
  figureName,
  generateMothers,
} from "../divination/index.js";
import {
  DEFAULT_MOTHERS,
  GEO_METHOD_OPTIONS,
  GEOMANCY_DEFAULT_QUESTION,
  HOUSES_EYEBROW,
  HOUSES_FOOTNOTE,
  MARK_AGAIN_LABEL,
  MOTHERS_EYEBROW,
  SHIELD_EYEBROW,
} from "./copy.js";
import { GeoHouseChart } from "./GeoHouseChart.js";
import { GeoShield } from "./GeoShield.js";
import { GeoVerdict } from "./GeoVerdict.js";
import { MotherCell } from "./MotherCell.js";

export type CastingMethod = "gen" | "paper";

export interface GeomancySurfaceProps {
  /** The practitioner's question. Edit affordance fires onEditQuestion. */
  question?: string;
  onEditQuestion?: () => void;
  /** Initial four Mothers. Defaults to the mockup's demo cast. */
  initialMothers?: readonly [GeoFigure, GeoFigure, GeoFigure, GeoFigure];
  /** Initial method. Defaults to 'gen'. */
  initialMethod?: CastingMethod;
  /** Save-chart callback; the surface emits the figure name on the
   *  selected house as the title. */
  onSave?: (title: string) => void;
  /** Optional injection for tests: deterministic point generator. */
  random?: () => number;
  className?: string;
  style?: CSSProperties;
}

const METHOD_BUTTON_BASE: CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const METHOD_BUTTON_ON: CSSProperties = {
  ...METHOD_BUTTON_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export function GeomancySurface({
  question = GEOMANCY_DEFAULT_QUESTION,
  onEditQuestion,
  initialMothers = DEFAULT_MOTHERS,
  initialMethod = "gen",
  onSave,
  random = Math.random,
  className,
  style,
}: GeomancySurfaceProps) {
  const [mothers, setMothers] = useState<
    [GeoFigure, GeoFigure, GeoFigure, GeoFigure]
  >([...initialMothers] as [GeoFigure, GeoFigure, GeoFigure, GeoFigure]);
  const [method, setMethod] = useState<CastingMethod>(initialMethod);
  const [selectedHouse, setSelectedHouse] = useState(0);

  const shield = deriveShield(mothers);

  const handleCast = () => {
    setMothers(generateMothers(random));
    setSelectedHouse(0);
  };

  const handleToggleLine = (
    motherIndex: number,
    lineIndex: number,
    newValue: GeoLine,
  ) => {
    setMothers((curr) => {
      const mother = curr[motherIndex];
      if (!mother) return curr;
      const [a, b, c, d] = mother;
      const updated: GeoFigure = [
        lineIndex === 0 ? newValue : a,
        lineIndex === 1 ? newValue : b,
        lineIndex === 2 ? newValue : c,
        lineIndex === 3 ? newValue : d,
      ];
      return [
        motherIndex === 0 ? updated : curr[0],
        motherIndex === 1 ? updated : curr[1],
        motherIndex === 2 ? updated : curr[2],
        motherIndex === 3 ? updated : curr[3],
      ];
    });
  };

  const handleSave = () => {
    const judgeName = figureName(shield.judge) ?? "—";
    onSave?.(`Geomancy — ${judgeName}`);
  };

  return (
    <div
      data-component="geomancy-surface"
      data-method={method}
      className={className}
      style={style}
    >
      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 28px 60px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* Question banner */}
          <div
            data-question
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 18,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--div)",
                fontSize: 16,
                flex: "none",
              }}
            >
              ❖
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              {question}
            </span>
            {onEditQuestion ? (
              <button
                type="button"
                onClick={onEditQuestion}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  flex: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            ) : null}
          </div>

          {/* Method picker + cast / hint */}
          <div
            data-cast-controls
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div role="group" aria-label="Casting method" style={{ display: "flex", gap: 6 }}>
              {GEO_METHOD_OPTIONS.map((opt) => {
                const on = method === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={on}
                    data-method-option={opt.key}
                    onClick={() => setMethod(opt.key)}
                    style={on ? METHOD_BUTTON_ON : METHOD_BUTTON_BASE}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {method === "gen" ? (
              <>
                <button
                  type="button"
                  data-action="cast"
                  onClick={handleCast}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 18px",
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                  </svg>
                  {MARK_AGAIN_LABEL}
                </button>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  {GEO_METHOD_OPTIONS[0]!.hint}
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {GEO_METHOD_OPTIONS[1]!.hint}
              </span>
            )}
          </div>

          {/* Mothers row */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            {MOTHERS_EYEBROW}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 30,
            }}
          >
            {mothers.map((m, i) => (
              <MotherCell
                key={i}
                index={i}
                figure={m}
                editable={method === "paper"}
                onToggleLine={(li, val) => handleToggleLine(i, li, val)}
              />
            ))}
          </div>

          {/* Shield cascade */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            {SHIELD_EYEBROW}
          </div>
          <div
            data-shield-frame
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-lg)",
              background:
                "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
              padding: "26px 22px",
              marginBottom: 30,
              overflowX: "auto",
            }}
          >
            <GeoShield shield={shield} />
          </div>

          {/* 12-house chart + verdict */}
          <div
            className="geo-cols"
            style={{
              display: "flex",
              gap: 28,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: "1 1 440px", minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {HOUSES_EYEBROW}
              </div>
              <GeoHouseChart
                shield={shield}
                selectedHouse={selectedHouse}
                onSelectHouse={setSelectedHouse}
              />
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                  margin: "14px 0 0",
                }}
              >
                {HOUSES_FOOTNOTE}
              </p>
            </div>
            <GeoVerdict
              shield={shield}
              selectedHouse={selectedHouse}
              onSave={handleSave}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

