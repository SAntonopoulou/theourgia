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
  buildSitPlanJson,
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

/** A rite authored on the web. `id`/`createdAt` absent → a new rite. A rite
 *  the practitioner wrote has no tradition timing; one adopted from a pack
 *  carries the tradition's own statement of when it is kept (`keptAt`, a
 *  JSON list, verbatim from the pack). */
export async function writeRitual(input: {
  id?: string;
  name: string;
  summary: string;
  script: string;
  createdAt?: string | null;
  keptAt?: string;
}): Promise<RecordEntryWrite> {
  const entry = buildSubjectEntry({
    id: input.id ?? crypto.randomUUID(),
    kind: "ritual",
    now: new Date().toISOString(),
    createdAt: input.createdAt ?? undefined,
    row: {
      name: input.name,
      summary: input.summary,
      script: input.script,
      keptAt: input.keptAt ?? "[]",
    },
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

/** One performable item as the working editor holds it. `stageId`, `script`
 *  and `ritualId` are carried untouched — the web editor does not author
 *  phases, and a save that dropped them would flatten a staged operation. */
export interface WorkingItemDraft {
  id?: string;
  createdAt?: string | null;
  title: string;
  cadence: string;
  perDay: number;
  orderIndex: number;
  stageId?: string | null;
  script?: string;
  ritualId?: string | null;
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

/** One phase of a working, as adopt writes it. Every column of the phone's
 *  WorkingStages table is present — its sync applies the row with a strict
 *  fromJson, so an absent field is not a default but a failure. */
export interface WorkingStageDraft {
  id: string;
  name: string;
  orderIndex: number;
  /** `onCompletion`, `onDate`, `afterSpan` or `whenDeclared`. */
  openRule: string;
  /** SkySpan JSON, when the rule is `afterSpan`. */
  openSpan?: string | null;
  /** `forDays`, `everyItemOnce` or `untilSky`. */
  requirement: string;
  requiredDays?: number;
  /** SkySpan JSON, when the requirement is measured by the sky. */
  requiredSpan?: string | null;
  criterion?: string;
  /** `previous` or `start`. */
  countFrom?: string;
  opensNoEarlierThanDay?: number | null;
  greek?: string;
  phaseKey?: string;
  namesAre?: string;
  /** Per-item phase cadences, JSON keyed by item id; '' for none. */
  cadences?: string;
}

function stageRow(workingId: string, s: WorkingStageDraft): Record<string, unknown> {
  return {
    workingId,
    name: s.name,
    orderIndex: s.orderIndex,
    openRule: s.openRule,
    openOn: null,
    spanDays: null,
    openSpan: s.openSpan ?? null,
    requiredSpan: s.requiredSpan ?? null,
    criterion: s.criterion ?? "",
    declaredAt: null,
    declaredNote: "",
    countFrom: s.countFrom ?? "previous",
    opensNoEarlierThanDay: s.opensNoEarlierThanDay ?? null,
    greek: s.greek ?? "",
    phaseKey: s.phaseKey ?? "",
    namesAre: s.namesAre ?? "",
    cadences: s.cadences ?? "",
    requirement: s.requirement,
    requiredDays: s.requiredDays ?? 1,
    openedAt: null,
    breakRule: null,
    completedAt: null,
  };
}

function itemRow(workingId: string, it: WorkingItemDraft): Record<string, unknown> {
  return {
    workingId,
    stageId: it.stageId ?? null,
    ritualId: it.ritualId ?? null,
    script: it.script ?? "",
    title: it.title,
    cadence: it.cadence,
    perDay: it.perDay,
    orderIndex: it.orderIndex,
  };
}

/** A working authored on the web — the working row plus its items (and, when
 *  adopting from a pack, its phases), and tombstones for items removed in
 *  this edit. All in one batch. */
export async function writeWorking(input: {
  id?: string;
  createdAt?: string | null;
  name: string;
  summary: string;
  subjectName: string;
  items: WorkingItemDraft[];
  removedItems?: WorkingItemDraft[];
  /** Written only when creating (adopt) — the web editor never edits phases,
   *  so an ordinary save must not touch them. */
  stages?: WorkingStageDraft[];
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
  for (const s of input.stages ?? []) {
    entries.push(
      buildSubjectEntry({
        id: s.id,
        kind: "working-stage",
        now,
        row: stageRow(workingId, s),
      }),
    );
  }
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

function sitPlanRow(
  name: string,
  summary: string,
  minutes: number,
  bell: boolean,
  kind: "sitting" | "breath",
): Record<string, unknown> {
  return {
    setId: null,
    name,
    summary,
    sourceKind: "silence",
    source: '{"source":"silence"}',
    // The phone's PracticeKind key — a breath form lives in the same store
    // and syncs to the phone's meditations table under its own kind.
    kind,
    plan: buildSitPlanJson(minutes, bell),
    breath: null,
    orderIndex: 0,
  };
}

/** A meditation plan authored on the web (a `meditation` row) — a silent sit
 *  by default, or a breath form for the pacer. */
export async function writeMeditationPlan(input: {
  id?: string;
  createdAt?: string | null;
  name: string;
  summary: string;
  minutes: number;
  bell: boolean;
  kind?: "sitting" | "breath";
}): Promise<void> {
  const entry = buildSubjectEntry({
    id: input.id ?? crypto.randomUUID(),
    kind: "meditation",
    now: new Date().toISOString(),
    createdAt: input.createdAt ?? undefined,
    row: sitPlanRow(input.name, input.summary, input.minutes, input.bell, input.kind ?? "sitting"),
  });
  await apiPut("/record/entries", { entries: [entry] });
}

/** Tombstone a saved sitting or breath form. */
export async function deleteMeditationPlan(p: {
  id: string;
  name: string;
  summary: string;
  minutes: number;
  bell: boolean;
  createdAt?: string | null;
  kind?: "sitting" | "breath";
}): Promise<void> {
  const now = new Date().toISOString();
  const entry = buildSubjectEntry({
    id: p.id,
    kind: "meditation",
    now,
    createdAt: p.createdAt ?? undefined,
    deletedAt: now,
    row: sitPlanRow(p.name, p.summary, p.minutes, p.bell, p.kind ?? "sitting"),
  });
  await apiPut("/record/entries", { entries: [entry] });
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
