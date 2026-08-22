import { describe, expect, it } from "vitest";

import { placeNodes } from "./MapFigureView.js";
import { packToSpiritualMaps } from "./packSpiritualMaps.js";

const payload = {
  kind: "spiritual-map",
  maps: [
    {
      id: "tetraktys",
      name: "The Tetraktys",
      tradition: "pythagorean",
      summary: "Ten positions in four rows.",
      nodes: [
        { id: "n1", name: "The Monad", number: 1, x: 1.5, y: 0 },
        { id: "n2", name: "The Dyad Left", number: 2, x: 1, y: 1 },
        { id: "n3", name: "The Dyad Right", number: 3, x: 2, y: 1 },
        { id: "n4", name: "Unnumbered Corner", x: 0, y: 3 },
      ],
      edges: [
        { from: "n1", to: "n2", relation: "parent" },
        { from: "n1", to: "ghost" },
      ],
      lines: [
        { nodes: ["n2", "n3"] },
        { nodes: ["n2", "ghost"] },
      ],
    },
    { name: "" },
  ],
};

describe("packToSpiritualMaps", () => {
  it("reads the figure and drops what references missing nodes", () => {
    const maps = packToSpiritualMaps(payload);
    expect(maps).toHaveLength(1);
    const map = maps[0];
    expect(map?.name).toBe("The Tetraktys");
    expect(map?.nodes).toHaveLength(4);
    // The edge to a ghost node is dropped; the good edge stands.
    expect(map?.edges).toEqual([{ from: "n1", to: "n2" }]);
    // A line reduced below two points cannot be drawn and is dropped.
    expect(map?.lines).toEqual([{ nodeIds: ["n2", "n3"] }]);
    // Null number is meaningful: the tradition names, not numbers, it.
    expect(map?.nodes[3]?.number).toBeNull();
  });
});

describe("placeNodes", () => {
  it("keeps the aspect — an equilateral figure stays equilateral", () => {
    const nodes = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 2, y: 0 },
      { id: "c", x: 1, y: 2 },
    ];
    const placed = placeNodes(nodes, 400, 400);
    const a = placed.get("a");
    const b = placed.get("b");
    const c = placed.get("c");
    if (!a || !b || !c) throw new Error("nodes must place");
    // Pack ratio spanY/spanX = 1 must survive the scale.
    expect((b.x - a.x) / (c.y - a.y)).toBeCloseTo(1, 5);
  });

  it("survives a figure that is all one row", () => {
    const placed = placeNodes(
      [
        { id: "a", x: 0, y: 5 },
        { id: "b", x: 10, y: 5 },
      ],
      300,
      120,
    );
    expect(placed.size).toBe(2);
    const a = placed.get("a");
    const b = placed.get("b");
    if (!a || !b) throw new Error("nodes must place");
    expect(a.y).toBeCloseTo(b.y, 5);
    expect(b.x).toBeGreaterThan(a.x);
  });
});
