import { describe, expect, it } from "vitest";

import { moonArc } from "./moonArc.js";

describe("moonArc", () => {
  // Athens, across a full day — sampled hourly, the invariants must always hold.
  const lat = 37.98;
  const lng = 23.72;

  it("returns a fraction in [0,1] when up, and -1 when down", () => {
    for (let h = 0; h < 24; h++) {
      const now = new Date(Date.UTC(2026, 7, 21, h, 0, 0));
      const arc = moonArc(now, lat, lng);
      if (arc.isUp) {
        expect(arc.aboveFraction).toBeGreaterThanOrEqual(0);
        expect(arc.aboveFraction).toBeLessThanOrEqual(1);
      } else {
        expect(arc.aboveFraction).toBe(-1);
      }
    }
  });
});
