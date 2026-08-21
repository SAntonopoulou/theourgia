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

import {
  type AdorationBody,
  type RecordEntryWrite,
  type RecordedAdorationSet,
  adorationSetsFromEntries,
  buildAdorationEntry,
  buildAdorationSetEntry,
} from "@theourgia/shared";

import { apiGet, apiPut } from "../lib/api.js";

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
