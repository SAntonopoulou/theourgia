/**
 * SynchronicityLogSurface — H06 §S7.9.
 *
 * Two-column layout: pattern rail (left, 300px) · main log
 * grouped by day (right, flexible).
 *
 * Honesty + H06 rules:
 *   • Pattern observations carry the "observations only" framing —
 *     "Last refreshed Xh ago · observations only". Never oracular.
 *   • Small-sample chips on patterns use --accent (warm invitation),
 *     never --warn / --danger.
 *   • Filter chips include a search box at the head.
 *   • Each log entry shows: time · category dot · description ·
 *     category chip · optional entity tag · open-chevron.
 *   • Sealed synchronicities (rare — only when the practitioner
 *     opts in) surface as count-only at the day's foot — the row
 *     never renders sealed phrase content.
 *   • No --danger anywhere.
 */

import {
  type CSSProperties,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SyncCategoryId =
  | "number_sequence"
  | "name_occurrence"
  | "dream_spillover"
  | "animal_omen"
  | "song_lyric"
  | "overheard_speech"
  | "weather"
  | "object_encounter"
  | "electromagnetic"
  | "custom";

export interface SyncLogItem {
  id: string;
  /** "14:32" */
  time_label: string;
  description: string;
  category: SyncCategoryId;
  intensity: number;
  /** Optional entity tag — "☽ Hekate" — derived by the route. */
  entity_label?: string | null;
}

export interface SyncLogDay {
  /** "26 Jun 2026" */
  date_label: string;
  /** Per-day astrological summary — "Sun in Cancer · Waning Moon". */
  astro_summary: string | null;
  items: readonly SyncLogItem[];
}

export interface PatternCard {
  id: string;
  text: string;
  /** "n=14 · 78%" */
  stat_label: string;
  small_sample: boolean;
  /** Filter that loading this pattern applies — opaque to the
   *  surface; the route decodes it. */
  filter_payload?: Record<string, unknown>;
}

export interface SynchronicityLogSurfaceProps {
  days: readonly SyncLogDay[];
  patterns: readonly PatternCard[];
  /** Total count line at the bottom of the log. */
  total_recorded: number;
  /** True while patterns are recomputing. */
  patterns_loading?: boolean;
  patterns_last_refreshed_label?: string | null;
  onOpenItem?: (id: string) => void;
  onCapture?: () => void;
  onExport?: () => void;
  onViewPattern?: (id: string) => void;
  onDismissPattern?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Category glyphs (mirror the QuickCapture set) ─────────────────

const CATEGORY_GLYPH: Record<SyncCategoryId, string> = {
  number_sequence: "1·1",
  name_occurrence: "A·a",
  dream_spillover: "☽",
  animal_omen: "🦅",
  song_lyric: "♪",
  overheard_speech: "❝",
  weather: "☁",
  object_encounter: "◇",
  electromagnetic: "⚡",
  custom: "✶",
};

const CATEGORY_LABEL: Record<SyncCategoryId, string> = {
  number_sequence: "Number",
  name_occurrence: "Name",
  dream_spillover: "Dream",
  animal_omen: "Animal",
  song_lyric: "Song",
  overheard_speech: "Overheard",
  weather: "Weather",
  object_encounter: "Object",
  electromagnetic: "EM",
  custom: "Other",
};

// ── Surface ───────────────────────────────────────────────────────

const CATEGORY_FILTERS: { id: SyncCategoryId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "number_sequence", label: "Numbers" },
  { id: "name_occurrence", label: "Names" },
  { id: "dream_spillover", label: "Dreams" },
  { id: "animal_omen", label: "Animals" },
  { id: "song_lyric", label: "Song" },
];

export function SynchronicityLogSurface({
  days,
  patterns,
  total_recorded,
  patterns_loading = false,
  patterns_last_refreshed_label,
  onOpenItem,
  onCapture,
  onExport,
  onViewPattern,
  onDismissPattern,
  className,
  style,
}: SynchronicityLogSurfaceProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<SyncCategoryId | "all">("all");

  const filteredDays = useMemo<SyncLogDay[]>(() => {
    const lower = search.trim().toLowerCase();
    return days
      .map((d) => ({
        ...d,
        items: d.items.filter((it) => {
          if (filter !== "all" && it.category !== filter) return false;
          if (lower && !it.description.toLowerCase().includes(lower))
            return false;
          return true;
        }),
      }))
      .filter((d) => d.items.length > 0);
  }, [days, filter, search]);

  return (
    <div
      data-component="synchronicity-log-surface"
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
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Synchronicity Log
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            What you've noticed — recorded plainly, read as evidence.
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            data-capture-cta
            onClick={onCapture}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 15px",
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
            Capture
          </button>
        </div>
      </header>

      <div
        className="sl-cols"
        style={{
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Pattern rail */}
        <aside
          data-pattern-rail
          className="scroll sl-rail"
          style={{
            flex: "0 0 300px",
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
              marginBottom: 4,
            }}
          >
            Patterns present
          </div>
          <div
            data-pattern-refresh-label
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            {patterns_loading
              ? "Recomputing patterns…"
              : `${patterns_last_refreshed_label ?? "—"} · observations only`}
          </div>
          {patterns.length === 0 ? (
            <div
              data-patterns-empty
              style={{
                padding: "8px 0",
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
            >
              No patterns yet — capture a few more and a weekly
              recompute will surface what your record suggests.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {patterns.map((p) => (
                <div
                  key={p.id}
                  data-pattern-card={p.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg)",
                    padding: "14px 15px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      lineHeight: 1.5,
                      color: "var(--ink-soft)",
                      margin: "0 0 10px",
                    }}
                  >
                    {p.text}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 11,
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
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      data-pattern-view={p.id}
                      onClick={() => onViewPattern?.(p.id)}
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
                    <button
                      type="button"
                      data-pattern-dismiss={p.id}
                      onClick={() => onDismissPattern?.(p.id)}
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main log */}
        <div
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            padding: "18px 26px 50px",
          }}
        >
          {/* Filter row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", flex: "0 0 200px" }}>
              <span
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-mute)",
                }}
                aria-hidden="true"
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                >
                  <circle cx={11} cy={11} r={7} />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                type="text"
                data-log-search
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the log…"
                aria-label="Search the log"
                style={{
                  width: "100%",
                  padding: "8px 11px 8px 32px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                }}
              />
            </div>
            {CATEGORY_FILTERS.map((c) => {
              const on = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-category-filter={c.id}
                  aria-pressed={on}
                  onClick={() => setFilter(c.id)}
                  style={{
                    padding: "7px 13px",
                    borderRadius: 20,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                    background: on ? "var(--accent-soft)" : "var(--bg-2)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: on ? "var(--ink)" : "var(--ink-mute)",
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div style={{ maxWidth: 760 }}>
            {filteredDays.length === 0 ? (
              <div
                data-log-empty
                style={{
                  padding: "9vh 0",
                  textAlign: "center",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                }}
              >
                No synchronicities match — try a different category or
                clear the search.
              </div>
            ) : (
              filteredDays.map((d) => (
                <div
                  key={d.date_label}
                  data-log-day={d.date_label}
                  style={{ marginBottom: 24 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 0 12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        color: "var(--ink)",
                      }}
                    >
                      {d.date_label}
                    </span>
                    {d.astro_summary ? (
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {d.astro_summary}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {d.items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        data-log-item={s.id}
                        onClick={() => onOpenItem?.(s.id)}
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
                            fontSize: 12,
                            color: "var(--ink-mute)",
                            flex: "none",
                            width: 42,
                          }}
                        >
                          {s.time_label}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            flex: "none",
                            color: "var(--accent)",
                          }}
                          aria-hidden="true"
                        >
                          {CATEGORY_GLYPH[s.category]}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontFamily: "var(--font-serif)",
                            fontSize: 15.5,
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.description}
                        </span>
                        <span
                          data-category-chip={s.category}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            border: "1px solid var(--line-2)",
                            borderRadius: 20,
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                            flex: "none",
                          }}
                        >
                          {CATEGORY_LABEL[s.category]}
                        </span>
                        {s.entity_label ? (
                          <span
                            data-entity-tag
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 11,
                              color: "var(--ink-mute)",
                              flex: "none",
                            }}
                          >
                            {s.entity_label}
                          </span>
                        ) : null}
                        <span
                          style={{
                            color: "var(--ink-mute)",
                            flex: "none",
                          }}
                          aria-hidden="true"
                        >
                          <svg
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Footer count line + export */}
            <div
              data-log-footer
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                paddingTop: 6,
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--line)" }}
              />
              <span>
                {total_recorded} synchronicit
                {total_recorded === 1 ? "y" : "ies"} recorded ·{" "}
                <button
                  type="button"
                  data-export
                  onClick={onExport}
                  style={{
                    color: "var(--ink-soft)",
                    textDecoration: "underline",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Export
                </button>
              </span>
              <div
                style={{ flex: 1, height: 1, background: "var(--line)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
