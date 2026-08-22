import { describe, expect, it } from "vitest";

import {
  type MeditationRecordEntry,
  buildSitPlanJson,
  meditationPlansFromEntries,
  planTotals,
} from "./meditationPlans.js";

describe("buildSitPlanJson", () => {
  it("builds one stretch/sit phase of the given minutes, with a bell", () => {
    const plan = JSON.parse(buildSitPlanJson(20, true));
    expect(plan).toEqual({
      segments: [{ segment: "stretch", phase: { kind: "sit", seconds: 1200, bell: true } }],
    });
  });

  it("omits the bell when not asked and never goes below one second", () => {
    const plan = JSON.parse(buildSitPlanJson(0, false));
    expect(plan.segments[0].phase.bell).toBeUndefined();
    expect(plan.segments[0].phase.seconds).toBe(1);
  });
});

describe("planTotals", () => {
  it("sums a silent-sit stretch and reads its bell", () => {
    expect(planTotals(buildSitPlanJson(10, true))).toEqual({ seconds: 600, bell: true });
  });

  it("sums a repeating cycle (a breath the phone authored)", () => {
    const plan = JSON.stringify({
      segments: [
        {
          segment: "cycle",
          repeats: 4,
          steps: [
            { kind: "sit", seconds: 4 },
            { kind: "sit", seconds: 6 },
          ],
        },
      ],
    });
    expect(planTotals(plan)).toEqual({ seconds: 40, bell: false });
  });

  it("tolerates malformed plans", () => {
    expect(planTotals("not json")).toEqual({ seconds: 0, bell: false });
    expect(planTotals("{}")).toEqual({ seconds: 0, bell: false });
  });
});

describe("meditationPlansFromEntries", () => {
  const plan = (
    row: Record<string, unknown>,
    envelope: Partial<MeditationRecordEntry> = {},
  ): MeditationRecordEntry => ({
    kind: "meditation",
    doc: { row },
    ...envelope,
  });

  it("reads sitting plans, computing their length", () => {
    const plans = meditationPlansFromEntries([
      plan({
        id: "m1",
        name: "Morning sit",
        summary: "Silence",
        kind: "sitting",
        plan: buildSitPlanJson(15, true),
        createdAt: "2026-08-20T00:00:00Z",
      }),
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ id: "m1", name: "Morning sit", seconds: 900, bell: true });
  });

  it("splits by kind: sittings to Meditation, breath forms to the pacer", () => {
    const entries = [
      plan({ id: "b1", name: "Box breath", kind: "breath", plan: "{}" }),
      plan({ id: "m1", name: "Sit", kind: "sitting", plan: buildSitPlanJson(5, false) }),
    ];
    expect(meditationPlansFromEntries(entries).map((p) => p.id)).toEqual(["m1"]);
    expect(meditationPlansFromEntries(entries, "breath").map((p) => p.id)).toEqual(["b1"]);
  });

  it("a row without a kind predates the field and is a sitting", () => {
    const entries = [plan({ id: "m1", name: "Old sit", kind: "", plan: "{}" })];
    expect(meditationPlansFromEntries(entries).map((p) => p.id)).toEqual(["m1"]);
    expect(meditationPlansFromEntries(entries, "breath")).toEqual([]);
  });

  it("drops deleted plans and orders newest-first", () => {
    const plans = meditationPlansFromEntries([
      plan({
        id: "a",
        name: "Old",
        kind: "sitting",
        plan: "{}",
        createdAt: "2026-08-01T00:00:00Z",
      }),
      plan({
        id: "b",
        name: "New",
        kind: "sitting",
        plan: "{}",
        createdAt: "2026-08-20T00:00:00Z",
      }),
      plan({ id: "c", name: "Gone", kind: "sitting", plan: "{}", deletedAt: "x" }),
    ]);
    expect(plans.map((p) => p.name)).toEqual(["New", "Old"]);
  });
});
