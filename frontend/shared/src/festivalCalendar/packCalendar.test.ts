import { describe, expect, it } from "vitest";

import { packToFestivalCalendar } from "./packCalendar.js";

const payload = {
  kind: "festival-calendar",
  items: [
    {
      ref: "occasions:the-deipnon",
      key: "deipnon",
      name: "The Deipnon — Hekate's Supper",
      summary: "The dark moon. The house is cleansed of the month's miasma.",
      note: "Kept on the month's last day, before the first crescent is sighted.",
      significator: "moon",
      anchor: { degrees: 0, kind: "lunar" },
      at: { solar: "dusk" },
      tags: ["household", "hekate", "monthly"],
    },
    {
      ref: "occasions:the-noumenia",
      key: "noumenia",
      name: "The Noumenia",
      summary: "The first crescent — the new month begins.",
      significator: "moon",
      anchor: { degrees: 12, kind: "lunar" },
      tags: [],
    },
    {
      ref: "reckonings:attic",
      key: "attic",
      name: "The Attic calendar",
      detail: "The Athenian lunar month.",
      months: { format: "{month} {day}", names: ["Ἑκατομβαιών", "Μεταγειτνιών"] },
      year: {},
    },
    // Configuration — skipped.
    { ref: "options:options-0", key: "monthOpensAt", name: "What opens the month" },
  ],
};

describe("packToFestivalCalendar", () => {
  it("reads occasions and skips the options item", () => {
    const { occasions } = packToFestivalCalendar(payload);
    expect(occasions.map((o) => o.key)).toEqual(["deipnon", "noumenia"]);
  });

  it("derives a when-phrase from the lunar anchor and the time of day", () => {
    const [deipnon] = packToFestivalCalendar(payload).occasions;
    expect(deipnon?.when).toBe("the dark moon, at dusk");
  });

  it("falls back to the raw degree for a non-cardinal lunar anchor", () => {
    const noumenia = packToFestivalCalendar(payload).occasions[1];
    expect(noumenia?.when).toBe("the Moon at 12°");
  });

  it("reads the reckoning's month-names in order", () => {
    const { reckonings } = packToFestivalCalendar(payload);
    expect(reckonings).toHaveLength(1);
    expect(reckonings[0]?.monthNames).toEqual(["Ἑκατομβαιών", "Μεταγειτνιών"]);
  });

  it("carries summary, note and tags", () => {
    const [deipnon] = packToFestivalCalendar(payload).occasions;
    expect(deipnon?.note).toContain("last day");
    expect(deipnon?.tags).toEqual(["household", "hekate", "monthly"]);
  });

  it("returns empty structures for a payload with no items", () => {
    expect(packToFestivalCalendar({})).toEqual({ occasions: [], reckonings: [] });
    expect(packToFestivalCalendar(null)).toEqual({ occasions: [], reckonings: [] });
  });
});
