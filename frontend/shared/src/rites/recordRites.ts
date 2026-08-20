/**
 * The practitioner's written rites, read from the synced record.
 *
 * A rite crosses from the phone as a `ritual` document in the record store
 * (`/record/entries`): the whole device row rides under `doc.row`, so a rite is
 * `{ id, name, summary, script, keptAt, createdAt, updatedAt, deletedAt }`. This
 * turns those documents into `Rite`s for the library surface — pure, so it is
 * tested without a network. The web reads what the phone wrote; it does not
 * (yet) author rites, so this is read-only by design.
 */

/** A record entry as the pull returns it — only the fields a rite needs. */
export interface RiteRecordEntry {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null } | null;
}

/** One written rite, ready to render. */
export interface Rite {
  id: string;
  name: string;
  summary: string;
  /** The whole rite, byte-exact, with the RiteScript marks — see `parseRite`. */
  script: string;
  /** Whether the rite carries a tradition's customary timing (`keptAt`). A
   *  statement, not an arrangement — nothing on the web schedules from it. */
  hasTraditionTiming: boolean;
  /** ISO instant the rite was last changed, for ordering. Null if absent. */
  updatedAt: string | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Whether `keptAt` (a JSON string of packed timings) names any timing. */
function carriesTiming(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.trim().length === 0) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * The written rites among a set of record entries, newest-changed within an
 * A→Z ordering. Deleted rites — by the entry envelope or the row's own
 * tombstone — are dropped; duplicate ids keep the last seen.
 */
export function ritesFromEntries(entries: readonly RiteRecordEntry[]): Rite[] {
  const byId = new Map<string, Rite>();
  for (const entry of entries) {
    if (entry.kind !== "ritual") continue;
    if (entry.deleted_at_utc) continue;
    const row = entry.doc?.row;
    if (!row) continue;
    const id = str(row.id);
    if (id.length === 0) continue;
    if (str(row.deletedAt).length > 0) {
      // A rite deleted on the device: honour the tombstone even if the envelope
      // hasn't caught up.
      byId.delete(id);
      continue;
    }
    byId.set(id, {
      id,
      name: str(row.name),
      summary: str(row.summary),
      script: str(row.script),
      hasTraditionTiming: carriesTiming(row.keptAt),
      updatedAt: str(row.updatedAt) || null,
    });
  }
  return [...byId.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}
