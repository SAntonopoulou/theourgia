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
  buildSubjectEntry,
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

/** A rite authored on the web. `id`/`createdAt` absent → a new rite. */
export async function writeRitual(input: {
  id?: string;
  name: string;
  summary: string;
  script: string;
  createdAt?: string | null;
}): Promise<RecordEntryWrite> {
  const entry = buildSubjectEntry({
    id: input.id ?? crypto.randomUUID(),
    kind: "ritual",
    now: new Date().toISOString(),
    createdAt: input.createdAt ?? undefined,
    // A rite the practitioner wrote has no tradition timing — an empty list.
    row: { name: input.name, summary: input.summary, script: input.script, keptAt: "[]" },
  });
  await apiPut("/record/entries", { entries: [entry] });
  return entry;
}

/** Tombstone a rite (the whole row re-sent with deletedAt set). */
export async function deleteRitual(rite: {
  id: string;
  name: string;
  summary: string;
  script: string;
  createdAt?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const entry = buildSubjectEntry({
    id: rite.id,
    kind: "ritual",
    now,
    createdAt: rite.createdAt ?? undefined,
    deletedAt: now,
    row: { name: rite.name, summary: rite.summary, script: rite.script, keptAt: "[]" },
  });
  await apiPut("/record/entries", { entries: [entry] });
}

/** One performable item as the working editor holds it. */
export interface WorkingItemDraft {
  id?: string;
  createdAt?: string | null;
  title: string;
  cadence: string;
  perDay: number;
  orderIndex: number;
}

function workingRow(name: string, summary: string, subjectName: string): Record<string, unknown> {
  return {
    name,
    summary,
    startedAt: null,
    breakRule: "askMe",
    nativityStanding: "not-sought",
    subjectBirthId: null,
    subjectName,
  };
}

function itemRow(workingId: string, it: WorkingItemDraft): Record<string, unknown> {
  return {
    workingId,
    stageId: null,
    ritualId: null,
    script: "",
    title: it.title,
    cadence: it.cadence,
    perDay: it.perDay,
    orderIndex: it.orderIndex,
  };
}

/** A working authored on the web — the working row plus its items, and
 *  tombstones for items removed in this edit. All in one batch. */
export async function writeWorking(input: {
  id?: string;
  createdAt?: string | null;
  name: string;
  summary: string;
  subjectName: string;
  items: WorkingItemDraft[];
  removedItems?: WorkingItemDraft[];
}): Promise<void> {
  const now = new Date().toISOString();
  const workingId = input.id ?? crypto.randomUUID();
  const entries: RecordEntryWrite[] = [
    buildSubjectEntry({
      id: workingId,
      kind: "working",
      now,
      createdAt: input.createdAt ?? undefined,
      row: workingRow(input.name, input.summary, input.subjectName),
    }),
  ];
  for (const it of input.items) {
    entries.push(
      buildSubjectEntry({
        id: it.id ?? crypto.randomUUID(),
        kind: "working-item",
        now,
        createdAt: it.createdAt ?? undefined,
        row: itemRow(workingId, it),
      }),
    );
  }
  for (const it of input.removedItems ?? []) {
    if (!it.id) continue;
    entries.push(
      buildSubjectEntry({
        id: it.id,
        kind: "working-item",
        now,
        createdAt: it.createdAt ?? undefined,
        deletedAt: now,
        row: itemRow(workingId, it),
      }),
    );
  }
  await apiPut("/record/entries", { entries });
}

/** Tombstone a working (its items cascade-delete on the phone). */
export async function deleteWorking(w: {
  id: string;
  name: string;
  summary: string;
  subjectName: string;
  createdAt?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const entry = buildSubjectEntry({
    id: w.id,
    kind: "working",
    now,
    createdAt: w.createdAt ?? undefined,
    deletedAt: now,
    row: workingRow(w.name, w.summary, w.subjectName),
  });
  await apiPut("/record/entries", { entries: [entry] });
}

/**
 * A divination reading, kept to the record as a `consultation` — the shown
 * draw, not a fresh server re-cast. It crosses to the phone and shows in its
 * divination history. `cast` is the drawn result (JSON/text); `reading` the
 * interpretation.
 */
export async function writeConsultation(input: {
  systemId: string;
  question: string;
  cast: string;
  reading?: string;
  /** How it was arrived at — `drawn`, `thrown`, `scried`… */
  source?: string;
}): Promise<RecordEntryWrite> {
  const now = new Date().toISOString();
  const entry = buildSubjectEntry({
    id: crypto.randomUUID(),
    kind: "consultation",
    now,
    row: {
      systemId: input.systemId,
      question: input.question,
      cast: input.cast,
      source: input.source ?? "drawn",
      standing: "read",
      reading: input.reading ?? null,
      field: null,
      session: null,
      bound: null,
      selfInfluence: null,
      askedAt: now,
      entryLabel: "",
      presiding: "",
      verdict: "",
      note: "",
      outcome: "",
      outcomeAt: null,
      forAnother: false,
      nativityStanding: "not-sought",
      subjectBirthId: null,
      subjectName: "",
    },
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
