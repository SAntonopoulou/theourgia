import { describe, expect, it } from "vitest";

import {
  formatAstroSnapshot,
  formatCalendarSnapshot,
  parseSnapshot,
} from "./formatSnapshots.js";

describe("parseSnapshot", () => {
  it("returns null for null / undefined", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSnapshot("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSnapshot("not json")).toBeNull();
  });

  it("returns null for JSON that isn't an object (e.g., a number)", () => {
    expect(parseSnapshot("42")).toBeNull();
    expect(parseSnapshot('"just a string"')).toBeNull();
  });

  it("returns the parsed object for valid JSON", () => {
    expect(parseSnapshot<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
});

describe("formatAstroSnapshot", () => {
  const ASTRO_MID = JSON.stringify({
    sun: { sign: "Cancer", glyph: "☉", degree: 17.3 },
    moon: {
      sign: "Virgo",
      glyph: "☽",
      degree: 4.8,
      phase: "Waxing crescent",
      illumination_pct: 26.4,
    },
  });

  it("formats sun + moon + phase into a single readable line", () => {
    const line = formatAstroSnapshot(ASTRO_MID);
    expect(line).toContain("Sun ☉ Cancer 17°");
    expect(line).toContain("Moon ☽ Virgo 4°");
    expect(line).toContain("Waxing crescent");
    expect(line).toContain("26%");
  });

  it("returns null for null / empty inputs", () => {
    expect(formatAstroSnapshot(null)).toBeNull();
    expect(formatAstroSnapshot(undefined)).toBeNull();
    expect(formatAstroSnapshot("")).toBeNull();
  });

  it("returns null for JSON without any recognisable fields", () => {
    expect(formatAstroSnapshot("{}")).toBeNull();
  });

  it("handles a sun-only snapshot", () => {
    const raw = JSON.stringify({
      sun: { sign: "Aries", glyph: "☉", degree: 12.0 },
    });
    expect(formatAstroSnapshot(raw)).toBe("Sun ☉ Aries 12°");
  });

  it("handles a moon-only snapshot", () => {
    const raw = JSON.stringify({
      moon: { sign: "Scorpio", phase: "Full moon", illumination_pct: 99.9 },
    });
    const out = formatAstroSnapshot(raw);
    expect(out).toContain("Moon Scorpio");
    expect(out).toContain("Full moon");
    expect(out).toContain("100%");
  });

  it("floors degrees instead of rounding — 17.9 → 17°", () => {
    const raw = JSON.stringify({
      sun: { sign: "Leo", glyph: "☉", degree: 17.9 },
    });
    expect(formatAstroSnapshot(raw)).toBe("Sun ☉ Leo 17°");
  });

  it("survives an invalid JSON input by returning null", () => {
    expect(formatAstroSnapshot("not json at all")).toBeNull();
  });
});

describe("formatCalendarSnapshot", () => {
  it("formats Hebrew date with named month", () => {
    const raw = JSON.stringify({
      hebrew: { year: 5786, month: 4, month_name: "Tammuz", day: 24 },
    });
    expect(formatCalendarSnapshot(raw)).toContain("24 Tammuz 5786");
  });

  it("formats Hebrew date by month number when no name is given", () => {
    const raw = JSON.stringify({
      hebrew: { year: 5786, month: 10, day: 24 },
    });
    // Backend uses Nisan-starting numbering (Nisan=1). Month 10 is Tevet.
    expect(formatCalendarSnapshot(raw)).toContain("Tevet");
  });

  it("prefers the backend's pre-rendered 'long' string when present", () => {
    const raw = JSON.stringify({
      hebrew: {
        year: 5786,
        month: 4,
        month_name: "Tammuz",
        day: 20,
        long: "20 Tammuz 5786 AM",
      },
    });
    // The long field is emitted verbatim — never re-composed.
    expect(formatCalendarSnapshot(raw)).toContain("20 Tammuz 5786 AM");
  });

  it("NEVER emits the literal 'month N' string as a Hebrew fallback", () => {
    // Regression guard on the b108-2hz bug Sophia caught: falling
    // through to "month 4" instead of "Tammuz". If a future refactor
    // reintroduces a raw-number fallback, this test catches it.
    const raw = JSON.stringify({
      hebrew: { year: 5786, month: 4, day: 20 },
    });
    const out = formatCalendarSnapshot(raw);
    expect(out).not.toMatch(/month \d/i);
    expect(out).toContain("Tammuz");
  });

  it("includes Thelemic formatted line when present", () => {
    const raw = JSON.stringify({
      thelemic: {
        year: 122,
        month: 3,
        day: 27,
        formatted: "☉ in ♋ · ☽ in ♍ · A.'.C.'. XII · An 122",
      },
    });
    expect(formatCalendarSnapshot(raw)).toContain("An 122");
  });

  it("includes Julian date when present", () => {
    const raw = JSON.stringify({
      julian: { year: 2026, month: 6, day: 26 },
    });
    expect(formatCalendarSnapshot(raw)).toContain("Julian: 2026-06-26");
  });

  it("joins multiple calendars with middot", () => {
    const raw = JSON.stringify({
      hebrew: { year: 5786, month_name: "Tammuz", day: 24 },
      thelemic: { year: 122, formatted: "An 122" },
    });
    const out = formatCalendarSnapshot(raw);
    expect(out).toContain(" · ");
    expect(out?.split(" · ").length).toBeGreaterThanOrEqual(2);
  });

  it("returns null for empty / invalid inputs", () => {
    expect(formatCalendarSnapshot(null)).toBeNull();
    expect(formatCalendarSnapshot("")).toBeNull();
    expect(formatCalendarSnapshot("not json")).toBeNull();
    expect(formatCalendarSnapshot("{}")).toBeNull();
  });
});
