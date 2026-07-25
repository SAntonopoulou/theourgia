/**
 * TodayPractice — the H12 practice pieces of the Today dashboard:
 *
 *   TodayLunarChip      · Attic lunar day + Hekatean observance state
 *                         (GET /api/v1/events/today-context)
 *   TodayRiteRow        · the four-station daily rite — first real mount
 *                         of the LiberResh family on the home surface
 *                         (GET /api/v1/resh/today · POST /resh/adorations)
 *   AwaitingJudgmentCard· the due-row slot for undischarged verdicts —
 *                         gracefully empty until the queue endpoint
 *                         (Sprint I-B) exists
 *
 * Extracted from Today.tsx so each piece is testable in isolation.
 *
 * H12 traps honoured (agent_data_and_components_H12 §E): dusk is the
 * minimum-viable station and carries the only primary CTA (rule 66);
 * the streak is a record, not a scoreboard; a missed station is
 * `--ink-mute`, never red; the observance — not the phase percentage —
 * is the actionable part of the lunar chip.
 */

import {
  type AwaitingJudgmentRead,
  LunarDayChip,
  RESH_STATION_ORDER,
  type ReshAdorationRead,
  type ReshModeWire,
  ReshNextAdoration,
  ReshStationCard,
  type ReshStationRead,
  type ReshStreakDay,
  ReshStreakGrid,
  type ReshTodayRead,
  type ReshTransitionWire,
  Skeleton,
  SunArcDiagram,
  Toast,
  type TodayContextRead,
  useApiCall,
} from "@theourgia/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiMethods } from "../data/api.js";

/** H12 relabel — Dawn/Noon/Dusk/Night (a prop-level rename, not a fork). */
export const STATION_LABEL: Record<ReshTransitionWire, string> = {
  sunrise: "Dawn",
  noon: "Noon",
  sunset: "Dusk",
  midnight: "Night",
};

/** Trailing window the dusk-kept grid renders (five weeks). */
const STREAK_WINDOW_DAYS = 35;

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

// ─── Lunar-day chip ────────────────────────────────────────────────────────

/** Type guard — the RouteMountSmoke API stub answers `[]` to everything. */
function isTodayContext(value: unknown): value is TodayContextRead {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "attic" in value &&
    "moon" in value
  );
}

export function TodayLunarChip() {
  const context = useApiCall<TodayContextRead>((signal) => apiMethods.getTodayContext({ signal }));

  if (context.status === "loading" || context.status === "idle") {
    return (
      <div
        style={{
          padding: "15px 17px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
        }}
      >
        <Skeleton kind="text" width="55%" />
      </div>
    );
  }
  // Rule 61: an unreachable field is absent, never synthesised — no chip
  // rather than a fabricated calendar day.
  if (context.status === "error" || !isTodayContext(context.data)) return null;

  return (
    <LunarDayChip
      context={context.data}
      action={
        <Link
          to="/calendar"
          style={{
            padding: "8px 14px",
            borderRadius: "var(--r-md, 8px)",
            border: "1px solid var(--network-line)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--network)",
            textDecoration: "none",
          }}
        >
          Observances
        </Link>
      }
    />
  );
}

// ─── Four-station rite row ─────────────────────────────────────────────────

function minuteOfDayLocal(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function minuteOfDayUtc(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Local civil date (YYYY-MM-DD) ``offset`` days before today. */
function localIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isReshToday(value: unknown): value is ReshTodayRead {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { stations?: unknown }).stations)
  );
}

/** Binary dusk-kept days over the trailing window. */
function buildKeptDays(
  adorations: ReshAdorationRead[],
  minimumStation: ReshTransitionWire,
): ReshStreakDay[] {
  const kept = new Set<string>();
  for (const a of adorations) {
    if (a.transition === minimumStation) kept.add(a.civil_date);
  }
  const days: ReshStreakDay[] = [];
  for (let i = STREAK_WINDOW_DAYS - 1; i >= 0; i--) {
    const date = localIsoDate(i);
    // 4 = full tint for a kept day; the grid is binary by design here.
    days.push({ date, count: kept.has(date) ? 4 : 0 });
  }
  return days;
}

export interface TodayRiteRowProps {
  lat: number;
  lng: number;
}

export function TodayRiteRow({ lat, lng }: TodayRiteRowProps) {
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const today = useApiCall<ReshTodayRead>((signal) =>
    apiMethods.reshToday({ lat, lng, tz, signal }),
  );
  const adorations = useApiCall<ReshAdorationRead[]>((signal) =>
    apiMethods.listReshAdorations({ since: localIsoDate(STREAK_WINDOW_DAYS - 1), signal }),
  );

  // HOME/XENOS liturgy form — posts with the adoration. Defaults to the
  // day's most recent observed form, else home.
  const [modeChoice, setModeChoice] = useState<ReshModeWire | null>(null);
  const [marking, setMarking] = useState<ReshTransitionWire | null>(null);

  const data = isReshToday(today.data) ? today.data : null;
  const mode: ReshModeWire = modeChoice ?? data?.mode ?? "home";

  async function keepStation(transition: ReshTransitionWire): Promise<void> {
    setMarking(transition);
    try {
      await apiMethods.createReshAdoration({
        transition,
        civil_date: data?.civil_date ?? null,
        mode,
      });
      await Promise.all([today.refresh(), adorations.refresh()]);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Could not record the adoration",
        body: e instanceof Error ? e.message : "Try again — the record was not saved.",
      });
    } finally {
      setMarking(null);
    }
  }

  if (today.status === "loading" || today.status === "idle") {
    return (
      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          padding: 18,
        }}
      >
        <Skeleton kind="text" width="40%" />
      </section>
    );
  }
  if (today.status === "error" || !data) {
    return (
      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          padding: "16px 18px",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        Couldn't compute today's stations
        {today.error?.message ? ` — ${today.error.message}` : "."}
      </section>
    );
  }

  const minimumStation = data.minimum_viable_station;
  const minimumLabel = STATION_LABEL[minimumStation];
  const streakDays = data.streak_days;
  const now = Date.now();
  const ordered = RESH_STATION_ORDER.map((key) =>
    data.stations.find((s) => s.transition === key),
  ).filter((s): s is ReshStationRead => s !== undefined);
  const next = ordered.find((s) => s.at !== null && new Date(s.at).getTime() > now) ?? null;

  // Sun-arc position from the day's real transitions.
  const sunrise = ordered.find((s) => s.transition === "sunrise")?.at ?? null;
  const sunset = ordered.find((s) => s.transition === "sunset")?.at ?? null;
  const daylightFraction =
    sunrise && sunset
      ? (now - new Date(sunrise).getTime()) /
        Math.max(1, new Date(sunset).getTime() - new Date(sunrise).getTime())
      : null;

  const keptGrid = buildKeptDays(
    Array.isArray(adorations.data) ? adorations.data : [],
    minimumStation,
  );

  return (
    <section
      data-component="today-rite-row"
      // .td-rite — container-query root: the station/two-up grids ask the
      // REAL column width (nav rail + right rail deducted), not the window.
      className="td-rite"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      {/* Header — the rule in words (rule 66) + streak + liturgy form */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 17px",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 17,
              color: "var(--ink)",
            }}
          >
            The four stations
          </div>
          <div
            data-rite-rule
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {minimumLabel} is the station that must be kept — the streak holds if{" "}
            {minimumLabel.toLowerCase()} is done. The others are kept or not, without penalty.
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: "none",
            flexWrap: "wrap",
          }}
        >
          <span
            data-rite-streak
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {minimumLabel.toLowerCase()} kept {streakDays} {streakDays === 1 ? "day" : "days"}{" "}
            running
          </span>
          <div
            role="group"
            aria-label="Liturgy form"
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg)",
            }}
          >
            {(["home", "xenos"] as const).map((m) => {
              const selected = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  data-rite-mode={m}
                  aria-pressed={selected}
                  onClick={() => setModeChoice(m)}
                  title={
                    m === "home"
                      ? "Home liturgy — posts with the adoration"
                      : "Xenos liturgy (abroad) — posts with the adoration"
                  }
                  style={{
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: selected ? "var(--ink)" : "var(--ink-mute)",
                    background: selected ? "var(--accent-soft)" : "transparent",
                    border: "1px solid transparent",
                    borderColor: selected ? "var(--line-2)" : "transparent",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 17px", display: "flex", flexDirection: "column", gap: 13 }}>
        {/* Next adoration hero */}
        {next?.at ? (
          <ReshNextAdoration
            station={next.transition}
            label={STATION_LABEL[next.transition]}
            adoration={{
              godform: next.godform,
              direction: next.direction,
              invocation: next.short_invocation,
            }}
            stationMin={minuteOfDayLocal(next.at)}
            stationMinUtc={minuteOfDayUtc(next.at)}
            countdown={fmtCountdown(new Date(next.at).getTime() - now)}
            liturgyAction={
              <Link
                to="/daily-practice/resh"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                Open full liturgy →
              </Link>
            }
          />
        ) : null}

        {/* Four station cards — dusk carries the only primary CTA.
            Column count (1 → 2×2 → 4) lives in theourgia.shared.css as
            container queries against .td-rite; never 3-across, never a
            card below the ~260px content floor. */}
        <div
          className="td-stations"
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {ordered.map((s) => {
            const observed = s.observed_at !== null;
            const passed = s.at !== null && new Date(s.at).getTime() < now;
            const isMinimum = s.transition === minimumStation;
            if (s.at === null) {
              return (
                <div
                  key={s.transition}
                  style={{
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--r-lg, 14px)",
                    padding: "15px 16px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {STATION_LABEL[s.transition]} — no transition at this latitude today (polar day or
                  night).
                </div>
              );
            }
            return (
              <ReshStationCard
                key={s.transition}
                station={s.transition}
                label={STATION_LABEL[s.transition]}
                adoration={{
                  godform: s.godform,
                  direction: s.direction,
                  invocation: s.short_invocation,
                }}
                stationMin={minuteOfDayLocal(s.at)}
                stationMinUtc={minuteOfDayUtc(s.at)}
                isNext={next?.transition === s.transition}
                isMinimum={isMinimum}
                isFaded={passed && !observed}
                {...(observed && s.observed_at
                  ? {
                      observation: {
                        atMin: minuteOfDayLocal(s.observed_at),
                        ...(s.note ? { note: s.note } : {}),
                      },
                    }
                  : {})}
                onMarkObserved={
                  observed || marking !== null ? undefined : () => void keepStation(s.transition)
                }
              />
            );
          })}
        </div>

        {/* Sun arc + dusk-kept record */}
        <div
          className="td-two"
          style={{
            display: "grid",
            gap: 13,
            alignItems: "stretch",
          }}
        >
          {daylightFraction !== null ? (
            <SunArcDiagram
              daylightFraction={daylightFraction}
              caption={`${STATION_LABEL.sunrise} and ${STATION_LABEL.noon.toLowerCase()} pass whether or not they are kept; ${minimumLabel.toLowerCase()} is the one the record asks for.`}
            />
          ) : (
            <div
              style={{
                border: "1px dashed var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                padding: "15px 16px",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              No sun arc at this latitude today (polar day or night).
            </div>
          )}
          <ReshStreakGrid
            days={keptGrid}
            streakOverride={streakDays}
            hideLegend
            cellTitle={(d) =>
              `${d.date} — ${minimumLabel.toLowerCase()} ${d.count > 0 ? "kept" : "not kept"}`
            }
            subtitle={`A record, not a scoreboard — ${minimumLabel.toLowerCase()} kept, last five weeks. Gaps are kept as honestly as the days you sat.`}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Awaiting-judgment due slot ────────────────────────────────────────────

/** Rows shown before the card defers to "and N more" + the link. */
const AWAITING_CARD_MAX_ROWS = 4;

/**
 * The due row's verdict slot — live against
 * ``GET /api/v1/verdicts/awaiting`` (H12 F2). Workings with a sealed
 * intent and an open gate list oldest-first with their age; the record
 * does not quietly forget an unfinished judgment. Empty stays honest,
 * not celebratory.
 */
export function AwaitingJudgmentCard() {
  const queue = useApiCall<AwaitingJudgmentRead[]>((signal) =>
    apiMethods.listAwaitingJudgment({ signal }),
  );
  const items = Array.isArray(queue.data) ? queue.data : [];
  const shown = items.slice(0, AWAITING_CARD_MAX_ROWS);
  const more = items.length - shown.length;

  return (
    <article
      data-component="awaiting-judgment-card"
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: 18,
      }}
    >
      <div style={{ ...sectionLabel, marginBottom: 14 }}>Awaiting judgment</div>
      {queue.status === "loading" || queue.status === "idle" ? (
        <Skeleton kind="text" width="70%" />
      ) : shown.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
          }}
        >
          Nothing awaits judgment. A working joins this list the moment its intent is sealed, and
          leaves it only when both gates are closed.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map((item) => (
            <Link
              key={item.entry_id}
              to="/verdicts"
              data-awaiting-row={item.entry_id}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  flex: "none",
                }}
              >
                {item.age_days} {item.age_days === 1 ? "day" : "days"}
              </span>
            </Link>
          ))}
          {more > 0 ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              and {more} more
            </div>
          ) : null}
        </div>
      )}
      <Link
        to="/verdicts"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        The two gates →
      </Link>
    </article>
  );
}
