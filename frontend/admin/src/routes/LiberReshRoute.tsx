/**
 * Liber Resh — the four daily solar adorations (/daily-practice/resh).
 *
 * Minimal composition of the existing shared LiberResh primitives:
 *   Hero   · ReshNextAdoration — the next upcoming station + countdown.
 *   Cards  · one ReshStationCard per station (sunrise · noon · sunset ·
 *            midnight) with "Mark observed" wired to the backend.
 *   Streak · ReshStreakGrid over the trailing ten weeks.
 *
 * Wire: ``GET /api/v1/resh/today`` (stations + observed markers +
 * streak, computed for the signed-in user's stored location) ·
 * ``GET/POST /api/v1/resh/adorations``. A fuller Today-card
 * integration comes later; this surface exists so the Daily Practice
 * tracker's Liber Resh link lands somewhere real.
 */

import {
  RESH_STATION_META,
  RESH_THELEMIC,
  type ReshAdorationRead,
  ReshNextAdoration,
  type ReshStation,
  ReshStationCard,
  type ReshStationRead,
  type ReshStreakDay,
  ReshStreakGrid,
  type ReshTodayRead,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { useMyLocation } from "../data/useLocation.js";

/** Trailing window the streak grid renders (ten weeks). */
const STREAK_DAYS = 70;

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

function buildStreakDays(adorations: ReshAdorationRead[]): ReshStreakDay[] {
  const counts = new Map<string, number>();
  for (const a of adorations) {
    counts.set(a.civil_date, (counts.get(a.civil_date) ?? 0) + 1);
  }
  const days: ReshStreakDay[] = [];
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    const date = localIsoDate(i);
    days.push({ date, count: Math.min(4, counts.get(date) ?? 0) });
  }
  return days;
}

export function LiberReshRoute() {
  useTopbar(
    () => ({
      title: "Liber Resh",
      subtitle: "The four adorations of the sun — sunrise, noon, sunset, midnight",
    }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const lat = location.data?.lat;
  const lng = location.data?.lng;

  const today = useApiCall<ReshTodayRead>(
    (signal) => apiMethods.reshToday({ lat: lat ?? 0, lng: lng ?? 0, tz, signal }),
    { skip: lat === undefined || lng === undefined },
  );
  const adorations = useApiCall<ReshAdorationRead[]>((signal) =>
    apiMethods.listReshAdorations({ since: localIsoDate(STREAK_DAYS - 1), signal }),
  );

  // A slow clock so the countdown + next-station highlight stay honest
  // without re-rendering every second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [marking, setMarking] = useState<ReshStation | null>(null);

  async function markObserved(transition: ReshStation): Promise<void> {
    setMarking(transition);
    try {
      await apiMethods.createReshAdoration({
        transition,
        civil_date: today.data?.civil_date ?? null,
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

  const stations: ReshStationRead[] = today.data?.stations ?? [];
  // The next upcoming station of the civil day, by clock time.
  const next = stations.find((s) => s.at !== null && new Date(s.at).getTime() > now) ?? null;

  const streakDays = useMemo(() => buildStreakDays(adorations.data ?? []), [adorations.data]);
  const observedToday = stations.filter((s) => s.observed_at !== null).length;

  const loading =
    location.status === "loading" ||
    location.status === "idle" ||
    today.status === "loading" ||
    today.status === "idle";

  return (
    <div
      className="scroll"
      style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, padding: "24px 28px" }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={`resh-skel-${i}`}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  padding: 18,
                }}
              >
                <Skeleton kind="text" width="50%" />
              </div>
            ))}
          </div>
        ) : today.status === "error" ? (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              background: "var(--bg-2)",
              padding: "22px 24px",
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
            }}
          >
            Couldn't compute today's stations:{" "}
            {today.error?.message ?? location.error?.message ?? "unknown error."}
          </div>
        ) : (
          <>
            {next?.at ? (
              <ReshNextAdoration
                station={next.transition}
                adoration={RESH_THELEMIC.stations[next.transition]}
                stationMin={minuteOfDayLocal(next.at)}
                stationMinUtc={minuteOfDayUtc(next.at)}
                countdown={fmtCountdown(new Date(next.at).getTime() - now)}
              />
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {stations.map((s) => {
                const observed = s.observed_at !== null;
                const passed = s.at !== null && new Date(s.at).getTime() < now;
                return s.at !== null ? (
                  <ReshStationCard
                    key={s.transition}
                    station={s.transition}
                    adoration={RESH_THELEMIC.stations[s.transition]}
                    stationMin={minuteOfDayLocal(s.at)}
                    stationMinUtc={minuteOfDayUtc(s.at)}
                    isNext={next?.transition === s.transition}
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
                      observed || marking !== null
                        ? undefined
                        : () => void markObserved(s.transition)
                    }
                  />
                ) : (
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
                    {RESH_STATION_META[s.transition].label} — no transition at this latitude today
                    (polar day or night).
                  </div>
                );
              })}
            </div>

            <ReshStreakGrid
              days={streakDays}
              streakOverride={today.data?.streak_days ?? 0}
              subtitle={`${observedToday} of ${stations.length || 4} kept so far today`}
            />
          </>
        )}
      </div>
    </div>
  );
}
