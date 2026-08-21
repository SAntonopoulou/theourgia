/**
 * Astrology — cast a chart for a moment and place, on the web.
 *
 * The phone's astrology, mirrored: pick an instant (now, or any time) and a
 * location (your saved one, editable), choose tropical/sidereal and the house
 * system, and read the wheel. Positions come from the server's Swiss Ephemeris
 * (`GET /api/v1/astro/chart`) — the browser only draws them, via the shared
 * `<Chart>` used by the publishing editor. The backend response is already in
 * the component's shape, so nothing is re-derived here.
 */

import {
  Button,
  Chart,
  ChartDetail,
  ChartLegend,
  type ChartResponse,
  EmptyState,
  Skeleton,
  Toast,
  useApiCall,
} from "@theourgia/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiMethods } from "../data/api.js";
import { writeDayEntry } from "../data/keepObservance.js";

type Zodiac = "tropical" | "sidereal";
type HouseSystem = "placidus" | "whole-sign";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const LUMINARIES = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);

function signOf(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)] ?? "";
}

function degInSign(longitude: number): string {
  return `${Math.floor(((longitude % 30) + 30) % 30)}°`;
}

/** A Date as the value a <input type="datetime-local"> wants (local wall clock). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

const HOUR_MS = 3_600_000;

/** The spans one full drag of the scrubber covers, mirroring the phone's Hour/
 *  Day/Week/Month strip in `quick_chart_screen`. */
const SCRUB_SPANS = [
  { key: "hour", label: "Hour", unit: "hour", ms: HOUR_MS },
  { key: "day", label: "Day", unit: "day", ms: 24 * HOUR_MS },
  { key: "week", label: "Week", unit: "week", ms: 7 * 24 * HOUR_MS },
  { key: "month", label: "Month", unit: "month", ms: 30 * 24 * HOUR_MS },
] as const;

type ScrubSpanKey = (typeof SCRUB_SPANS)[number]["key"];

/** A signed millisecond offset as a short human label: "+3h", "−2d 4h", "now". */
function offsetLabel(ms: number): string {
  if (Math.abs(ms) < 60_000) return "at the cast moment";
  const sign = ms < 0 ? "−" : "+";
  let s = Math.abs(Math.round(ms / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  return `${sign}${parts.join(" ") || "0m"}`;
}

const SEG_BASE = {
  padding: "6px 12px",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  border: "1px solid var(--line)",
  cursor: "pointer",
  background: "transparent",
  color: "var(--ink-soft)",
} as const;

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink-mute)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ display: "inline-flex", borderRadius: "var(--r-md, 8px)", overflow: "hidden" }}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            style={{
              ...SEG_BASE,
              background: value === o.key ? "var(--accent-soft, var(--bg-3))" : "transparent",
              color: value === o.key ? "var(--ink)" : "var(--ink-soft)",
              borderColor: value === o.key ? "var(--accent)" : "var(--line)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "7px 9px",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg-2)",
  color: "var(--ink)",
} as const;

export function AstrologyRoute() {
  const location = useApiCall((signal) => apiMethods.getMyLocation({ signal }));

  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [zodiac, setZodiac] = useState<Zodiac>("tropical");
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");

  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const didInitialCast = useRef(false);

  // The time-scrubber: drag the chart through time from a base anchor (the last
  // moment cast explicitly). The slider's value is the fraction of one span away
  // from that anchor, in [-1, 1]; the span is Hour/Day/Week/Month.
  const [scrubSpanKey, setScrubSpanKey] = useState<ScrubSpanKey>("day");
  const [scrubOffset, setScrubOffset] = useState(0);
  const scrubBaseRef = useRef<number>(Date.now());
  const scrubTokenRef = useRef(0);
  const scrubSpanMs = SCRUB_SPANS.find((s) => s.key === scrubSpanKey)?.ms ?? 24 * HOUR_MS;

  const cast = useCallback(
    async (over?: { lat?: number; lng?: number; whenIso?: string }) => {
      const latN = over?.lat ?? Number(lat);
      const lngN = over?.lng ?? Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        setCastError("Enter a latitude and longitude first.");
        return;
      }
      const whenIso = over?.whenIso ?? new Date(when).toISOString();
      setCasting(true);
      setCastError(null);
      try {
        const result = await apiMethods.getChart({
          when: whenIso,
          latitude: latN,
          longitude: lngN,
          zodiac,
          house_system: houseSystem === "whole-sign" ? "whole-sign" : "placidus",
        });
        // An explicit cast is the scrubber's new anchor: centre the slider on it.
        scrubTokenRef.current += 1;
        scrubBaseRef.current = new Date(whenIso).getTime();
        setScrubOffset(0);
        setChart(result);
        setSaved(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "The chart could not be cast.";
        setCastError(msg);
        Toast.push({ tone: "warning", title: "Couldn't cast the chart", body: msg });
      } finally {
        setCasting(false);
      }
    },
    [lat, lng, when, zodiac, houseSystem],
  );

  const saveChart = async (): Promise<void> => {
    if (!chart) return;
    setSaving(true);
    try {
      const asc = `Asc ${degInSign(chart.houses.ascendant)} ${signOf(chart.houses.ascendant)}`;
      const bodies = chart.placements
        .filter((p) => LUMINARIES.has(p.body_name))
        .map((p) => `${p.body_name} ${degInSign(p.tropical_longitude)} ${p.tropical_sign}`);
      await writeDayEntry({ kind: "sky", at: chart.instant, body: [asc, ...bodies].join(" · ") });
      setSaved(true);
      Toast.push({
        tone: "success",
        title: "Kept to the record",
        body: "This chart is in your record and will sync to the phone.",
      });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Couldn't save the chart",
        body: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Seed the location from the user's saved setting, then cast "now" once.
  useEffect(() => {
    if (location.data && !didInitialCast.current) {
      didInitialCast.current = true;
      const la = location.data.lat;
      const lo = location.data.lng;
      setLat(String(la));
      setLng(String(lo));
      void cast({ lat: la, lng: lo, whenIso: new Date().toISOString() });
    }
  }, [location.data, cast]);

  const setNow = () => {
    const now = new Date();
    setWhen(toLocalInput(now));
    void cast({ whenIso: now.toISOString() });
  };

  // A latest-wins cast for the scrubber: dragging fires many casts, and a slower
  // earlier response must not overwrite a later one, so each carries a token and
  // only the newest to return is allowed to land.
  const castAt = useCallback(
    async (whenIso: string) => {
      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return;
      scrubTokenRef.current += 1;
      const token = scrubTokenRef.current;
      setCasting(true);
      try {
        const result = await apiMethods.getChart({
          when: whenIso,
          latitude: latN,
          longitude: lngN,
          zodiac,
          house_system: houseSystem === "whole-sign" ? "whole-sign" : "placidus",
        });
        if (token !== scrubTokenRef.current) return;
        setChart(result);
        setSaved(false);
      } catch {
        // A scrub that fails is quiet — the previous chart stays; the next drag retries.
      } finally {
        if (token === scrubTokenRef.current) setCasting(false);
      }
    },
    [lat, lng, zodiac, houseSystem],
  );

  const scrubTo = (offset: number) => {
    setScrubOffset(offset);
    const moment = new Date(scrubBaseRef.current + offset * scrubSpanMs);
    setWhen(toLocalInput(moment));
    void castAt(moment.toISOString());
  };

  // Changing the span rebases onto the shown moment and re-centres, so the chart
  // never jumps — only how far a full drag reaches changes.
  const changeSpan = (key: ScrubSpanKey) => {
    scrubBaseRef.current += scrubOffset * scrubSpanMs;
    setScrubOffset(0);
    setScrubSpanKey(key);
  };

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <header style={{ marginBottom: 18 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 24,
            color: "var(--ink)",
          }}
        >
          Astrology
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          Cast a chart for any moment and place. Positions are computed by the Swiss Ephemeris on
          the server.
        </p>
      </header>

      {location.status === "loading" ? (
        <Skeleton kind="rect" height={64} />
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 16,
            padding: 16,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--bg-2)",
            marginBottom: 20,
          }}
        >
          <label style={{ display: "grid", gap: 5 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink-mute)",
              }}
            >
              Moment
            </span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink-mute)",
              }}
            >
              Latitude
            </span>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              style={{ ...inputStyle, width: 110 }}
            />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink-mute)",
              }}
            >
              Longitude
            </span>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              style={{ ...inputStyle, width: 110 }}
            />
          </label>
          <Segmented
            label="Zodiac"
            value={zodiac}
            onChange={setZodiac}
            options={[
              { key: "tropical", label: "Tropical" },
              { key: "sidereal", label: "Sidereal" },
            ]}
          />
          <Segmented
            label="Houses"
            value={houseSystem}
            onChange={setHouseSystem}
            options={[
              { key: "placidus", label: "Placidus" },
              { key: "whole-sign", label: "Whole sign" },
            ]}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => void cast()} disabled={casting}>
              {casting ? "Casting…" : "Cast"}
            </Button>
            <Button variant="quiet" onClick={setNow} disabled={casting}>
              Now
            </Button>
          </div>
        </div>
      )}

      {castError && !chart ? (
        <EmptyState
          title="Couldn't cast the chart"
          body={castError}
          action={<Button onClick={() => void cast()}>Try again</Button>}
        />
      ) : chart ? (
        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
              marginBottom: 14,
            }}
          >
            Ascendant {degInSign(chart.houses.ascendant)} {signOf(chart.houses.ascendant)} ·
            Midheaven {degInSign(chart.houses.midheaven)} {signOf(chart.houses.midheaven)}
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              padding: "13px 16px",
              marginBottom: 14,
              background: "var(--bg-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <Segmented
                label="Scrub by"
                value={scrubSpanKey}
                onChange={changeSpan}
                options={SCRUB_SPANS.map((s) => ({ key: s.key, label: s.label }))}
              />
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Number.isNaN(new Date(when).getTime())
                    ? ""
                    : new Date(when).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                </div>
                <div
                  style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}
                >
                  {offsetLabel(scrubOffset * scrubSpanMs)}
                  {scrubOffset !== 0 ? (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={setNow}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          font: "inherit",
                          color: "var(--accent)",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        back to now
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.0001}
              value={scrubOffset}
              onChange={(e) => scrubTo(Number(e.target.value))}
              aria-label="Scrub the chart through time"
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "ew-resize" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 2,
              }}
            >
              <span>
                −1 {SCRUB_SPANS.find((s) => s.key === scrubSpanKey)?.unit ?? scrubSpanKey}
              </span>
              <span>the cast moment</span>
              <span>
                +1 {SCRUB_SPANS.find((s) => s.key === scrubSpanKey)?.unit ?? scrubSpanKey}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Button variant="quiet" onClick={() => void saveChart()} disabled={saving || saved}>
              {saved ? "Kept to the record ✓" : saving ? "Saving…" : "Save to record"}
            </Button>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 28,
              alignItems: "flex-start",
            }}
          >
            <Chart
              title="Cast chart"
              placements={chart.placements}
              houses={chart.houses}
              aspects={chart.aspects}
              size={440}
              attribution={chart.attribution}
            />
            <div style={{ flex: 1, minWidth: 280 }}>
              <ChartLegend placements={chart.placements} />
            </div>
          </div>
          <div style={{ marginTop: 28 }}>
            <ChartDetail chart={chart} />
          </div>
        </div>
      ) : casting ? (
        <Skeleton kind="rect" height={440} />
      ) : null}
    </section>
  );
}
