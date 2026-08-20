import { describe, expect, it } from "vitest";

import { type WorkingRecordEntry, workingsFromEntries } from "./recordWorkings.js";

const working = (
  row: Record<string, unknown>,
  envelope: Partial<WorkingRecordEntry> = {},
): WorkingRecordEntry => ({ kind: "working", doc: { row }, ...envelope });

const stage = (row: Record<string, unknown>): WorkingRecordEntry => ({
  kind: "working-stage",
  doc: { row },
});

describe("workingsFromEntries", () => {
  it("reads a working and gathers its stages in order", () => {
    const workings = workingsFromEntries([
      working({
        id: "w1",
        name: "Probationer's Cycle",
        summary: "A year and a day",
        startedAt: "2026-01-01T00:00:00Z",
        subjectName: "Aspasia",
        updatedAt: "2026-08-01T00:00:00Z",
      }),
      stage({ id: "s2", workingId: "w1", name: "The Labour", orderIndex: 1, criterion: "41 days" }),
      stage({
        id: "s1",
        workingId: "w1",
        name: "The Oath",
        orderIndex: 0,
        declaredAt: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(workings).toHaveLength(1);
    const w = workings[0];
    expect(w).toMatchObject({ id: "w1", started: true, subjectName: "Aspasia" });
    expect(w?.stages.map((s) => s.name)).toEqual(["The Oath", "The Labour"]);
    expect(w?.stages[0]?.declared).toBe(true);
    expect(w?.stages[1]?.declared).toBe(false);
    expect(w?.stages[1]?.criterion).toBe("41 days");
  });

  it("marks a working not-yet-begun when it has no start", () => {
    const [w] = workingsFromEntries([working({ id: "w1", name: "Unstarted" })]);
    expect(w?.started).toBe(false);
    expect(w?.startedAt).toBeNull();
  });

  it("drops an orphan stage whose working is gone", () => {
    const workings = workingsFromEntries([
      stage({ id: "s1", workingId: "missing", name: "Orphan", orderIndex: 0 }),
      working({ id: "w1", name: "Standing" }),
    ]);
    expect(workings.map((w) => w.id)).toEqual(["w1"]);
    expect(workings[0]?.stages).toEqual([]);
  });

  it("drops deleted workings (envelope or tombstone) and deleted stages", () => {
    const workings = workingsFromEntries([
      working({ id: "w1", name: "Gone" }, { deleted_at_utc: "2026-08-20T00:00:00Z" }),
      working({ id: "w2", name: "Tombstoned", deletedAt: "2026-08-20T00:00:00Z" }),
      working({ id: "w3", name: "Standing" }),
      stage({ id: "s1", workingId: "w3", name: "Live", orderIndex: 0 }),
      { kind: "working-stage", doc: { row: { id: "s2", workingId: "w3", deletedAt: "x" } } },
    ]);
    expect(workings.map((w) => w.name)).toEqual(["Standing"]);
    expect(workings[0]?.stages.map((s) => s.id)).toEqual(["s1"]);
  });

  it("orders A→Z by name", () => {
    const workings = workingsFromEntries([
      working({ id: "b", name: "beta" }),
      working({ id: "a", name: "Alpha" }),
    ]);
    expect(workings.map((w) => w.name)).toEqual(["Alpha", "beta"]);
  });

  it("ignores unrelated kinds and tolerates missing rows", () => {
    const workings = workingsFromEntries([
      { kind: "ritual", doc: { row: { id: "r1", name: "A rite" } } },
      { kind: "working", doc: null },
      { kind: "working", doc: { row: { name: "no id" } } },
      working({ id: "w1", name: "Real" }),
    ]);
    expect(workings.map((w) => w.id)).toEqual(["w1"]);
  });
});
