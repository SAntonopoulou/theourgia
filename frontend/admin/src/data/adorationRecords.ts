/**
 * Adoration sets on the web, backed by the synced record store.
 *
 * Replaces the old per-account settings slice (`/users/me/settings/adorations`,
 * web-only) with the record store, so a set chosen here crosses to the phone and
 * back — see the shared `adorationRecords` vertical and the phone's adoration
 * sync. Reading pages `/record/entries`; every write is one `PUT /record/entries`
 * batch. There is no default: a body with no active set has no words, exactly as
 * on the phone.
 */

import { useQuery } from "@tanstack/react-query";
import {
  type AdorationBody,
  type RecordEntryWrite,
  type RecordedAdorationSet,
  adorationSetsFromEntries,
  buildAdorationEntry,
  buildAdorationSetEntry,
} from "@theourgia/shared";

import { apiGet, apiPut } from "../lib/api.js";

/** One shared TanStack cache for the record-backed adoration sets, so the
 *  selection surface and Today re-render together. */
export const ADORATION_SETS_KEY = ["adoration-sets", "record"] as const;

export function useAdorationSets() {
  return useQuery<RecordedAdorationSet[], Error>({
    queryKey: ADORATION_SETS_KEY,
    queryFn: fetchAdorationSets,
  });
}

const LUNAR_OBSERVANCE_KEYS = new Set([
  "moonrise",
  "upperCulmination",
  "moonset",
  "lowerCulmination",
]);

function localDay(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * The lunar adoration streak — consecutive days a lunar station was kept,
 * counted back from today (or yesterday, if today is not yet kept, so an alive
 * streak is not shown as broken before the day is done). Computed from the
 * synced record, the web counterpart of the solar `streak_days` the Resh
 * endpoint returns.
 */
export async function fetchLunarStreakDays(): Promise<number> {
  const days = new Set<string>();
  let since = 0;
  for (;;) {
    const page = await apiGet<PullPage>(`/record/entries?since=${since}&limit=500`);
    for (const e of page.entries ?? []) {
      if (e.kind !== "observance" || e.deleted_at_utc) continue;
      const doc = e.doc as { subjectKey?: unknown; observedAt?: unknown } | null;
      const key = typeof doc?.subjectKey === "string" ? doc.subjectKey : "";
      const at = typeof doc?.observedAt === "string" ? doc.observedAt : "";
      if (!LUNAR_OBSERVANCE_KEYS.has(key) || at.length === 0) continue;
      days.add(localDay(new Date(at)));
    }
    since = page.next_since;
    if (!page.more) break;
  }

  const cursor = new Date();
  if (!days.has(localDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDay(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useLunarStreak() {
  return useQuery<number, Error>({
    queryKey: ["lunar-streak", "record"],
    queryFn: fetchLunarStreakDays,
  });
}

let counter = 0;
function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  counter += 1;
  return `${prefix}-${counter}-${Date.now()}`;
}

type PullPage = {
  entries: {
    kind: string;
    deleted_at_utc?: string | null;
    doc?: { row?: Record<string, unknown> | null; stations?: unknown } | null;
  }[];
  next_since: number;
  more: boolean;
};

/** Every adoration set in the record, of every body, with its adorations. */
export async function fetchAdorationSets(): Promise<RecordedAdorationSet[]> {
  const all: PullPage["entries"] = [];
  let since = 0;
  for (;;) {
    const page = await apiGet<PullPage>(`/record/entries?since=${since}&limit=500`);
    for (const e of page.entries ?? []) {
      if (e.kind === "adoration-set" || e.kind === "adoration") all.push(e);
    }
    since = page.next_since;
    if (!page.more) break;
  }
  return adorationSetsFromEntries(all);
}

function put(entries: RecordEntryWrite[]): Promise<unknown> {
  return apiPut("/record/entries", { entries });
}

/** Create a new, empty set for a body. Its first four station adorations are
 *  left to be given words in the editor. Not activated here. */
export async function createAdorationSet(body: AdorationBody, name: string): Promise<string> {
  const id = newId("aset");
  await put([
    buildAdorationSetEntry({ id, body, name, active: false, now: new Date().toISOString() }),
  ]);
  return id;
}

export async function renameAdorationSet(set: RecordedAdorationSet, name: string): Promise<void> {
  await put([
    buildAdorationSetEntry({
      id: set.id,
      body: set.body,
      name,
      active: set.active,
      createdAt: set.createdAt,
      now: new Date().toISOString(),
    }),
  ]);
}

/**
 * Make one set the active one for its body. Rewrites every set of that body —
 * the target active, the rest inactive — each with a fresh `updatedAt`, so the
 * whole switch crosses under per-row last-writer-wins exactly as the phone's
 * `activate` intends.
 */
export async function activateAdorationSet(
  sets: readonly RecordedAdorationSet[],
  setId: string,
): Promise<void> {
  const target = sets.find((s) => s.id === setId);
  if (!target) return;
  const now = new Date().toISOString();
  const entries = sets
    .filter((s) => s.body === target.body)
    .map((s) =>
      buildAdorationSetEntry({
        id: s.id,
        body: s.body,
        name: s.name,
        active: s.id === setId,
        createdAt: s.createdAt,
        now,
      }),
    );
  await put(entries);
}

/** Tombstone a set (its adorations cascade-delete on the phone). */
export async function deleteAdorationSet(set: RecordedAdorationSet): Promise<void> {
  const now = new Date().toISOString();
  await put([
    buildAdorationSetEntry({
      id: set.id,
      body: set.body,
      name: set.name,
      active: false,
      createdAt: set.createdAt,
      now,
      deletedAt: now,
    }),
  ]);
}

/** Give (or change) the words said at one station of a set. Upserts the
 *  adoration keyed by station: one adoration per station on the web, which is
 *  the shape the station editor presents. */
export async function writeStationAdoration(input: {
  set: RecordedAdorationSet;
  stationKey: string;
  script: string;
  orderIndex: number;
}): Promise<void> {
  const existing = input.set.adorations.find((a) => a.stationKeys.includes(input.stationKey));
  await put([
    buildAdorationEntry({
      id: existing?.id ?? newId("ador"),
      setId: input.set.id,
      title: "",
      script: input.script,
      stationKeys: [input.stationKey],
      orderIndex: input.orderIndex,
      now: new Date().toISOString(),
    }),
  ]);
}

/**
 * Adopt a set from a pack payload — the phone's "a pack is a source to adopt
 * from": the words are COPIED into the practitioner's own new set, never
 * linked, so a pack update can never rewrite words they have changed. Returns
 * the new set's id. Adopted inactive; the surface offers to activate it.
 */
export async function adoptAdorationSet(input: {
  body: AdorationBody;
  name: string;
  adorations: { script: string; title?: string; stationKeys: string[] }[];
}): Promise<string> {
  const setId = newId("aset");
  const now = new Date().toISOString();
  const entries: RecordEntryWrite[] = [
    buildAdorationSetEntry({ id: setId, body: input.body, name: input.name, active: false, now }),
  ];
  input.adorations.forEach((a, i) => {
    entries.push(
      buildAdorationEntry({
        id: newId("ador"),
        setId,
        title: a.title ?? "",
        script: a.script,
        stationKeys: a.stationKeys,
        orderIndex: i,
        now,
      }),
    );
  });
  await put(entries);
  return setId;
}
