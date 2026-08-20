/**
 * Recording a kept practice from the web — the write half of parity with the
 * phone's keeping.
 *
 * The phone's rule is "mark first, offer the sheet after": `keepObservance`
 * captures the sky and writes the observance immediately (mood/body/note left
 * open), returning the entry; the keeping sheet then calls `amendObservance` to
 * add how it was. Both go through `PUT /record/entries`, which the phone pulls
 * on its next sync, so a web-kept mark shows up on the phone.
 */

import {
  type ChartResponse,
  type DayEntryKind,
  type ObservanceContext,
  type RecordEntryWrite,
  buildDayEntryEntry,
  buildObservanceContext,
  buildObservanceEntry,
} from "@theourgia/shared";

import { apiGet, apiPut } from "../lib/api.js";

type PlanetaryHoursResponse = {
  current_hour_index: number | null;
  hours: { index: number; ruler: string; is_day: boolean }[];
};

export interface KeepLocation {
  lat: number;
  lng: number;
  label?: string | null;
}

/** Snapshot the sky for a keeping, from the public astro endpoints. Never
 *  throws — a failed read yields a context whose projected fields are null and
 *  which records the reason, exactly as the phone stores a capture failure. */
export async function fetchSkyContext(loc: KeepLocation): Promise<ObservanceContext> {
  const capturedAt = new Date().toISOString();
  const q = `latitude=${loc.lat}&longitude=${loc.lng}`;
  try {
    const [chart, hours] = await Promise.all([
      apiGet<ChartResponse>(`/astro/now?${q}`),
      apiGet<PlanetaryHoursResponse>(`/astro/planetary-hours?${q}`),
    ]);
    return buildObservanceContext({
      capturedAt,
      placements: chart.placements,
      hours,
      location: { latitude: loc.lat, longitude: loc.lng, label: loc.label ?? null },
      skyJson: JSON.stringify(chart),
    });
  } catch (e) {
    return buildObservanceContext({
      capturedAt,
      placements: [],
      hours: null,
      location: { latitude: loc.lat, longitude: loc.lng, label: loc.label ?? null },
      skyFailureReason: e instanceof Error ? e.message : "sky unavailable",
    });
  }
}

export interface KeepInput {
  /** `ritual:<id>`, a station name, `working-item:<id>`, `meditation:<id>`… */
  subjectKey: string;
  /** The instant the thing was due/occurred (a station's time, or the moment). */
  occurrenceAt: string;
  observedAt?: string;
  durationSeconds?: number | null;
  subjectName?: string;
  location: KeepLocation;
}

/** Write the observance now, sky captured, mood/body/note left open. */
export async function keepObservance(input: KeepInput): Promise<RecordEntryWrite> {
  const context = await fetchSkyContext(input.location);
  const entry = buildObservanceEntry({
    id: crypto.randomUUID(),
    now: new Date().toISOString(),
    subjectKey: input.subjectKey,
    occurrenceAt: input.occurrenceAt,
    observedAt: input.observedAt,
    durationSeconds: input.durationSeconds ?? null,
    subjectName: input.subjectName,
    context,
  });
  await apiPut("/record/entries", { entries: [entry] });
  return entry;
}

/** Write a day-journal entry (a note, a dream, a waking, a kept sky…) to the
 *  record; it crosses to the phone on its next sync. */
export async function writeDayEntry(input: {
  kind: DayEntryKind;
  at?: string;
  body?: string;
  sleepQuality?: number | null;
}): Promise<RecordEntryWrite> {
  const entry = buildDayEntryEntry({
    id: crypto.randomUUID(),
    now: new Date().toISOString(),
    kind: input.kind,
    at: input.at,
    body: input.body,
    sleepQuality: input.sleepQuality ?? null,
  });
  await apiPut("/record/entries", { entries: [entry] });
  return entry;
}

/** Amend an already-written keeping with mood/body/note (last-writer-wins). */
export async function amendObservance(
  entry: RecordEntryWrite,
  values: { mood: number | null; body: number | null; note: string },
): Promise<RecordEntryWrite> {
  const amended: RecordEntryWrite = {
    ...entry,
    updated_at_utc: new Date().toISOString(),
    doc: { ...entry.doc, mood: values.mood, bodyFeeling: values.body, note: values.note },
  };
  await apiPut("/record/entries", { entries: [amended] });
  return amended;
}
