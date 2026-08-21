/**
 * Adoration sets, read from and written to the synced record.
 *
 * The phone reserved adoration sets for a deferred sync and now carries them
 * through the record store: an `adoration-set` document is the device row
 * (`{ id, body, name, isActive, createdAt, updatedAt, deletedAt }`), and an
 * `adoration` document is its row (`{ id, setId, title, content, orderIndex, … }`)
 * with the stations it is said at riding embedded as `doc.stations`. This module
 * turns those documents into sets for the web to choose among, and builds the
 * same documents back so a set adopted or activated on the web crosses to the
 * phone. Pure — tested without a network.
 *
 * One set is *active* per body; that is the set the day tracker reads its words
 * from. There is no default: until a set is adopted (from a pack) and activated,
 * a body has no words — exactly as on the phone.
 */

import type { RecordEntryWrite } from "../keeping/observance.js";
import { buildSubjectEntry } from "../keeping/subject.js";

export type AdorationBody = "lunar" | "solar";

/** The four stations of each rite, keyed as the phone keys them. */
export const LUNAR_STATION_KEYS = [
  "moonrise",
  "upperCulmination",
  "moonset",
  "lowerCulmination",
] as const;
export const SOLAR_STATION_KEYS = ["sunrise", "noon", "sunset", "midnight"] as const;

/** A station's key paired with a human label, for the editor. */
export const STATION_LABELS: Record<string, string> = {
  moonrise: "Moonrise",
  upperCulmination: "Upper culmination",
  moonset: "Moonset",
  lowerCulmination: "Lower culmination",
  sunrise: "Sunrise",
  noon: "Noon",
  sunset: "Sunset",
  midnight: "Midnight",
};

/** The station keys a body offers, in order. */
export function stationKeysFor(body: AdorationBody): readonly string[] {
  return body === "lunar" ? LUNAR_STATION_KEYS : SOLAR_STATION_KEYS;
}

/** One adoration: the words, byte-exact, and where they are said. */
export interface RecordedAdoration {
  id: string;
  setId: string;
  title: string;
  /** The adoration as one RiteScript, byte-exact (the phone's `content`). */
  script: string;
  stationKeys: string[];
  orderIndex: number;
}

/** A set of adorations for one body, one of which is in use. */
export interface RecordedAdorationSet {
  id: string;
  body: AdorationBody;
  name: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  adorations: RecordedAdoration[];
}

/** A record entry as the pull returns it — only what an adoration needs. */
export interface AdorationRecordEntry {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: {
    row?: Record<string, unknown> | null;
    stations?: unknown;
  } | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bodyOf(value: unknown): AdorationBody | null {
  return value === "lunar" || value === "solar" ? value : null;
}

/**
 * The adoration sets among a set of record entries, each with its adorations.
 * Tombstoned sets and adorations — by the envelope or the row's own
 * `deletedAt` — are dropped; duplicate ids keep the last seen. Sets are A→Z by
 * name; adorations within a set are by `orderIndex`.
 */
export function adorationSetsFromEntries(
  entries: readonly AdorationRecordEntry[],
): RecordedAdorationSet[] {
  const sets = new Map<string, RecordedAdorationSet>();
  const adorations = new Map<string, RecordedAdoration>();

  for (const entry of entries) {
    const row = entry.doc?.row;
    if (!row) continue;
    const id = str(row.id);
    if (id.length === 0) continue;
    const tombstoned = Boolean(entry.deleted_at_utc) || str(row.deletedAt).length > 0;

    if (entry.kind === "adoration-set") {
      if (tombstoned) {
        sets.delete(id);
        continue;
      }
      const body = bodyOf(row.body);
      if (body === null) continue;
      sets.set(id, {
        id,
        body,
        name: str(row.name),
        active: row.isActive === true,
        createdAt: str(row.createdAt) || null,
        updatedAt: str(row.updatedAt) || null,
        adorations: [],
      });
    } else if (entry.kind === "adoration") {
      if (tombstoned) {
        adorations.delete(id);
        continue;
      }
      const setId = str(row.setId);
      if (setId.length === 0) continue;
      const stations = Array.isArray(entry.doc?.stations)
        ? (entry.doc?.stations as unknown[]).filter((s): s is string => typeof s === "string")
        : [];
      adorations.set(id, {
        id,
        setId,
        title: str(row.title),
        script: str(row.content),
        stationKeys: stations,
        orderIndex: typeof row.orderIndex === "number" ? row.orderIndex : 0,
      });
    }
  }

  for (const adoration of adorations.values()) {
    const set = sets.get(adoration.setId);
    if (set) set.adorations.push(adoration);
  }
  for (const set of sets.values()) {
    set.adorations.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  return [...sets.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** The active set for a body, or undefined — what the day tracker reads. */
export function activeSetFor(
  sets: readonly RecordedAdorationSet[],
  body: AdorationBody,
): RecordedAdorationSet | undefined {
  return sets.find((s) => s.body === body && s.active);
}

/** The words said at one station of a set — the script of the adoration
 *  assigned there, or empty. Empty when there is no set (no default). */
export function wordAtStation(set: RecordedAdorationSet | undefined, stationKey: string): string {
  if (!set) return "";
  return set.adorations.find((a) => a.stationKeys.includes(stationKey))?.script ?? "";
}

// ─── adopting from a pack ───────────────────────────────────────────

/** A set as an installed adoration-set pack publishes it, before adoption. */
export interface PackedAdorationSet {
  name: string;
  body: AdorationBody;
  adorations: { script: string; title: string; stationKeys: string[] }[];
}

/**
 * The adoration sets in an installed pack payload.
 *
 * Adoration-set packs share the MBF `ritual-set` container with rite and
 * working packs, so this reads the same payload but keeps only the items that
 * are adoration sets — an item with a `body` (lunar/solar) and an `adorations`
 * list, which a rite (steps) or a working never has. The words are byte-exact.
 */
export function packedAdorationSetsFromPayload(payload: unknown): PackedAdorationSet[] {
  const items =
    payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];
  const out: PackedAdorationSet[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const body = bodyOf(row.body);
    if (body === null || !Array.isArray(row.adorations)) continue;
    const adorations = (row.adorations as unknown[])
      .map((a) => {
        const ao = a && typeof a === "object" ? (a as Record<string, unknown>) : {};
        return {
          script: str(ao.script),
          title: str(ao.title),
          stationKeys: Array.isArray(ao.stations)
            ? (ao.stations as unknown[]).filter((s): s is string => typeof s === "string")
            : [],
        };
      })
      .filter((a) => a.script.length > 0);
    if (adorations.length === 0) continue;
    out.push({ name: str(row.name) || "Adoration set", body, adorations });
  }
  return out;
}

// ─── writers: the same documents back ───────────────────────────────

/** Build an `adoration-set` record entry. */
export function buildAdorationSetEntry(input: {
  id: string;
  body: AdorationBody;
  name: string;
  active: boolean;
  now: string;
  createdAt?: string | null;
  deletedAt?: string | null;
}): RecordEntryWrite {
  return buildSubjectEntry({
    id: input.id,
    kind: "adoration-set",
    now: input.now,
    createdAt: input.createdAt ?? undefined,
    deletedAt: input.deletedAt ?? null,
    row: { body: input.body, name: input.name, isActive: input.active },
  });
}

/**
 * Build an `adoration` record entry, with its station assignment embedded the
 * way the phone's `_wireAdoration` does — the words in `doc.row.content` (byte
 * exact), the stations in `doc.stations`.
 */
export function buildAdorationEntry(input: {
  id: string;
  setId: string;
  title: string;
  script: string;
  stationKeys: readonly string[];
  orderIndex?: number;
  now: string;
  createdAt?: string | null;
  deletedAt?: string | null;
}): RecordEntryWrite {
  const deletedAt = input.deletedAt ?? null;
  return {
    id: input.id,
    kind: "adoration",
    updated_at_utc: input.now,
    deleted_at_utc: deletedAt,
    doc: {
      v: 1,
      row: {
        id: input.id,
        setId: input.setId,
        title: input.title,
        // The phone's column is `content`; the byte-exact script goes in whole.
        content: input.script,
        orderIndex: input.orderIndex ?? 0,
        createdAt: input.createdAt ?? input.now,
        updatedAt: input.now,
        deletedAt,
      },
      stations: [...input.stationKeys],
    },
  };
}
