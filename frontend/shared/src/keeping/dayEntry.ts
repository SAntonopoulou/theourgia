/**
 * Writing a day-entry the phone will accept.
 *
 * The day journal — waking, sleeping, dreams, notes, and a kept sky — crosses as
 * `kind:"day-entry"` record entries. This builds that entry as the phone's
 * record_sync `_wireDayEntry`/`_applyDayEntry` reads it: required `kind`/`at`/
 * `createdAt`, optional body/sleepQuality/observanceId. Pure; POST the result to
 * `PUT /record/entries`.
 */

import type { RecordEntryWrite } from "./observance.js";

/** The phone's `DayEntryKind` names — the discriminator inside a day-entry. */
export type DayEntryKind =
  | "note"
  | "waking"
  | "sleeping"
  | "dream"
  | "dreamIntention"
  | "sky";

/** The journal kinds a practitioner writes by hand (sky is kept from a chart). */
export const JOURNAL_KINDS: { kind: DayEntryKind; label: string; prompt: string }[] = [
  { kind: "note", label: "A note", prompt: "What happened, and what it was worth" },
  { kind: "waking", label: "Waking", prompt: "Record your dream before it fades" },
  { kind: "sleeping", label: "Sleeping", prompt: "How the day ends" },
  { kind: "dream", label: "A dream", prompt: "What you dreamt, before it goes" },
  { kind: "dreamIntention", label: "A dream intended", prompt: "What you mean to dream, and why" },
];

export interface BuildDayEntryInput {
  id: string;
  /** An ISO instant for created/updated — supplied so this stays pure. */
  now: string;
  kind: DayEntryKind;
  /** The instant the entry is *about* (defaults to `now`). */
  at?: string;
  body?: string;
  /** Only meaningful on a `waking` entry — a 1..5 judgment on the night. */
  sleepQuality?: number | null;
  observanceId?: string | null;
}

/** Build the `day-entry` record entry. */
export function buildDayEntryEntry(input: BuildDayEntryInput): RecordEntryWrite {
  return {
    id: input.id,
    kind: "day-entry",
    updated_at_utc: input.now,
    deleted_at_utc: null,
    doc: {
      v: 1,
      kind: input.kind,
      at: input.at ?? input.now,
      body: input.body ?? "",
      sleepQuality: input.sleepQuality ?? null,
      observanceId: input.observanceId ?? null,
      createdAt: input.now,
    },
  };
}
