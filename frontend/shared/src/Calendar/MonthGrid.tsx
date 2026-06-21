/**
 * MonthGrid — 5-week (or 6-week) calendar layout with festival
 * overlays and astro events.
 *
 * Per `Theourgia Calendar.dc.html`. The grid renders a fixed weekday
 * header and a body of week-rows. Each week-row carries:
 *   - 7 day cells with dom number (rounded accent halo on today),
 *     an optional "out-of-month" tag (e.g. "May"), single-day
 *     festival chips, and astro-event buttons.
 *   - A separate absolutely-positioned bar lane for multi-day
 *     festivals that intersect the week. The lane is reserved with a
 *     24px-tall placeholder per cell so the bar doesn't overlap day
 *     content.
 *
 * The caller supplies all event data — this is a pure layout
 * primitive. The Calendar surface or the Today landing composes it
 * with `FestivalDetail` for the right rail.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  FESTIVAL_TRADITIONS,
  type Festival,
} from "./festivals.js";

export interface MonthDay {
  /** 1..31. */
  dom: number;
  /** Calendar-month name for prev/next padding cells ("May", "Jul"). */
  outOfMonthTag?: string;
  /** True if this cell is in the focused month. */
  inMonth: boolean;
  /** True if this cell is today. */
  isToday?: boolean;
  /** Single-day festivals to chip-render. */
  festivals?: Festival[];
  /** Astro events to row-render (lunations, solar, conjunctions). */
  astro?: MonthAstroEvent[];
}

export interface MonthAstroEvent {
  id: string;
  glyph: string;
  label: string;
}

export interface MultiDayFestivalBar {
  festival: Festival;
  /** Which column (0..6) the bar starts in for THIS week-row. */
  startCol: number;
  /** Width in columns. */
  span: number;
  /** True when this week contains the festival's first day. */
  isStart: boolean;
  /** True when this week contains the festival's last day. */
  isEnd: boolean;
}

export interface MonthWeek {
  days: MonthDay[];
  /** Bars to overlay on this week row. */
  bars?: MultiDayFestivalBar[];
}

export interface MonthGridProps {
  /** 7 weekday short names. Caller controls locale (Sun-first vs Mon-first). */
  weekdayNames: string[];
  weeks: MonthWeek[];
  onSelectFestival?: (festival: Festival) => void;
  onSelectAstro?: (event: MonthAstroEvent) => void;
  className?: string;
  style?: CSSProperties;
}

function tintOf(color: string): string {
  return `color-mix(in srgb, ${color} 20%, var(--bg-2))`;
}

function festivalColor(festival: Festival): string {
  return FESTIVAL_TRADITIONS[festival.tradition].color;
}

function DayCell({
  day,
  col,
  laneHeight,
  onSelectFestival,
  onSelectAstro,
}: {
  day: MonthDay;
  col: number;
  laneHeight: number;
  onSelectFestival?: (festival: Festival) => void;
  onSelectAstro?: (event: MonthAstroEvent) => void;
}) {
  const cellStyle: CSSProperties = {
    minHeight: 118,
    padding: "8px 9px 10px",
    borderRight: col < 6 ? "1px solid var(--line)" : "none",
    background: day.isToday
      ? "var(--accent-soft)"
      : day.inMonth
        ? "transparent"
        : "var(--bg-sunk)",
    boxShadow: day.isToday ? "inset 0 0 0 1.5px var(--accent)" : "none",
    display: "flex",
    flexDirection: "column",
  };

  const numStyle: CSSProperties = day.isToday
    ? {
        fontFamily: "var(--font-display)",
        fontSize: 14,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "var(--accent-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }
    : {
        fontFamily: "var(--font-display)",
        fontSize: 15,
        color: day.inMonth ? "var(--ink)" : "var(--ink-mute)",
      };

  return (
    <div
      data-month-day={day.dom}
      data-in-month={day.inMonth ? "true" : "false"}
      data-is-today={day.isToday ? "true" : "false"}
      style={cellStyle}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={numStyle}>{day.dom}</span>
        {day.outOfMonthTag ? (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--ink-mute)",
            }}
          >
            {day.outOfMonthTag}
          </span>
        ) : null}
      </div>

      {/* Reserved bar lane */}
      <div data-bar-lane style={{ height: laneHeight }} />

      {/* Astro events */}
      {day.astro?.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelectAstro?.(a)}
          data-astro-id={a.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            textAlign: "left",
            padding: "2px 4px",
            borderRadius: 4,
            marginTop: 2,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-glyph)",
              fontSize: 13,
              color: "var(--ink-soft)",
              flex: "none",
            }}
          >
            {a.glyph}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-soft)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.label}
          </span>
        </button>
      ))}

      {/* Single-day festival chips */}
      {day.festivals?.map((f) => {
        const color = festivalColor(f);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelectFestival?.(f)}
            data-festival-id={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              textAlign: "left",
              padding: "3px 6px",
              borderRadius: 4,
              marginTop: 3,
              background: tintOf(color),
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              cursor: "pointer",
              color: "var(--ink)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
                flex: "none",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {f.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Bar({
  bar,
  onSelectFestival,
}: {
  bar: MultiDayFestivalBar;
  onSelectFestival?: (festival: Festival) => void;
}): ReactNode {
  const color = festivalColor(bar.festival);
  return (
    <button
      type="button"
      onClick={() => onSelectFestival?.(bar.festival)}
      data-bar-id={bar.festival.id}
      data-bar-start={bar.isStart ? "true" : "false"}
      data-bar-end={bar.isEnd ? "true" : "false"}
      style={{
        position: "absolute",
        top: 30,
        height: 21,
        left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
        width: `calc(${(bar.span / 7) * 100}% - 8px)`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 8px",
        background: tintOf(color),
        borderLeft: `3px solid ${color}`,
        color: "var(--ink)",
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        borderTopLeftRadius: bar.isStart ? 5 : 0,
        borderBottomLeftRadius: bar.isStart ? 5 : 0,
        borderTopRightRadius: bar.isEnd ? 5 : 0,
        borderBottomRightRadius: bar.isEnd ? 5 : 0,
        borderTop: "1px solid var(--line-2)",
        borderRight: bar.isEnd ? "1px solid var(--line-2)" : "none",
        borderBottom: "1px solid var(--line-2)",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 12,
          flex: "none",
        }}
      >
        {bar.festival.glyph}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {bar.festival.name}
      </span>
    </button>
  );
}

export function MonthGrid({
  weekdayNames,
  weeks,
  onSelectFestival,
  onSelectAstro,
  className,
  style,
}: MonthGridProps) {
  return (
    <div
      className={className}
      data-component="month-grid"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      {/* Weekday header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--line-2)",
          background: "var(--bg-sunk)",
        }}
      >
        {weekdayNames.map((w) => (
          <div
            key={w}
            style={{
              padding: "9px 10px",
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              textAlign: "left",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const laneHeight = week.bars && week.bars.length > 0 ? 24 : 0;
        return (
          <div
            key={wi}
            data-month-week={wi}
            style={{
              position: "relative",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
              }}
            >
              {week.days.map((day, col) => (
                <DayCell
                  key={col}
                  day={day}
                  col={col}
                  laneHeight={laneHeight}
                  onSelectFestival={onSelectFestival}
                  onSelectAstro={onSelectAstro}
                />
              ))}
            </div>
            {week.bars?.map((bar) => (
              <Bar
                key={bar.festival.id}
                bar={bar}
                onSelectFestival={onSelectFestival}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
