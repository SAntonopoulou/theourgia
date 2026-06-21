/**
 * Circle Builder — three-pane workshop for the magical circle.
 *
 * Composition tracks ``Theourgia Circle.dc.html``:
 *   Topbar  · "Circle Builder" + subtitle + "Save circle" (disabled until
 *             the circle persistence model lands).
 *   Left    · Working tradition picker (Golden Dawn / Goetic / Hellenic),
 *             Layer toggles (Names · Quarters · Pentagrams · Triangle),
 *             Dimensions.
 *   Center  · A live SVG figure built from the tradition + layer state.
 *             Faithful port of the .dc.html figure constructor.
 *   Right   · The four quarters (with elemental color bars), Great names,
 *             Implements list.
 *
 * The figure is hand-drawn per the design's procedural construction so
 * the visual matches exactly. Engine wiring (Save / Export / per-step
 * ritual recall) lands later.
 */

import { useTopbar } from "@theourgia/shared";
import { useState } from "react";

// ─── Tradition data ─────────────────────────────────────────────────────────

type Tradition = "gd" | "goetic" | "hellenic";

interface Quarter {
  dir: "East" | "South" | "West" | "North";
  element: "Air" | "Fire" | "Water" | "Earth";
  glyph: string;
  color: string;
  hebrew: string;
  name: string;
  attribution: string;
}

const TRADITION_LABEL: Record<Tradition, string> = {
  gd: "Golden Dawn",
  goetic: "Goetic",
  hellenic: "Hellenic",
};

const TRADITION_HINT: Record<Tradition, string> = {
  gd: "Hebrew names · archangelic quarters",
  goetic: "Circle & triangle of art · divine names",
  hellenic: "Greek barbarous names · the four winds",
};

const QUARTERS: Record<Tradition, Quarter[]> = {
  gd: [
    {
      dir: "East",
      element: "Air",
      glyph: "🜁",
      color: "var(--air)",
      hebrew: "רפאל",
      name: "Raphael",
      attribution: "Archangel of Air · the rushing wind",
    },
    {
      dir: "South",
      element: "Fire",
      glyph: "🜂",
      color: "var(--fire)",
      hebrew: "מיכאל",
      name: "Michael",
      attribution: "Archangel of Fire · the flaming sword",
    },
    {
      dir: "West",
      element: "Water",
      glyph: "🜄",
      color: "var(--water)",
      hebrew: "גבריאל",
      name: "Gabriel",
      attribution: "Archangel of Water · the deep",
    },
    {
      dir: "North",
      element: "Earth",
      glyph: "🜃",
      color: "var(--earth)",
      hebrew: "אוריאל",
      name: "Auriel",
      attribution: "Archangel of Earth · the silent ground",
    },
  ],
  goetic: [
    {
      dir: "East",
      element: "Air",
      glyph: "🜁",
      color: "var(--air)",
      hebrew: "יהוה",
      name: "Tetragrammaton",
      attribution: "Bound by the ineffable name",
    },
    {
      dir: "South",
      element: "Fire",
      glyph: "🜂",
      color: "var(--fire)",
      hebrew: "אדני",
      name: "Adonai",
      attribution: "The Lord, against the spirit",
    },
    {
      dir: "West",
      element: "Water",
      glyph: "🜄",
      color: "var(--water)",
      hebrew: "אלהים",
      name: "Elohim",
      attribution: "The powers, sealing the round",
    },
    {
      dir: "North",
      element: "Earth",
      glyph: "🜃",
      color: "var(--earth)",
      hebrew: "אהיה",
      name: "Eheieh",
      attribution: "I am that I am, at the foundation",
    },
  ],
  hellenic: [
    {
      dir: "East",
      element: "Air",
      glyph: "🜁",
      color: "var(--air)",
      hebrew: "",
      name: "Euros",
      attribution: "Anemos of the East · ΙΑΩ",
    },
    {
      dir: "South",
      element: "Fire",
      glyph: "🜂",
      color: "var(--fire)",
      hebrew: "",
      name: "Notos",
      attribution: "Anemos of the South · ΣΑΒΑΩΘ",
    },
    {
      dir: "West",
      element: "Water",
      glyph: "🜄",
      color: "var(--water)",
      hebrew: "",
      name: "Zephyros",
      attribution: "Anemos of the West · ΑΔΩΝΑΙ",
    },
    {
      dir: "North",
      element: "Earth",
      glyph: "🜃",
      color: "var(--earth)",
      hebrew: "",
      name: "Boreas",
      attribution: "Anemos of the North · ΑΒΡΑΞΑΣ",
    },
  ],
};

const GREAT_NAMES: Record<Tradition, { he: string; tr: string }[]> = {
  gd: [
    { he: "יהוה", tr: "Tetragrammaton" },
    { he: "אדני", tr: "Adonai" },
    { he: "אהיה", tr: "Eheieh" },
    { he: "אגלא", tr: "Agla" },
  ],
  goetic: [
    { he: "אל", tr: "El" },
    { he: "אלהים", tr: "Elohim" },
    { he: "שדי", tr: "Shaddai" },
    { he: "צבאות", tr: "Tzabaoth" },
  ],
  hellenic: [
    { he: "", tr: "ΙΑΩ" },
    { he: "", tr: "ΣΑΒΑΩΘ" },
    { he: "", tr: "ΑΒΡΑΞΑΣ" },
    { he: "", tr: "ΑΔΩΝΑΙ" },
  ],
};

const RING_TEXT: Record<Tradition, string> = {
  gd: "יהוה · אדני · אהיה · אגלא · ",
  goetic: "EL · ELOHIM · SHADDAI · TZABAOTH · ",
  hellenic: "ΙΑΩ · ΣΑΒΑΩΘ · ΑΒΡΑΞΑΣ · ΑΔΩΝΑΙ · ",
};

interface Layers {
  names: boolean;
  quarters: boolean;
  pentagrams: boolean;
  triangle: boolean;
}

// ─── Circle figure ──────────────────────────────────────────────────────────

function pentagram(cx: number, cy: number, r: number): string {
  let d = "";
  for (let k = 0; k < 5; k += 1) {
    const a = ((-90 + k * 144) * Math.PI) / 180;
    d += `${k ? "L" : "M"}${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r} `;
  }
  return `${d}Z`;
}

function hexagram(cx: number, cy: number, r: number): string {
  const up: [number, number][] = [];
  const dn: [number, number][] = [];
  for (let k = 0; k < 3; k += 1) {
    const a1 = ((-90 + k * 120) * Math.PI) / 180;
    const a2 = ((-30 + k * 120) * Math.PI) / 180;
    up.push([cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]);
    dn.push([cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]);
  }
  const toP = (a: [number, number][]) =>
    `M${a.map((p, i) => `${i ? "L" : ""}${p[0]} ${p[1]}`).join(" ")}Z`;
  return `${toP(up)} ${toP(dn)}`;
}

function CircleFigure({
  tradition,
  layers,
}: {
  tradition: Tradition;
  layers: Layers;
}) {
  const C = 280;
  const ROUT = 268;
  const R2 = 250;
  const RNAME = 232;
  const RIN = 214;
  const qs = QUARTERS[tradition];
  const vbTop = layers.triangle ? -110 : -10;
  const dirs: { a: number; q: Quarter }[] = [
    { a: -90, q: qs[0] as Quarter },
    { a: 0, q: qs[1] as Quarter },
    { a: 90, q: qs[2] as Quarter },
    { a: 180, q: qs[3] as Quarter },
  ];

  return (
    <svg
      viewBox={`0 ${vbTop} 560 ${560 - vbTop}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`${TRADITION_LABEL[tradition]} magical circle`}
    >
      <title>{TRADITION_LABEL[tradition]} magical circle</title>

      {/* ground glow */}
      <circle cx={C} cy={C} r={ROUT} fill="var(--bg-sunk)" />
      {/* double boundary */}
      <circle cx={C} cy={C} r={ROUT} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
      <circle
        cx={C}
        cy={C}
        r={R2}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        opacity={0.8}
      />
      <circle cx={C} cy={C} r={RIN} fill="none" stroke="var(--line-2)" strokeWidth="1" />

      {/* names of power around the band */}
      {layers.names ? (
        <>
          <defs>
            <path
              id="cring"
              d={`M ${C},${C - RNAME} A ${RNAME},${RNAME} 0 1,1 ${C - 0.01},${C - RNAME}`}
              fill="none"
            />
          </defs>
          <text
            fill="var(--accent)"
            style={{
              fontFamily:
                tradition === "hellenic"
                  ? "var(--font-display, var(--font-serif))"
                  : "var(--font-hebrew, var(--font-serif))",
              fontSize: 15,
            }}
          >
            <textPath href="#cring" textLength={1458} lengthAdjust="spacing">
              {RING_TEXT[tradition].repeat(3)}
            </textPath>
          </text>
        </>
      ) : null}

      {/* quarter axes + sigils */}
      {layers.quarters
        ? dirs.map((d) => {
            const rad = (d.a * Math.PI) / 180;
            const x1 = C + Math.cos(rad) * 40;
            const y1 = C + Math.sin(rad) * 40;
            const x2 = C + Math.cos(rad) * RIN;
            const y2 = C + Math.sin(rad) * RIN;
            const gx = C + Math.cos(rad) * (RIN - 26);
            const gy = C + Math.sin(rad) * (RIN - 26);
            const lx = C + Math.cos(rad) * (RIN - 74);
            const ly = C + Math.sin(rad) * (RIN - 74);
            return (
              <g key={`quarter-${d.q.dir}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={d.q.color}
                  strokeWidth="1"
                  opacity={0.5}
                  strokeDasharray="2 5"
                />
                <circle
                  cx={gx}
                  cy={gy}
                  r={18}
                  fill="var(--bg-2)"
                  stroke={d.q.color}
                  strokeWidth="1.2"
                />
                <text
                  x={gx}
                  y={gy + 7}
                  textAnchor="middle"
                  fill={d.q.color}
                  style={{
                    fontFamily: "var(--font-glyph, var(--font-serif))",
                    fontSize: 19,
                  }}
                >
                  {d.q.glyph}
                </text>
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  fill="var(--ink-soft)"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  }}
                >
                  {d.q.dir}
                </text>
              </g>
            );
          })
        : null}

      {/* warding pentagrams at the quarters */}
      {layers.pentagrams
        ? [-90, 0, 90, 180].map((a) => {
            const rad = (a * Math.PI) / 180;
            const px = C + Math.cos(rad) * ((R2 + ROUT) / 2);
            const py = C + Math.sin(rad) * ((R2 + ROUT) / 2);
            return (
              <path
                key={`pent-${a}`}
                d={pentagram(px, py, 8)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeLinejoin="round"
                opacity={0.92}
              />
            );
          })
        : null}

      {/* central hexagram + seal */}
      <path
        d={hexagram(C, C, 34)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        opacity={0.55}
      />
      <circle cx={C} cy={C} r={7} fill="none" stroke="var(--accent)" strokeWidth="1.2" />

      {/* triangle of art (outside, East/top) */}
      {layers.triangle
        ? (() => {
            const tcx = C;
            const tcy = C - ROUT - 46;
            const ts = 58;
            const a: [number, number][] = [
              [tcx, tcy - ts],
              [tcx - ts * 0.87, tcy + ts * 0.5],
              [tcx + ts * 0.87, tcy + ts * 0.5],
            ];
            const d = `M${a.map((p, i) => `${i ? "L" : ""}${p[0]} ${p[1]}`).join(" ")}Z`;
            return (
              <>
                <path d={d} fill="var(--bg-sunk)" stroke="var(--accent)" strokeWidth="1.4" />
                <circle
                  cx={tcx}
                  cy={tcy + 4}
                  r={20}
                  fill="none"
                  stroke="var(--line-2)"
                  strokeWidth="1"
                />
                <text
                  x={tcx}
                  y={tcy + 10}
                  textAnchor="middle"
                  fill="var(--ink-soft)"
                  style={{
                    fontFamily: "var(--font-glyph, var(--font-serif))",
                    fontSize: 18,
                  }}
                >
                  ▽
                </text>
              </>
            );
          })()
        : null}
    </svg>
  );
}

// ─── Save action ───────────────────────────────────────────────────────────

function SaveCircleButton() {
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
      title="Save lights up with the circle persistence model."
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
      Save circle
    </button>
  );
}

// ─── Left pane: tradition + layers ──────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function LeftPane({
  tradition,
  setTradition,
  layers,
  toggleLayer,
}: {
  tradition: Tradition;
  setTradition: (t: Tradition) => void;
  layers: Layers;
  toggleLayer: (key: keyof Layers) => void;
}) {
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
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Working</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 26 }}>
        {(Object.keys(TRADITION_LABEL) as Tradition[]).map((t) => {
          const selected = t === tradition;
          return (
            <button
              key={t}
              type="button"
              data-tradition
              aria-pressed={selected}
              onClick={() => setTradition(t)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "12px 14px",
                border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
                borderRadius: "var(--r-md, 8px)",
                background: selected ? "var(--accent-soft)" : "var(--bg)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 16,
                  color: "var(--ink)",
                }}
              >
                {TRADITION_LABEL[t]}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                {TRADITION_HINT[t]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>Layers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(
          [
            ["names", "Names of power"],
            ["quarters", "Quarters & elements"],
            ["pentagrams", "Warding pentagrams"],
            ["triangle", "Triangle of art"],
          ] as [keyof Layers, string][]
        ).map(([key, label]) => {
          const on = layers[key];
          return (
            <button
              key={key}
              type="button"
              data-layer
              aria-pressed={on}
              onClick={() => toggleLayer(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 12px",
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "var(--r-md, 8px)",
                background: on ? "var(--accent-soft)" : "var(--bg)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: "1px solid var(--line-2)",
                  flex: "none",
                  background: on ? "var(--accent)" : "transparent",
                }}
                aria-hidden="true"
              />
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, margin: "24px 0 11px" }}>Dimensions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Diameter
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink)" }}>
            9 ft
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
            Orientation
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)" }}>
            East at top
          </span>
        </div>
      </div>
    </aside>
  );
}

// ─── Right pane: quarters + names + implements ──────────────────────────────

function RightPane({ tradition }: { tradition: Tradition }) {
  const qs = QUARTERS[tradition];
  const names = GREAT_NAMES[tradition];

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
      <div style={{ ...sectionLabel, marginBottom: 13 }}>The four quarters</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {qs.map((q) => (
          <div
            key={q.dir}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "13px 14px",
              border: "1px solid var(--line)",
              borderLeft: `3px solid ${q.color}`,
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph, var(--font-serif))",
                color: q.color,
                fontSize: 20,
                flex: "none",
                width: 22,
                textAlign: "center",
                marginTop: 1,
              }}
            >
              {q.glyph}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display, var(--font-serif))",
                    fontSize: 16,
                    color: "var(--ink)",
                  }}
                >
                  {q.dir}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {q.element}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {q.hebrew ? (
                  <span
                    lang="he"
                    dir="rtl"
                    style={{
                      fontFamily: "var(--font-hebrew, var(--font-serif))",
                      fontSize: 16,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {q.hebrew}
                  </span>
                ) : null}
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {q.name}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginTop: 2,
                }}
              >
                {q.attribution}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>The names about the round</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 24 }}>
        {names.map((n) => (
          <span
            key={n.tr}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 11px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-pill, 999px)",
            }}
          >
            {n.he ? (
              <span
                lang="he"
                dir="rtl"
                style={{
                  fontFamily: "var(--font-hebrew, var(--font-serif))",
                  fontSize: 14,
                  color: "var(--accent)",
                }}
              >
                {n.he}
              </span>
            ) : null}
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              {n.tr}
            </span>
          </span>
        ))}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 11 }}>Implements</div>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        {[
          { label: "Dagger — at the East", path: "M12 3v13M9 6l3-3 3 3M9 19h6" },
          {
            label: "Wand & lamp — at the South",
            path: "M12 3c1.4 1.6 2.3 3 2.3 4.5a2.3 2.3 0 0 1-4.6 0C9.7 6 10.6 4.6 12 3zM10 21h4M12 9v12",
          },
          { label: "Cup — at the West", path: "M6 8h12l-1.5 11h-9zM6 8c0-3 12-3 12 0" },
          { label: "Pentacle — at the North", path: "M12 4v16M4 12h16" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 14px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-mute)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {row.label.startsWith("Pentacle") ? (
                <>
                  <circle cx="12" cy="12" r="8" />
                  <path d={row.path} />
                </>
              ) : (
                <path d={row.path} />
              )}
            </svg>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
                flex: 1,
              }}
            >
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function CircleBuilder() {
  const [tradition, setTradition] = useState<Tradition>("gd");
  const [layers, setLayers] = useState<Layers>({
    names: true,
    quarters: true,
    pentagrams: true,
    triangle: false,
  });

  function toggleLayer(key: keyof Layers): void {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const subtitle = `A ${TRADITION_LABEL[tradition]} circle · oriented to the East`;
  useTopbar(
    () => ({
      title: "Circle Builder",
      subtitle,
      after: <SaveCircleButton />,
    }),
    [subtitle],
  );

  const figureTitle = `${TRADITION_LABEL[tradition]} circle of art`;
  const figureNote =
    tradition === "goetic"
      ? "The operator stands within; the spirit is constrained to the triangle without. Names of God seal the round."
      : tradition === "hellenic"
        ? "The four winds at their quarters, the barbarous names of the PGM circling the round."
        : "Archangels at the four quarters, the divine names about the band, warding pentagrams at each gate.";

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
      <LeftPane
        tradition={tradition}
        setTradition={setTradition}
        layers={layers}
        toggleLayer={toggleLayer}
      />

      {/* CENTER: circle */}
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
          padding: "30px 24px",
          background: "radial-gradient(circle at 50% 40%, var(--bg-2), var(--bg) 64%)",
        }}
      >
        <div style={{ width: "min(560px, 74vh)", aspectRatio: "1 / 1", flex: "none" }}>
          <CircleFigure tradition={tradition} layers={layers} />
        </div>
        <div style={{ marginTop: 18, textAlign: "center", maxWidth: "52ch" }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              color: "var(--ink)",
            }}
          >
            {figureTitle}
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
            {figureNote}
          </p>
        </div>
      </div>

      <RightPane tradition={tradition} />
    </div>
  );
}
