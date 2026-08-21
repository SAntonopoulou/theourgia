/**
 * ChartDetail — the traditional reading beneath the wheel.
 *
 * The phone's chart is not only a wheel: it names the sect and its light, the
 * Lots of Fortune and Spirit, the essential dignity of each of the seven, the
 * aspect grid (with aversion drawn as a finding, not a blank), the antiscia, and
 * the quarter of each house. This renders the same, all of it derived on the
 * client by :func:`readChart` from the `ChartResponse` the server already
 * returns — no extra call, and byte-for-byte the phone's doctrine.
 */

import type { CSSProperties } from "react";

import type { ChartResponse } from "../api/types.js";
import {
  ASPECT_GLYPHS,
  type DoctrineBody,
  type TraditionalPlanet,
  aspectBetween,
  planetGlyph,
  planetLabel,
  readChart,
} from "./chartDoctrine.js";

export interface ChartDetailProps {
  chart: ChartResponse;
  style?: CSSProperties;
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "0 0 8px",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "6px 12px",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "7px 12px",
  borderBottom: "1px solid var(--line)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
};

const glyph: CSSProperties = {
  fontFamily: "var(--font-glyph)",
  color: "var(--accent)",
  marginRight: 7,
};

const card: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: 16,
  background: "var(--bg-2)",
};

function planet(p: TraditionalPlanet) {
  return (
    <span>
      <span style={glyph} aria-hidden="true">
        {planetGlyph(p)}
      </span>
      {planetLabel(p)}
    </span>
  );
}

function held(labels: string[]): string {
  return labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(", ");
}

export function ChartDetail({ chart, style }: ChartDetailProps) {
  const reading = readChart(chart);
  const bodies = reading.bodies;
  const dignified = bodies.filter((b) => b.dignities);

  return (
    <div style={{ display: "grid", gap: 20, ...style }}>
      {/* Sect and lots — the frame the rest is read in. */}
      {reading.sect ? (
        <div style={card}>
          <p style={eyebrow}>The frame</p>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.6,
            }}
          >
            A <strong>{reading.sect === "diurnal" ? "diurnal" : "nocturnal"}</strong> chart — the{" "}
            {reading.sect === "diurnal" ? "Sun" : "Moon"} leads.{" "}
            {reading.greaterBenefic && reading.worseMalefic ? (
              <>
                Benefic of the sect: {planet(reading.greaterBenefic)}. Malefic to keep from:{" "}
                {planet(reading.worseMalefic)}.
              </>
            ) : null}
          </p>
          {reading.lots ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 24,
                marginTop: 12,
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
              }}
            >
              <span>
                <span style={{ color: "var(--ink-mute)" }}>Fortune</span>{" "}
                {reading.lots.fortune.degIn}{" "}
                <span style={glyph} aria-hidden="true">
                  {reading.lots.fortune.signGlyph}
                </span>
                {reading.lots.fortune.sign} · {ordinalHouse(reading.lots.fortune.house)}
              </span>
              <span>
                <span style={{ color: "var(--ink-mute)" }}>Spirit</span> {reading.lots.spirit.degIn}{" "}
                <span style={glyph} aria-hidden="true">
                  {reading.lots.spirit.signGlyph}
                </span>
                {reading.lots.spirit.sign} · {ordinalHouse(reading.lots.spirit.house)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Essential dignities of the seven. */}
      {dignified.length > 0 ? (
        <div>
          <p style={eyebrow}>Essential dignity</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460 }}>
              <thead>
                <tr>
                  <th style={th}>Body</th>
                  <th style={th}>Sign</th>
                  <th style={th}>Holds</th>
                  <th style={th}>Weakened</th>
                </tr>
              </thead>
              <tbody>
                {dignified.map((b) => (
                  <tr key={b.bodyId}>
                    <td style={{ ...td, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      <span style={glyph} aria-hidden="true">
                        {b.glyph}
                      </span>
                      {b.bodyName}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {b.degIn}{" "}
                      <span style={glyph} aria-hidden="true">
                        {b.signGlyph}
                      </span>
                      {b.sign}
                    </td>
                    <td style={td}>
                      {b.dignities && b.dignities.held.length > 0 ? (
                        held(b.dignities.held)
                      ) : b.dignities?.peregrine ? (
                        <span style={{ color: "var(--ink-mute)", fontStyle: "italic" }}>
                          peregrine
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-mute)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: b.dignities?.debilities.length
                          ? "var(--warning)"
                          : "var(--ink-mute)",
                      }}
                    >
                      {b.dignities && b.dignities.debilities.length > 0
                        ? held(b.dignities.debilities)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* The aspect grid — a triangle, with aversion drawn rather than blank. */}
      {bodies.length >= 2 ? <AspectGrid chart={chart} bodies={bodies} /> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {/* Antiscia. */}
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <p style={eyebrow}>Antiscia</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Body</th>
                  <th style={th}>Antiscion</th>
                  <th style={th}>Contra</th>
                </tr>
              </thead>
              <tbody>
                {bodies.map((b) => (
                  <tr key={b.bodyId}>
                    <td style={{ ...td, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      <span style={glyph} aria-hidden="true">
                        {b.glyph}
                      </span>
                      {b.bodyName}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {b.antiscion.degIn}{" "}
                      <span style={glyph} aria-hidden="true">
                        {b.antiscion.signGlyph}
                      </span>
                      {b.antiscion.sign}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {b.contraAntiscion.degIn}{" "}
                      <span style={glyph} aria-hidden="true">
                        {b.contraAntiscion.signGlyph}
                      </span>
                      {b.contraAntiscion.sign}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Houses and their quarters. */}
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <p style={eyebrow}>Houses</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "right" }}>House</th>
                  <th style={th}>On the cusp</th>
                  <th style={th}>Quarter</th>
                </tr>
              </thead>
              <tbody>
                {reading.houses.map((h) => (
                  <tr key={h.number}>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {h.number}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {h.degIn}{" "}
                      <span style={glyph} aria-hidden="true">
                        {h.signGlyph}
                      </span>
                      {h.sign}
                    </td>
                    <td style={{ ...td, textTransform: "capitalize" }}>{h.quarter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ordinalHouse(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]} house`;
}

/**
 * The aspect grid as a lower triangle: a configuration is symmetric, so half a
 * square is the same half twice. A blank is not missing data — it is aversion,
 * which the sources treat as a finding, so those cells are marked and the
 * caption says so.
 */
function AspectGrid({ chart, bodies }: { chart: ChartResponse; bodies: DoctrineBody[] }) {
  const cell: CSSProperties = {
    width: 34,
    height: 34,
    textAlign: "center",
    verticalAlign: "middle",
    border: "1px solid var(--line)",
    fontFamily: "var(--font-glyph)",
    fontSize: 15,
  };
  const headCell: CSSProperties = {
    ...cell,
    fontFamily: "var(--font-glyph)",
    color: "var(--accent)",
    background: "var(--bg-3, var(--bg))",
  };

  return (
    <div>
      <p style={eyebrow}>The grid</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <caption
            style={{
              captionSide: "bottom",
              textAlign: "left",
              padding: "8px 0 0",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            Each pair, once. An empty cell is aversion — the two cannot see one another.
          </caption>
          <tbody>
            {bodies.slice(1).map((rowBody, r) => (
              <tr key={rowBody.bodyId}>
                <td style={headCell} title={rowBody.bodyName} aria-hidden="true">
                  {rowBody.glyph}
                </td>
                {bodies.slice(0, r + 1).map((colBody) => {
                  const a = aspectBetween(chart.aspects, rowBody.bodyId, colBody.bodyId);
                  return (
                    <td
                      key={colBody.bodyId}
                      style={{ ...cell, color: a ? "var(--ink)" : "var(--ink-mute)" }}
                      title={
                        a
                          ? `${rowBody.bodyName} ${a.kind} ${colBody.bodyName} (orb ${a.orb.toFixed(1)}°)`
                          : `${rowBody.bodyName} averse to ${colBody.bodyName}`
                      }
                    >
                      {a ? ASPECT_GLYPHS[a.kind] : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={cell} aria-hidden="true" />
              {bodies.slice(0, bodies.length - 1).map((colBody) => (
                <td
                  key={colBody.bodyId}
                  style={headCell}
                  title={colBody.bodyName}
                  aria-hidden="true"
                >
                  {colBody.glyph}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
