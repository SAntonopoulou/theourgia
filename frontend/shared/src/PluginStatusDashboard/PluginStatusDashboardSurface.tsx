/**
 * PluginStatusDashboardSurface — H09 Cluster A surface 5.
 *
 * Honesty rules wired:
 *
 *   * **Errors show the FULL trace** (rule 39) — `--font-mono`
 *     in a `<pre>` with `white-space: pre-wrap`. No friendly
 *     summary euphemism.
 *   * Performance tiles are quiet stats (one number + one
 *     subtitle line each) — NO charts, NO leaderboards.
 *   * Active table uses --plugin-active dot for "loaded
 *     successfully", never a leaderboard ranking.
 */

import {
  type CSSProperties,
  useState,
} from "react";

import {
  PSD_COL_EXT_POINTS,
  PSD_COL_LOAD_TIME,
  PSD_COL_PLUGIN,
  PSD_COL_STATUS,
  PSD_ERRORS_INTRO,
  PSD_SECTION_ACTIVE,
  PSD_SECTION_ERRORS,
  PSD_SECTION_PERFORMANCE,
  PSD_SUBHEAD,
  PSD_TILE_LOAD_TIME,
  PSD_TILE_MEMORY,
  PSD_TITLE,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface ActiveRow {
  name: string;
  version: string;
  /** Display-friendly, e.g. `"84 ms"`. */
  loadMs: string;
  extensionPointsLabel: string;
}

export interface ErrorRow {
  id: string;
  name: string;
  version: string;
  summary: string;
  /** Display-friendly timestamp, e.g. `27 Jun · 09:31`. */
  when: string;
  /** Full exception trace — rendered verbatim in a `<pre>`. */
  trace: string;
}

export interface PerformanceStats {
  /** Display-friendly, e.g. "412 ms". */
  totalLoadTimeLabel: string;
  /** Sub-line, e.g. "across 4 active plugins, last startup". */
  totalLoadTimeDetail: string;
  /** Display-friendly, e.g. "~38 MB". */
  memoryLabel: string;
  /** Sub-line. */
  memoryDetail: string;
}

export interface PluginStatusDashboardSurfaceProps {
  active: readonly ActiveRow[];
  errors: readonly ErrorRow[];
  performance: PerformanceStats;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function PluginStatusDashboardSurface({
  active,
  errors,
  performance,
  className,
  style,
}: PluginStatusDashboardSurfaceProps) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggle = (id: string) =>
    setOpenIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section
      data-surface="plugin-status-dashboard"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
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
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {PSD_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {PSD_SUBHEAD}
          </div>
        </div>
      </header>

      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 24px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          {/* Active */}
          <section data-field="active-section">
            <h2 style={sectionHeading()}>{PSD_SECTION_ACTIVE}</h2>
            <div
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 16,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--line)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                <span>{PSD_COL_PLUGIN}</span>
                <span style={{ textAlign: "right", width: 90 }}>
                  {PSD_COL_LOAD_TIME}
                </span>
                <span style={{ textAlign: "right", width: 100 }}>
                  {PSD_COL_EXT_POINTS}
                </span>
                <span style={{ textAlign: "right", width: 64 }}>
                  {PSD_COL_STATUS}
                </span>
              </div>
              {active.map((a, i) => (
                <div
                  key={`${a.name}-${i}`}
                  data-active-row
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    gap: 16,
                    padding: "12px 16px",
                    borderBottomWidth: i < active.length - 1 ? 1 : 0,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--line)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14.5,
                        color: "var(--ink)",
                      }}
                    >
                      {a.name}
                    </span>{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {a.version}
                    </span>
                  </div>
                  <span
                    style={{
                      textAlign: "right",
                      width: 90,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {a.loadMs}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      width: 100,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {a.extensionPointsLabel}
                  </span>
                  <span
                    style={{
                      justifySelf: "end",
                      width: 64,
                      textAlign: "right",
                    }}
                  >
                    <span
                      aria-label="loaded"
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: "var(--plugin-active)",
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Errors */}
          <section data-field="errors-section">
            <h2 style={sectionHeading()}>{PSD_SECTION_ERRORS}</h2>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 12px",
              }}
            >
              {PSD_ERRORS_INTRO}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {errors.map((e) => {
                const open = openIds.has(e.id);
                return (
                  <div
                    key={e.id}
                    data-error-id={e.id}
                    style={{
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--warn-border)",
                      borderRadius: "var(--r-md)",
                      background: "var(--warn-soft)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(e.id)}
                      aria-expanded={open}
                      data-action="toggle-error"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: "13px 15px",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "flex",
                          color: "var(--warn)",
                          flex: "none",
                        }}
                      >
                        <svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 8v5M12 16h.01" />
                        </svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 14.5,
                            color: "var(--ink)",
                          }}
                        >
                          {e.name}{" "}
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {e.version}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 12,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {e.summary}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                          flex: "none",
                        }}
                      >
                        {e.when}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "flex",
                          color: "var(--warn)",
                          flex: "none",
                          transform: open ? "rotate(90deg)" : "none",
                          transition: "transform .18s ease",
                        }}
                      >
                        <svg
                          width={13}
                          height={13}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.9}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                    {open ? (
                      <div style={{ padding: "0 15px 15px" }}>
                        <pre
                          data-field="error-trace"
                          style={{
                            margin: 0,
                            padding: "13px 15px",
                            background: "var(--bg-sunk)",
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: "var(--line)",
                            borderRadius: "var(--r-md)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11.5,
                            lineHeight: 1.6,
                            color: "var(--ink-soft)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowX: "auto",
                          }}
                        >
                          {e.trace}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Performance */}
          <section data-field="performance-section">
            <h2 style={sectionHeading()}>
              {PSD_SECTION_PERFORMANCE}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 11,
              }}
            >
              <Tile
                label={PSD_TILE_LOAD_TIME}
                value={performance.totalLoadTimeLabel}
                detail={performance.totalLoadTimeDetail}
              />
              <Tile
                label={PSD_TILE_MEMORY}
                value={performance.memoryLabel}
                detail={performance.memoryDetail}
              />
            </div>
          </section>
        </div>
      </main>
    </section>
  );
}

function sectionHeading(): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    color: "var(--ink)",
    margin: "0 0 12px",
  };
}

function Tile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      data-field="perf-tile"
      style={{
        padding: "16px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 24,
          color: "var(--ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginTop: 4,
        }}
      >
        {detail}
      </div>
    </div>
  );
}
