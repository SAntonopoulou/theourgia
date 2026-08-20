import { describe, expect, it } from "vitest";

import { breathPattern, cycleSeconds, formatClock, phaseAt } from "./practiceTimer.js";

describe("formatClock", () => {
  it("shows m:ss below an hour, zero-padding seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
  });

  it("shows h:mm:ss from an hour up", () => {
    expect(formatClock(3661)).toBe("1:01:01");
  });

  it("clamps negatives to zero and floors fractions", () => {
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(59.9)).toBe("0:59");
  });
});

describe("breathPattern", () => {
  it("keeps all four phases of a box breath", () => {
    const phases = breathPattern({ inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 });
    expect(phases.map((p) => p.key)).toEqual(["inhale", "holdIn", "exhale", "holdOut"]);
    expect(cycleSeconds(phases)).toBe(16);
  });

  it("drops zero-length counts (a simple in/out breath)", () => {
    const phases = breathPattern({ inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 });
    expect(phases.map((p) => p.key)).toEqual(["inhale", "exhale"]);
    expect(phases.map((p) => p.label)).toEqual(["Breathe in", "Breathe out"]);
  });

  it("floors fractions and clamps negatives", () => {
    const phases = breathPattern({ inhale: 4.8, holdIn: -2, exhale: 4, holdOut: 0 });
    expect(phases.map((p) => p.seconds)).toEqual([4, 4]);
  });
});

describe("phaseAt", () => {
  const phases = breathPattern({ inhale: 4, holdIn: 2, exhale: 4, holdOut: 2 }); // 12s cycle

  it("finds the phase and the seconds left in it", () => {
    expect(phaseAt(0, phases)).toMatchObject({ index: 0, intoPhase: 0, remaining: 4 });
    expect(phaseAt(3, phases)).toMatchObject({ index: 0, remaining: 1 });
    expect(phaseAt(4, phases)).toMatchObject({ index: 1, intoPhase: 0, remaining: 2 });
    expect(phaseAt(6, phases)?.phase.key).toBe("exhale");
    expect(phaseAt(11, phases)?.phase.key).toBe("holdOut");
  });

  it("loops past the end of a cycle", () => {
    expect(phaseAt(12, phases)).toMatchObject({ index: 0, intoPhase: 0 });
    expect(phaseAt(15, phases)?.phase.key).toBe("inhale");
  });

  it("returns null when there is nothing to pace", () => {
    expect(phaseAt(3, [])).toBeNull();
  });
});
