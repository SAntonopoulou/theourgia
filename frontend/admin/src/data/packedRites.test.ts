/**
 * packedRites — reading rites out of the shared `ritual-set` container and
 * flattening them the way the phone's `adoptRite` does. Pinned: the
 * discrimination (rites only — never adoration sets or workings), the
 * `[instruction]` + spoken flattening with role prefixes, and the timing
 * carried verbatim.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("./api.js", () => ({ apiMethods: {} }));
vi.mock("./keepObservance.js", () => ({ writeRitual: vi.fn() }));

import { flattenRiteScript, packedRitesFromPayload } from "./packedRites.js";

const MIXED_PAYLOAD = {
  kind: "ritual-set",
  items: [
    {
      ref: "rites:0",
      name: "The Star Ruby",
      summary: "Class D.",
      steps: [
        { instruction: "Face EAST. Draw a deep breath." },
        { instruction: "Dash the hand down, and cry:", spoken: "ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ" },
      ],
      keptAt: [{ when: "daily" }],
    },
    // An adoration set in the same container — not a rite.
    {
      ref: "sets:0",
      name: "Hekate's stations",
      body: "lunar",
      adorations: [{ script: "ΧΑΙΡΕ", title: "", stations: ["moonrise"] }],
    },
    // A working — not a rite either.
    {
      ref: "workings:0",
      name: "Astarte",
      summary: "",
      items: [{ title: "The ceremony", cadence: "timesADay", script: "..." }],
      stages: [],
    },
    // A rite with neither script nor steps offers nothing to perform.
    { ref: "rites:1", name: "An empty page" },
  ],
};

describe("packedRitesFromPayload", () => {
  it("keeps only the rites out of the shared container", () => {
    const rites = packedRitesFromPayload(MIXED_PAYLOAD);
    expect(rites.map((r) => r.name)).toEqual(["The Star Ruby"]);
    expect(rites[0]?.keptAt).toEqual([{ when: "daily" }]);
  });

  it("tolerates garbage", () => {
    expect(packedRitesFromPayload(null)).toEqual([]);
    expect(packedRitesFromPayload({ items: [7, "x", {}] })).toEqual([]);
  });
});

describe("flattenRiteScript", () => {
  it("flattens steps as the phone does — [instruction], spoken byte-exact", () => {
    const rite = packedRitesFromPayload(MIXED_PAYLOAD)[0];
    expect(rite).toBeDefined();
    expect(flattenRiteScript(rite as NonNullable<typeof rite>)).toBe(
      "[Face EAST. Draw a deep breath.]\n\n" +
        "[Dash the hand down, and cry:]\nΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ",
    );
  });

  it("prefixes each step with whose part it is when the rite is shared", () => {
    const script = flattenRiteScript({
      name: "A mass",
      summary: "",
      script: "",
      packTitle: "",
      roles: [
        { id: "priest", name: "Priest", detail: "" },
        { id: "deacon", name: "Deacon", detail: "at the door" },
      ],
      steps: [
        { instruction: "", spoken: "I proclaim.", role: "deacon", together: false },
        { instruction: "", spoken: "So mote it be.", role: "", together: true },
      ],
      keptAt: [],
    });
    expect(script).toBe(
      "WORKED BY\n· Priest\n· Deacon — at the door\n\n" +
        "DEACON:\nI proclaim.\n\n" +
        "ALL:\nSo mote it be.",
    );
  });
});
