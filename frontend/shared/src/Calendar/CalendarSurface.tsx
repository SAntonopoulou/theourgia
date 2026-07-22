/**
 * CalendarSurface — the full Calendar page body.
 *
 * Per `Theourgia Calendar.dc.html` (H01-H03). Composes, top to bottom
 * of the calendar column: the control bar (month stepper · Today ·
 * Month/Week-list view toggle), the tradition overlay chips, the
 * event-kind filter chips, then either the `MonthGrid` or the agenda
 * list ("also the screen-reader list view"). The right rail carries
 * the detail card (Today by default; a selected festival renders
 * `FestivalDetail`, a selected astro event its own card) and the
 * citation-kind legend ("How a festival is attested").
 *
 * The surface is data-pure: festival instances + astro events arrive
 * as props covering (at least) the focused month; `onMonthChange`
 * lets the route fetch a new range when the operator steps months.
 * All date math is local-calendar (Y/M/D triples), Sunday-first, per
 * the design's grid.
 *
 * Responsive: below 900px the 7-column grid scrolls horizontally
 * inside its own wrapper rather than crushing (design's `.cal-scroll`
 * / `.cal-grid { min-width:680px }` note); the two columns flex-wrap.
 *
 * Documented deviations from the demo mock (generalisations, not
 * omissions):
 *  - The mock's fixed June-2026 5-week grid is real month math here
 *    (4–6 weeks, any month).
 *  - The Today card's poetic subtitle ("The Sun at its northern
 *    station — the longest day.") was solstice-specific demo copy
 *    with no general data source; the card renders date + items only.
 *  - Multi-day festival bars clip to the focused month; a clipped
 *    edge renders square (no rounding), signalling continuation.
 */

import { type CSSProperties, useMemo, useState } from "react";

import { useNarrowLayout } from "../hooks/useNarrowLayout.js";

import {
  CITATION_KINDS,
  CITATION_KIND_ORDER,
  FESTIVAL_TRADITIONS,
  FESTIVAL_TRADITION_ORDER,
  type CitationKind,
  type Festival,
  type FestivalSource,
  type FestivalTradition,
} from "./festivals.js";
import {
  MonthGrid,
  type MonthDay,
  type MonthWeek,
  type MultiDayFestivalBar,
} from "./MonthGrid.js";
import { FestivalDetail } from "./FestivalDetail.js";

// ─── Public data types ─────────────────────────────────────────────────

export type AstroKindGroup = "lunation" | "solar" | "conjunction";

export interface CalendarAstroEvent {
  id: string;
  /** Local calendar day the event belongs to, "YYYY-MM-DD". */
  date: string;
  /** Mark rendered in the grid row + detail circle. */
  glyph: string;
  /** Short grid label ("Full moon"). */
  label: string;
  /** Detail title ("Full moon · Strawberry Moon"). */
  name: string;
  /** Detail subtitle ("Moon in Sagittarius"). */
  sub: string;
  /** Detail body. */
  description: string;
  kindGroup: AstroKindGroup;
}

export interface CalendarFestivalInstance {
  /** Instance-unique id (a festival can recur within a month). */
  id: string;
  festivalId: string;
  name: string;
  tradition: FestivalTradition;
  glyph: string;
  /** Human-facing occurrence label ("7–15 June", "dark of the moon"). */
  label: string;
  /** Local first day, "YYYY-MM-DD", inclusive. */
  startDate: string;
  /** Local last day, "YYYY-MM-DD", inclusive. */
  endDate: string;
  description: string;
  practice: string;
  sources: FestivalSource[];
}

export interface CalendarSurfaceProps {
  festivals?: readonly CalendarFestivalInstance[];
  astro?: readonly CalendarAstroEvent[];
  /** Focused month at mount; defaults to `today`'s month. */
  initialYear?: number;
  /** 1–12. */
  initialMonth?: number;
  /** "Today" as a local "YYYY-MM-DD"; defaults to the real clock. */
  today?: string;
  onMonthChange?: (year: number, month: number) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Local-date helpers ────────────────────────────────────────────────

interface Ymd {
  y: number;
  m: number; // 1–12
  d: number;
}

function parseYmd(iso: string): Ymd {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return { y, m, d };
}

function toIso(ymd: Ymd): string {
  const mm = String(ymd.m).padStart(2, "0");
  const dd = String(ymd.d).padStart(2, "0");
  return `${ymd.y}-${mm}-${dd}`;
}

/** Days since a fixed epoch — safe integer arithmetic on local days. */
function dayNumber(ymd: Ymd): number {
  return Math.round(Date.UTC(ymd.y, ymd.m - 1, ymd.d) / 86_400_000);
}

function fromDayNumber(n: number): Ymd {
  const date = new Date(n * 86_400_000);
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}

/** 0 = Sunday … 6 = Saturday (design grid is Sunday-first). */
function weekdayOf(n: number): number {
  // Day 0 of the epoch (1970-01-01) was a Thursday (4).
  return (((n + 4) % 7) + 7) % 7;
}

function localTodayIso(): string {
  const now = new Date();
  return toIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

// ─── Small shared styles (design-literal) ──────────────────────────────

const SEG_BASE: CSSProperties = {
  padding: "5px 11px",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  letterSpacing: ".03em",
  color: "var(--ink-mute)",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  transition: "all .15s ease",
  cursor: "pointer",
};

const SEG_ON: CSSProperties = {
  ...SEG_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginRight: 2,
};

function chipStyle(on: boolean, soon = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "5px 11px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    border: `1px solid ${on ? "var(--line-2)" : "var(--line)"}`,
    background: on ? "var(--bg-3)" : "transparent",
    color: soon ? "var(--ink-mute)" : on ? "var(--ink)" : "var(--ink-mute)",
    opacity: soon ? 0.55 : 1,
    cursor: soon ? "default" : "pointer",
  };
}

function badgeStyle(kind: CitationKind): CSSProperties {
  return {
    width: 24,
    height: 24,
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "1px solid var(--line-2)",
    background: "var(--bg-3)",
    fontFamily: "var(--font-glyph)",
    fontSize: 13,
    color: CITATION_KINDS[kind].color,
  };
}

// ─── Icons ─────────────────────────────────────────────────────────────

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ─── Kind filter metadata ──────────────────────────────────────────────

const KIND_ORDER: { key: AstroKindGroup; name: string; glyph: string }[] = [
  { key: "lunation", name: "Lunations", glyph: "◐" },
  { key: "solar", name: "Solar", glyph: "☀" },
  { key: "conjunction", name: "Conjunctions", glyph: "☌" },
];

// ─── Selection model ───────────────────────────────────────────────────

type Selection =
  | { type: "today" }
  | { type: "fest"; id: string }
  | { type: "astro"; id: string };

// ─── Agenda / today item row ───────────────────────────────────────────

interface EventItem {
  key: string;
  name: string;
  meta: string;
  glyph: string;
  glyphColor: string;
  edge: string;
  onSelect: () => void;
}

function EventItemButton({ item, compact }: { item: EventItem; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={item.onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        padding: compact ? "8px 10px" : "7px 10px",
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${item.edge}`,
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-3)",
        cursor: "pointer",
        color: "var(--ink)",
        width: "100%",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 15,
          color: item.glyphColor,
          flex: "none",
        }}
      >
        {item.glyph}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: compact ? 14.5 : 15, color: "var(--ink)" }}>
          {item.name}
        </span>{" "}
        {item.meta ? (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {item.meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ─── The surface ───────────────────────────────────────────────────────

export function CalendarSurface({
  festivals = [],
  astro = [],
  initialYear,
  initialMonth,
  today,
  onMonthChange,
  className,
  style,
}: CalendarSurfaceProps) {
  const todayIso = today ?? localTodayIso();
  const todayYmd = parseYmd(todayIso);
  const todayN = dayNumber(todayYmd);

  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: initialYear ?? todayYmd.y,
    m: initialMonth ?? todayYmd.m,
  });
  const [view, setView] = useState<"month" | "week">("month");
  const [trad, setTrad] = useState<Record<FestivalTradition, boolean>>({
    woty: true,
    greek: true,
    roman: true,
    hekatean: true,
    thelemic: true,
    hindu: false,
    egyptian: false,
  });
  const [kinds, setKinds] = useState<Record<AstroKindGroup, boolean>>({
    lunation: true,
    solar: true,
    conjunction: true,
  });
  const [sel, setSel] = useState<Selection>({ type: "today" });

  // Design: keep the 7-col grid legible by scrolling rather than crushing.
  const narrow = useNarrowLayout("(max-width: 900px)");

  // NOT inside the setState updater — a side effect there fires
  // mid-render (React warns) and doubles under StrictMode.
  const stepMonth = (delta: number) => {
    const zero = cursor.y * 12 + (cursor.m - 1) + delta;
    const next = { y: Math.floor(zero / 12), m: (zero % 12 + 12) % 12 + 1 };
    setCursor(next);
    onMonthChange?.(next.y, next.m);
  };
  const goToday = () => {
    if (cursor.y === todayYmd.y && cursor.m === todayYmd.m) return;
    setCursor({ y: todayYmd.y, m: todayYmd.m });
    onMonthChange?.(todayYmd.y, todayYmd.m);
  };

  // ── Filters ──
  const festVisible = (f: CalendarFestivalInstance) => !!trad[f.tradition];
  const astroVisible = (a: CalendarAstroEvent) => !!kinds[a.kindGroup];

  // ── Month grid model ──
  const grid = useMemo(() => {
    const firstN = dayNumber({ y: cursor.y, m: cursor.m, d: 1 });
    const daysInMonth =
      dayNumber({ y: cursor.m === 12 ? cursor.y + 1 : cursor.y, m: cursor.m === 12 ? 1 : cursor.m + 1, d: 1 }) - firstN;
    const lastN = firstN + daysInMonth - 1;
    const gridStart = firstN - weekdayOf(firstN);
    const gridEnd = lastN + (6 - weekdayOf(lastN));
    const weekCount = (gridEnd - gridStart + 1) / 7;

    const astroByN = new Map<number, CalendarAstroEvent[]>();
    for (const a of astro) {
      if (!astroVisible(a)) continue;
      const n = dayNumber(parseYmd(a.date));
      const bucket = astroByN.get(n) ?? [];
      bucket.push(a);
      astroByN.set(n, bucket);
    }

    // Single-day chips keyed by day number (in-month cells only, per design).
    const singleByN = new Map<number, CalendarFestivalInstance[]>();
    const multi: { inst: CalendarFestivalInstance; startN: number; endN: number }[] = [];
    for (const f of festivals) {
      if (!festVisible(f)) continue;
      const s = dayNumber(parseYmd(f.startDate));
      const e = dayNumber(parseYmd(f.endDate));
      if (s === e) {
        const bucket = singleByN.get(s) ?? [];
        bucket.push(f);
        singleByN.set(s, bucket);
      } else {
        multi.push({ inst: f, startN: s, endN: e });
      }
    }

    const toFestival = (f: CalendarFestivalInstance): Festival => {
      const s = parseYmd(f.startDate);
      const e = parseYmd(f.endDate);
      return {
        id: f.id,
        name: f.name,
        tradition: f.tradition,
        glyph: f.glyph,
        label: f.label,
        ...(f.startDate === f.endDate ? { day: s.d } : { start: s.d, end: e.d }),
        description: f.description,
        practice: f.practice,
        sources: f.sources,
      };
    };

    const weeks: MonthWeek[] = [];
    for (let w = 0; w < weekCount; w++) {
      const wkStart = gridStart + w * 7;
      const days: MonthDay[] = [];
      let prevOutRunStarted = false;
      for (let col = 0; col < 7; col++) {
        const n = wkStart + col;
        const ymd = fromDayNumber(n);
        const inMonth = n >= firstN && n <= lastN;
        // Out-of-month tag on the first cell of each out-month run.
        let outOfMonthTag: string | undefined;
        if (!inMonth) {
          const isRunStart = n === gridStart || ymd.d === 1;
          if (isRunStart && !prevOutRunStarted) {
            outOfMonthTag = MONTH_SHORT[ymd.m - 1];
            prevOutRunStarted = true;
          }
        } else {
          prevOutRunStarted = false;
        }
        days.push({
          dom: ymd.d,
          inMonth,
          isToday: n === todayN,
          ...(outOfMonthTag !== undefined ? { outOfMonthTag } : {}),
          astro: (astroByN.get(n) ?? []).map((a) => ({
            id: a.id,
            glyph: a.glyph,
            label: a.label,
          })),
          festivals: inMonth
            ? (singleByN.get(n) ?? []).map(toFestival)
            : [],
        });
      }
      // Multi-day bars intersecting this week, clipped to the month.
      const bars: MultiDayFestivalBar[] = [];
      for (const { inst, startN, endN } of multi) {
        const clipS = Math.max(startN, firstN);
        const clipE = Math.min(endN, lastN);
        const segS = Math.max(clipS, wkStart);
        const segE = Math.min(clipE, wkStart + 6);
        if (segE < segS) continue;
        bars.push({
          festival: toFestival(inst),
          startCol: segS - wkStart,
          span: segE - segS + 1,
          isStart: segS === startN,
          isEnd: segE === endN,
        });
      }
      weeks.push({ days, ...(bars.length ? { bars } : {}) });
    }

    return { weeks, firstN, lastN, astroByN, singleByN, multi };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, festivals, astro, trad, kinds, todayN]);

  // ── Lookup helpers for selection ──
  const astroById = useMemo(() => {
    const m = new Map<string, CalendarAstroEvent>();
    for (const a of astro) m.set(a.id, a);
    return m;
  }, [astro]);
  const festById = useMemo(() => {
    const m = new Map<string, CalendarFestivalInstance>();
    for (const f of festivals) m.set(f.id, f);
    return m;
  }, [festivals]);

  const selectAstro = (id: string) => setSel({ type: "astro", id });
  const selectFest = (id: string) => setSel({ type: "fest", id });
  const clearSel = () => setSel({ type: "today" });

  // ── Items for a given day (agenda rows + Today card) ──
  const itemsForDay = (n: number): EventItem[] => {
    const items: EventItem[] = [];
    for (const a of grid.astroByN.get(n) ?? []) {
      items.push({
        key: `a-${a.id}`,
        name: a.name,
        meta: a.sub ? `· ${a.sub}` : "",
        glyph: a.glyph,
        glyphColor: "var(--ink-soft)",
        edge: "var(--line-2)",
        onSelect: () => selectAstro(a.id),
      });
    }
    for (const f of grid.singleByN.get(n) ?? []) {
      const color = FESTIVAL_TRADITIONS[f.tradition].color;
      items.push({
        key: `f-${f.id}`,
        name: f.name,
        meta: `· ${FESTIVAL_TRADITIONS[f.tradition].name}`,
        glyph: f.glyph,
        glyphColor: color,
        edge: color,
        onSelect: () => selectFest(f.id),
      });
    }
    for (const { inst, startN, endN } of grid.multi) {
      if (n < startN || n > endN) continue;
      const color = FESTIVAL_TRADITIONS[inst.tradition].color;
      items.push({
        key: `m-${inst.id}`,
        name: inst.name,
        meta: `· ${FESTIVAL_TRADITIONS[inst.tradition].name} (day ${n - startN + 1})`,
        glyph: inst.glyph,
        glyphColor: color,
        edge: color,
        onSelect: () => selectFest(inst.id),
      });
    }
    return items;
  };

  // ── Agenda week: the week containing today when today is in the
  //    focused month; otherwise the month's first week. ──
  const agendaStartN = useMemo(() => {
    if (todayN >= grid.firstN && todayN <= grid.lastN) {
      return todayN - weekdayOf(todayN);
    }
    return grid.firstN - weekdayOf(grid.firstN);
  }, [grid, todayN]);

  const agendaLabel = useMemo(() => {
    const a = fromDayNumber(agendaStartN);
    const b = fromDayNumber(agendaStartN + 6);
    const range =
      a.m === b.m
        ? `${a.d}–${b.d} ${MONTH_LONG[a.m - 1]}`
        : `${a.d} ${MONTH_LONG[a.m - 1]}–${b.d} ${MONTH_LONG[b.m - 1]}`;
    return `Week of ${range} · agenda (also the screen-reader list view)`;
  }, [agendaStartN]);

  // ── Rail: selection detail resolution ──
  const selFest = sel.type === "fest" ? festById.get(sel.id) : undefined;
  const selAstro = sel.type === "astro" ? astroById.get(sel.id) : undefined;

  const monthTitle = (
    <div
      data-month-title
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 20,
        minWidth: 148,
        textAlign: "center",
      }}
    >
      {MONTH_LONG[cursor.m - 1]}{" "}
      <span style={{ color: "var(--ink-mute)" }}>{cursor.y}</span>
    </div>
  );

  const navBtn: CSSProperties = {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--line-2)",
    borderRadius: "var(--r-sm, 4px)",
    background: "transparent",
    color: "var(--ink-soft)",
    cursor: "pointer",
  };

  const todayItems = itemsForDay(todayN);

  return (
    <div
      data-component="calendar-surface"
      className={className}
      style={{ padding: "22px 28px 60px", ...style }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        {/* ── CALENDAR COLUMN ── */}
        <div style={{ flex: "3 1 620px", minWidth: 0 }}>
          {/* Control bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" aria-label="Previous month" style={navBtn} onClick={() => stepMonth(-1)}>
                <Chevron dir="prev" />
              </button>
              {monthTitle}
              <button type="button" aria-label="Next month" style={navBtn} onClick={() => stepMonth(1)}>
                <Chevron dir="next" />
              </button>
            </div>
            <button
              type="button"
              onClick={goToday}
              style={{
                padding: "7px 14px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md, 8px)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Today
            </button>
            <div
              role="group"
              aria-label="View"
              style={{
                display: "flex",
                gap: 2,
                padding: 3,
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--bg-2)",
                marginLeft: "auto",
              }}
            >
              <button
                type="button"
                aria-pressed={view === "month"}
                onClick={() => setView("month")}
                style={view === "month" ? SEG_ON : SEG_BASE}
              >
                Month
              </button>
              <button
                type="button"
                aria-pressed={view === "week"}
                onClick={() => setView("week")}
                style={view === "week" ? SEG_ON : SEG_BASE}
              >
                Week list
              </button>
            </div>
          </div>

          {/* Tradition overlay chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <span style={EYEBROW}>Traditions</span>
            {FESTIVAL_TRADITION_ORDER.map((key) => {
              const meta = FESTIVAL_TRADITIONS[key];
              const on = !!trad[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  disabled={meta.soon}
                  title={
                    meta.soon
                      ? `${meta.name} festivals — awaiting practitioner consultation`
                      : `Toggle ${meta.name} overlay`
                  }
                  onClick={
                    meta.soon
                      ? undefined
                      : () => setTrad((t) => ({ ...t, [key]: !t[key] }))
                  }
                  style={chipStyle(on, meta.soon)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: on || meta.soon ? meta.color : "var(--line-2)",
                      flex: "none",
                    }}
                  />
                  {meta.name}
                  {meta.soon ? (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 9.5,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                        marginLeft: 2,
                      }}
                    >
                      soon
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Event-kind filter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <span style={EYEBROW}>Events</span>
            {KIND_ORDER.map(({ key, name, glyph }) => {
              const on = !!kinds[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKinds((k) => ({ ...k, [key]: !k[key] }))}
                  style={chipStyle(on)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: "var(--font-glyph)",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {glyph}
                  </span>
                  {name}
                </button>
              );
            })}
          </div>

          {view === "month" ? (
            <div
              className="cal-scroll"
              style={narrow ? { overflowX: "auto", overflowY: "hidden" } : undefined}
            >
              <MonthGrid
                className="cal-grid"
                weekdayNames={WEEKDAY_SHORT}
                weeks={grid.weeks}
                onSelectFestival={(f) => selectFest(f.id)}
                onSelectAstro={(a) => selectAstro(a.id)}
                style={narrow ? { minWidth: 680 } : undefined}
              />
            </div>
          ) : (
            <div
              data-agenda
              style={{
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg, 14px)",
                overflow: "hidden",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  padding: "11px 18px",
                  borderBottom: "1px solid var(--line-2)",
                  background: "var(--bg-sunk)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                {agendaLabel}
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const n = agendaStartN + i;
                const ymd = fromDayNumber(n);
                const isToday = n === todayN;
                const items = itemsForDay(n);
                return (
                  <div
                    key={n}
                    data-agenda-day={toIso(ymd)}
                    style={{
                      display: "flex",
                      gap: 18,
                      padding: "14px 18px",
                      borderBottom: i < 6 ? "1px solid var(--line)" : "none",
                      background: isToday ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <div style={{ flex: "none", width: 88, textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          color: "var(--ink-mute)",
                        }}
                      >
                        {WEEKDAY_SHORT[weekdayOf(n)]}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 24,
                          lineHeight: 1,
                          color: isToday ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {ymd.d}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                      }}
                    >
                      {items.length === 0 ? (
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 12.5,
                            color: "var(--ink-mute)",
                            padding: "3px 0",
                          }}
                        >
                          No marked events.
                        </div>
                      ) : (
                        items.map((item) => (
                          <EventItemButton key={item.key} item={item} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT RAIL ── */}
        <aside
          style={{
            flex: "1 1 320px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "sticky",
            top: 0,
          }}
        >
          {selFest ? (
            <FestivalDetail
              festival={{
                id: selFest.id,
                name: selFest.name,
                tradition: selFest.tradition,
                glyph: selFest.glyph,
                label: selFest.label,
                description: selFest.description,
                practice: selFest.practice,
                sources: selFest.sources,
              }}
              onDismiss={clearSel}
            />
          ) : selAstro ? (
            <div
              data-astro-detail
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg, 14px)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--bg-3)",
                      border: "1px solid var(--line-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-glyph)",
                      fontSize: 19,
                      color: "var(--ink)",
                      flex: "none",
                    }}
                  >
                    {selAstro.glyph}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        lineHeight: 1.12,
                      }}
                    >
                      {selAstro.name}
                    </div>
                    {selAstro.sub ? (
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                          marginTop: 2,
                        }}
                      >
                        {selAstro.sub}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={clearSel}
                    aria-label="Back to today"
                    style={{
                      color: "var(--ink-mute)",
                      flex: "none",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <DismissIcon />
                  </button>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    color: "var(--ink-soft)",
                    margin: "14px 0 0",
                  }}
                >
                  {selAstro.description}
                </p>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  Computed via Swiss Ephemeris · times shown in your timezone.
                </div>
              </div>
            </div>
          ) : (
            <div
              data-today-card
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg, 14px)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 20px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: ".16em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 6,
                  }}
                >
                  Today
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    lineHeight: 1.05,
                  }}
                >
                  {WEEKDAY_LONG[weekdayOf(todayN)]}, {todayYmd.d}{" "}
                  {MONTH_LONG[todayYmd.m - 1]}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {todayItems.map((item) => (
                    <EventItemButton key={item.key} item={item} compact />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Citation-kind legend */}
          <div
            data-citation-legend
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
                fontSize: 10,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 11,
              }}
            >
              How a festival is attested
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {CITATION_KIND_ORDER.map((kind) => {
                const meta = CITATION_KINDS[kind];
                return (
                  <div
                    key={kind}
                    style={{ display: "flex", gap: 11, alignItems: "flex-start" }}
                  >
                    <span aria-hidden="true" style={badgeStyle(kind)}>
                      {meta.glyph}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 14,
                          color: "var(--ink)",
                        }}
                      >
                        {meta.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                          lineHeight: 1.4,
                        }}
                      >
                        {meta.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                lineHeight: 1.5,
                color: "var(--ink-mute)",
                margin: "13px 0 0",
                paddingTop: 12,
                borderTop: "1px solid var(--line)",
              }}
            >
              A festival can be ancient in name yet modern in observance. The
              record shows you which, and lets you decide.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
