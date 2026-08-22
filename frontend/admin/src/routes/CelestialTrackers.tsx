/**
 * CelestialTrackers — the sun's course and the moon's, side by side, each with
 * its adoration streak below it.
 *
 * Sophia (21 Aug): "as we track the sun's position on Today, we also need to
 * track the moon's … side by side, and the count for streaks on them should be
 * placed below them." Each body is one column — arc on top, streak beneath — so
 * as the screen narrows and the columns stack, a streak always stays under its
 * own tracker (never crossed). Positions come from SunCalc (sunArc/moonArc);
 * the solar streak from the Resh endpoint, the lunar from the synced record.
 */

import {
  MoonArcDiagram,
  type ReshTodayRead,
  SunArcDiagram,
  moonArc,
  sunArc,
  useApiCall,
} from "@theourgia/shared";
import { useMemo } from "react";

import { useLunarStreak } from "../data/adorationRecords.js";
import { apiMethods } from "../data/api.js";

function streakLine(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "No streak yet — keep a station to begin one.";
  return `Kept ${days} day${days === 1 ? "" : "s"} running.`;
}

function Streak({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 10, textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
          marginTop: 2,
          minHeight: 18,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function CelestialTrackers({
  lat,
  lng,
  solarOn,
  lunarOn,
}: {
  lat: number;
  lng: number;
  solarOn: boolean;
  lunarOn: boolean;
}) {
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const now = new Date();
  const sun = sunArc(now, lat, lng);
  const moon = moonArc(now, lat, lng);

  // Solar streak — the Resh endpoint already keeps it; only fetched when solar
  // adorations are on (its streak is what the number below the sun shows).
  const resh = useApiCall<ReshTodayRead>(
    (signal) => apiMethods.reshToday({ lat, lng, tz, signal }),
    // deps: recompute when the stored location replaces the Greenwich
    // stand-in — a mount-once call would hold the wrong sky.
    { skip: !solarOn, deps: [lat, lng, tz] },
  );
  const solarStreak =
    solarOn && resh.data && typeof (resh.data as ReshTodayRead).streak_days === "number"
      ? (resh.data as ReshTodayRead).streak_days
      : null;

  const lunar = useLunarStreak();
  const lunarStreak = lunarOn ? (lunar.data ?? 0) : null;

  return (
    <section
      aria-label="The sun and moon today"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      <div>
        <SunArcDiagram
          daylightFraction={sun.daylightFraction}
          isDay={sun.isDay}
          caption={sun.isDay ? "The sun is above the horizon." : "The sun is below the horizon."}
        />
        {solarOn ? <Streak label="Solar adorations" text={streakLine(solarStreak)} /> : null}
      </div>
      <div>
        <MoonArcDiagram
          aboveFraction={moon.aboveFraction}
          isUp={moon.isUp}
          caption={moon.isUp ? "The moon is above the horizon." : "The moon is below the horizon."}
        />
        {lunarOn ? <Streak label="Lunar adorations" text={streakLine(lunarStreak)} /> : null}
      </div>
    </section>
  );
}
