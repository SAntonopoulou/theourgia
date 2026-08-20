import { describe, expect, it } from "vitest";

import { type RiteRecordEntry, ritesFromEntries } from "./recordRites.js";

const ritual = (
  row: Record<string, unknown>,
  envelope: Partial<RiteRecordEntry> = {},
): RiteRecordEntry => ({ kind: "ritual", doc: { row }, ...envelope });

describe("ritesFromEntries", () => {
  it("reads a ritual document's row into a Rite", () => {
    const rites = ritesFromEntries([
      ritual({
        id: "r1",
        name: "Star Ruby",
        summary: "A banishing",
        script: "(face East) *ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ*",
        keptAt: "[]",
        updatedAt: "2026-08-20T10:00:00Z",
      }),
    ]);
    expect(rites).toHaveLength(1);
    expect(rites[0]).toMatchObject({
      id: "r1",
      name: "Star Ruby",
      summary: "A banishing",
      hasTraditionTiming: false,
    });
    expect(rites[0]?.script).toContain("ΑΠΟ");
  });

  it("flags a rite that carries a tradition timing", () => {
    const [rite] = ritesFromEntries([
      ritual({ id: "r1", name: "Resh", keptAt: '[{"station":"sunrise"}]' }),
    ]);
    expect(rite?.hasTraditionTiming).toBe(true);
  });

  it("ignores non-ritual kinds", () => {
    const rites = ritesFromEntries([
      { kind: "meditation", doc: { row: { id: "m1", name: "Sit" } } },
      ritual({ id: "r1", name: "A rite" }),
    ]);
    expect(rites.map((r) => r.id)).toEqual(["r1"]);
  });

  it("drops rites deleted by the envelope or the row tombstone", () => {
    const rites = ritesFromEntries([
      ritual({ id: "r1", name: "Gone" }, { deleted_at_utc: "2026-08-20T00:00:00Z" }),
      ritual({ id: "r2", name: "Tombstoned", deletedAt: "2026-08-20T00:00:00Z" }),
      ritual({ id: "r3", name: "Standing" }),
    ]);
    expect(rites.map((r) => r.id)).toEqual(["r3"]);
  });

  it("keeps the last document for a duplicated id", () => {
    const rites = ritesFromEntries([
      ritual({ id: "r1", name: "Old name" }),
      ritual({ id: "r1", name: "New name" }),
    ]);
    expect(rites).toHaveLength(1);
    expect(rites[0]?.name).toBe("New name");
  });

  it("orders A→Z by name, case-insensitively", () => {
    const rites = ritesFromEntries([
      ritual({ id: "b", name: "banishing" }),
      ritual({ id: "a", name: "Adoration" }),
      ritual({ id: "c", name: "Consecration" }),
    ]);
    expect(rites.map((r) => r.name)).toEqual(["Adoration", "banishing", "Consecration"]);
  });

  it("tolerates a missing row or id without throwing", () => {
    const rites = ritesFromEntries([
      { kind: "ritual", doc: { row: null } },
      { kind: "ritual", doc: null },
      { kind: "ritual" },
      ritual({ name: "no id" }),
    ]);
    expect(rites).toEqual([]);
  });
});
