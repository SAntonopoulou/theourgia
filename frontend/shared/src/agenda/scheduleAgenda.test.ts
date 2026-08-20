import { describe, expect, it } from "vitest";

import {
  type Schedule,
  type ScheduleRecordEntry,
  isoWeekday,
  scheduleDueOn,
  scheduleSubjectKey,
  schedulesFromEntries,
} from "./scheduleAgenda.js";

const sched = (over: Partial<Schedule>): Schedule => ({
  id: "s1",
  subjectKind: "ritual",
  subjectId: "r1",
  title: "LBRP",
  recurrenceKind: "everyDay",
  interval: 1,
  weekdays: [],
  startsOn: "2026-08-01",
  endsOn: null,
  enabled: true,
  ...over,
});

// 2026-08-20 is a Thursday (weekday 4); pick local-noon to avoid tz edges.
const thu = new Date(2026, 7, 20, 12);
const fri = new Date(2026, 7, 21, 12);

describe("schedulesFromEntries", () => {
  it("reads a schedule row and parses its recurrence from the rule JSON", () => {
    const entry: ScheduleRecordEntry = {
      kind: "schedule",
      doc: {
        row: {
          id: "s1",
          subjectKind: "meditation",
          subjectId: "m1",
          title: "Evening sit",
          rule: JSON.stringify({
            recurrence: { kind: "onWeekdays", weekdays: [1, 3, 5] },
            timing: { kind: "count", count: 1 },
          }),
          startsOn: "2026-08-01",
          enabled: true,
        },
      },
    };
    const [s] = schedulesFromEntries([entry]);
    expect(s).toMatchObject({
      id: "s1",
      subjectKind: "meditation",
      recurrenceKind: "onWeekdays",
      weekdays: [1, 3, 5],
    });
  });

  it("drops deleted schedules and ignores other kinds", () => {
    const schedules = schedulesFromEntries([
      { kind: "schedule", doc: { row: { id: "a", rule: "{}", deletedAt: "x" } } },
      { kind: "ritual", doc: { row: { id: "r", name: "x" } } },
      {
        kind: "schedule",
        deleted_at_utc: "2026-08-20T00:00:00Z",
        doc: { row: { id: "b", rule: "{}" } },
      },
      { kind: "schedule", doc: { row: { id: "c", rule: "{}" } } },
    ]);
    expect(schedules.map((s) => s.id)).toEqual(["c"]);
  });
});

describe("scheduleDueOn", () => {
  it("everyDay falls on any day in range", () => {
    expect(scheduleDueOn(sched({}), thu)).toBe(true);
  });

  it("respects enabled, start and end bounds", () => {
    expect(scheduleDueOn(sched({ enabled: false }), thu)).toBe(false);
    expect(scheduleDueOn(sched({ startsOn: "2026-08-25" }), thu)).toBe(false);
    expect(scheduleDueOn(sched({ endsOn: "2026-08-10" }), thu)).toBe(false);
  });

  it("onWeekdays falls only on the listed weekdays (Mon=1…Sun=7)", () => {
    const thursdayOnly = sched({ recurrenceKind: "onWeekdays", weekdays: [4] });
    expect(scheduleDueOn(thursdayOnly, thu)).toBe(true);
    expect(scheduleDueOn(thursdayOnly, fri)).toBe(false);
  });

  it("everyNDays lands on the interval, counted from the start", () => {
    // start Aug 20 (Thu), every 3 days → Aug 20 yes, Aug 21 no, Aug 23 yes.
    const every3 = sched({ recurrenceKind: "everyNDays", interval: 3, startsOn: "2026-08-20" });
    expect(scheduleDueOn(every3, thu)).toBe(true);
    expect(scheduleDueOn(every3, fri)).toBe(false);
    expect(scheduleDueOn(every3, new Date(2026, 7, 23, 12))).toBe(true);
  });

  it("excludes sky-timed schedules (can't resolve the sky on the web)", () => {
    expect(scheduleDueOn(sched({ recurrenceKind: "atSky" }), thu)).toBe(false);
  });
});

describe("helpers", () => {
  it("isoWeekday maps Sunday to 7", () => {
    expect(isoWeekday(new Date(2026, 7, 23, 12))).toBe(7); // a Sunday
    expect(isoWeekday(thu)).toBe(4);
  });

  it("keys a kept scheduled occurrence by the schedule", () => {
    expect(scheduleSubjectKey(sched({ id: "s9" }))).toBe("schedule:s9");
  });
});
