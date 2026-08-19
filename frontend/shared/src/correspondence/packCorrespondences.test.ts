import { describe, expect, it } from "vitest";
import {
  categoriesFor,
  packToCorrespondenceTable,
  subjectsAcross,
  valueIn,
} from "./packCorrespondences.js";

const PAYLOAD_777 = {
  kind: "correspondence-tables",
  items: [
    { ref: "self:self", source: { title: "Liber 777", author: "Crowley", year: 1909 } },
    { ref: "entries:0", subject: "planet.saturn", category: "metal", value: "Lead" },
    {
      ref: "entries:1",
      subject: "planet.saturn",
      category: "stone",
      value: "Star Sapphire, Pearl",
    },
    { ref: "entries:2", subject: "planet.mars", category: "metal", value: "Iron" },
  ],
};

const PAYLOAD_AGRIPPA = {
  items: [
    { source: { title: "Three Books", author: "Agrippa", year: 1533 } },
    { subject: "planet.mars", category: "metal", value: "Iron" },
    { subject: "planet.mars", category: "stone", value: "Diamond" },
  ],
};

describe("packToCorrespondenceTable", () => {
  it("reads the source and entries", () => {
    const t = packToCorrespondenceTable(PAYLOAD_777);
    expect(t).not.toBeNull();
    if (!t) return;
    expect(t.shortLabel).toBe("Crowley, 1909");
    expect(t.entries).toHaveLength(3);
    expect(valueIn(t, "planet.saturn", "stone")).toBe("Star Sapphire, Pearl");
  });

  it("refuses a table with no source", () => {
    expect(
      packToCorrespondenceTable({ items: [{ subject: "x", category: "y", value: "z" }] }),
    ).toBeNull();
    expect(packToCorrespondenceTable(null)).toBeNull();
  });
});

describe("chart shaping across tables", () => {
  const t777 = packToCorrespondenceTable(PAYLOAD_777);
  const tAg = packToCorrespondenceTable(PAYLOAD_AGRIPPA);
  const tables = [t777, tAg].flatMap((t) => (t ? [t] : []));

  it("gathers every subject any table fills", () => {
    expect(subjectsAcross(tables)).toEqual(["planet.saturn", "planet.mars"]);
  });

  it("gathers the categories filled for a subject", () => {
    expect(categoriesFor(tables, "planet.mars")).toEqual(["metal", "stone"]);
  });

  it("each source keeps its own value where they disagree", () => {
    const [a, b] = tables;
    if (!a || !b) return;
    // Mars stone: 777 has none, Agrippa has Diamond.
    expect(valueIn(a, "planet.mars", "stone")).toBeUndefined();
    expect(valueIn(b, "planet.mars", "stone")).toBe("Diamond");
  });
});
