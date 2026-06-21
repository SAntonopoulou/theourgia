/**
 * Analytics — "scientific illuminism" dashboard.
 *
 * Composition tracks ``Theourgia Analytics.dc.html``:
 *   Topbar  · "Analytics" + "Scientific illuminism — query your own
 *             practice" subtitle + "New study" primary action.
 *   Stats   · 4-card grid (Workings this moon, Mean efficacy,
 *             Synchronicities, Scrying clarity) each with a sparkline.
 *   Chart   · Workings & divinations — last 12 moons (line chart).
 *   Heatmap · Practice intensity — trailing 26 weeks × 7 days.
 *   Right   · Saved studies (correlation findings) + Mean efficacy by
 *             planetary day (bar rows).
 *
 * All data is placeholder / illustrative until the aggregation pipeline
 * lands. The line chart values match the .dc.html; the heatmap is
 * seeded with a deterministic pseudo-random function so it renders the
 * same shape every load without committing 182 inline rects to source.
 */

import { useTopbar } from "@theourgia/shared";

// ─── Topbar action ──────────────────────────────────────────────────────────

function NewStudyButton() {
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
      title="New-study composer ships with the aggregation pipeline."
    >
      New study
    </button>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  deltaColor = "var(--c-synchronicity)",
  sparkline,
  sparklineStroke,
}: {
  label: string;
  value: string;
  delta: string;
  deltaColor?: string;
  sparkline: string;
  sparklineStroke: string;
}) {
  return (
    <article
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 30,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: deltaColor,
          }}
        >
          {delta}
        </span>
      </div>
      <svg
        viewBox="0 0 96 30"
        width="100%"
        height="30"
        style={{ marginTop: 8 }}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points={sparkline} fill="none" stroke={sparklineStroke} strokeWidth="1.6" />
      </svg>
    </article>
  );
}

// ─── Line chart ─────────────────────────────────────────────────────────────

function LineChart() {
  const months = ["J", "A", "S", "O", "N", "D", "J", "F", "M", "A", "M", "J"];
  const workings = [
    [44, 105.4],
    [86.18, 90.6],
    [128.36, 101.7],
    [170.55, 75.8],
    [212.73, 83.2],
    [254.91, 57.3],
    [297.09, 68.4],
    [339.27, 42.5],
    [381.45, 61],
    [423.64, 49.9],
    [465.82, 64.7],
    [508, 31.4],
  ];
  const divinations = [
    [44, 127.6],
    [86.18, 120.2],
    [128.36, 131.3],
    [170.55, 112.8],
    [212.73, 116.5],
    [254.91, 101.7],
    [297.09, 109.1],
    [339.27, 120.2],
    [381.45, 98],
    [423.64, 105.4],
    [465.82, 90.6],
    [508, 94.3],
  ];
  const areaPath = `M44 172 ${workings.map((p) => `L${p[0]} ${p[1]}`).join(" ")} L508 172 Z`;
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontFamily: "var(--font-display, var(--font-serif))", fontSize: 18 }}>
          Workings &amp; divinations — last 12 moons
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2, background: "var(--accent)" }} />
            Workings
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2, background: "var(--c-divination)" }} />
            Divinations
          </span>
        </div>
      </div>
      <svg viewBox="0 0 520 200" width="100%" style={{ display: "block" }} aria-hidden="true">
        <g stroke="var(--line)" strokeWidth="1">
          {[172, 135, 98, 61, 24].map((y) => (
            <line key={`grid-y-${y}`} x1="44" y1={y} x2="508" y2={y} />
          ))}
        </g>
        <g fill="var(--ink-mute)" fontFamily="var(--font-mono)" fontSize="10" textAnchor="end">
          {[
            ["0", 176],
            ["10", 139],
            ["20", 102],
            ["30", 65],
            ["40", 28],
          ].map(([label, y]) => (
            <text key={`label-y-${label}`} x="34" y={y as number}>
              {label}
            </text>
          ))}
        </g>
        <g fill="var(--ink-mute)" fontFamily="var(--font-mono)" fontSize="10" textAnchor="middle">
          {months.map((m, i) => (
            <text key={`label-x-${i}-${m}`} x={44 + i * 42.18} y="190">
              {m}
            </text>
          ))}
        </g>
        <path d={areaPath} fill="var(--accent)" fillOpacity={0.1} />
        <polyline
          points={divinations.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="var(--c-divination)"
          strokeWidth="2"
        />
        <polyline
          points={workings.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.4"
        />
        <g fill="var(--accent)">
          {workings.map((p, i) => (
            <circle key={`pt-${i}-${p[0]}`} cx={p[0]} cy={p[1]} r="2.4" />
          ))}
        </g>
      </svg>
    </div>
  );
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random in [0, 1). */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function Heatmap() {
  const weeks = 26;
  const days = 7;
  const rects: { x: number; y: number; opacity: number }[] = [];
  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < days; d += 1) {
      const r = rand(w * 31 + d * 7 + 17);
      // Roughly 35% of cells are "off"; the rest fall in [0.28..1].
      const opacity = r < 0.35 ? 0 : 0.28 + rand(w * 13 + d * 5) * 0.72;
      rects.push({ x: w * 16, y: d * 16, opacity });
    }
  }
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontFamily: "var(--font-display, var(--font-serif))", fontSize: 18 }}>
          Practice intensity — trailing 26 weeks
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          less
          {[0.18, 0.45, 0.72, 1].map((o) => (
            <span
              key={`legend-${o}`}
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                background: "var(--accent)",
                opacity: o,
              }}
            />
          ))}
          more
        </div>
      </div>
      <svg
        viewBox="0 0 413 109"
        width="100%"
        style={{ display: "block", maxWidth: 520 }}
        aria-label="Practice intensity heatmap, 26 weeks × 7 days"
      >
        <title>Practice intensity heatmap, 26 weeks by 7 days</title>
        {rects.map((r, i) => (
          <rect
            key={`cell-${i}`}
            x={r.x}
            y={r.y}
            width="13"
            height="13"
            rx="2"
            fill="var(--accent)"
            fillOpacity={r.opacity}
          />
        ))}
      </svg>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginTop: 12,
        }}
      >
        142 active days · longest streak 19 · current streak 6
      </div>
    </div>
  );
}

// ─── Right rail ─────────────────────────────────────────────────────────────

const railCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: 18,
};

const railLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function SavedStudiesCard() {
  const studies = [
    {
      finding: "Efficacy rises with the waxing moon.",
      stat: "r = .42 · n = 188 · p < .01",
    },
    {
      finding: "Resh consistency higher in Sun hours.",
      stat: "+31% · n = 96",
    },
    {
      finding: "Scrying clarity peaks 2 days post-full.",
      stat: "peak +1.4 · n = 54",
    },
  ];
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>Saved studies</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {studies.map((s, i) => (
          <div
            key={s.finding}
            style={{
              borderTop: i > 0 ? "1px solid var(--line)" : "none",
              paddingTop: i > 0 ? 13 : 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                lineHeight: 1.4,
                color: "var(--ink)",
              }}
            >
              {s.finding}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--accent)",
                marginTop: 3,
              }}
            >
              {s.stat}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function MeanEfficacyCard() {
  const rows: { glyph: string; pct: number; value: string }[] = [
    { glyph: "☉", pct: 81, value: "8.1" },
    { glyph: "☽", pct: 62, value: "6.2" },
    { glyph: "♂", pct: 74, value: "7.4" },
    { glyph: "☿", pct: 69, value: "6.9" },
    { glyph: "♃", pct: 78, value: "7.8" },
    { glyph: "♀", pct: 71, value: "7.1" },
    { glyph: "♄", pct: 56, value: "5.6" },
  ];
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>Mean efficacy by planetary day</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.glyph} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph, var(--font-serif))",
                width: 16,
                color: "var(--ink-soft)",
              }}
            >
              {r.glyph}
            </span>
            <span
              style={{
                flex: 1,
                height: 7,
                background: "var(--bg-sunk, var(--bg))",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${r.pct}%`,
                  height: "100%",
                  background: "var(--accent)",
                }}
              />
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                width: 26,
                textAlign: "right",
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Analytics() {
  useTopbar(
    () => ({
      title: "Analytics",
      subtitle: "Scientific illuminism — query your own practice",
      after: <NewStudyButton />,
    }),
    [],
  );

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 22,
      }}
    >
      <div
        style={{
          flex: "3 1 540px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Workings · this moon"
            value="38"
            delta="▲ 12%"
            sparkline="6,26 13.64,22.62 21.27,24.31 28.91,19.23 36.55,20.92 44.18,15.85 51.82,17.54 59.45,12.46 67.09,14.15 74.73,9.08 82.36,10.77 90,4"
            sparklineStroke="var(--accent)"
          />
          <StatCard
            label="Mean efficacy"
            value="7.4"
            delta="/ 10 · ▲ 0.5"
            deltaColor="var(--ink-mute)"
            sparkline="6,26 13.64,26 21.27,20.5 28.91,26 36.55,15 44.18,20.5 51.82,9.5 59.45,15 67.09,9.5 74.73,9.5 82.36,4 90,9.5"
            sparklineStroke="var(--c-divination)"
          />
          <StatCard
            label="Synchronicities"
            value="156"
            delta="▲ 8"
            sparkline="6,26 13.64,18.67 21.27,22.33 28.91,15 36.55,18.67 44.18,22.33 51.82,11.33 59.45,15 67.09,7.67 74.73,11.33 82.36,15 90,4"
            sparklineStroke="var(--c-synchronicity)"
          />
          <StatCard
            label="Scrying clarity"
            value="6.8"
            delta="▲ 0.9"
            sparkline="6,21.6 13.64,26 21.27,17.2 28.91,21.6 36.55,12.8 44.18,17.2 51.82,21.6 59.45,12.8 67.09,17.2 74.73,8.4 82.36,12.8 90,4"
            sparklineStroke="var(--accent)"
          />
        </div>

        <LineChart />
        <Heatmap />
      </div>

      <aside
        style={{
          flex: "1 1 250px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <SavedStudiesCard />
        <MeanEfficacyCard />
      </aside>
    </div>
  );
}
