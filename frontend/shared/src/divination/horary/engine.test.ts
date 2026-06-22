import { describe, expect, it } from "vitest";

import {
  HORARY_STEP_META,
  HORARY_STEP_ORDER,
  type HoraryChart,
  horaryStepText,
} from "./engine.js";

const sampleChart: HoraryChart = {
  id: "h1",
  question: "Will the lineage petition complete?",
  lat: 51.5,
  lng: -0.1,
  timestamp: "2026-06-22T14:00:00Z",
  sect: "day",
  houseSystem: "whole-sign",
  placements: [
    { planet: "Sun", glyph: "☉", house: 3, sign: 2 },
    { planet: "Mercury", glyph: "☿", house: 3, sign: 2 },
  ],
  interpretation: {
    querentSignificator: "Mercury, ruler of the Asc",
    quesitedSignificator: "Jupiter, ruler of the 9th",
    perfection: {
      kind: "applying",
      aspect: "sextile",
      note: "Mercury applies to a sextile of Jupiter within orb before changing sign: the matter can come together.",
    },
    reception: "Mutual reception; Saturn intervenes",
    witnesses:
      "The two significators receive one another, easing the contact; but Saturn, the day's malefic, marks a delay before completion.",
    provisional: "Likely, with delay",
  },
};

describe("HORARY_STEP_ORDER", () => {
  it("lists the five Hellenistic steps in canonical order", () => {
    expect(HORARY_STEP_ORDER).toEqual([
      "sect",
      "querent",
      "quesited",
      "perfection",
      "reception",
    ]);
  });
});

describe("HORARY_STEP_META", () => {
  it("numbers and titles each step", () => {
    expect(HORARY_STEP_META.sect).toEqual({ number: 1, title: "Sect" });
    expect(HORARY_STEP_META.reception).toEqual({
      number: 5,
      title: "Reception & witnesses",
    });
  });

  it("step numbers run 1..5 with the correct ordering", () => {
    expect(HORARY_STEP_ORDER.map((s) => HORARY_STEP_META[s].number)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});

describe("horaryStepText", () => {
  it("sect — Day chart yields the diurnal-rulers note verbatim", () => {
    const r = horaryStepText(sampleChart, "sect");
    expect(r.value).toBe("Day chart");
    expect(r.note).toContain("Sun, Jupiter, Saturn");
  });

  it("sect — Night chart switches to the nocturnal rulers", () => {
    const r = horaryStepText({ ...sampleChart, sect: "night" }, "sect");
    expect(r.value).toBe("Night chart");
    expect(r.note).toContain("Moon, Venus, Mars");
  });

  it("querent + quesited surface the chart's significators", () => {
    expect(horaryStepText(sampleChart, "querent").value).toBe(
      "Mercury, ruler of the Asc",
    );
    expect(horaryStepText(sampleChart, "quesited").value).toBe(
      "Jupiter, ruler of the 9th",
    );
  });

  it("perfection (applying) renders the aspect type + the chart's note", () => {
    const r = horaryStepText(sampleChart, "perfection");
    expect(r.value).toBe("By applying sextile");
    expect(r.note).toContain("within orb");
  });

  it("perfection (none) shows the no-perfection note", () => {
    const chart: HoraryChart = {
      ...sampleChart,
      interpretation: {
        ...sampleChart.interpretation,
        perfection: {
          kind: "none",
          note: "No applying aspect within orb before sign change.",
        },
      },
    };
    const r = horaryStepText(chart, "perfection");
    expect(r.value).toBe("No perfection within orb");
    expect(r.note).toContain("No applying aspect");
  });

  it("reception — value is reception summary; note is witnesses", () => {
    const r = horaryStepText(sampleChart, "reception");
    expect(r.value).toBe("Mutual reception; Saturn intervenes");
    expect(r.note).toContain("Saturn");
  });
});
