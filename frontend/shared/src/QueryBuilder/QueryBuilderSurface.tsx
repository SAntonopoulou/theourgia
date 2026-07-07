/**
 * QueryBuilderSurface — H06 §S7.8.
 *
 * Three-column layout: filter builder (left 340px) · preview +
 * results (centre flexible) · save-as-study modal.
 *
 * Honesty + H06 rules:
 *   • The "Reads as" banner renders a plain-English version of the
 *     stored query so the practitioner can spot mistakes without
 *     learning the JSON DSL.
 *   • Astrological axes are intentionally NOT exposed via the
 *     filter dropdown until the backend B122 executor handles them.
 *     The H06 design's astrological picker rail will surface back
 *     here when the columns are materialised — adding it now would
 *     create dead clicks (the executor returns 400 today).
 *   • "Materialise daily" save option defaults OFF — re-runs cost
 *     work; the practitioner opts in.
 *   • Sealed-excluded count is surfaced as a quiet stat in
 *     --ink-mute (mirrors B111 + B122 honesty).
 *   • No --danger anywhere.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";

// ── Types ──────────────────────────────────────────────────────────

export type QBSubject =
  | "entry"
  | "working"
  | "synchronicity"
  | "divination";

export type QBComparator =
  | "eq"
  | "ne"
  | "lt"
  | "le"
  | "gt"
  | "ge"
  | "in"
  | "nin"
  | "contains"
  | "matches"
  | "between";

export interface QBAxis {
  /** DSL field name, e.g. ``synchronicity.intensity``. */
  field: string;
  /** Short label for the dropdown. */
  label: string;
  /** Subjects this axis is reachable from. */
  subjects: readonly QBSubject[];
  /** Backend type — drives the right comparators + input shape. */
  type: "string" | "int" | "float" | "datetime" | "id_list" | "bool";
}

export interface QBFilterRow {
  id: string;
  field: string;
  cmp: QBComparator;
  /** Stored as a string in the UI; the route coerces to the
   *  right type at submission time. */
  value: string;
}

export interface QueryResultRow {
  id: string;
  /** "26 Jun 2026" */
  date_label: string;
  title: string;
  meta?: string;
  /** Optional accent stat ("8.1") — shown when present. */
  rating_label?: string;
}

export interface ExecutedQueryResult {
  total_rows: number;
  rows: readonly QueryResultRow[];
  sealed_excluded_count: number;
}

export interface QueryBuilderSurfaceProps {
  axes: readonly QBAxis[];
  initial_subject?: QBSubject;
  initial_filters?: readonly QBFilterRow[];
  /** Latest execution result; null when not yet run. */
  result: ExecutedQueryResult | null;
  loading?: boolean;
  /** Fires when the practitioner clicks Run. The route owns
   *  the actual POST to /api/v1/analytics/query and the
   *  coercion of the raw filter strings to the DSL value type. */
  onRun: (payload: {
    subject: QBSubject;
    filters: readonly QBFilterRow[];
  }) => void;
  /** Fires when the practitioner saves the current query as a
   *  Study. The route POSTs to /api/v1/studies. */
  onSave?: (payload: {
    name: string;
    description: string;
    subject: QBSubject;
    filters: readonly QBFilterRow[];
    materialise_daily: boolean;
  }) => void;
  onExportCsv?: () => void;
  onOpenResult?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Comparators per axis type ─────────────────────────────────────

const COMPARATORS_BY_TYPE: Record<QBAxis["type"], QBComparator[]> = {
  string: ["eq", "ne", "contains", "matches", "in", "nin"],
  int: ["eq", "ne", "lt", "le", "gt", "ge", "between", "in", "nin"],
  float: ["eq", "ne", "lt", "le", "gt", "ge", "between"],
  datetime: ["eq", "ne", "lt", "le", "gt", "ge", "between"],
  id_list: ["contains", "in", "nin"],
  bool: ["eq", "ne"],
};

const COMPARATOR_LABEL: Record<QBComparator, string> = {
  eq: "is",
  ne: "is not",
  lt: "<",
  le: "≤",
  gt: ">",
  ge: "≥",
  in: "in",
  nin: "not in",
  contains: "contains",
  matches: "matches",
  between: "between",
};

const SUBJECT_LABEL: Record<QBSubject, string> = {
  entry: "entry",
  working: "working",
  synchronicity: "synchronicity",
  divination: "divination",
};

// ── Helpers ───────────────────────────────────────────────────────

function nextRowId(rows: readonly QBFilterRow[]): string {
  return `row-${Date.now()}-${rows.length}`;
}

function plainEnglish(
  subject: QBSubject,
  filters: readonly QBFilterRow[],
  axesByField: Map<string, QBAxis>,
): string {
  if (filters.length === 0) {
    return `Every ${SUBJECT_LABEL[subject]} in your vault.`;
  }
  const parts = filters
    .map((f) => {
      const axis = axesByField.get(f.field);
      const axisLabel = axis ? axis.label : f.field;
      const cmpLabel = COMPARATOR_LABEL[f.cmp];
      const value = f.value.trim();
      return `${axisLabel} ${cmpLabel} ${value || "…"}`;
    })
    .join(" AND ");
  return `${SUBJECT_LABEL[subject].charAt(0).toUpperCase()}${SUBJECT_LABEL[subject].slice(1)} where ${parts}.`;
}

// ── Icons ─────────────────────────────────────────────────────────

function CloseIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function PlusIcon(): ReactElement {
  return (
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
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function QueryBuilderSurface({
  axes,
  initial_subject = "entry",
  initial_filters = [],
  result,
  loading = false,
  onRun,
  onSave,
  onExportCsv,
  onOpenResult,
  className,
  style,
}: QueryBuilderSurfaceProps) {
  const [subject, setSubject] = useState<QBSubject>(initial_subject);
  const [filters, setFilters] = useState<readonly QBFilterRow[]>(
    initial_filters,
  );
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [materialiseDaily, setMaterialiseDaily] = useState(false);

  // Escape closes the Save-query modal (b108-2fz a11y sweep).
  const closeSave = useCallback(() => setSaveOpen(false), []);
  useEscapeToClose(saveOpen, closeSave);

  const axesByField = useMemo(() => {
    const m = new Map<string, QBAxis>();
    for (const a of axes) m.set(a.field, a);
    return m;
  }, [axes]);

  const axesForSubject = useMemo(
    () => axes.filter((a) => a.subjects.includes(subject)),
    [axes, subject],
  );

  const englishLine = useMemo(
    () => plainEnglish(subject, filters, axesByField),
    [subject, filters, axesByField],
  );

  const handleAdd = useCallback(() => {
    const firstAxis = axesForSubject[0];
    if (!firstAxis) return;
    const firstCmp = COMPARATORS_BY_TYPE[firstAxis.type][0] ?? "eq";
    setFilters((arr) => [
      ...arr,
      {
        id: nextRowId(arr),
        field: firstAxis.field,
        cmp: firstCmp,
        value: "",
      },
    ]);
  }, [axesForSubject]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<QBFilterRow>) => {
      setFilters((arr) =>
        arr.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const handleRemove = useCallback((id: string) => {
    setFilters((arr) => arr.filter((f) => f.id !== id));
  }, []);

  const handleRun = useCallback(() => {
    onRun({ subject, filters });
  }, [subject, filters, onRun]);

  const handleOpenSave = useCallback(() => {
    setSaveOpen(true);
    setSaveName(englishLine.slice(0, 80));
  }, [englishLine]);

  const handleConfirmSave = useCallback(() => {
    onSave?.({
      name: saveName,
      description: saveDesc,
      subject,
      filters,
      materialise_daily: materialiseDaily,
    });
    setSaveOpen(false);
  }, [
    onSave,
    saveName,
    saveDesc,
    subject,
    filters,
    materialiseDaily,
  ]);

  const canRun = filters.length > 0 && filters.every((f) => f.value.trim().length > 0);

  return (
    <div
      data-component="query-builder-surface"
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
            Query Builder
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            A question, chained from filters; the answer with its
            sample size.
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <select
            data-subject-select
            value={subject}
            onChange={(e) => setSubject(e.target.value as QBSubject)}
            aria-label="Subject"
            style={{
              padding: "8px 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          >
            {(["entry", "working", "synchronicity", "divination"] as const).map(
              (s) => (
                <option key={s} value={s}>
                  {SUBJECT_LABEL[s]}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            data-run
            onClick={handleRun}
            disabled={!canRun || loading}
            style={{
              padding: "9px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: canRun && !loading ? "pointer" : "not-allowed",
              opacity: canRun && !loading ? 1 : 0.55,
            }}
          >
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </header>

      <div
        className="qb-cols"
        style={{
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* LEFT: filter builder */}
        <aside
          data-filter-builder
          className="scroll qb-side"
          style={{
            flex: "0 0 340px",
            minWidth: 0,
            borderRight: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "18px 16px 30px",
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
            Filters
          </div>
          {filters.length === 0 ? (
            <p
              data-filters-empty
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                margin: "0 0 14px",
              }}
            >
              Add a filter — the result will refresh when you press
              Run.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {filters.map((f, i) => {
                const axis = axesByField.get(f.field);
                const validComparators = axis
                  ? COMPARATORS_BY_TYPE[axis.type]
                  : ["eq" as QBComparator];
                return (
                  <div key={f.id} data-filter-row={f.id}>
                    {i > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          role="group"
                          aria-label="Connector"
                          style={{
                            display: "flex",
                            gap: 2,
                            padding: 2,
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            background: "var(--bg)",
                          }}
                        >
                          <span
                            style={{
                              padding: "3px 10px",
                              fontFamily: "var(--font-ui)",
                              fontSize: 11,
                              borderRadius: 4,
                              color: "var(--ink)",
                              background: "var(--accent-soft)",
                            }}
                          >
                            AND
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div
                      style={{
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg)",
                        padding: "13px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 9,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 10,
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            color: "var(--ink-mute)",
                          }}
                        >
                          {axis?.field.split(".")[0] ?? "axis"}
                        </span>
                        <button
                          type="button"
                          data-filter-remove={f.id}
                          aria-label="Remove filter"
                          onClick={() => handleRemove(f.id)}
                          style={{
                            color: "var(--ink-mute)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                        }}
                      >
                        <select
                          data-filter-axis={f.id}
                          value={f.field}
                          onChange={(e) =>
                            handleUpdate(f.id, { field: e.target.value })
                          }
                          aria-label="Axis"
                          style={{
                            width: "100%",
                            padding: "8px 11px",
                            border: "1px solid var(--line)",
                            borderRadius: "var(--r-sm)",
                            background: "var(--bg-2)",
                            color: "var(--ink)",
                            fontFamily: "var(--font-ui)",
                            fontSize: 13,
                          }}
                        >
                          {axesForSubject.map((a) => (
                            <option key={a.field} value={a.field}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: "flex", gap: 7 }}>
                          <select
                            data-filter-cmp={f.id}
                            value={f.cmp}
                            onChange={(e) =>
                              handleUpdate(f.id, {
                                cmp: e.target.value as QBComparator,
                              })
                            }
                            aria-label="Comparator"
                            style={{
                              flex: "0 0 120px",
                              padding: "8px 11px",
                              border: "1px solid var(--line)",
                              borderRadius: "var(--r-sm)",
                              background: "var(--bg-2)",
                              color: "var(--ink-soft)",
                              fontFamily: "var(--font-ui)",
                              fontSize: 12.5,
                            }}
                          >
                            {validComparators.map((c) => (
                              <option key={c} value={c}>
                                {COMPARATOR_LABEL[c]}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            data-filter-value={f.id}
                            value={f.value}
                            placeholder="value"
                            onChange={(e) =>
                              handleUpdate(f.id, { value: e.target.value })
                            }
                            aria-label="Value"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: "8px 11px",
                              border: "1px solid var(--line)",
                              borderRadius: "var(--r-sm)",
                              background: "var(--bg-2)",
                              color: "var(--ink)",
                              fontFamily: "var(--font-ui)",
                              fontSize: 12.5,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            data-add-filter
            onClick={handleAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              marginTop: 12,
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
            <PlusIcon />
            Add a filter
          </button>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
              marginTop: 14,
              lineHeight: 1.45,
            }}
          >
            Astrological filters (Moon phase, planetary hour, etc.) will
            arrive when those columns are materialised in the search
            index. Until then the picker stays simple.
          </p>
        </aside>

        {/* CENTRE: preview + results */}
        <main
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            padding: "22px 26px 50px",
          }}
        >
          {/* Reads-as banner */}
          <div
            data-reads-as
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "14px 18px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                flex: "none",
                paddingTop: 3,
              }}
            >
              Reads as
            </span>
            <p
              style={{
                flex: 1,
                fontFamily: "var(--font-serif)",
                fontSize: 17,
                lineHeight: 1.5,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              {englishLine}
            </p>
          </div>

          {result !== null ? (
            <>
              <div
                data-result-count
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {result.total_rows}{" "}
                {SUBJECT_LABEL[subject]}
                {result.total_rows === 1 ? "" : "s"} match
                {result.sealed_excluded_count > 0 ? (
                  <span
                    data-sealed-stat
                    style={{ marginLeft: 8, color: "var(--ink-mute)" }}
                  >
                    · {result.sealed_excluded_count} sealed (count only)
                  </span>
                ) : null}
              </div>
              {result.rows.length === 0 ? (
                <div
                  data-no-match
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink-soft)",
                    padding: "5vh 0",
                    textAlign: "center",
                  }}
                >
                  Nothing matched. Try widening a comparator.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {result.rows.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      data-result-row={r.id}
                      onClick={() => onOpenResult?.(r.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 15,
                        padding: "14px 16px",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        textAlign: "left",
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                          flex: "none",
                          width: 74,
                        }}
                      >
                        {r.date_label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 16,
                            color: "var(--ink)",
                          }}
                        >
                          {r.title}
                        </div>
                        {r.meta ? (
                          <div
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 11.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {r.meta}
                          </div>
                        ) : null}
                      </div>
                      {r.rating_label ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            flex: "none",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 13,
                              color: "var(--accent)",
                            }}
                          >
                            {r.rating_label}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 10.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            /10
                          </span>
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 18,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  data-save-as-study
                  onClick={handleOpenSave}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Save as study
                </button>
                <button
                  type="button"
                  data-export-csv
                  onClick={onExportCsv}
                  style={{
                    padding: "9px 15px",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "transparent",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  CSV
                </button>
              </div>
            </>
          ) : (
            <div
              data-not-run
              style={{
                textAlign: "center",
                padding: "8vh 0",
                color: "var(--ink-mute)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-glyph)",
                  fontSize: 34,
                  color: "var(--line-2)",
                }}
                aria-hidden="true"
              >
                ⌖
              </span>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  margin: "14px auto 0",
                  maxWidth: 340,
                }}
              >
                Build a filter on the left, then Run. Queries against
                larger journals may take a moment.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Save modal */}
      {saveOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Save query"
          data-save-modal
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={() => setSaveOpen(false)}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.55)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "min(440px, 100%)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-lg)",
              background: "var(--bg)",
              boxShadow: "0 24px 60px rgba(0,0,0,.5)",
              padding: "24px 26px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                margin: "0 0 16px",
              }}
            >
              Save this query
            </h2>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              Name
            </label>
            <input
              type="text"
              data-save-name
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                marginBottom: 14,
              }}
            />
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              Description{" "}
              <span style={{ color: "var(--ink-mute)" }}>· optional</span>
            </label>
            <textarea
              rows={2}
              data-save-description
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                resize: "vertical",
                marginBottom: 14,
              }}
            />
            <label
              data-materialise-toggle
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: "pointer",
                marginBottom: 18,
              }}
            >
              <input
                type="checkbox"
                checked={materialiseDaily}
                onChange={(e) => setMaterialiseDaily(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  flex: "none",
                  marginTop: 1,
                  accentColor: "var(--accent)",
                }}
                aria-label="Materialise the count daily"
              />
              <span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                >
                  Materialise the count daily
                </span>
                <br />
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  Re-runs daily so the Studies index shows a fresh
                  count without reopening.
                </span>
              </span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                data-save-cancel
                onClick={() => setSaveOpen(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--line-2)",
                  background: "transparent",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-save-confirm
                onClick={handleConfirmSave}
                disabled={saveName.trim() === ""}
                style={{
                  flex: 1.4,
                  padding: 12,
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: saveName.trim() === "" ? "not-allowed" : "pointer",
                  opacity: saveName.trim() === "" ? 0.55 : 1,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
