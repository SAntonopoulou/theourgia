import { describe, expect, it } from "vitest";

import { planetaryHour } from "./planetaryHour.js";

/**
 * Fixtures: hand-computed against the Chaldean cycle.
 *
 * Day-rulers (Date.getDay()):
 *   Sunday(0)=Sun, Monday(1)=Moon, Tuesday(2)=Mars, Wednesday(3)=Mercury,
 *   Thursday(4)=Jupiter, Friday(5)=Venus, Saturday(6)=Saturn
 *
 * Chaldean order (descending): Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
 *
 * For a day starting with Sun (Sunday), hours cycle:
 *   1: Sun
 *   2: Venus
 *   3: Mercury
 *   4: Moon
 *   5: Saturn
 *   6: Jupiter
 *   7: Mars
 *   ... (continues)
 */

function buildSun(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

describe("planetaryHour", () => {
  // Sunday 2026-06-21. Sunrise 06:00 local, sunset 18:00 local. Day length 12h.
  // Each day-hour = 1h exactly.
  const sunrise = buildSun(2026, 6, 21, 6);
  const sunset = buildSun(2026, 6, 21, 18);
  const nextSunrise = buildSun(2026, 6, 22, 6);

  it("first day-hour after sunrise on Sunday is ruled by Sun", () => {
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 6, 30),
      sunrise,
      sunset,
      nextSunrise,
    });
    expect(result.ruler).toBe("sun");
    expect(result.indexInBand).toBe(1);
    expect(result.band).toBe("day");
    expect(result.dayRuler).toBe("sun");
  });

  it("second day-hour on Sunday is Venus", () => {
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 7, 30),
      sunrise,
      sunset,
      nextSunrise,
    });
    expect(result.ruler).toBe("venus");
    expect(result.indexInBand).toBe(2);
  });

  it("third day-hour on Sunday is Mercury", () => {
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 8, 30),
      sunrise,
      sunset,
      nextSunrise,
    });
    expect(result.ruler).toBe("mercury");
  });

  it("12th day-hour on Sunday is Saturn (cycle wraps)", () => {
    // hours 1..12: sun, venus, mercury, moon, saturn, jupiter, mars,
    //              sun, venus, mercury, moon, saturn → hour 12 is Saturn
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 17, 30),
      sunrise,
      sunset,
      nextSunrise,
    });
    expect(result.indexInBand).toBe(12);
    expect(result.ruler).toBe("saturn");
  });

  it("first night-hour after sunset on Sunday is Jupiter", () => {
    // 13th hour overall. From Sun (0) + 12 offsets in Chaldean = position 12 mod 7 = 5
    // Chaldean: 0=saturn 1=jupiter 2=mars 3=sun 4=venus 5=mercury 6=moon
    // Sun = index 3. 3 + 12 = 15 mod 7 = 1 → jupiter ✓
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 18, 30),
      sunrise,
      sunset,
      nextSunrise,
    });
    expect(result.band).toBe("night");
    expect(result.indexInBand).toBe(1);
    expect(result.ruler).toBe("jupiter");
  });

  it("first day-hour on Monday is Moon", () => {
    const monSunrise = buildSun(2026, 6, 22, 6);
    const monSunset = buildSun(2026, 6, 22, 18);
    const tueSunrise = buildSun(2026, 6, 23, 6);
    const result = planetaryHour({
      now: buildSun(2026, 6, 22, 6, 30),
      sunrise: monSunrise,
      sunset: monSunset,
      nextSunrise: tueSunrise,
    });
    expect(result.ruler).toBe("moon");
    expect(result.dayRuler).toBe("moon");
  });

  it("first day-hour on Saturday is Saturn", () => {
    // 2026-06-20 was Saturday
    const satSunrise = buildSun(2026, 6, 20, 6);
    const satSunset = buildSun(2026, 6, 20, 18);
    const sunSunrise = buildSun(2026, 6, 21, 6);
    const result = planetaryHour({
      now: buildSun(2026, 6, 20, 6, 30),
      sunrise: satSunrise,
      sunset: satSunset,
      nextSunrise: sunSunrise,
    });
    expect(result.ruler).toBe("saturn");
    expect(result.dayRuler).toBe("saturn");
  });

  it("startsAt + endsAt span one day-hour length", () => {
    const result = planetaryHour({
      now: buildSun(2026, 6, 21, 9, 0),
      sunrise,
      sunset,
      nextSunrise,
    });
    const span = result.endsAt.getTime() - result.startsAt.getTime();
    expect(span).toBe(60 * 60 * 1000);
  });
});
