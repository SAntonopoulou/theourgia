/**
 * ChartDetail — the traditional reading beneath the wheel.
 *
 * The phone's chart is not only a wheel: it names the sect and its light, the
 * Lots of Fortune and Spirit, the essential dignity of each of the seven, the
 * aspect grid (with aversion drawn as a finding, not a blank), the antiscia,
 * and the quarter of each house. The judgment — sect, lots, dignities — comes
 * from ``GET /astro/chart/doctrine``, computed by the backend's hellenistic
 * engine under the practitioner's own ``astro.doctrine`` choices (#126). Only
 * presentation and single-answer arithmetic (antiscia, house quarters) stay
 * on the client.
 */

import type { CSSProperties } from "react";

import type { ChartDoctrineResponse, ChartResponse } from "../api/types.js";
import {
  ASPECT_GLYPHS,
  type DoctrinePoint,
  type TraditionalPlanet,
  antiscion,
  asTraditional,
  aspectBetween,
  contraAntiscion,
  formatDegInSign,
  houseQuarter,
  planetGlyph,
  planetLabel,
  pointAt,
  signGlyphOf,
  signNameOf,
} from "./chartFormat.js";

export interface ChartDetailProps {
  chart: ChartResponse;
  /** The server-derived reading. Absent while it is still being fetched. */
  doctrine?: ChartDoctrineResponse | null;
  /** The reading lags the chart (mid-scrub) — dim it rather than tear it. */
  doctrineStale?: boolean;
  style?: CSSProperties;
}

/** A placement dressed for the tables below. */
interface PresentedBody {
  bodyId: string;
  bodyName: string;
  glyph: string;
  degIn: string;
  sign: string;
  signGlyph: string;
  antiscion: DoctrinePoint;
  contraAntiscion: DoctrinePoint;
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

function planetById(bodyId: string) {
  const p = asTraditional(bodyId);
  return p ? planet(p) : <span>{bodyId}</span>;
}

function held(labels: string[]): string {
  return labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(", ");
}

export function ChartDetail({ chart, doctrine, doctrineStale, style }: ChartDetailProps) {
  const cusps = chart.houses.cusps;

  const bodies: PresentedBody[] = chart.placements.map((p) => ({
    bodyId: p.body_id,
    bodyName: p.body_name,
    glyph: p.glyph,
    degIn: formatDegInSign(p.tropical_longitude),
    sign: signNameOf(p.tropical_longitude),
    signGlyph: signGlyphOf(p.tropical_longitude),
    antiscion: pointAt(antiscion(p.tropical_longitude), cusps),
    contraAntiscion: pointAt(contraAntiscion(p.tropical_longitude), cusps),
  }));
  const bodyById = new Map(bodies.map((b) => [b.bodyId, b]));

  const fortune = doctrine?.lots.find((l) => l.id === "fortune") ?? null;
  const spirit = doctrine?.lots.find((l) => l.id === "spirit") ?? null;
  const dignityRows = doctrine?.dignities ?? [];

  // The judgment sections dim while the reading lags the wheel mid-scrub.
  const judged: CSSProperties = doctrineStale
    ? { opacity: 0.55, transition: "opacity 0.2s" }
    : { transition: "opacity 0.2s" };

  return (
    <div style={{ display: "grid", gap: 20, ...style }}>
      {/* Sect and lots — the frame the rest is read in. Server-derived. */}
      {doctrine ? (
        <div style={{ ...card, ...judged }}>
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
            A <strong>{doctrine.sect.sect === "diurnal" ? "diurnal" : "nocturnal"}</strong> chart —
            the {doctrine.sect.sect === "diurnal" ? "Sun" : "Moon"} leads. Benefic of the sect:{" "}
            {planetById(doctrine.sect.benefic)}. Malefic to keep from:{" "}
            {planetById(doctrine.sect.malefic_contrary)}.
          </p>
          {doctrine.sect.is_borderline ? (
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              The Sun stands within a degree of the horizon, so the determination is delicate — no
              ancient source resolves this case, and a few minutes of birth time would turn it.
            </p>
          ) : null}
          {fortune && spirit ? (
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
              {[
                { label: "Fortune", point: pointAt(fortune.longitude, cusps) },
                { label: "Spirit", point: pointAt(spirit.longitude, cusps) },
              ].map(({ label, point }) => (
                <span key={label}>
                  <span style={{ color: "var(--ink-mute)" }}>{label}</span> {point.degIn}{" "}
                  <span style={glyph} aria-hidden="true">
                    {point.signGlyph}
                  </span>
                  {point.sign} · {ordinalHouse(point.house)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Essential dignities of the seven — the engine's judgment. */}
      {dignityRows.length > 0 ? (
        <div style={judged}>
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
                {dignityRows.map((d) => {
                  const b = bodyById.get(d.body_id);
                  return (
                    <tr key={d.body_id}>
                      <td style={{ ...td, color: "var(--ink)", whiteSpace: "nowrap" }}>
                        {b ? (
                          <>
                            <span style={glyph} aria-hidden="true">
                              {b.glyph}
                            </span>
                            {b.bodyName}
                          </>
                        ) : (
                          planetById(d.body_id)
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {b ? (
                          <>
                            {b.degIn}{" "}
                            <span style={glyph} aria-hidden="true">
                              {b.signGlyph}
                            </span>
                            {b.sign}
                          </>
                        ) : (
                          d.sign
                        )}
                      </td>
                      <td style={td}>
                        {d.held.length > 0 ? (
                          held(d.held)
                        ) : d.peregrine ? (
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
                          color: d.debilities.length ? "var(--warning)" : "var(--ink-mute)",
                        }}
                      >
                        {d.debilities.length > 0 ? held(d.debilities) : "—"}
                      </td>
                    </tr>
                  );
                })}
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
                {cusps.slice(0, 12).map((cusp, i) => (
                  <tr key={`h${i + 1}`}>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {i + 1}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {formatDegInSign(cusp)}{" "}
                      <span style={glyph} aria-hidden="true">
                        {signGlyphOf(cusp)}
                      </span>
                      {signNameOf(cusp)}
                    </td>
                    <td style={{ ...td, textTransform: "capitalize" }}>{houseQuarter(i + 1)}</td>
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
function AspectGrid({ chart, bodies }: { chart: ChartResponse; bodies: PresentedBody[] }) {
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
