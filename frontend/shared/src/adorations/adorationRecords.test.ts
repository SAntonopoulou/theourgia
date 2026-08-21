import { describe, expect, it } from "vitest";

import {
  activeSetFor,
  adorationSetsFromEntries,
  buildAdorationEntry,
  buildAdorationSetEntry,
} from "./adorationRecords.js";

const NOW = "2026-08-21T10:00:00.000Z";

describe("adoration sets, round-tripped through the record", () => {
  it("reads a set and its adoration back, stations and byte-exact words", () => {
    const setEntry = buildAdorationSetEntry({
      id: "set-1",
      body: "lunar",
      name: "Hekate",
      active: true,
      now: NOW,
    });
    const adorationEntry = buildAdorationEntry({
      id: "ad-1",
      setId: "set-1",
      title: "At moonrise",
      script: "Χαῖρε Ἑκάτη",
      stationKeys: ["moonrise", "moonset"],
      now: NOW,
    });

    const [set] = adorationSetsFromEntries([setEntry, adorationEntry]);
    expect(set).toBeDefined();
    if (!set) return;
    expect(set.name).toBe("Hekate");
    expect(set.body).toBe("lunar");
    expect(set.active).toBe(true);
    const [ad] = set.adorations;
    expect(ad).toBeDefined();
    if (!ad) return;
    expect(ad.script).toBe("Χαῖρε Ἑκάτη");
    expect(ad.stationKeys).toEqual(["moonrise", "moonset"]);
  });

  it("the adoration document matches the phone's shape (content + stations)", () => {
    const entry = buildAdorationEntry({
      id: "ad-1",
      setId: "set-1",
      title: "",
      script: "Ra",
      stationKeys: ["sunrise"],
      now: NOW,
    });
    // The phone's column is `content`, and stations ride beside the row.
    expect((entry.doc as { row: Record<string, unknown> }).row.content).toBe("Ra");
    expect((entry.doc as { stations: string[] }).stations).toEqual(["sunrise"]);
    expect(entry.kind).toBe("adoration");
  });

  it("finds the active set per body, and there is no default", () => {
    const lunarA = buildAdorationSetEntry({
      id: "l-a",
      body: "lunar",
      name: "A",
      active: false,
      now: NOW,
    });
    const lunarB = buildAdorationSetEntry({
      id: "l-b",
      body: "lunar",
      name: "B",
      active: true,
      now: NOW,
    });
    const sets = adorationSetsFromEntries([lunarA, lunarB]);
    expect(activeSetFor(sets, "lunar")?.name).toBe("B");
    // Nothing for solar — no set, no default.
    expect(activeSetFor(sets, "solar")).toBeUndefined();
  });

  it("drops a tombstoned set and a tombstoned adoration", () => {
    const setEntry = buildAdorationSetEntry({
      id: "set-1",
      body: "lunar",
      name: "Gone",
      active: true,
      now: NOW,
    });
    const deletedSet = buildAdorationSetEntry({
      id: "set-1",
      body: "lunar",
      name: "Gone",
      active: true,
      now: "2026-08-21T11:00:00.000Z",
      deletedAt: "2026-08-21T11:00:00.000Z",
    });
    expect(adorationSetsFromEntries([setEntry, deletedSet])).toHaveLength(0);
  });
});
