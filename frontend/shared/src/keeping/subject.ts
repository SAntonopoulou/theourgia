/**
 * Writing a subject row the phone will accept — a rite, a working, a stage, a
 * plan authored on the web.
 *
 * Subject rows cross whole and drift-serialised: the phone's record_sync
 * `_wireSubject` wraps the row as `doc: { v: 1, row: <the row> }`, and applies it
 * with the table's `fromJson`. So authoring on the web means constructing that
 * row (camelCase fields, an ISO `createdAt`/`updatedAt`, a null-or-ISO
 * `deletedAt`) and posting it. Pure; the caller supplies id/now.
 */

import type { RecordEntryWrite } from "./observance.js";

export interface BuildSubjectInput {
  id: string;
  /** The record kind — `ritual`, `working`, `working-stage`, `working-item`,
   *  `meditation`, `schedule`. */
  kind: string;
  /** The full device row, field-for-field as the phone's table holds it
   *  (camelCase). `id`/`createdAt`/`updatedAt`/`deletedAt` are filled in from
   *  the inputs below if absent. */
  row: Record<string, unknown>;
  /** ISO instant for updatedAt + the envelope's updated_at_utc. */
  now: string;
  /** ISO instant the row was first created; defaults to `now` (a new row). */
  createdAt?: string;
  /** Set to tombstone the row (both the row's deletedAt and the envelope). */
  deletedAt?: string | null;
}

/** Build a subject record entry (`doc: { v: 1, row }`). */
export function buildSubjectEntry(input: BuildSubjectInput): RecordEntryWrite {
  const deletedAt = input.deletedAt ?? null;
  return {
    id: input.id,
    kind: input.kind,
    updated_at_utc: input.now,
    deleted_at_utc: deletedAt,
    doc: {
      v: 1,
      row: {
        ...input.row,
        id: input.id,
        createdAt: input.createdAt ?? input.now,
        updatedAt: input.now,
        deletedAt,
      },
    },
  };
}
