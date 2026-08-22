import { describe, expect, it } from "vitest";

import {
  antiscion,
  aspectBetween,
  contraAntiscion,
  formatDegInSign,
  houseOfLongitude,
  houseQuarter,
  pointAt,
  signNameOf,
} from "./chartFormat.js";

// The doctrine itself — sect, lots, essential dignities — is computed by the
// backend's hellenistic engine and golden-tested there (#126 retired the
// client-side tables). What remains here is presentation arithmetic.

describe("antiscia", () => {
  it("mirrors across the solstitial axis: 15° Aries → 15° Virgo", () => {
    expect(antiscion(15)).toBe(165);
    expect(signNameOf(antiscion(15))).toBe("Virgo");
    // The reflection is an involution — applying it twice returns home.
    expect(antiscion(antiscion(123.4))).toBeCloseTo(123.4);
  });

  it("contra-antiscion mirrors across the equinox: 15° Aries → 15° Pisces", () => {
    expect(contraAntiscion(15)).toBe(345);
    expect(signNameOf(contraAntiscion(15))).toBe("Pisces");
    expect(contraAntiscion(contraAntiscion(123.4))).toBeCloseTo(123.4);
  });
});

describe("houses", () => {
  it("names the quarter of each house", () => {
    expect(houseQuarter(1)).toBe("angular");
    expect(houseQuarter(2)).toBe("succedent");
    expect(houseQuarter(3)).toBe("cadent");
    expect(houseQuarter(10)).toBe("angular");
    expect(houseQuarter(12)).toBe("cadent");
  });

  it("places a longitude in the right whole-sign house", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
    expect(houseOfLongitude(15, cusps)).toBe(1);
    expect(houseOfLongitude(45, cusps)).toBe(2);
    expect(houseOfLongitude(359.9, cusps)).toBe(12);
  });

  it("handles cusps that wrap through 0° Aries", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => (200 + i * 30) % 360);
    expect(houseOfLongitude(205, cusps)).toBe(1);
    expect(houseOfLongitude(15, cusps)).toBe(6);
  });
});

describe("degrees", () => {
  it("formats a degree within its sign", () => {
    expect(formatDegInSign(15.5)).toBe("15°30'");
    expect(formatDegInSign(210.25)).toBe("0°15'");
  });

  it("dresses a point with sign, glyph, degree and house", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
    const p = pointAt(280.5, cusps);
    expect(p.sign).toBe("Capricorn");
    expect(p.signGlyph).toBe("♑");
    expect(p.degIn).toBe("10°30'");
    expect(p.house).toBe(10);
  });
});

describe("aspects", () => {
  it("finds an aspect in either order", () => {
    const aspects = [{ body_a: "sun", body_b: "moon", kind: "square" as const, orb: 1 }];
    expect(aspectBetween(aspects, "sun", "moon")?.kind).toBe("square");
    expect(aspectBetween(aspects, "moon", "sun")?.kind).toBe("square");
    expect(aspectBetween(aspects, "sun", "mars")).toBeNull();
  });
});
