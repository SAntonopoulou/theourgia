/**
 * ReshStreakGrid — calendar-cell heatmap of how many of the day's
 * four solar adorations were observed, plus the big "X days kept"
 * counter and a low→high legend.
 *
 * Per `Theourgia Liber Resh.dc.html`. Each day is a small square
 * tinted by the count [0..4]; today gets an accent outline + halo.
 * The legend (none → all four) uses the same five tints so the
 * mapping is unambiguous.
 *
 * Per the user's wellbeing-copy rule: streaks are kept gently — the
 * heatmap is a record of practice, not a guilt-driver. No red, no
 * scolding language.
 */

import { type CSSProperties, type ReactNode } from "react";

export interface ReshStreakDay {
  /** ISO date for tooltip + a11y; the grid itself is rendered
   *  geometrically, the caller arranges the data in order. */
  date: string;
  /** 0..4 — how many of the four stations were observed on this day. */
  count: number;
}

export interface ReshStreakGridProps {
  /** Days in chronological order; the last entry is "today". */
  days: ReshStreakDay[];
  /** Override the big number; defaults to the trailing run of days
   *  with `count > 0`. */
  streakOverride?: number;
  /** Optional subtitle ("3 of 4 kept so far today"). */
  subtitle?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Fill tint for a day with `count` observed stations. */
function fillFor(count: number): string {
  if (count <= 0) return "var(--bg-sunk)";
  const alphas: Record<number, number> = {
    1: 0.22,
    2: 0.42,
    3: 0.66,
    4: 1,
  };
  const a = alphas[Math.min(4, count)] ?? 1;
  return `color-mix(in srgb, var(--accent) ${a * 100}%, var(--bg-sunk))`;
}

function computeStreak(days: ReshStreakDay[]): number {
  let run = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((days[i]?.count ?? 0) >= 1) {
      run++;
    } else {
      break;
    }
  }
  return run;
}

export function ReshStreakGrid({
  days,
  streakOverride,
  subtitle,
  className,
  style,
}: ReshStreakGridProps) {
  const streak = streakOverride ?? computeStreak(days);
  const todayIdx = days.length - 1;

  return (
    <div
      className={className}
      data-component="resh-streak-grid"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: "18px 20px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "none" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 46,
                lineHeight: 0.9,
                color: "var(--ink)",
              }}
              data-streak-count
            >
              {streak}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              days kept
            </span>
          </div>
          {subtitle ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              justifyContent: "flex-end",
            }}
          >
            {days.map((d, i) => {
              const isToday = i === todayIdx;
              return (
                <span
                  key={d.date}
                  data-day={d.date}
                  data-count={d.count}
                  data-is-today={isToday ? "true" : "false"}
                  title={`${d.date} — ${d.count} of 4 kept`}
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 3,
                    background: fillFor(d.count),
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: isToday ? "var(--accent)" : "var(--line)",
                    boxShadow: isToday ? "0 0 0 1px var(--accent)" : "none",
                    display: "inline-block",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 9,
            }}
            data-legend
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
              }}
            >
              none
            </span>
            {[0, 1, 2, 3, 4].map((c) => (
              <span
                key={c}
                data-legend-count={c}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 3,
                  background: fillFor(c),
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  display: "inline-block",
                }}
              />
            ))}
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
              }}
            >
              all four
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
