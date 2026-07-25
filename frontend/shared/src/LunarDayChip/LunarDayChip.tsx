/**
 * LunarDayChip — the Today dashboard's lunar-day banner (H12).
 *
 * Per ``TodayPracticeDashboard.dc.html``: a quiet ``--lunar``-tinted strip
 * above the fold carrying what day it is in the Attic calendar and what
 * that day asks. The observance is the actionable part — "Deipnon tonight
 * — dark moon" — with the phase percentage secondary (H12 §E trap d).
 *
 * Fed by ``GET /api/v1/events/today-context`` (v1-058). Renders one of
 * four states:
 *
 *   deipnon         · the dark-moon day closing the Attic month
 *   noumenia        · day 1 — the new month
 *   agathos_daimon  · day 2 — the household daimon's day
 *   null            · an ordinary day; the phase name leads
 *
 * The moon glyph is derived from the phase angle (0 = new, 180 = full)
 * and is aria-hidden; the chip's text carries the full meaning.
 */

import type { CSSProperties, ReactNode } from "react";

import type { TodayContextRead } from "../api/types.js";
import { _ } from "../i18n/index.js";

export interface LunarDayChipProps {
  context: TodayContextRead;
  /** Optional trailing affordance (e.g. an "Observances" link). */
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Illuminated fraction (0..1) from the Sun–Moon elongation angle. */
function illuminationOf(phaseAngle: number): number {
  return (1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2;
}

/**
 * Small engraving-style moon glyph. The terminator is an ellipse whose
 * x-radius follows cos(angle); waxing lights the right limb, waning the
 * left — good enough for a 24px chip ornament.
 */
function MoonGlyph({ phaseAngle }: { phaseAngle: number }) {
  const r = 9;
  const angle = ((phaseAngle % 360) + 360) % 360;
  const waxing = angle <= 180;
  const lit = illuminationOf(angle);

  let litPath: string | null = null;
  if (lit > 0.02) {
    // Terminator x-radius: +r at full, sweeping through 0 at quarter.
    const tr = Math.abs(Math.cos((angle * Math.PI) / 180)) * r;
    const limb = waxing ? 1 : 0; // outer limb arc sweep side
    const bulge = lit >= 0.5 ? (waxing ? 1 : 0) : waxing ? 0 : 1;
    litPath = [
      `M12 ${12 - r}`,
      `A${r} ${r} 0 0 ${limb} 12 ${12 + r}`,
      `A${tr.toFixed(2)} ${r} 0 0 ${bulge} 12 ${12 - r}`,
      "Z",
    ].join(" ");
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r={r} />
      {litPath ? <path d={litPath} fill="currentColor" stroke="none" opacity={0.55} /> : null}
    </svg>
  );
}

function headlineFor(context: TodayContextRead): string {
  switch (context.observance) {
    case "deipnon":
      return _("Deipnon tonight — dark moon");
    case "noumenia":
      return _("Noumenia — the month begins");
    case "agathos_daimon":
      return _("Agathos Daimon — the second day");
    default:
      // Ordinary day — the eight-phase name leads ("Waxing gibbous", …).
      return context.moon.phase_name;
  }
}

function detailFor(context: TodayContextRead): string {
  const pct = Math.round(illuminationOf(context.moon.phase_angle) * 100);
  const phase = `${context.moon.phase_name.toLowerCase()}, ${pct}%`;
  switch (context.observance) {
    case "deipnon":
      return _(
        "Last day of the Attic month · {phase} · the offering goes to the crossroads after dark",
        { phase },
      );
    case "noumenia":
      return _("First day of {month} · {phase} · incense at the household shrine", {
        month: context.attic.month_name,
        phase,
      });
    case "agathos_daimon":
      return _("Second day of {month} · {phase} · a libation to the Agathos Daimon", {
        month: context.attic.month_name,
        phase,
      });
    default:
      return _("Day {day} of {month} · {phase}", {
        day: context.attic.day,
        month: context.attic.month_name,
        phase,
      });
  }
}

export function LunarDayChip({ context, action, className, style }: LunarDayChipProps) {
  return (
    <div
      className={`td-lunar${className ? ` ${className}` : ""}`}
      data-component="lunar-day-chip"
      data-observance={context.observance ?? "none"}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        padding: "15px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--network-line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--lunar-soft)",
        ...style,
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--lunar)",
          background: "var(--bg-2)",
          border: "1px solid var(--network-line)",
        }}
      >
        <MoonGlyph phaseAngle={context.moon.phase_angle} />
      </span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <span
            data-lunar-headline
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              color: "var(--ink)",
            }}
          >
            {headlineFor(context)}
          </span>
          <span
            data-lunar-attic
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--lunar)",
            }}
          >
            {context.attic.month_name} {context.attic.day}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            marginTop: 3,
          }}
        >
          {detailFor(context)}
        </div>
      </div>
      {action ? <div style={{ flex: "none" }}>{action}</div> : null}
    </div>
  );
}
