/**
 * GeoShield — the full geomantic shield pyramid.
 *
 * Verbatim from the shield composition in `Theourgia Geomancy.dc.html`
 * (lines 225-234). Five rows top→bottom:
 *
 *   1. Mothers 4-3-2-1 then Daughters 4-3-2-1 (right→left so the
 *      cascade reads outward from the centre — matching the
 *      mockup's specific ordering)
 *   2. Nieces 4-3-2-1
 *   3. Left witness, Right witness
 *   4. The Judge
 *   5. Reconciler
 *
 * Cards above the witnesses use --ink-soft dots; witnesses + judge
 * use --accent dots for emphasis. Reconciler uses --ink-soft (not
 * emphasised in the mockup).
 *
 * The shield is render-heavy and must scroll horizontally on narrow
 * viewports without widening the page — caller wraps in an
 * overflow-x:auto container.
 */

import { type CSSProperties } from "react";

import {
  type GeoFigure,
  type GeomancyShield,
  figureName,
} from "../divination/index.js";
import { GeoFigureView } from "./GeoFigureView.js";

export interface GeoShieldProps {
  shield: GeomancyShield;
  className?: string;
  style?: CSSProperties;
}

export function GeoShield({
  shield,
  className,
  style,
}: GeoShieldProps) {
  return (
    <div
      data-component="geo-shield"
      className={className}
      role="img"
      aria-label="The geomantic shield"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "center",
        minWidth: 760,
        margin: "0 auto",
        ...style,
      }}
    >
      <ShieldRow>
        <FigCard figure={shield.mothers[3]} label="Mother 4" />
        <FigCard figure={shield.mothers[2]} label="Mother 3" />
        <FigCard figure={shield.mothers[1]} label="Mother 2" />
        <FigCard figure={shield.mothers[0]} label="Mother 1" />
        <FigCard figure={shield.daughters[3]} label="Daughter 4" />
        <FigCard figure={shield.daughters[2]} label="Daughter 3" />
        <FigCard figure={shield.daughters[1]} label="Daughter 2" />
        <FigCard figure={shield.daughters[0]} label="Daughter 1" />
      </ShieldRow>

      <ShieldRow>
        <FigCard figure={shield.nieces[3]} label="Niece 4" />
        <FigCard figure={shield.nieces[2]} label="Niece 3" />
        <FigCard figure={shield.nieces[1]} label="Niece 2" />
        <FigCard figure={shield.nieces[0]} label="Niece 1" />
      </ShieldRow>

      <ShieldRow>
        <FigCard figure={shield.leftWitness} label="Left witness" accent />
        <FigCard figure={shield.rightWitness} label="Right witness" accent />
      </ShieldRow>

      <ShieldRow>
        <FigCard figure={shield.judge} label="The Judge" accent />
      </ShieldRow>

      <ShieldRow>
        <FigCard figure={shield.reconciler} label="Reconciler" />
      </ShieldRow>
    </div>
  );
}

function ShieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function FigCard({
  figure,
  label,
  accent = false,
}: {
  figure: GeoFigure;
  label: string;
  accent?: boolean;
}) {
  const name = figureName(figure) ?? "—";
  return (
    <div
      data-shield-cell
      data-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 9,
        padding: "13px 8px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        minWidth: 92,
      }}
    >
      <div
        style={{
          minHeight: 42,
          display: "flex",
          alignItems: "center",
        }}
      >
        <GeoFigureView
          figure={figure}
          color={accent ? "var(--accent)" : "var(--ink-soft)"}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13.5,
          color: "var(--ink)",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
