import { describe, expect, it } from "vitest";

import {
  DEFAULT_PENDULUM_CALIBRATION,
  PENDULUM_ANSWERS,
  type PendulumCalibration,
  pendulumAnswer,
} from "./engine.js";

describe("PENDULUM_ANSWERS", () => {
  it("lists the four canonical answers in display order", () => {
    expect(PENDULUM_ANSWERS).toEqual(["Yes", "No", "Maybe", "Unclear"]);
  });
});

describe("DEFAULT_PENDULUM_CALIBRATION", () => {
  it("carries the mockup's verbatim swing descriptions", () => {
    expect(DEFAULT_PENDULUM_CALIBRATION).toEqual({
      yes: "swings along the body",
      no: "swings across",
      maybe: "circles, or stays still",
    });
  });
});

describe("pendulumAnswer", () => {
  const cal: PendulumCalibration = DEFAULT_PENDULUM_CALIBRATION;

  it("maps random() = 0 → first answer (Yes)", () => {
    expect(pendulumAnswer(cal, () => 0)).toBe("Yes");
  });

  it("maps random() = 0.99 → last answer (Unclear)", () => {
    expect(pendulumAnswer(cal, () => 0.99)).toBe("Unclear");
  });

  it("clamps random() = 1 to the last answer (no out-of-bounds)", () => {
    expect(pendulumAnswer(cal, () => 1)).toBe("Unclear");
  });

  it("maps the four quartile values to each answer", () => {
    expect(pendulumAnswer(cal, () => 0.0)).toBe("Yes");
    expect(pendulumAnswer(cal, () => 0.3)).toBe("No");
    expect(pendulumAnswer(cal, () => 0.6)).toBe("Maybe");
    expect(pendulumAnswer(cal, () => 0.85)).toBe("Unclear");
  });

  it("only ever returns values from PENDULUM_ANSWERS", () => {
    for (let i = 0; i < 50; i++) {
      const v = pendulumAnswer(cal);
      expect(PENDULUM_ANSWERS).toContain(v);
    }
  });
});
