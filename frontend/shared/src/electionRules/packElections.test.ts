import { describe, expect, it } from "vitest";

import { packToElectionTemplates } from "./packElections.js";

const payload = {
  kind: "election-templates",
  items: [
    {
      ref: "matters:money-and-increase",
      key: "wealth",
      name: "Money and increase",
      house: 2,
      significators: ["jupiter", "venus"],
      ruleset: "undertaking",
      summary: "Gaining, earning, and what is held.",
    },
    {
      ref: "rulesets:undertaking",
      id: "undertaking",
      name: "An undertaking",
      takes: "matter",
      summary: "Anything begun that must go on afterwards.",
      clauses: [
        {
          condition: "moon-not-void",
          veto: true,
          because: "Nothing begun on a void Moon comes to anything.",
        },
        {
          // A compound group — its reasoned clauses are collected flat.
          all: [
            {
              condition: "body-not-debilitated",
              body: "$significator",
              veto: true,
              because: "A significator in detriment or fall cannot carry the matter.",
            },
            {
              condition: "moon-increasing",
              because: "A waxing Moon is preferred for anything meant to grow.",
            },
          ],
        },
      ],
    },
  ],
};

describe("packToElectionTemplates", () => {
  it("reads the matters with place and significators", () => {
    const { matters } = packToElectionTemplates(payload);
    expect(matters).toHaveLength(1);
    expect(matters[0]).toMatchObject({
      key: "wealth",
      house: 2,
      significators: ["jupiter", "venus"],
      ruleset: "undertaking",
    });
  });

  it("reads the rulesets", () => {
    const { rulesets } = packToElectionTemplates(payload);
    expect(rulesets).toHaveLength(1);
    expect(rulesets[0]?.name).toBe("An undertaking");
    expect(rulesets[0]?.takes).toBe("matter");
  });

  it("flattens nested all/any clauses and keeps every reason", () => {
    const [ruleset] = packToElectionTemplates(payload).rulesets;
    // top-level clause + two from the `all` group = three
    expect(ruleset?.clauses).toHaveLength(3);
    expect(ruleset?.clauses.map((c) => c.because)).toContain(
      "A waxing Moon is preferred for anything meant to grow.",
    );
  });

  it("humanises the condition and marks veto vs preference", () => {
    const [ruleset] = packToElectionTemplates(payload).rulesets;
    const first = ruleset?.clauses[0];
    expect(first?.condition).toBe("moon not void");
    expect(first?.veto).toBe(true);
    const waxing = ruleset?.clauses.find((c) => c.condition === "moon increasing");
    expect(waxing?.veto).toBe(false);
  });

  it("returns empty structures for a payload with no items", () => {
    expect(packToElectionTemplates({})).toEqual({ matters: [], rulesets: [] });
    expect(packToElectionTemplates(null)).toEqual({ matters: [], rulesets: [] });
  });
});
