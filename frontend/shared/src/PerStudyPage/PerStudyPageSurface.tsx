/**
 * PerStudyPageSurface — H06 §S7.3 (Per-Study Page).
 *
 * Renders a single saved study: name + description + metadata +
 * a chart of the most-recent snapshot's results + a practitioner-
 * authored interpretation block + collapsible raw-data table +
 * linked workings + a re-run rail.
 *
 * Honesty + H06 rules:
 *   • Re-running the study creates a NEW snapshot (B112 rule). The
 *     copy under "Refresh chart" reads verbatim: "This creates a
 *     new chart snapshot — the current one is kept."
 *   • The interpretation block is the PRACTITIONER'S text — never
 *     auto-filled. The auto-save line reads: "Auto-saved · the
 *     interpretation is yours; pattern detections are never
 *     written here for you."
 *   • Kind-aware rendering:
 *       gematria_search       → top-results table + value histogram
 *       gematria_calculation  → per-cipher breakdown table
 *   • No --danger anywhere.
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type PerStudyKind = "gematria_search" | "gematria_calculation";

export interface PerStudyLinkedWorking {
  id: string;
  title: string;
  date_label: string;
  meta?: string;
  rating_label?: string;
}

export interface PerStudyRecord {
  id: string;
  name: string;
  description: string;
  kind: PerStudyKind;
  /** Time since the most-recent snapshot, e.g. "Last run 22 Jun 2026". */
  last_run_label: string | null;
  /** The most-recent snapshot's results JSON (kind-shaped). */
  snapshot_results: Record<string, unknown> | null;
  /** Sample size of the most-recent snapshot. */
  sample_size: number;
  /** Workings the study drew on. */
  linked_workings: readonly PerStudyLinkedWorking[];
  /** Practitioner's interpretation prose — Tiptap-rendered in the
   *  real editor; presentational textarea fallback here until the
   *  Tiptap wiring lands. */
  interpretation: string;
}

export interface PerStudyPageSurfaceProps {
  record: PerStudyRecord;
  onBack?: () => void;
  onEditQuery?: () => void;
  onInsertIntoDraft?: () => void;
  /** Fires when the user changes the interpretation. The route owns
   *  the debounce + PATCH to the snapshot.notes field (B112 says
   *  notes is the only editable snapshot column). */
  onInterpretationChange?: (next: string) => void;
  /** Fires when the user clicks Refresh chart (POST /studies/:id/run). */
  onRefresh?: () => void;
  /** True while a refresh is in flight. */
  refreshing?: boolean;
  className?: string;
  style?: CSSProperties;
}

// ── Chart data extraction ───────────────────────────────────────────

interface BarPoint {
  label: string;
  value: number;
  color: string;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--accent)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function deriveSearchBars(
  results: Record<string, unknown>,
): BarPoint[] {
  // Aggregate top result phrases by count.
  const rows = Array.isArray(results.results)
    ? (results.results as { phrase: string | null; cipher_name: string }[])
    : [];
  const grouped = new Map<string, number>();
  for (const r of rows) {
    const key = r.cipher_name ?? "—";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length] ?? "var(--accent)",
    }));
}

function deriveCalculationBars(
  results: Record<string, unknown>,
): BarPoint[] {
  const rows = Array.isArray(results.per_cipher)
    ? (results.per_cipher as {
        cipher_name: string;
        value: number;
      }[])
    : [];
  return rows.map((r, i) => ({
    label: r.cipher_name,
    value: r.value,
    color: CHART_COLORS[i % CHART_COLORS.length] ?? "var(--accent)",
  }));
}

// ── BarChart component ────────────────────────────────────────────

function BarChart({ data }: { data: BarPoint[] }): ReactElement {
  const W = 700;
  const H = 300;
  const padL = 44;
  const padB = 46;
  const padT = 14;
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotH = H - padB - padT;
  const plotW = W - padL - 12;
  const bw = data.length > 0 ? (plotW / data.length) * 0.5 : 0;
  const gap = data.length > 0 ? plotW / data.length : 0;
  const yTicks = useMemo(() => {
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) =>
      Math.round((max / steps) * i),
    );
  }, [max]);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: "100%" }}
      role="img"
      aria-label="Study chart — bars grouped by series, value labels above each bar"
    >
      {yTicks.map((t, i) => {
        const y = padT + plotH * (1 - t / max);
        return (
          <g key={`tick-${i}`}>
            <line
              x1={padL}
              y1={y}
              x2={W - 12}
              y2={y}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize={10}
              fill="var(--ink-mute)"
            >
              {t}
            </text>
          </g>
        );
      })}
      {data.map((d, di) => {
        const x = padL + di * gap + (gap - bw) / 2;
        const bh = max > 0 ? plotH * (d.value / max) : 0;
        const y = padT + plotH - bh;
        const cx = x + bw / 2;
        return (
          <g key={di} data-bar={d.label}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx={3}
              fill={d.color}
              fillOpacity={0.55}
              stroke={d.color}
              strokeWidth={1.2}
            />
            <text
              x={cx}
              y={y - 7}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={12}
              fill="var(--ink)"
            >
              {d.value}
            </text>
            <text
              x={cx}
              y={H - 26}
              textAnchor="middle"
              fontFamily="var(--font-ui)"
              fontSize={11.5}
              fill="var(--ink-soft)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────

function ChevronRightIcon(): ReactElement {
  return (
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
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function PencilIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 19l2.5-.6L19 7a2 2 0 0 0-3-3L4.6 15.5 4 18z" />
    </svg>
  );
}

function RefreshIcon(): ReactElement {
  return (
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
  );
}

function InsertIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 9h6" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function PerStudyPageSurface({
  record,
  onBack,
  onEditQuery,
  onInsertIntoDraft,
  onInterpretationChange,
  onRefresh,
  refreshing = false,
  className,
  style,
}: PerStudyPageSurfaceProps) {
  const [tableOpen, setTableOpen] = useState(false);

  const bars = useMemo(() => {
    if (!record.snapshot_results) return [];
    return record.kind === "gematria_search"
      ? deriveSearchBars(record.snapshot_results)
      : deriveCalculationBars(record.snapshot_results);
  }, [record.kind, record.snapshot_results]);

  return (
    <div
      data-component="per-study-page-surface"
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
          gap: 16,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            data-back
            onClick={onBack}
            style={{
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Studies
          </button>
          <span style={{ color: "var(--line-2)" }}>/</span>
          <span
            style={{
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {record.name}
          </span>
        </nav>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            data-edit-query
            onClick={onEditQuery}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <PencilIcon />
            Edit
          </button>
          <button
            type="button"
            data-insert-draft
            onClick={onInsertIntoDraft}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 12.5,
              border: "none",
              cursor: "pointer",
            }}
          >
            <InsertIcon />
            Insert into draft
          </button>
        </div>
      </header>

      <div
        className="ps-cols"
        style={{
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <main
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            padding: "34px 26px 60px",
          }}
        >
          <article style={{ maxWidth: 800, margin: "0 auto" }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 34,
                lineHeight: 1.1,
                margin: "0 0 8px",
              }}
            >
              {record.name}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--ink-soft)",
                margin: "0 0 12px",
              }}
            >
              {record.description}
            </p>
            <div
              data-study-meta
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginBottom: 28,
              }}
            >
              {record.last_run_label
                ? `${record.last_run_label} · n=${record.sample_size}`
                : "Not yet run"}
            </div>

            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                marginBottom: 10,
              }}
            >
              What this chart shows:{" "}
              {record.kind === "gematria_search"
                ? "count of matching phrases grouped by cipher (top 7)."
                : "the input's value under each cipher in the calculation."}
            </div>
            <div
              data-chart-wrap
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                padding: "24px 22px 18px",
                marginBottom: 8,
              }}
            >
              {bars.length === 0 ? (
                <div
                  data-chart-empty
                  style={{
                    padding: "30px 0",
                    textAlign: "center",
                    color: "var(--ink-mute)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                  }}
                >
                  No snapshot yet — refresh on the right to run this study.
                </div>
              ) : (
                <BarChart data={bars} />
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 32,
              }}
            >
              n={record.sample_size} · computed from your local journal ·
              study {record.id.slice(0, 8)}
            </div>

            {/* Interpretation */}
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: ".13em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 12,
              }}
            >
              Your interpretation
            </div>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg)",
                padding: "4px 4px 0",
                marginBottom: 14,
              }}
            >
              <textarea
                data-interpretation
                value={record.interpretation}
                onChange={(e) => onInterpretationChange?.(e.target.value)}
                placeholder="Write what you make of the chart. Pattern detections are never written here for you."
                style={{
                  width: "100%",
                  padding: "18px 20px 22px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 16.5,
                  lineHeight: 1.7,
                  color: "var(--ink)",
                  background: "transparent",
                  border: "none",
                  resize: "vertical",
                  minHeight: 220,
                  outline: "none",
                }}
              />
            </div>
            <div
              data-autosave-note
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 32,
              }}
            >
              Auto-saved · the interpretation is yours; pattern detections
              are never written here for you.
            </div>

            {/* Collapsible data table */}
            <button
              type="button"
              data-table-toggle
              aria-expanded={tableOpen}
              onClick={() => setTableOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginBottom: 14,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  transform: tableOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
                aria-hidden="true"
              >
                <ChevronRightIcon />
              </span>
              The data behind the chart
            </button>
            {tableOpen ? (
              <div
                data-data-table
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  overflow: "hidden",
                  marginBottom: 32,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr",
                    background: "var(--bg-3)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                  }}
                >
                  <span style={{ padding: "10px 14px" }}>Group</span>
                  <span style={{ padding: "10px 14px" }}>Count</span>
                </div>
                {bars.map((b) => (
                  <div
                    key={b.label}
                    data-data-row
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr",
                      borderTop: "1px solid var(--line)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <span
                      style={{
                        padding: "11px 14px",
                        fontFamily: "var(--font-serif)",
                        color: "var(--ink)",
                      }}
                    >
                      {b.label}
                    </span>
                    <span style={{ padding: "11px 14px" }}>{b.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Linked workings */}
            {record.linked_workings.length > 0 ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    letterSpacing: ".13em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 12,
                  }}
                >
                  Workings this study drew on
                </div>
                <div
                  data-linked-workings
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {record.linked_workings.map((l) => (
                    <div
                      key={l.id}
                      data-linked-working={l.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "11px 2px",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                          width: 78,
                          flex: "none",
                        }}
                      >
                        {l.date_label}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          color: "var(--ink)",
                        }}
                      >
                        {l.title}
                      </span>
                      {l.meta ? (
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {l.meta}
                        </span>
                      ) : null}
                      {l.rating_label ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12.5,
                            color: "var(--accent)",
                          }}
                        >
                          {l.rating_label}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        </main>

        {/* Re-run rail */}
        <aside
          data-rerun-rail
          className="ps-rail"
          style={{
            flex: "0 0 240px",
            minWidth: 0,
            borderLeft: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "24px 18px 30px",
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
            Re-run
          </div>
          <button
            type="button"
            data-refresh-chart
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: 11,
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.55 : 1,
            }}
          >
            <RefreshIcon />
            {refreshing ? "Refreshing…" : "Refresh chart"}
          </button>
          <p
            data-refresh-note
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
              margin: "10px 0 0",
            }}
          >
            This creates a new chart snapshot — the current one is kept.
          </p>
          {record.last_run_label ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
              }}
            >
              {record.last_run_label}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
