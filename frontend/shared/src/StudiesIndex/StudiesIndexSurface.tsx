/**
 * StudiesIndexSurface — H06 §S7.5 (Saved Studies Index).
 *
 * A grid of the practitioner's saved gematria + analytics queries.
 * Each card shows the study's name, a one-line description, a
 * small thumb visualisation hint, the time since last run, the
 * sample size, and optional "small sample" + "stale" chips.
 *
 * Honesty + H06 rules:
 *   • A study with sample size below the configurable threshold
 *     surfaces a `small sample` chip in `--ink-mute` — never
 *     `--warn` or `--danger`. The chip is informational.
 *   • A study that hasn't been re-run in N days surfaces a
 *     `stale — re-run?` chip in `--accent` (warm invitation, not
 *     red alert).
 *   • Bundled studies (authored by the Theourgia team) carry a
 *     `‡` chip — the same Nominatim/OSM `‡` glyph reused as
 *     "this is from the project, not authored by you".
 *   • Re-running a study creates a new snapshot (the B112 rule);
 *     the card surfaces the most-recent run's metadata.
 *   • Empty state: "No studies yet — Save a search to start one."
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type StudyKind = "gematria_search" | "gematria_calculation";
export type StudiesFilter = "mine" | "shared" | "bundled";

export interface StudyCard {
  id: string;
  name: string;
  kind: StudyKind;
  description: string;
  /** A short, human-friendly "run X ago" label produced by the
   *  route. The surface doesn't compute time itself. */
  last_run_label: string | null;
  /** Sample size of the most-recent snapshot. */
  sample_size: number;
  /** Whether the sample size is below the practitioner's threshold. */
  small_sample: boolean;
  /** True when the last run is "stale" (route owns the policy). */
  stale: boolean;
  /** Set on bundled studies (Theourgia-authored). */
  bundled: boolean;
  /** Optional thumb hint — line/bars/heat. The surface picks
   *  a deterministic stylised SVG based on the study id. */
  thumb_hint: "bars" | "heat" | "line";
}

export interface StudiesIndexSurfaceProps {
  studies: readonly StudyCard[];
  /** True while the index is fetching. */
  loading?: boolean;
  onOpen?: (id: string) => void;
  onNew?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Filter chips ──────────────────────────────────────────────────

const FILTERS: { id: StudiesFilter; label: string }[] = [
  { id: "mine", label: "Mine" },
  { id: "shared", label: "Shared with this network" },
  { id: "bundled", label: "Bundled examples" },
];

// ── Stylised thumbs ───────────────────────────────────────────────

function seedRng(seed: number): () => number {
  let x = (seed * 2654435761) >>> 0;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function ThumbBars({ seed }: { seed: number }): ReactElement {
  const rnd = seedRng(seed);
  const cols = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  const n = 9;
  const W = 240;
  const H = 84;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxHeight: 90 }}
      aria-hidden="true"
    >
      {Array.from({ length: n }, (_, i) => {
        const h = 14 + rnd() * 64;
        return (
          <rect
            key={i}
            x={6 + (i * (W - 12)) / n}
            y={H - h}
            width={((W - 12) / n) * 0.66}
            height={h}
            rx={2}
            fill={cols[i % 3]}
            fillOpacity={0.55}
          />
        );
      })}
    </svg>
  );
}

function ThumbHeat({ seed }: { seed: number }): ReactElement {
  const rnd = seedRng(seed);
  const cells: ReactElement[] = [];
  const cw = 26;
  const ch = 20;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={30 + c * cw}
          y={8 + r * ch}
          width={cw - 3}
          height={ch - 3}
          rx={2}
          fill="var(--accent)"
          fillOpacity={0.08 + rnd() * 0.7}
        />,
      );
    }
  }
  return (
    <svg
      viewBox="0 0 220 76"
      width="100%"
      style={{ maxHeight: 90 }}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

function ThumbLine({ seed }: { seed: number }): ReactElement {
  const rnd = seedRng(seed);
  let d = "M6 60";
  for (let i = 1; i <= 10; i++) {
    d += ` L${6 + i * 22} ${20 + rnd() * 45}`;
  }
  return (
    <svg
      viewBox="0 0 240 84"
      width="100%"
      style={{ maxHeight: 90 }}
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke="var(--chart-2)" strokeWidth={2} />
    </svg>
  );
}

function thumbFor(study: StudyCard): ReactElement {
  const seed = hashId(study.id) || 1;
  switch (study.thumb_hint) {
    case "bars":
      return <ThumbBars seed={seed} />;
    case "heat":
      return <ThumbHeat seed={seed} />;
    case "line":
    default:
      return <ThumbLine seed={seed} />;
  }
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

function SearchIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function StudiesIndexSurface({
  studies,
  loading = false,
  onOpen,
  onNew,
  className,
  style,
}: StudiesIndexSurfaceProps) {
  const [filter, setFilter] = useState<StudiesFilter>("mine");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return studies.filter((s) => {
      if (filter === "mine" && s.bundled) return false;
      if (filter === "bundled" && !s.bundled) return false;
      // "shared" filter is a no-op until the federation layer
      // adds the shared/visibility join; for now it shows nothing.
      if (filter === "shared") return false;
      if (lower !== "") {
        if (
          !s.name.toLowerCase().includes(lower) &&
          !s.description.toLowerCase().includes(lower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [studies, filter, search]);

  return (
    <div
      data-component="studies-index-surface"
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
            Saved Studies
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            A query you keep running, named, with your interpretation kept
            beside it.
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ position: "relative", flex: "0 0 220px" }}>
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
              <SearchIcon />
            </span>
            <input
              type="text"
              data-studies-search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studies…"
              aria-label="Search studies"
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
          <button
            type="button"
            data-new-study
            onClick={onNew}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
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
            <PlusIcon />
            New study
          </button>
        </div>
      </header>

      <main
        className="scroll"
        style={{ overflowY: "auto", minHeight: 0, padding: "20px 26px 50px" }}
      >
        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                data-filter={f.id}
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accent-soft)" : "var(--bg-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: on ? "var(--ink)" : "var(--ink-mute)",
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div
            data-studies-loading
            style={{
              textAlign: "center",
              padding: "6vh 0",
              color: "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          >
            Loading studies…
          </div>
        ) : visible.length === 0 ? (
          <div
            data-studies-empty
            style={{
              textAlign: "center",
              padding: "8vh 0",
              color: "var(--ink-mute)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                margin: 0,
                color: "var(--ink-soft)",
              }}
            >
              {filter === "shared"
                ? "Shared studies aren't available yet on this instance."
                : filter === "bundled"
                  ? "No bundled studies in this instance."
                  : "No studies yet — save a search from the Search surface to start one."}
            </p>
          </div>
        ) : (
          <div
            data-studies-grid
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              maxWidth: 1140,
            }}
          >
            {visible.map((s) => (
              <button
                key={s.id}
                type="button"
                data-study-card={s.id}
                onClick={() => onOpen?.(s.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg)",
                  background: "var(--bg-2)",
                  overflow: "hidden",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    aspectRatio: "2",
                    background: "var(--bg-sunk)",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 14,
                  }}
                >
                  {thumbFor(s)}
                </div>
                <div style={{ padding: "15px 16px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        color: "var(--ink)",
                        lineHeight: 1.15,
                      }}
                    >
                      {s.name}
                    </span>
                    {s.bundled ? (
                      <span
                        data-bundled-chip
                        title="Bundled example · authored by the Theourgia team"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontFamily: "var(--font-glyph)",
                          fontSize: 10,
                          flex: "none",
                        }}
                      >
                        ‡
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink-soft)",
                      lineHeight: 1.45,
                      margin: "0 0 12px",
                    }}
                  >
                    {s.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {s.last_run_label ? (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {s.last_run_label}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        never run
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                      }}
                    >
                      · n={s.sample_size}
                    </span>
                    {s.small_sample ? (
                      <span
                        data-small-sample-chip
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          color: "var(--ink-mute)",
                          border: "1px solid var(--line-2)",
                          borderRadius: 20,
                          padding: "1px 7px",
                        }}
                      >
                        small sample
                      </span>
                    ) : null}
                    {s.stale ? (
                      <span
                        data-stale-chip
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: "var(--accent)",
                          border: "1px solid var(--accent-soft)",
                          borderRadius: 20,
                          padding: "1px 8px",
                        }}
                      >
                        stale — re-run?
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
