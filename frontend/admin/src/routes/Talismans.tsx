/**
 * Talismans — three-pane workshop for planetary talismans.
 *
 * Composition tracks ``Theourgia Talisman.dc.html``:
 *   Topbar  · "Talismans" + per-planet subtitle + "Save talisman" (disabled
 *             until the talisman persistence model lands).
 *   Left    · Planetary virtue picker (Saturn / Jupiter / Mars), free-text
 *             Intent, Form (diameter / material / engraving).
 *   Center  · Talisman SVG figure with Obverse / Reverse face toggle.
 *   Right   · Planet header, square stats, spirits of the square, election
 *             of time, suffumigation, Export engraving.
 *
 * The square + sigil-trace + ring-text are all faithfully ported from the
 * .dc.html data tables. Persistence + the printable engraving export ship
 * in a later batch.
 */

import { useTopbar } from "@theourgia/shared";
import { useState } from "react";

// ─── Planet data ────────────────────────────────────────────────────────────

type Planet = "saturn" | "jupiter" | "mars";

interface PlanetData {
  glyph: string;
  name: string;
  epithet: string;
  metal: string;
  day: string;
  hour: string;
  moon: string;
  incense: string;
  divine: string;
  divineHe: string;
  intel: string;
  intelHe: string;
  spirit: string;
  spiritHe: string;
  ringText: string;
  sq: number[][];
  seq: number[];
}

const PLANETS: Record<Planet, PlanetData> = {
  saturn: {
    glyph: "♄",
    name: "Saturn",
    epithet: "Binding · time · limit",
    metal: "Lead",
    day: "Saturday",
    hour: "Hour of Saturn",
    moon: "Waning, in Capricorn",
    incense: "Myrrh and cypress, burned on coal at the third hour of night.",
    divine: "YHVH Elohim",
    divineHe: "יהוה אלהים",
    intel: "Agiel",
    intelHe: "אגיאל",
    spirit: "Zazel",
    spiritHe: "זאזל",
    ringText: "יהוה אלהים · AGIEL · ZAZEL · ",
    sq: [
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ],
    seq: [4, 9, 5, 1, 8, 3],
  },
  jupiter: {
    glyph: "♃",
    name: "Jupiter",
    epithet: "Increase · fortune · grace",
    metal: "Tin",
    day: "Thursday",
    hour: "Hour of Jupiter",
    moon: "Waxing, in Sagittarius",
    incense: "Cedar, nutmeg, and saffron, offered as the Moon increases.",
    divine: "El",
    divineHe: "אל",
    intel: "Iophiel",
    intelHe: "יהפיאל",
    spirit: "Hismael",
    spiritHe: "הסמאל",
    ringText: "אל · IOPHIEL · HISMAEL · QUAM DILECTA · ",
    sq: [
      [4, 14, 15, 1],
      [9, 7, 6, 12],
      [5, 11, 10, 8],
      [16, 2, 3, 13],
    ],
    seq: [4, 14, 15, 1, 12, 8, 13],
  },
  mars: {
    glyph: "♂",
    name: "Mars",
    epithet: "Force · severance · defence",
    metal: "Iron",
    day: "Tuesday",
    hour: "Hour of Mars",
    moon: "Waxing, in Aries",
    incense: "Dragon's blood and pepper, kindled swiftly at sunrise.",
    divine: "Elohim Gibor",
    divineHe: "אלהים גבור",
    intel: "Graphiel",
    intelHe: "גראפיאל",
    spirit: "Bartzabel",
    spiritHe: "ברצבאל",
    ringText: "אלהים גבור · GRAPHIEL · BARTZABEL · ",
    sq: [
      [11, 24, 7, 20, 3],
      [4, 12, 25, 8, 16],
      [17, 5, 13, 21, 9],
      [10, 18, 1, 14, 22],
      [23, 6, 19, 2, 15],
    ],
    seq: [11, 12, 13, 14, 15, 1],
  },
};

const INTENT_TEXT: Record<Planet, string> = {
  saturn: "To bind and to make firm",
  jupiter: "To draw fortune to a venture",
  mars: "To ward and to defend",
};

// ─── Talisman figure ────────────────────────────────────────────────────────

function TalismanFigure({
  planet,
  face,
}: {
  planet: Planet;
  face: "obverse" | "reverse";
}) {
  const p = PLANETS[planet];
  const N = p.sq.length;
  const C = 200;
  const ROUT = 196;
  const R2 = 184;
  const RIN = 150;
  const gridSpan = 188;
  const gx0 = C - gridSpan / 2;
  const cell = gridSpan / N;
  const ringPathD = `M ${C},${C - 170} A 170,170 0 1,1 ${C - 0.01},${C - 170}`;

  function posOf(val: number): { x: number; y: number } | null {
    for (let r = 0; r < N; r += 1) {
      const row = p.sq[r];
      if (!row) continue;
      for (let c = 0; c < N; c += 1) {
        if (row[c] === val) {
          return { x: gx0 + (c + 0.5) * cell, y: gx0 + (r + 0.5) * cell };
        }
      }
    }
    return null;
  }

  const pts = p.seq.map(posOf).filter((q): q is { x: number; y: number } => q !== null);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] ?? pts[0];
  const sigilD = pts.map((pt, i) => `${i ? "L" : "M"}${pt.x} ${pt.y}`).join(" ");

  if (face === "obverse") {
    return (
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        role="img"
        aria-label={`${p.name} talisman, obverse`}
      >
        <title>{p.name} talisman, obverse</title>
        <circle
          cx={C}
          cy={C}
          r={ROUT}
          fill="var(--bg-sunk)"
          stroke="var(--accent)"
          strokeWidth="1.4"
        />
        <circle
          cx={C}
          cy={C}
          r={R2}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.8"
          opacity={0.75}
        />
        <circle cx={C} cy={C} r={RIN} fill="none" stroke="var(--line-2)" strokeWidth="1" />
        <circle
          cx={C}
          cy={C}
          r={158}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.8"
          opacity={0.55}
        />
        <defs>
          <path id={`tring-${planet}-obv`} d={ringPathD} fill="none" />
        </defs>
        <text
          fill="var(--accent)"
          style={{
            fontFamily: "var(--font-hebrew, var(--font-serif))",
            fontSize: 12,
            letterSpacing: "2px",
          }}
        >
          <textPath href={`#tring-${planet}-obv`} textLength={1068} lengthAdjust="spacing">
            {p.ringText.repeat(4)}
          </textPath>
        </text>
        <g opacity={0.7}>
          {Array.from({ length: N - 1 }, (_, i) => {
            const o = gx0 + (i + 1) * cell;
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={o}
                  y1={gx0}
                  x2={o}
                  y2={gx0 + gridSpan}
                  stroke="var(--line)"
                  strokeWidth="0.6"
                />
                <line
                  x1={gx0}
                  y1={o}
                  x2={gx0 + gridSpan}
                  y2={o}
                  stroke="var(--line)"
                  strokeWidth="0.6"
                />
              </g>
            );
          })}
        </g>
        <g>
          {p.sq.flatMap((row, r) =>
            row.map((val, c) => (
              <text
                key={`num-${r}-${c}`}
                x={gx0 + (c + 0.5) * cell}
                y={gx0 + (r + 0.5) * cell + cell * 0.16}
                textAnchor="middle"
                fill="var(--ink-soft)"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: `${cell * 0.34}px`,
                }}
              >
                {val}
              </text>
            )),
          )}
        </g>
        {pts.length > 0 ? (
          <>
            <path
              d={sigilD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.92}
            />
            <circle
              cx={pts[0]?.x}
              cy={pts[0]?.y}
              r={5.5}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.2"
            />
            {last && prev
              ? (() => {
                  const ang = Math.atan2(last.y - prev.y, last.x - prev.x) + Math.PI / 2;
                  const bx = Math.cos(ang) * 7;
                  const by = Math.sin(ang) * 7;
                  return (
                    <line
                      x1={last.x - bx}
                      y1={last.y - by}
                      x2={last.x + bx}
                      y2={last.y + by}
                      stroke="var(--accent)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  );
                })()
              : null}
          </>
        ) : null}
      </svg>
    );
  }

  // reverse
  return (
    <svg
      viewBox="0 0 400 400"
      width="100%"
      height="100%"
      role="img"
      aria-label={`${p.name} talisman, reverse`}
    >
      <title>{p.name} talisman, reverse</title>
      <circle
        cx={C}
        cy={C}
        r={ROUT}
        fill="var(--bg-sunk)"
        stroke="var(--accent)"
        strokeWidth="1.4"
      />
      <circle
        cx={C}
        cy={C}
        r={R2}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.8"
        opacity={0.75}
      />
      <circle
        cx={C}
        cy={C}
        r={158}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.8"
        opacity={0.55}
      />
      <defs>
        <path id={`tring-${planet}-rev`} d={ringPathD} fill="none" />
      </defs>
      <text
        fill="var(--accent)"
        style={{
          fontFamily: "var(--font-hebrew, var(--font-serif))",
          fontSize: 12,
          letterSpacing: "2px",
        }}
      >
        <textPath href={`#tring-${planet}-rev`} textLength={1068} lengthAdjust="spacing">
          {`${p.intelHe} · ${p.intel.toUpperCase()} · `.repeat(5)}
        </textPath>
      </text>
      <circle cx={C} cy={C} r={96} fill="none" stroke="var(--line-2)" strokeWidth="1" />
      <circle cx={C} cy={C} r={84} fill="none" stroke="var(--line)" strokeWidth="0.8" />
      <text
        x={C}
        y={C + 34}
        textAnchor="middle"
        fill="var(--accent)"
        style={{
          fontFamily: "var(--font-glyph, var(--font-serif))",
          fontSize: 104,
        }}
      >
        {p.glyph}
      </text>
      {[
        [C, C - 120],
        [C, C + 120],
        [C - 120, C],
        [C + 120, C],
      ].map((pt) => (
        <circle
          key={`cardinal-${pt[0]}-${pt[1]}`}
          cx={pt[0]}
          cy={pt[1]}
          r={2.4}
          fill="var(--accent)"
        />
      ))}
    </svg>
  );
}

// ─── Topbar action ──────────────────────────────────────────────────────────

function SaveTalismanButton() {
  return (
    <button
      type="button"
      disabled
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent)",
        color: "var(--accent-ink, white)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "not-allowed",
        opacity: 0.7,
      }}
      title="Save lights up with the talisman persistence model."
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 4h11l3 3v13H5zM8 4v5h7M9 20v-5h6v5" />
      </svg>
      Save talisman
    </button>
  );
}

// ─── Left pane ──────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function LeftPane({
  planet,
  setPlanet,
}: {
  planet: Planet;
  setPlanet: (p: Planet) => void;
}) {
  const p = PLANETS[planet];
  return (
    <aside
      className="scroll"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: 20,
      }}
    >
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Planetary virtue</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 26 }}>
        {(Object.keys(PLANETS) as Planet[]).map((key) => {
          const data = PLANETS[key];
          const selected = key === planet;
          return (
            <button
              key={key}
              type="button"
              data-planet
              aria-pressed={selected}
              onClick={() => setPlanet(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 13px",
                border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
                borderRadius: "var(--r-md, 8px)",
                background: selected ? "var(--accent-soft)" : "var(--bg)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-glyph, var(--font-serif))",
                  color: "var(--accent)",
                  fontSize: 20,
                  flex: "none",
                  width: 24,
                  textAlign: "center",
                }}
              >
                {data.glyph}
              </span>
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-display, var(--font-serif))",
                    fontSize: 16,
                    color: "var(--ink)",
                  }}
                >
                  {data.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {data.epithet}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 9 }}>Intent</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 12px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          marginBottom: 24,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-mute)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flex: "none" }}
          aria-hidden="true"
        >
          <path d="M12 3v18M5 8l7-5 7 5" />
        </svg>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink)" }}>
          {INTENT_TEXT[planet]}
        </span>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 9 }}>Form</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Diameter
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink)" }}>
            2.25 in
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Material
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)" }}>
            {p.metal}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Engraving
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)" }}>
            Both faces
          </span>
        </div>
      </div>
    </aside>
  );
}

// ─── Right pane ─────────────────────────────────────────────────────────────

function RightPane({ planet }: { planet: Planet }) {
  const p = PLANETS[planet];
  const N = p.sq.length;
  const magic = (N * (N * N + 1)) / 2;
  const total = (N * N * (N * N + 1)) / 2;

  return (
    <aside
      className="scroll"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        borderLeft: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-glyph, var(--font-serif))",
            color: "var(--accent)",
            fontSize: 22,
            flex: "none",
          }}
        >
          {p.glyph}
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              lineHeight: 1.1,
            }}
          >
            {p.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {p.epithet}
          </div>
        </div>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>The square</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Kamea order
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>
            {N} × {N}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Magic constant
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
            {magic}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Sum of all
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>
            {total}
          </span>
        </div>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>Spirits of the square</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 22 }}>
        {[
          { he: p.divineHe, name: p.divine, role: "Divine name · the ring", emphasize: true },
          { he: p.intelHe, name: p.intel, role: "Intelligence · the good", emphasize: false },
          { he: p.spiritHe, name: p.spirit, role: "Spirit · the force", emphasize: false },
        ].map((s) => (
          <div
            key={s.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 13px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg)",
            }}
          >
            <span
              lang="he"
              dir="rtl"
              style={{
                fontFamily: "var(--font-hebrew, var(--font-serif))",
                fontSize: 19,
                color: s.emphasize ? "var(--accent)" : "var(--ink-soft)",
                flex: "none",
              }}
            >
              {s.he}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 15,
                  color: "var(--ink)",
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {s.role}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>Election of time</div>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          overflow: "hidden",
          marginBottom: 22,
        }}
      >
        {[
          ["Day", p.day],
          ["Hour", p.hour],
          ["Moon", p.moon],
        ].map(([label, value], i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 13px",
              borderBottom: i < 2 ? "1px solid var(--line)" : "none",
            }}
          >
            <span
              style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-soft)" }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 14.5,
                color: "var(--ink)",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 9 }}>Suffumigation</div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "var(--ink-soft)",
          margin: "0 0 18px",
        }}
      >
        {p.incense}
      </p>

      <button
        type="button"
        disabled
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 10,
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          background: "transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-mute)",
          cursor: "not-allowed",
        }}
        title="Engraving export ships with the print pipeline."
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
        </svg>
        Export engraving file
      </button>
    </aside>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Talismans() {
  const [planet, setPlanet] = useState<Planet>("jupiter");
  const [face, setFace] = useState<"obverse" | "reverse">("obverse");
  const p = PLANETS[planet];

  const subtitle = `A ${p.name} talisman · drawn in the ${p.hour}`;
  useTopbar(
    () => ({
      title: "Talismans",
      subtitle,
      after: <SaveTalismanButton />,
    }),
    [subtitle],
  );

  const faceTitle =
    face === "obverse" ? "Obverse — the square & seal" : "Reverse — the planetary character";
  const faceNote =
    face === "obverse"
      ? `The kamea of ${p.name}, the divine name about the ring, and the sigil of the Intelligence traced upon the numbers.`
      : `The character of ${p.name} at the centre, girt by the name of the Intelligence ${p.intel}.`;

  const faceToggleStyle = (selected: boolean): React.CSSProperties => ({
    padding: "7px 18px",
    border: "1px solid transparent",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: selected ? "var(--ink)" : "var(--ink-mute)",
    background: selected ? "var(--accent-soft)" : "transparent",
    cursor: "pointer",
  });

  return (
    <div
      style={{
        margin: "0 -28px",
        display: "grid",
        gridTemplateColumns: "264px 1fr 288px",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <LeftPane planet={planet} setPlanet={setPlanet} />

      {/* CENTER: talisman */}
      <div
        className="scroll"
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "34px 24px",
          background: "radial-gradient(circle at 50% 34%, var(--bg-2), var(--bg) 62%)",
        }}
      >
        <div style={{ width: "min(440px, 68vh)", aspectRatio: "1 / 1", flex: "none" }}>
          <TalismanFigure planet={planet} face={face} />
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 3,
            padding: 3,
            border: "1px solid var(--line)",
            borderRadius: 999,
            background: "var(--bg-2)",
          }}
          role="group"
          aria-label="Talisman face"
        >
          <button
            type="button"
            data-face
            aria-pressed={face === "obverse"}
            onClick={() => setFace("obverse")}
            style={faceToggleStyle(face === "obverse")}
          >
            Obverse
          </button>
          <button
            type="button"
            data-face
            aria-pressed={face === "reverse"}
            onClick={() => setFace("reverse")}
            style={faceToggleStyle(face === "reverse")}
          >
            Reverse
          </button>
        </div>

        <div style={{ marginTop: 16, textAlign: "center", maxWidth: "46ch" }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              color: "var(--ink)",
            }}
          >
            {faceTitle}
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--ink-mute)",
              margin: "6px 0 0",
            }}
          >
            {faceNote}
          </p>
        </div>
      </div>

      <RightPane planet={planet} />
    </div>
  );
}
