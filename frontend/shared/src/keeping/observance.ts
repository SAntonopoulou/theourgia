/**
 * Writing a keeping the phone will accept.
 *
 * A kept practice crosses as a `kind: "observance"` record entry. This builds
 * that entry field-for-field as the phone's record_sync `_wire`/`_apply`
 * expects — the required `subjectKey`/`occurrenceAt`/`observedAt`/`createdAt`,
 * the optional mood/body/note/duration, and the sky context. Pure: the caller
 * supplies `id` (a UUID) and `now` (an ISO instant), so it is tested without a
 * clock or a network. POST the result to `PUT /record/entries`.
 */

import type { ObservanceContext } from "./observanceContext.js";

/** The five points of mood and body, as the phone and the record surface name
 *  them. Index 1..5; 0/undefined means unset. */
export const MOOD_LABELS = ["", "Troubled", "Low", "Level", "Glad", "Elated"] as const;
export const BODY_LABELS = ["", "Ailing", "Weary", "Steady", "Rested", "Vital"] as const;

/** A record entry as `PUT /record/entries` accepts it. */
export interface RecordEntryWrite {
  id: string;
  kind: string;
  doc: Record<string, unknown>;
  updated_at_utc: string;
  deleted_at_utc: string | null;
}

export interface BuildObservanceInput {
  /** A fresh UUID (device-minted; the record's composite key with the owner). */
  id: string;
  /** An ISO instant for created/updated — supplied so this stays pure. */
  now: string;
  /** What was kept — `ritual:<id>`, a station name, `working-item:<id>`, … */
  subjectKey: string;
  /** The instant the thing was due/occurred (a station time, or the moment). */
  occurrenceAt: string;
  /** The instant it was marked. Defaults to `now`. */
  observedAt?: string;
  note?: string;
  /** 1..5 or null. */
  mood?: number | null;
  /** 1..5 or null. */
  bodyFeeling?: number | null;
  /** For sittings and breaths. */
  durationSeconds?: number | null;
  subjectName?: string;
  subjectBirthId?: string | null;
  context?: ObservanceContext | null;
}

/** Build the `observance` record entry. */
export function buildObservanceEntry(input: BuildObservanceInput): RecordEntryWrite {
  return {
    id: input.id,
    kind: "observance",
    updated_at_utc: input.now,
    deleted_at_utc: null,
    doc: {
      v: 1,
      subjectKey: input.subjectKey,
      occurrenceAt: input.occurrenceAt,
      observedAt: input.observedAt ?? input.now,
      note: input.note ?? "",
      mood: input.mood ?? null,
      bodyFeeling: input.bodyFeeling ?? null,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: input.now,
      nativityStanding: "not-sought",
      subjectBirthId: input.subjectBirthId ?? null,
      subjectName: input.subjectName ?? "",
      context: input.context ?? null,
    },
  };
}
