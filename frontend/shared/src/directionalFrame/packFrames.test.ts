import { describe, expect, it } from "vitest";
import { packToFrames } from "./packFrames.js";

const PAYLOAD = {
  kind: "directional-frames",
  items: [
    {
      ref: "self:anemoi",
      id: "anemoi",
      name: "The Anemoi",
      summary: "The four winds.",
      quarters: [
        { key: "south", label: "Notos", degrees: 180, attribution: "the south wind" },
        { key: "north", label: "Boreas", degrees: 0, attribution: "winter's breath" },
        { key: "east", label: "Euros", degrees: 90, attribution: "" },
      ],
    },
  ],
};

describe("packToFrames", () => {
  it("reads a frame and its quarters, sorted by bearing", () => {
    const frames = packToFrames(PAYLOAD);
    const f = frames[0];
    expect(f).toBeDefined();
    if (!f) return;
    expect(f.name).toBe("The Anemoi");
    expect(f.summary).toBe("The four winds.");
    expect(f.quarters.map((q) => q.degrees)).toEqual([0, 90, 180]);
    expect(f.quarters[0]?.label).toBe("Boreas");
    expect(f.quarters[0]?.attribution).toContain("winter");
  });

  it("skips malformed input, never throws", () => {
    expect(packToFrames(null)).toEqual([]);
    expect(packToFrames({ items: [{ id: "x" }] })).toEqual([]);
    expect(packToFrames({ items: [{ id: "x", quarters: [] }] })).toEqual([]);
  });
});
