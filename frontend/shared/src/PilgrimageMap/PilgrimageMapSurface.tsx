/**
 * PilgrimageMapSurface — H07 §S3 surface 18.
 *
 * A stylised offline-tile map of practice places. Per H07 §S6.3
 * the surface intentionally uses an SVG stand-in instead of
 * real OSM tiles — the precision-quantize, sealed-exclusion,
 * and `‡` Nominatim-attribution behaviours ARE the spec; the
 * Leaflet wiring lands later (and stays optional even then).
 *
 * Honesty + H07 rules wired:
 *   • Sealed sites are NEVER plotted on the map. They surface as a
 *     count badge on the map ("+N" in --seal/--seal-soft) and as a
 *     single dashed --seal-border row at the bottom of the site
 *     rail. Same count-only treatment as Media Library sealed card.
 *   • The precision selector quantizes ALL pins to the chosen level
 *     ("Show all as recorded" → exact, then 1km / 10km / country /
 *      "Hide map entirely"). Practitioner's choice; the map cannot
 *     hide more than the recorded precision but can always lower.
 *   • The `‡` glyph attribution is verbatim from the .dc.html:
 *     "Map tiles © OpenStreetMap · your viewport is visible to OSM".
 *     Quiet copy — observational, not a warning.
 *   • Place colours come from the `--map-{sacred,ancestral,working,
 *     pilgrimage,other}` palette — never --danger.
 *   • Add Place CTA opens the Add Place modal (surface 20).
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SiteKind =
  | "sacred"
  | "ancestral"
  | "working"
  | "pilgrimage"
  | "other";

export type PrecisionLevel =
  | "exact"
  | "1km"
  | "10km"
  | "country"
  | "hidden";

export const PRECISION_LABELS: Record<PrecisionLevel, string> = {
  exact: "Show all as recorded",
  "1km": "Quantize all to ~1 km",
  "10km": "Quantize all to ~10 km",
  country: "Quantize all to country",
  hidden: "Hide map entirely",
};

export const SITE_COLOR_TOKEN: Record<SiteKind, string> = {
  sacred: "var(--map-sacred)",
  ancestral: "var(--map-ancestral)",
  working: "var(--map-working)",
  pilgrimage: "var(--map-pilgrimage)",
  other: "var(--map-other)",
};

const SITE_KIND_LABEL: Record<SiteKind, string> = {
  sacred: "Sacred site",
  ancestral: "Ancestral",
  working: "Place of working",
  pilgrimage: "Pilgrimage",
  other: "Other",
};

export interface PilgrimageSite {
  id: string;
  name: string;
  kind: SiteKind;
  /** 0..1 SVG coords for the stand-in map. Real lat/lng arrives
   *  with the optional Leaflet wiring. */
  x_norm: number;
  y_norm: number;
  /** Per-site precision as recorded by the practitioner. */
  recorded_precision: PrecisionLevel;
  sealed: boolean;
}

export interface PilgrimageMapSurfaceProps {
  sites: readonly PilgrimageSite[];
  /** Sealed sites are NEVER passed in the `sites` list. The count is
   *  surfaced separately so the surface can render the badge + rail
   *  row without leaking plaintext. */
  sealed_count: number;
  /** Initial map-wide precision floor. Defaults to "exact" — pins
   *  render at their recorded precision. */
  initial_precision?: PrecisionLevel;
  onSelectSite?: (id: string) => void;
  onAddPlace?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Quantize helper ───────────────────────────────────────────────
//
// The map can only LOWER precision (per H07 §S6.3 rule). If a site
// was recorded at country-level precision, the practitioner cannot
// "re-quantize all to 1km" and reveal more — the quantize floor for
// each pin is the most precise it can render at.

const PRECISION_ORDER: PrecisionLevel[] = [
  "exact",
  "1km",
  "10km",
  "country",
  "hidden",
];

function effectivePrecision(
  site_recorded: PrecisionLevel,
  global_floor: PrecisionLevel,
): PrecisionLevel {
  const a = PRECISION_ORDER.indexOf(site_recorded);
  const b = PRECISION_ORDER.indexOf(global_floor);
  return PRECISION_ORDER[Math.max(a, b)] ?? "exact";
}

// Quantize an x/y pair onto a coarse grid for non-exact precision.
function quantizeXY(
  x: number,
  y: number,
  precision: PrecisionLevel,
): { x: number; y: number } | null {
  if (precision === "hidden") return null;
  const grid =
    precision === "exact"
      ? 0
      : precision === "1km"
        ? 0.04
        : precision === "10km"
          ? 0.08
          : 0.2; // country
  if (grid === 0) return { x, y };
  return {
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  };
}

// ── Stylised map (per S6.3 stand-in) ──────────────────────────────

const MAP_W = 1000;
const MAP_H = 620;

const LAND_PATHS = [
  "M120,120 C260,80 420,100 520,160 C600,210 560,300 460,330 C320,370 180,330 120,250 Z",
  "M620,260 C720,230 860,260 900,340 C930,410 840,470 740,450 C650,430 600,340 620,260 Z",
  "M250,420 C340,400 430,430 440,500 C448,560 360,590 290,560 C230,535 210,460 250,420 Z",
];

function GridLines(): ReactElement {
  const lines: ReactElement[] = [];
  for (let x = 0; x <= MAP_W; x += 100) {
    lines.push(
      <line
        key={`gx${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={MAP_H}
        stroke="var(--line)"
        strokeWidth={1}
      />,
    );
  }
  for (let y = 0; y <= MAP_H; y += 100) {
    lines.push(
      <line
        key={`gy${y}`}
        x1={0}
        y1={y}
        x2={MAP_W}
        y2={y}
        stroke="var(--line)"
        strokeWidth={1}
      />,
    );
  }
  return <g opacity={0.5}>{lines}</g>;
}

function MapPin({
  x,
  y,
  color,
  onClick,
  testId,
  label,
}: {
  x: number;
  y: number;
  color: string;
  onClick?: () => void;
  testId: string;
  label: string;
}): ReactElement {
  return (
    <g
      data-map-pin={testId}
      transform={`translate(${x},${y})`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      aria-label={label}
    >
      <circle cx={0} cy={0} r={18} fill={color} opacity={0.16} />
      <path
        d="M0,-14 C7,-14 12,-9 12,-2 C12,7 0,16 0,16 C0,16 -12,7 -12,-2 C-12,-9 -7,-14 0,-14 Z"
        fill={color}
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
      <circle cx={0} cy={-2} r={4} fill="var(--bg)" />
    </g>
  );
}

// ── Icons ─────────────────────────────────────────────────────────

function PlusIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SealLockIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ChevronDown(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function PilgrimageMapSurface({
  sites,
  sealed_count,
  initial_precision = "exact",
  onSelectSite,
  onAddPlace,
  className,
  style,
}: PilgrimageMapSurfaceProps) {
  const [precision, setPrecision] = useState<PrecisionLevel>(
    initial_precision,
  );

  const visiblePins = useMemo(() => {
    if (precision === "hidden") return [];
    return sites
      .map((s) => {
        const eff = effectivePrecision(s.recorded_precision, precision);
        const q = quantizeXY(s.x_norm, s.y_norm, eff);
        if (!q) return null;
        return { site: s, x: q.x, y: q.y, eff };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [sites, precision]);

  return (
    <div
      data-component="pilgrimage-map-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Pilgrimage map
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            The places your practice has touched.
          </div>
        </div>
      </header>

      <div
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Map */}
        <div
          data-map-canvas
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--map-water)",
          }}
        >
          {precision === "hidden" ? (
            <div
              data-map-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                background: "var(--bg-sunk)",
              }}
            >
              <span>Map hidden. Sites remain in the rail.</span>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label="Map of recorded practice sites"
            >
              <rect
                x={0}
                y={0}
                width={MAP_W}
                height={MAP_H}
                fill="var(--map-water)"
              />
              {LAND_PATHS.map((d, i) => (
                <path
                  key={`l${i}`}
                  d={d}
                  fill="var(--map-land)"
                  stroke="var(--line-2)"
                  strokeWidth={1}
                />
              ))}
              <GridLines />
              {visiblePins.map((p) => (
                <MapPin
                  key={p.site.id}
                  testId={p.site.id}
                  label={`${p.site.name} · ${SITE_KIND_LABEL[p.site.kind]}`}
                  x={p.x * MAP_W}
                  y={p.y * MAP_H}
                  color={SITE_COLOR_TOKEN[p.site.kind]}
                  onClick={() => onSelectSite?.(p.site.id)}
                />
              ))}
              {sealed_count > 0 ? (
                <g
                  data-sealed-cluster
                  transform={`translate(${MAP_W - 180},${MAP_H - 80})`}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={16}
                    fill="var(--seal-soft)"
                    stroke="var(--seal)"
                    strokeWidth={1.4}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize={12}
                    fill="var(--seal)"
                  >
                    +{sealed_count}
                  </text>
                </g>
              ) : null}
            </svg>
          )}
        </div>

        {/* Attribution */}
        <div
          data-map-attribution
          style={{
            position: "absolute",
            bottom: 10,
            left: 14,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 10px",
            borderRadius: "var(--r-sm)",
            background: "rgba(0,0,0,.4)",
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "rgba(236,229,214,.7)",
          }}
        >
          <span
            style={{ fontFamily: "var(--font-glyph)" }}
            aria-hidden="true"
          >
            ‡
          </span>
          Map tiles © OpenStreetMap · your viewport is visible to OSM
        </div>

        {/* Precision selector */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ position: "relative" }}>
            <select
              data-map-precision
              aria-label="Map precision"
              value={precision}
              onChange={(e) =>
                setPrecision(e.target.value as PrecisionLevel)
              }
              style={{
                padding: "9px 32px 9px 12px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                appearance: "none",
              }}
            >
              {PRECISION_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRECISION_LABELS[p]}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--ink-mute)",
              }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </div>
        </div>

        {/* Add Place CTA */}
        <button
          type="button"
          data-add-place
          onClick={onAddPlace}
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          }}
        >
          <PlusIcon />
          Add place
        </button>

        {/* Site list rail */}
        <aside
          className="scroll pm-rail"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 280,
            borderLeft: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "16px 14px 30px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            In view · {sites.length} {sites.length === 1 ? "site" : "sites"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sites.map((s) => {
              const eff = effectivePrecision(s.recorded_precision, precision);
              const precisionLabel =
                eff === "exact"
                  ? "Exact"
                  : eff === "1km"
                    ? "~1 km"
                    : eff === "10km"
                      ? "~10 km"
                      : eff === "country"
                        ? "Country"
                        : "Hidden";
              return (
                <button
                  key={s.id}
                  type="button"
                  data-site-id={s.id}
                  onClick={() => onSelectSite?.(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "11px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: SITE_COLOR_TOKEN[s.kind],
                      flex: "none",
                      marginTop: 4,
                      border: "2px solid var(--bg-2)",
                      boxShadow: `0 0 0 1px ${SITE_COLOR_TOKEN[s.kind]}`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        color: "var(--ink)",
                        lineHeight: 1.2,
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
                      {SITE_KIND_LABEL[s.kind]} · {precisionLabel}
                    </div>
                  </div>
                </button>
              );
            })}
            {sealed_count > 0 ? (
              <div
                data-sealed-rail
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  border: "1px dashed var(--seal-border)",
                  borderRadius: "var(--r-md)",
                  background: "var(--seal-soft)",
                }}
              >
                <span style={{ display: "flex", color: "var(--seal)" }}>
                  <SealLockIcon />
                </span>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  {sealed_count} sealed{" "}
                  {sealed_count === 1 ? "site" : "sites"} in this region
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
