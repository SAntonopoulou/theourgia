import { describe, expect, it } from "vitest";

import { lunarPhaseLabel, lunarPhaseName } from "./lunarPhase.js";

describe("lunarPhase", () => {
  it.each([
    [0, "new"],
    [0.0625, "waxing-crescent"],
    [0.125, "waxing-crescent"],
    [0.25, "first-quarter"],
    [0.375, "waxing-gibbous"],
    [0.5, "full"],
    [0.625, "waning-gibbous"],
    [0.75, "last-quarter"],
    [0.875, "waning-crescent"],
    [0.9999, "new"],
  ])("phase=%s → %s", (phase, expected) => {
    expect(lunarPhaseName(phase)).toBe(expected);
  });

  it("returns a humanized label", () => {
    expect(lunarPhaseLabel(0.5)).toBe("Full");
    expect(lunarPhaseLabel(0)).toBe("New");
    expect(lunarPhaseLabel(0.25)).toBe("First Quarter");
  });
});
