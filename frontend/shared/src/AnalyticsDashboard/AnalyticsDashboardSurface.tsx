/**
 * AnalyticsDashboardSurface — H06 §S7.7.
 *
 * Grid dashboard: recent-activity timeline · suggested patterns ·
 * "this week" quiet stats · two heatmaps · network glance.
 * Saved-studies rail on the right.
 *
 * Honesty + H06 rules:
 *   • Every aggregate panel surfaces the sample size in mono
 *     metadata, never a leaderboard or rank.
 *   • Patterns carry the verbatim "Observation only — not a
 *     recommendation. Patterns suggest where to look, not what to
 *     do." disclaimer.
 *   • Small-sample chips on patterns use `--accent` (warm invite),
 *     never `--warn` / `--danger`.
 *   • Hero strip ("This week" stats) renders quietly in
 *     `--font-display` numbers + `--ink-mute` labels.
 *   • No `--danger` anywhere.
 */

import {
  type CSSProperties,
  type ReactElement,
  useState,
} from "react";

import { useNarrowLayout } from "../hooks/useNarrowLayout.js";

// ── Types ──────────────────────────────────────────────────────────

export type AnalyticsScope = "today" | "week" | "month" | "year" | "all";

export interface TimelineDay {
  /** "Mon 24" */
  label: string;
  bars: {
    /** Series id ("entries" | "workings" | …). */
    series: string;
    count: number;
  }[];
}

export interface HeroStat {
  /** "12" */
  value: string;
  /** "entries this week" */
  label: string;
}

export interface PatternRow {
  id: string;
  text: string;
  /** "n=14 · 2.3× baseline" */
  stat_label: string;
  small_sample: boolean;
}

export interface HeatmapPanel {
  /** "Outcome × planetary hour" */
  title: string;
  /** "Cell shade = mean outcome rating · click to drill in" */
  caption: string;
  cells: { x: string; y: string; value: number }[];
  /** "Computed from your local journal · n=89" */
  footnote: string;
}

export interface SavedStudyTile {
  id: string;
  name: string;
  /** "run 2h ago · n=76" */
  meta: string;
}

export interface AnalyticsDashboardSurfaceProps {
  scope: AnalyticsScope;
  hero_stats: readonly HeroStat[];
  timeline_days: readonly TimelineDay[];
  /** Stable colour per series — drawn from `--chart-*` tokens. */
  timeline_legend: readonly { series: string; label: string; color: string }[];
  patterns: readonly PatternRow[];
  heatmap_hour: HeatmapPanel | null;
  heatmap_lunar: HeatmapPanel | null;
  saved_studies: readonly SavedStudyTile[];
  loading?: boolean;
  onScopeChange?: (next: AnalyticsScope) => void;
  onOpenStudy?: (id: string) => void;
  onNewStudy?: () => void;
  onViewMatching?: (patternId: string) => void;
  onHeatmapCellClick?: (
    panelKey: "hour" | "lunar", x: string, y: string,
  ) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Scope tabs ────────────────────────────────────────────────────

const SCOPES: { id: AnalyticsScope; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
];

// ── Timeline mini-bars ────────────────────────────────────────────

function Timeline({
  days,
  legend,
}: {
  days: readonly TimelineDay[];
  legend: readonly { series: string; label: string; color: string }[];
}): ReactElement {
  const W = 720;
  const H = 130;
  const padL = 30;
  const padB = 22;
  const padT = 8;
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;
  const max = Math.max(
    1,
    ...days.flatMap((d) => d.bars.map((b) => b.count)),
  );
  const colsCount = Math.max(1, days.length);
  const gap = plotW / colsCount;
  const bw = Math.max(2, (gap - 4) / Math.max(1, legend.length));
  const seriesIndex = new Map(
    legend.map((l, i) => [l.series, i] as const),
  );

  return (
    <svg
      data-timeline-svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxHeight: 160 }}
      role="img"
      aria-label="Daily activity per series across the selected scope"
    >
      {/* y-axis baseline */}
      <line
        x1={padL}
        y1={padT + plotH}
        x2={W - 8}
        y2={padT + plotH}
        stroke="var(--line)"
        strokeWidth={1}
      />
      {days.map((d, di) => {
        const xCol = padL + di * gap;
        return (
          <g key={di} data-timeline-day={d.label}>
            {d.bars.map((b) => {
              const i = seriesIndex.get(b.series) ?? 0;
              const color = legend[i]?.color ?? "var(--accent)";
              const h = max > 0 ? plotH * (b.count / max) : 0;
              const x = xCol + 2 + i * (bw + 1);
              const y = padT + plotH - h;
              return (
                <rect
                  key={`${di}-${b.series}`}
                  data-timeline-bar={`${d.label}-${b.series}`}
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={1.5}
                  fill={color}
                  fillOpacity={0.7}
                />
              );
            })}
            {/* day label every Nth day to keep it readable */}
            {di % Math.max(1, Math.floor(days.length / 10)) === 0 ? (
              <text
                x={xCol + bw}
                y={H - 6}
                fontFamily="var(--font-mono)"
                fontSize={9}
                fill="var(--ink-mute)"
                textAnchor="middle"
              >
                {d.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// ── Heatmap mini-grid ────────────────────────────────────────────

function Heatmap({
  panel,
  onCellClick,
}: {
  panel: HeatmapPanel;
  onCellClick?: (x: string, y: string) => void;
}): ReactElement {
  // Build distinct x and y axes from cells.
  const xs = Array.from(new Set(panel.cells.map((c) => c.x)));
  const ys = Array.from(new Set(panel.cells.map((c) => c.y)));
  const cw = 32;
  const ch = 24;
  const padL = 60;
  const padT = 22;
  const W = padL + xs.length * cw + 12;
  const H = padT + ys.length * ch + 18;
  const lookup = new Map<string, number>();
  for (const c of panel.cells) {
    lookup.set(`${c.x}|${c.y}`, c.value);
  }
  const max = Math.max(0.001, ...panel.cells.map((c) => c.value));

  return (
    <svg
      data-heatmap-svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxHeight: 220 }}
      role="img"
      aria-label={panel.title}
    >
      {ys.map((y, yi) => (
        <text
          key={`yl-${yi}`}
          x={padL - 6}
          y={padT + yi * ch + ch / 2 + 3}
          fontFamily="var(--font-ui)"
          fontSize={10}
          fill="var(--ink-mute)"
          textAnchor="end"
        >
          {y}
        </text>
      ))}
      {xs.map((x, xi) => (
        <text
          key={`xl-${xi}`}
          x={padL + xi * cw + cw / 2}
          y={padT - 8}
          fontFamily="var(--font-ui)"
          fontSize={10}
          fill="var(--ink-mute)"
          textAnchor="middle"
        >
          {x}
        </text>
      ))}
      {ys.flatMap((y, yi) =>
        xs.map((x, xi) => {
          const v = lookup.get(`${x}|${y}`) ?? 0;
          const opacity = v <= 0 ? 0.08 : 0.18 + (v / max) * 0.6;
          return (
            <rect
              key={`c-${xi}-${yi}`}
              data-heatmap-cell={`${x}|${y}`}
              x={padL + xi * cw + 1}
              y={padT + yi * ch + 1}
              width={cw - 2}
              height={ch - 2}
              rx={2}
              fill="var(--accent)"
              fillOpacity={opacity}
              onClick={() => onCellClick?.(x, y)}
              style={{ cursor: onCellClick ? "pointer" : "default" }}
            />
          );
        }),
      )}
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function AnalyticsDashboardSurface({
  scope,
  hero_stats,
  timeline_days,
  timeline_legend,
  patterns,
  heatmap_hour,
  heatmap_lunar,
  saved_studies,
  loading = false,
  onScopeChange,
  onOpenStudy,
  onNewStudy,
  onViewMatching,
  onHeatmapCellClick,
  className,
  style,
}: AnalyticsDashboardSurfaceProps) {
  const [activeScope, setActiveScope] = useState<AnalyticsScope>(scope);
  // Responsive sweep (v1-050): below 960px the main dashboard + saved-
  // studies rail split clips, and the inner 12-column grid squeezes the
  // cards to unreadable widths. Stack the panes and collapse the grid.
  const stacked = useNarrowLayout("(max-width: 960px)");

  const handleScope = (next: AnalyticsScope) => {
    setActiveScope(next);
    onScopeChange?.(next);
  };

  return (
    <div
      data-component="analytics-dashboard-surface"
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
          flexDirection: stacked ? "column" : "row",
          alignItems: stacked ? "stretch" : "center",
          gap: stacked ? 10 : 16,
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
            Analytics
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            Your practice, treated as evidence — sample sizes always shown.
          </div>
        </div>
        <div
          role="group"
          aria-label="Scope"
          data-scope-tabs
          style={{
            marginLeft: stacked ? 0 : "auto",
            display: "flex",
            gap: 2,
            padding: 3,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--bg-2)",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          {SCOPES.map((s) => {
            const on = s.id === activeScope;
            return (
              <button
                key={s.id}
                type="button"
                data-scope={s.id}
                aria-pressed={on}
                onClick={() => handleScope(s.id)}
                style={{
                  padding: "5px 12px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: on ? "var(--ink)" : "var(--ink-mute)",
                  background: on ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${on ? "var(--line-2)" : "transparent"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      <div
        className="ad-cols"
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          alignItems: "stretch",
          minWidth: 0,
          minHeight: 0,
          overflow: stacked ? "auto" : "hidden",
        }}
      >
        <div
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: stacked ? "visible" : "auto",
            padding: "22px 26px 50px",
          }}
        >
          {loading ? (
            <div
              data-dashboard-loading
              style={{
                textAlign: "center",
                padding: "6vh 0",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              Recomputing analytics…
            </div>
          ) : null}

          <div
            className="ad-grid"
            style={{
              display: "grid",
              gridTemplateColumns: stacked ? "1fr" : "repeat(12, 1fr)",
              gap: 16,
              maxWidth: 1080,
            }}
          >
            {/* Recent activity timeline */}
            <section
              data-section-recent
              style={{
                gridColumn: stacked ? "1 / -1" : "span 12",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: ".13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 4,
                }}
              >
                Recent activity
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginBottom: 16,
                }}
              >
                Entries · workings · divinations · synchronicities ·
                practice logs, per day.
              </div>
              {timeline_days.length === 0 ? (
                <div
                  data-timeline-empty
                  style={{
                    padding: "30px 0",
                    textAlign: "center",
                    color: "var(--ink-mute)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                  }}
                >
                  No activity recorded in this scope yet.
                </div>
              ) : (
                <Timeline days={timeline_days} legend={timeline_legend} />
              )}
              <div
                data-timeline-legend
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                {timeline_legend.map((l) => (
                  <span
                    key={l.series}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: l.color,
                      }}
                      aria-hidden="true"
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </section>

            {/* Suggested patterns */}
            <section
              data-section-patterns
              style={{
                gridColumn: stacked ? "1 / -1" : "span 8",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: ".13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                Suggested patterns
              </div>
              {patterns.length === 0 ? (
                <p
                  data-patterns-empty
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  No patterns surfaced yet — your weekly digest will fill
                  this in as the record grows.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {patterns.map((p) => (
                    <div
                      key={p.id}
                      data-pattern-row={p.id}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        paddingBottom: 14,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 15.5,
                          lineHeight: 1.5,
                          color: "var(--ink)",
                          margin: "0 0 6px",
                        }}
                      >
                        {p.text}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {p.stat_label}
                        </span>
                        {p.small_sample ? (
                          <span
                            data-pattern-small-sample
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 10,
                              color: "var(--accent)",
                              border: "1px solid var(--accent-soft)",
                              borderRadius: 20,
                              padding: "1px 7px",
                            }}
                          >
                            small sample
                          </span>
                        ) : null}
                        <button
                          type="button"
                          data-view-matching={p.id}
                          onClick={() => onViewMatching?.(p.id)}
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 12,
                            color: "var(--info)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          View matching
                        </button>
                      </div>
                      <div
                        data-pattern-disclaimer
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                          fontStyle: "italic",
                        }}
                      >
                        Observation only — not a recommendation. Patterns
                        suggest where to look, not what to do.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quiet stats */}
            <section
              data-section-stats
              style={{
                gridColumn: stacked ? "1 / -1" : "span 4",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: ".13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {activeScope === "today"
                  ? "Today"
                  : activeScope === "week"
                    ? "This week"
                    : activeScope === "month"
                      ? "This month"
                      : activeScope === "year"
                        ? "This year"
                        : "All time"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                {hero_stats.map((s) => (
                  <div
                    key={s.label}
                    data-stat-line={s.label}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        color: "var(--ink)",
                        width: 40,
                      }}
                    >
                      {s.value}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Heatmap: planetary hour */}
            <section
              data-section-heatmap-hour
              style={{
                gridColumn: stacked ? "1 / -1" : "span 6",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: ".13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 3,
                }}
              >
                {heatmap_hour?.title ?? "Outcome × planetary hour"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {heatmap_hour?.caption ??
                  "Cell shade = mean outcome rating · click to drill in."}
              </div>
              {heatmap_hour && heatmap_hour.cells.length > 0 ? (
                <>
                  <Heatmap
                    panel={heatmap_hour}
                    onCellClick={
                      onHeatmapCellClick
                        ? (x, y) => onHeatmapCellClick("hour", x, y)
                        : undefined
                    }
                  />
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                      marginTop: 12,
                    }}
                  >
                    {heatmap_hour.footnote}
                  </div>
                </>
              ) : (
                <div
                  data-heatmap-hour-empty
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  Not enough data yet to draw this view.
                </div>
              )}
            </section>

            {/* Heatmap: lunar phase */}
            <section
              data-section-heatmap-lunar
              style={{
                gridColumn: stacked ? "1 / -1" : "span 6",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: ".13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 3,
                }}
              >
                {heatmap_lunar?.title ?? "Outcome × lunar phase"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {heatmap_lunar?.caption ??
                  "Cell shade = mean outcome rating · click to drill in."}
              </div>
              {heatmap_lunar && heatmap_lunar.cells.length > 0 ? (
                <>
                  <Heatmap
                    panel={heatmap_lunar}
                    onCellClick={
                      onHeatmapCellClick
                        ? (x, y) => onHeatmapCellClick("lunar", x, y)
                        : undefined
                    }
                  />
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                      marginTop: 12,
                    }}
                  >
                    {heatmap_lunar.footnote}
                  </div>
                </>
              ) : (
                <div
                  data-heatmap-lunar-empty
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  Not enough data yet to draw this view.
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Saved studies rail */}
        <aside
          data-saved-studies-rail
          className="scroll ad-rail"
          style={{
            flex: stacked ? "0 0 auto" : "0 0 260px",
            minWidth: 0,
            borderLeft: stacked ? "none" : "1px solid var(--line)",
            borderTop: stacked ? "1px solid var(--line)" : "none",
            background: "var(--bg-2)",
            padding: "18px 16px 30px",
            overflowY: stacked ? "visible" : "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            Studies you've saved
          </div>
          {saved_studies.length === 0 ? (
            <p
              data-saved-studies-empty
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                margin: "0 0 14px",
              }}
            >
              You haven't saved any studies yet. Start with a search and
              save the query when something catches.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {saved_studies.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-saved-study={s.id}
                  onClick={() => onOpenStudy?.(s.id)}
                  style={{
                    display: "block",
                    padding: "12px 13px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                      marginBottom: 3,
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {s.meta}
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            data-new-study
            onClick={onNewStudy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              border: "1px dashed var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              cursor: "pointer",
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
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New study
          </button>
        </aside>
      </div>
    </div>
  );
}
