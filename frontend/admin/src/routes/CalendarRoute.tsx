/**
 * Calendar — admin route composing the shared CalendarSurface against
 * ``GET /api/v1/events`` (v1-051).
 *
 * The surface is data-pure; this route owns the fetch. The requested
 * range is the focused month padded a week either side so the grid's
 * out-of-month cells still show their astro events. Stepping months
 * re-fetches (useApiCall's refresh picks up the new closure).
 *
 * Wire → surface mapping decisions:
 *  - Backend festival ``end`` is EXCLUSIVE (start + duration); the
 *    surface wants the inclusive last local day, so we step back 1ms
 *    before deriving the local date.
 *  - Backend labels carry the name redundantly ("Vestalia 2026",
 *    "Deipnon · June 2026 dark moon"). We strip a leading "Name · "
 *    qualifier prefix; plain "Name YYYY" labels are replaced with a
 *    date-range label ("7–15 June"), matching the design's detail rail.
 *  - Astro: lunar phases + Sun ingresses only. Moon/planet ingresses
 *    (~13+/month) would flood the grid the design curates; they stay
 *    available to future surfaces via the same endpoint.
 *  - "custom" tradition instances are skipped until the frontend
 *    taxonomy grows a custom lane.
 */

import {
  CalendarSurface,
  festivalGlyph,
  useTopbar,
  type AstroEventRead,
  type AstroEventsResponse,
  type CalendarAstroEvent,
  type CalendarFestivalInstance,
  type FestivalEventRead,
  type FestivalTradition,
} from "@theourgia/shared";
import { useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";

const TRADITION_MAP: Partial<Record<string, FestivalTradition>> = {
  "wheel-of-the-year": "woty",
  greek: "greek",
  roman: "roman",
  hekatean: "hekatean",
  thelemic: "thelemic",
  hindu: "hindu",
  egyptian: "egyptian",
};

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function localIsoDay(instant: string | Date): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Festival observances are CIVIL days. The backend encodes an
 * instance as ``[start, start + n days)`` where fixed-date festivals
 * start at a UTC midnight but lunar ones (Deipnon, Noumenia) start at
 * the astronomical INSTANT — so neither "local day of start" nor
 * "day of end − 1ms" is safe. The stable reading: the instance covers
 * ``round((end − start) / 1 day)`` civil days beginning on the
 * start's UTC day. Astro events are true instants and use the
 * viewer's local day instead (`localIsoDay` — "times shown in your
 * timezone").
 */
function utcIsoDay(instant: string | Date): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const out = new Date(Date.UTC(y, m - 1, d + days));
  return utcIsoDay(out);
}

/** "7–15 June" · "11 June" · "28 October–1 November". */
function rangeLabel(startIso: string, endIso: string): string {
  const [sy = 0, sm = 1, sd = 1] = startIso.split("-").map(Number);
  const [ey = 0, em = 1, ed = 1] = endIso.split("-").map(Number);
  void sy;
  void ey;
  if (sm === em && sd === ed) return `${sd} ${MONTH_LONG[sm - 1]}`;
  if (sm === em) return `${sd}–${ed} ${MONTH_LONG[sm - 1]}`;
  return `${sd} ${MONTH_LONG[sm - 1]}–${ed} ${MONTH_LONG[em - 1]}`;
}

function festivalLabel(
  wire: FestivalEventRead,
  startIso: string,
  endIso: string,
): string {
  const prefix = `${wire.name} · `;
  if (wire.label.startsWith(prefix)) return wire.label.slice(prefix.length);
  return rangeLabel(startIso, endIso);
}

function mapFestivals(rows: FestivalEventRead[]): CalendarFestivalInstance[] {
  const out: CalendarFestivalInstance[] = [];
  for (const wire of rows) {
    const tradition = TRADITION_MAP[wire.tradition];
    if (!tradition) continue;
    const startIso = utcIsoDay(wire.start);
    const durationDays = Math.max(
      1,
      Math.round(
        (new Date(wire.end).getTime() - new Date(wire.start).getTime()) /
          86_400_000,
      ),
    );
    const endIso = addDaysIso(startIso, durationDays - 1);
    out.push({
      id: `${wire.festival_id}:${startIso}`,
      festivalId: wire.festival_id,
      name: wire.name,
      tradition,
      glyph: festivalGlyph(wire.festival_id, tradition),
      label: festivalLabel(wire, startIso, endIso),
      startDate: startIso,
      endDate: endIso,
      description: wire.description,
      practice: wire.practice,
      sources: wire.sources.map((s) => ({
        kind: s.kind,
        title: s.title,
        author: s.author,
        // Design byline conventions: "c. 700 BCE" · "8 CE" · "1996".
        year:
          s.year === null
            ? "—"
            : s.year < 0
              ? `c. ${-s.year} BCE`
              : s.year < 1000
                ? `${s.year} CE`
                : String(s.year),
        ...(s.locator ? { loc: s.locator } : {}),
        ...(s.notes ? { note: s.notes } : {}),
      })),
    });
  }
  return out;
}

const PHASE_COPY: Record<
  string,
  { label: string; name: string; glyph: string; description: string }
> = {
  "new-moon": {
    label: "New moon",
    name: "New moon",
    glyph: "●",
    description:
      "The Sun and Moon in conjunction — the dark of the moon. Beginnings, intentions, the Hellenic month's eve.",
  },
  "first-quarter": {
    label: "First quarter",
    name: "First quarter moon",
    glyph: "◐",
    description:
      "The waxing half-moon — a time of building, tending and decisive action on what the new moon began.",
  },
  "full-moon": {
    label: "Full moon",
    name: "Full moon",
    glyph: "○",
    description:
      "The Moon fully lit, opposite the Sun. Culmination, gratitude, the height of a work's charge.",
  },
  "last-quarter": {
    label: "Last quarter",
    name: "Last quarter moon",
    glyph: "◑",
    description:
      "The waning half-moon. Traditionally a time for release, banishing and the closing of works.",
  },
};

/** Sun-ingress presentation: cardinal signs are the solar stations. */
const SUN_STATION: Record<string, { label: string; description: string }> = {
  Cancer: {
    label: "Summer solstice",
    description:
      "The Sun reaches its greatest northern declination and ingresses Cancer — the cardinal turn of the solar year.",
  },
  Capricorn: {
    label: "Winter solstice",
    description:
      "The Sun reaches its greatest southern declination and ingresses Capricorn — the cardinal turn of the solar year.",
  },
  Aries: {
    label: "Spring equinox",
    description:
      "The Sun crosses the celestial equator northward and ingresses Aries — day and night in balance.",
  },
  Libra: {
    label: "Autumn equinox",
    description:
      "The Sun crosses the celestial equator southward and ingresses Libra — day and night in balance.",
  },
};

function mapAstro(rows: AstroEventRead[]): CalendarAstroEvent[] {
  const out: CalendarAstroEvent[] = [];
  for (const wire of rows) {
    const date = localIsoDay(wire.instant);
    const phase = PHASE_COPY[wire.kind];
    if (phase) {
      out.push({
        id: `${wire.kind}:${wire.instant}`,
        date,
        glyph: phase.glyph,
        label: phase.label,
        name: phase.name,
        sub: wire.sign ? `Moon in ${wire.sign}` : "",
        description: phase.description,
        kindGroup: "lunation",
      });
      continue;
    }
    if (wire.kind === "ingress" && wire.body === "sun" && wire.sign) {
      const station = SUN_STATION[wire.sign];
      out.push({
        id: `ingress-sun:${wire.instant}`,
        date,
        glyph: "☀",
        label: station?.label ?? `Sun enters ${wire.sign}`,
        name: station?.label ?? `Sun enters ${wire.sign}`,
        // Stations subtitle with the ingress ("Sun enters Cancer" under
        // "Summer solstice"); a plain ingress IS its own name — an
        // identical sub would just echo it.
        sub: station ? `Sun enters ${wire.sign}` : "",
        description: station?.description ?? `The Sun ingresses ${wire.sign}.`,
        kindGroup: "solar",
      });
    }
    // Moon/planet ingresses + stations: intentionally not surfaced here.
  }
  return out;
}

/** The focused month padded a week either side, as tz-aware ISO bounds. */
function rangeFor(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(year, month, 1);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function CalendarRoute() {
  useTopbar(() => ({
    title: "Calendar",
    subtitle:
      "Astronomical events & festivals · across your enabled traditions",
  }));

  const now = new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth() + 1,
  });

  const range = useMemo(() => rangeFor(cursor.y, cursor.m), [cursor]);

  // One fetch per visible range. Abort-safe and stale-proof: the
  // cleanup aborts the in-flight call, and an aborted call never
  // writes state — so month-stepping and StrictMode's double effect
  // both settle on the latest range's data. `attempt` powers retry.
  const [data, setData] = useState<AstroEventsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    apiMethods
      .getEvents(
        { start: range.start, end: range.end },
        { signal: ctrl.signal },
      )
      .then((d: AstroEventsResponse) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e as Error);
      });
    return () => ctrl.abort();
  }, [range.start, range.end, attempt]);

  const festivals = useMemo(
    () => mapFestivals(data?.festivals ?? []),
    [data?.festivals],
  );
  const astro = useMemo(
    () => mapAstro(data?.astronomical ?? []),
    [data?.astronomical],
  );

  return (
    <div className="scroll" style={{ overflowY: "auto", minHeight: 0 }}>
      {error ? (
        <SurfaceError
          title="Calendar couldn't load"
          message={error.message || "The events request failed."}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : null}
      <CalendarSurface
        festivals={festivals}
        astro={astro}
        initialYear={cursor.y}
        initialMonth={cursor.m}
        onMonthChange={(y, m) => setCursor({ y, m })}
      />
    </div>
  );
}
