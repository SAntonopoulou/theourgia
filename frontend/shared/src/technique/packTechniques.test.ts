import { describe, expect, it } from "vitest";

import { packToTechniques } from "./packTechniques.js";

// The shape the .mbf reshape produces: one item per technique keyed
// `techniques:*`, plus the pack's options reshaped to `options:*`.
const payload = {
  kind: "astro-techniques",
  items: [
    {
      ref: "techniques:the-lord-of-the-year",
      key: "annual-profection",
      name: "The lord of the year",
      primitive: "profect-annual",
      provenance: "attested",
      summary: "One sign of the nativity a year, counted from the Ascendant.",
      reading: ["Find the place profected to.", "The lord of that sign is the lord of the year."],
      houses: { "10": "The work.", "1": "The body.", "2": "Livelihood." },
      cautions: ["A profection is counted from the birthday, never from January."],
    },
    {
      ref: "techniques:the-return-of-the-sun",
      key: "solar-return",
      name: "The return of the Sun",
      provenance: "attested",
      summary: "The Sun come back to its natal degree.",
      reading: ["Cast the chart for the moment of return."],
      cautions: [],
    },
    // Configuration, not a technique — must be skipped.
    { ref: "options:options-0", key: "bond", name: null },
  ],
};

describe("packToTechniques", () => {
  it("reads the techniques and skips the options item", () => {
    const techniques = packToTechniques(payload);
    expect(techniques.map((t) => t.key)).toEqual(["annual-profection", "solar-return"]);
  });

  it("carries the reading, provenance and cautions", () => {
    const [profection] = packToTechniques(payload);
    expect(profection?.provenance).toBe("attested");
    expect(profection?.reading).toHaveLength(2);
    expect(profection?.cautions[0]).toContain("never from January");
  });

  it("parses houses into a numerically sorted list", () => {
    const [profection] = packToTechniques(payload);
    expect(profection?.houses?.map((h) => h.house)).toEqual([1, 2, 10]);
    expect(profection?.houses?.[0]?.meaning).toBe("The body.");
  });

  it("leaves houses undefined where the technique has none", () => {
    const solar = packToTechniques(payload)[1];
    expect(solar?.houses).toBeUndefined();
  });

  it("returns nothing for a payload with no items", () => {
    expect(packToTechniques({})).toEqual([]);
    expect(packToTechniques(null)).toEqual([]);
    expect(packToTechniques({ items: "not an array" })).toEqual([]);
  });
});
