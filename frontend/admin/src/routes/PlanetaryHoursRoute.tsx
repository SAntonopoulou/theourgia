/**
 * Planetary hours — the phone's screen, on the web.
 *
 * The ring is the point: a planetary hour is not sixty minutes, and only a
 * day drawn to scale shows it. Sunrise at the top, the day turning
 * clockwise, the hour in force lit and counted down in the centre. Beneath
 * it, as on the phone: the day's ruler in plain sight (the planets change
 * hands at sunrise, not midnight), the hour you are in and the one after it
 * side by side with their true lengths, the day walkable backwards and
 * forwards, and the sky the hour has to be judged against — the Moon, her
 * course under the practitioner's void-of-course rule, the sect, and what
 * dignity the hour's ruler holds where it stands.
 */

import {
  type ChartDoctrineResponse,
  type ChartResponse,
  type MoonCourseResponse,
  PLANET_HOUR_COLOR,
  type PlanetaryHoursResponse,
  PlanetaryHoursRing,
  formatDegInSign,
  signGlyphOf,
  signNameOf,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { useMyLocation } from "../data/useLocation.js";
import { MOCK_LOCATION } from "../mocks/today.js";

const PLANET_LABEL: Record<string, string> = {
  sun: "the Sun",
  moon: "the Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** "1h 22m" / "47m" — an hour's length or remainder, in its own units. */
function span(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "0 0 8px",
};

const card: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  background: "var(--bg-2)",
  padding: "14px 16px",
};

export function PlanetaryHoursRoute() {
  useTopbar(
    () => ({ title: "Planetary hours", subtitle: "The rulers of the day and night hours" }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  /** Whole days walked from today. 0 is today; the ring only counts down
   *  and carries a needle when the day shown is the day in force. */
  const [dayOffset, setDayOffset] = useState(0);
  const [data, setData] = useState<PlanetaryHoursResponse | null>(null);
  const [course, setCourse] = useState<MoonCourseResponse | null>(null);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [doctrine, setDoctrine] = useState<ChartDoctrineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A ticking "now", so the countdown and the needle move.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const shownWhen = useMemo(() => {
    if (dayOffset === 0) return null; // now — let the server default
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }, [dayOffset]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    (async () => {
      try {
        const res = await apiMethods.getPlanetaryHours({
          latitude: loc.lat,
          longitude: loc.lng,
          ...(shownWhen ? { when: shownWhen } : {}),
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lng, shownWhen]);

  // The sky beneath: read at "now" for today, at the shown day's midday
  // otherwise — "now" has no meaning on a day that is not this one.
  useEffect(() => {
    let cancelled = false;
    setCourse(null);
    setChart(null);
    setDoctrine(null);
    const at = shownWhen ?? new Date().toISOString();
    (async () => {
      try {
        const [c, ch, d] = await Promise.all([
          apiMethods.getMoonCourse({ when: at }),
          apiMethods.getChart({ when: at, latitude: loc.lat, longitude: loc.lng }),
          apiMethods.getChartDoctrine({ when: at, latitude: loc.lat, longitude: loc.lng }),
        ]);
        if (cancelled) return;
        setCourse(c);
        setChart(ch);
        setDoctrine(d);
      } catch {
        // The ring stands on its own; the sky strip simply waits.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lng, shownWhen]);

  const isToday = dayOffset === 0;
  const hours = data?.hours ?? [];
  const current =
    isToday && data?.current_hour_index != null
      ? (hours.find((h) => h.index === data.current_hour_index) ?? null)
      : null;
  const next = current ? (hours.find((h) => h.index === current.index + 1) ?? null) : null;
  const dayRuler = hours[0] ?? null;

  const moon = chart?.placements.find((p) => p.body_id === "moon") ?? null;
  const rulerDignity =
    current && doctrine
      ? (doctrine.dignities.find((d) => d.body_id === current.ruler) ?? null)
      : null;

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      {/* The day, walkable. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          { label: "‹", go: -1, title: "The day before" },
          { label: null, go: 0, title: "" },
          { label: "›", go: +1, title: "The day after" },
        ].map((b) =>
          b.label === null ? (
            <button
              key="today"
              type="button"
              onClick={() => setDayOffset(0)}
              style={{
                minWidth: 220,
                padding: "7px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md, 8px)",
                background: isToday ? "var(--accent-soft)" : "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {dayLabel(
                (() => {
                  const d = new Date();
                  d.setDate(d.getDate() + dayOffset);
                  return d;
                })(),
              )}
              {isToday ? "" : "  · back to today"}
            </button>
          ) : (
            <button
              key={b.label}
              type="button"
              aria-label={b.title}
              onClick={() => setDayOffset((v) => v + b.go)}
              style={{
                width: 38,
                height: 38,
                border: "1px solid var(--line)",
                borderRadius: "50%",
                background: "var(--bg-2)",
                color: "var(--ink-soft)",
                fontSize: 17,
                cursor: "pointer",
              }}
            >
              {b.label}
            </button>
          ),
        )}
      </div>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
          The hours didn’t load: {error}
        </p>
      ) : data === null ? (
        <p
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--ink-mute)",
            textAlign: "center",
          }}
        >
          Dividing the day…
        </p>
      ) : hours.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-soft)" }}>
          At this latitude the Sun does not cross the horizon today — there are no arcs to divide
          into hours.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {/* The ring, centred, with the hour in force inside it. */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PlanetaryHoursRing
              hours={hours}
              currentIndex={isToday ? (data.current_hour_index ?? null) : null}
              now={isToday ? now : null}
              size={380}
            >
              {(() => {
                const focus = current ?? dayRuler;
                if (!focus) return null;
                const left = current ? new Date(current.end).getTime() - now.getTime() : null;
                return (
                  <div>
                    <div
                      aria-hidden="true"
                      style={{
                        fontSize: 46,
                        lineHeight: 1.1,
                        color: PLANET_HOUR_COLOR[focus.ruler] ?? "var(--ink)",
                      }}
                    >
                      {focus.glyph}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 13.5,
                        color: "var(--ink)",
                        marginTop: 2,
                      }}
                    >
                      {current
                        ? `the hour of ${PLANET_LABEL[focus.ruler] ?? focus.ruler}`
                        : `the day of ${PLANET_LABEL[focus.ruler] ?? focus.ruler}`}
                    </div>
                    {left !== null && current ? (
                      <>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 26,
                            color: "var(--accent)",
                            marginTop: 4,
                          }}
                        >
                          {span(left)}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 12,
                            color: "var(--ink-mute)",
                          }}
                        >
                          left of{" "}
                          {span(
                            new Date(current.end).getTime() - new Date(current.start).getTime(),
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })()}
            </PlanetaryHoursRing>
          </div>

          {/* The planet governing the whole day, kept in plain sight — the
              planets change hands at sunrise, not at midnight. */}
          {dayRuler ? (
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
              <span
                aria-hidden="true"
                style={{
                  fontSize: 24,
                  color: PLANET_HOUR_COLOR[dayRuler.ruler] ?? "var(--ink)",
                }}
              >
                {dayRuler.glyph}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display, var(--font-serif))",
                    fontSize: 16,
                    color: "var(--ink)",
                  }}
                >
                  The day of {PLANET_LABEL[dayRuler.ruler] ?? dayRuler.ruler}
                </div>
                <div
                  style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}
                >
                  It took hold at sunrise, {hhmm(dayRuler.start)} — and holds until the next.
                </div>
              </div>
            </div>
          ) : null}

          {/* The hour you are in and the one after it, with their true lengths. */}
          {current ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { title: "This hour", hour: current },
                ...(next ? [{ title: "Then", hour: next }] : []),
              ].map(({ title, hour }) => (
                <div key={title} style={card}>
                  <p style={eyebrow}>{title}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 20,
                        color: PLANET_HOUR_COLOR[hour.ruler] ?? "var(--ink)",
                      }}
                    >
                      {hour.glyph}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display, var(--font-serif))",
                        fontSize: 17,
                        color: "var(--ink)",
                      }}
                    >
                      {PLANET_LABEL[hour.ruler] ?? hour.ruler}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {hhmm(hour.start)} – {hhmm(hour.end)} ·{" "}
                    {span(new Date(hour.end).getTime() - new Date(hour.start).getTime())}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* What else the hour has to be judged against. */}
          <div style={card}>
            <p style={eyebrow}>The sky</p>
            <div
              style={{
                display: "grid",
                gap: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
              }}
            >
              {moon ? (
                <div>
                  <span style={{ color: "var(--ink-mute)" }}>Moon</span>{" "}
                  {formatDegInSign(moon.tropical_longitude)}{" "}
                  <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                    {signGlyphOf(moon.tropical_longitude)}
                  </span>{" "}
                  {signNameOf(moon.tropical_longitude)}
                </div>
              ) : null}
              {course ? (
                <div>
                  <span style={{ color: "var(--ink-mute)" }}>Course</span>{" "}
                  <span style={{ color: course.void ? "var(--warning)" : "var(--ink)" }}>
                    {course.void ? "Void of course" : "Not void"}
                  </span>{" "}
                  <span style={{ color: "var(--ink-mute)" }}>
                    (
                    {course.rule === "thirtyDegrees"
                      ? "within thirty degrees — Hellenistic"
                      : "before leaving the sign"}
                    ) · leaves the sign at {hhmm(course.next_sign_ingress)}
                  </span>
                </div>
              ) : null}
              {doctrine ? (
                <div>
                  <span style={{ color: "var(--ink-mute)" }}>Sect</span>{" "}
                  {doctrine.sect.sect === "diurnal" ? "a day chart — " : "a night chart — "}
                  {doctrine.sect.sect === "diurnal" ? "the Sun leads" : "the Moon leads"}
                </div>
              ) : null}
              {current && rulerDignity ? (
                <div>
                  <span style={{ color: "var(--ink-mute)" }}>The hour’s ruler</span>{" "}
                  {PLANET_LABEL[current.ruler] ?? current.ruler} in {rulerDignity.sign}
                  {" — "}
                  {rulerDignity.held.length > 0
                    ? rulerDignity.held.join(", ")
                    : rulerDignity.peregrine
                      ? "peregrine, a stranger there"
                      : rulerDignity.debilities.join(", ")}
                </div>
              ) : null}
            </div>
          </div>

          {/* The whole day, hour by hour — the ring's detail, listed. */}
          <div style={card}>
            <p style={eyebrow}>The whole day</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "4px 24px",
              }}
            >
              {hours.map((h) => {
                const isNow = current !== null && h.index === current.index;
                return (
                  <div
                    key={h.index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "5px 8px",
                      borderRadius: "var(--r-md, 8px)",
                      background: isNow ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${isNow ? "var(--accent)" : "transparent"}`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        textAlign: "center",
                        fontSize: 15,
                        color: PLANET_HOUR_COLOR[h.ruler] ?? "var(--ink-soft)",
                        opacity: h.is_day ? 1 : 0.75,
                      }}
                    >
                      {h.glyph}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink)",
                      }}
                    >
                      {PLANET_LABEL[h.ruler] ?? h.ruler}
                      {h.is_day ? "" : " · night"}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {hhmm(h.start)} – {hhmm(h.end)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
