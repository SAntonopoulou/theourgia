/**
 * What the day asks of the practitioner's schedules — the web reading of the
 * phone's day agenda.
 *
 * A schedule crosses as a `schedule` document: a subject (a rite, a sitting, a
 * breath) kept on a recurrence. This reads them and decides which fall on a
 * given day, porting the phone's `Recurrence.includes` faithfully:
 *   everyDay   → always;
 *   onWeekdays → the day's weekday is in the set (Mon=1 … Sun=7, the phone's);
 *   everyNDays → the interval lands, counting civil days from the start;
 *   atSky      → EXCLUDED here — the web can't resolve the sky moment, and the
 *                phone excludes it too rather than show a full-moon rite daily.
 * Pure, so the arithmetic is tested without a clock or a network.
 */

export type RecurrenceKind = "everyDay" | "everyNDays" | "onWeekdays" | "atSky";

export interface Schedule {
  id: string;
  /** What it schedules — `ritual`, `meditation`, `breath`, `undertaking`. */
  subjectKind: string;
  subjectId: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  interval: number;
  /** Weekdays it falls on, Mon=1 … Sun=7. */
  weekdays: number[];
  /** ISO date the schedule began. */
  startsOn: string | null;
  /** ISO date it ends, or null for open-ended. */
  endsOn: string | null;
  enabled: boolean;
}

/** A record entry as the pull returns it — only the fields a schedule needs. */
export interface ScheduleRecordEntry {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null } | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Parse the schedule row's `rule` JSON into a recurrence, tolerantly. */
function recurrenceFrom(ruleJson: string): {
  kind: RecurrenceKind;
  interval: number;
  weekdays: number[];
} {
  const fallback = { kind: "everyDay" as RecurrenceKind, interval: 1, weekdays: [] as number[] };
  try {
    const parsed: unknown = JSON.parse(ruleJson);
    const rec = (parsed as { recurrence?: unknown })?.recurrence;
    if (!rec || typeof rec !== "object") return fallback;
    const r = rec as { kind?: unknown; interval?: unknown; weekdays?: unknown };
    const kind =
      r.kind === "everyNDays" || r.kind === "onWeekdays" || r.kind === "atSky"
        ? (r.kind as RecurrenceKind)
        : "everyDay";
    const interval = typeof r.interval === "number" ? r.interval : 1;
    const weekdays = Array.isArray(r.weekdays)
      ? r.weekdays.filter((n): n is number => typeof n === "number")
      : [];
    return { kind, interval, weekdays };
  } catch {
    return fallback;
  }
}

/** The schedules among a set of record entries. */
export function schedulesFromEntries(entries: readonly ScheduleRecordEntry[]): Schedule[] {
  const byId = new Map<string, Schedule>();
  for (const entry of entries) {
    if (entry.kind !== "schedule" || entry.deleted_at_utc) continue;
    const row = entry.doc?.row;
    if (!row) continue;
    const id = str(row.id);
    if (id.length === 0) continue;
    if (str(row.deletedAt).length > 0) {
      byId.delete(id);
      continue;
    }
    const rec = recurrenceFrom(str(row.rule));
    byId.set(id, {
      id,
      subjectKind: str(row.subjectKind),
      subjectId: str(row.subjectId),
      title: str(row.title),
      recurrenceKind: rec.kind,
      interval: rec.interval,
      weekdays: rec.weekdays,
      startsOn: str(row.startsOn) || null,
      endsOn: str(row.endsOn) || null,
      enabled: row.enabled !== false,
    });
  }
  return [...byId.values()];
}

/** The phone's weekday for a date: Mon=1 … Sun=7 (JS Sunday 0 → 7). */
export function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** Whole civil days from `a` to `b` (local midnights), signed. */
function civilDaysBetween(a: Date, b: Date): number {
  const am = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bm = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bm - am) / 86_400_000);
}

/**
 * Whether a schedule falls on `day`. Disabled schedules, days before the start
 * or after the end, and unresolvable sky-timed rules are all "no".
 */
export function scheduleDueOn(schedule: Schedule, day: Date): boolean {
  if (!schedule.enabled) return false;
  if (schedule.startsOn) {
    const start = new Date(schedule.startsOn);
    if (civilDaysBetween(start, day) < 0) return false;
  }
  if (schedule.endsOn) {
    const end = new Date(schedule.endsOn);
    if (civilDaysBetween(day, end) < 0) return false;
  }
  switch (schedule.recurrenceKind) {
    case "everyDay":
      return true;
    case "onWeekdays":
      return schedule.weekdays.includes(isoWeekday(day));
    case "everyNDays": {
      if (schedule.interval <= 1) return true;
      if (!schedule.startsOn) return true; // interval unplaceable → show it (phone's rule)
      const since = civilDaysBetween(new Date(schedule.startsOn), day);
      return since % schedule.interval === 0;
    }
    default:
      // atSky — the web can't ask the sky; excluded, as on the phone.
      return false;
  }
}

/** The subject key a kept scheduled occurrence is recorded under. */
export function scheduleSubjectKey(schedule: Schedule): string {
  return `schedule:${schedule.id}`;
}
