/**
 * Planetary hours — the day and night divided into twelve each, every hour
 * ruled by a planet.
 *
 * A read surface (web parity with the phone's Planetary Hours screen): the day's
 * twenty-four hours from `GET /astro/planetary-hours`, the current one marked.
 * Public computation; nothing kept.
 */

import { useTopbar } from "@theourgia/shared";
import { useEffect, useState } from "react";

import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

interface HourRead {
  index: number;
  ruler: string;
  glyph: string;
  start: string;
  end: string;
  is_day: boolean;
}
interface HoursResponse {
  date: string;
  current_hour_index: number | null;
  hours: HourRead[];
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function HourRow({ hour, current }: { hour: HourRead; current: boolean }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: "var(--r-md, 8px)",
        border: `1px solid ${current ? "var(--accent)" : "var(--line)"}`,
        background: current ? "var(--accent-soft)" : "var(--bg-2)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          textAlign: "center",
          fontSize: 17,
          color: current ? "var(--accent)" : "var(--ink-soft)",
        }}
      >
        {hour.glyph}
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 15,
          color: "var(--ink)",
        }}
      >
        {hour.ruler}
      </span>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time(hour.start)} – {time(hour.end)}
      </span>
    </li>
  );
}

export function PlanetaryHoursRoute() {
  useTopbar(
    () => ({ title: "Planetary hours", subtitle: "The rulers of the day and night hours" }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;
  const [data, setData] = useState<HoursResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<HoursResponse>(
          `/astro/planetary-hours?latitude=${loc.lat}&longitude=${loc.lng}`,
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lng]);

  const dayHours = data?.hours.filter((h) => h.is_day) ?? [];
  const nightHours = data?.hours.filter((h) => !h.is_day) ?? [];

  return (
    <section style={{ maxWidth: 640, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <p
        style={{
          margin: "0 0 20px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        Day and night are each divided into twelve hours — unequal, longer in the ruler’s season —
        and each hour has its planet. The current hour is marked.
      </p>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
          The hours didn’t load: {error}
        </p>
      ) : data === null ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {[
            { label: "Day", hours: dayHours },
            { label: "Night", hours: nightHours },
          ].map((band) => (
            <div key={band.label}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                {band.label}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                {band.hours.map((h) => (
                  <HourRow key={h.index} hour={h} current={h.index === data.current_hour_index} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
