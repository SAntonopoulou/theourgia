import { describe, expect, it } from "vitest";

import { buildDayEntryEntry } from "./dayEntry.js";
import { buildObservanceEntry } from "./observance.js";
import { type ContextPlacement, buildObservanceContext, signIndex } from "./observanceContext.js";

const place = (
  body: string,
  sign: string,
  lon: number,
  house: number,
): ContextPlacement => ({ body_name: body, tropical_sign: sign, tropical_longitude: lon, house });

describe("signIndex", () => {
  it("maps Aries→0 … Pisces→11, unknown→null", () => {
    expect(signIndex("Aries")).toBe(0);
    expect(signIndex("Scorpio")).toBe(7);
    expect(signIndex("Pisces")).toBe(11);
    expect(signIndex("Ophiuchus")).toBeNull();
    expect(signIndex(undefined)).toBeNull();
  });
});

describe("buildObservanceContext", () => {
  const base = {
    capturedAt: "2026-08-20T12:00:00Z",
    location: { latitude: 41, longitude: -80, label: "Home" },
    hours: {
      current_hour_index: 3,
      hours: [
        { index: 0, ruler: "Sun", is_day: true },
        { index: 3, ruler: "Mars", is_day: true },
      ],
    },
  };

  it("reads moon/sun sign + degree, the hour ruler, day ruler and sect", () => {
    const ctx = buildObservanceContext({
      ...base,
      placements: [
        place("Moon", "Taurus", 45.5, 3), // 45.5 → 15.5° Taurus
        place("Sun", "Leo", 130, 10), // house 10 → above horizon → day
      ],
    });
    expect(ctx.moonSignIndex).toBe(1);
    expect(ctx.moonDegreeInSign).toBeCloseTo(15.5);
    expect(ctx.sunSignIndex).toBe(4);
    expect(ctx.planetaryHourRuler).toBe("Mars");
    expect(ctx.dayRuler).toBe("Sun");
    expect(ctx.sect).toBe("day");
    expect(ctx.weatherStatus).toBe("not-collected");
    expect(ctx.latitude).toBe(41);
    expect(ctx.locationLabel).toBe("Home");
  });

  it("calls it night when the Sun is below the horizon (houses 1–6)", () => {
    const ctx = buildObservanceContext({
      ...base,
      placements: [place("Sun", "Leo", 130, 3)],
    });
    expect(ctx.sect).toBe("night");
  });

  it("leaves projected fields null when a body or hours are absent", () => {
    const ctx = buildObservanceContext({
      capturedAt: "2026-08-20T12:00:00Z",
      location: { latitude: null, longitude: null },
      placements: [],
      hours: null,
      skyFailureReason: "offline",
    });
    expect(ctx.moonSignIndex).toBeNull();
    expect(ctx.sect).toBeNull();
    expect(ctx.planetaryHourRuler).toBeNull();
    expect(ctx.dayRuler).toBeNull();
    expect(ctx.skyFailureReason).toBe("offline");
    // Still a valid, non-null weather status by the phone's contract.
    expect(ctx.weatherStatus).toBe("not-collected");
  });
});

describe("buildObservanceEntry", () => {
  it("builds the observance wire shape with required + optional fields", () => {
    const entry = buildObservanceEntry({
      id: "obs-1",
      now: "2026-08-20T12:00:00Z",
      subjectKey: "ritual:r1",
      occurrenceAt: "2026-08-20T11:59:00Z",
      mood: 4,
      bodyFeeling: 3,
      note: "kept at dusk",
    });
    expect(entry.kind).toBe("observance");
    expect(entry.id).toBe("obs-1");
    expect(entry.deleted_at_utc).toBeNull();
    expect(entry.updated_at_utc).toBe("2026-08-20T12:00:00Z");
    expect(entry.doc).toMatchObject({
      v: 1,
      subjectKey: "ritual:r1",
      occurrenceAt: "2026-08-20T11:59:00Z",
      observedAt: "2026-08-20T12:00:00Z", // defaults to now
      createdAt: "2026-08-20T12:00:00Z",
      note: "kept at dusk",
      mood: 4,
      bodyFeeling: 3,
      nativityStanding: "not-sought",
      subjectName: "",
      subjectBirthId: null,
      context: null,
    });
  });

  it("defaults the optional fields the phone reads null-safely", () => {
    const entry = buildObservanceEntry({
      id: "obs-2",
      now: "2026-08-20T12:00:00Z",
      subjectKey: "moonrise",
      occurrenceAt: "2026-08-20T05:30:00Z",
    });
    expect(entry.doc.note).toBe("");
    expect(entry.doc.mood).toBeNull();
    expect(entry.doc.durationSeconds).toBeNull();
  });
});

describe("buildDayEntryEntry", () => {
  it("builds a day-entry with the discriminating kind and required fields", () => {
    const entry = buildDayEntryEntry({
      id: "de-1",
      now: "2026-08-20T12:00:00Z",
      kind: "dream",
      at: "2026-08-20T06:00:00Z",
      body: "I dreamt of a door",
    });
    expect(entry.kind).toBe("day-entry");
    expect(entry.doc).toMatchObject({
      v: 1,
      kind: "dream",
      at: "2026-08-20T06:00:00Z",
      body: "I dreamt of a door",
      sleepQuality: null,
      observanceId: null,
      createdAt: "2026-08-20T12:00:00Z",
    });
  });

  it("defaults `at` to now and keeps sleepQuality when given", () => {
    const entry = buildDayEntryEntry({
      id: "de-2",
      now: "2026-08-20T12:00:00Z",
      kind: "waking",
      sleepQuality: 4,
    });
    expect(entry.doc.at).toBe("2026-08-20T12:00:00Z");
    expect(entry.doc.sleepQuality).toBe(4);
    expect(entry.doc.body).toBe("");
  });
});
