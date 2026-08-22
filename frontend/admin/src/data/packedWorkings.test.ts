/**
 * packedWorkings — reading a pack's workings and building the adopt batch.
 * The rows written here are applied by the phone's sync with a strict
 * reader, so what is pinned is the wire: the opening rules, the span JSON
 * byte-shape, the phase cadences re-keyed from item titles to item ids, and
 * that nothing is begun.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("./api.js", () => ({ apiMethods: {} }));
vi.mock("./keepObservance.js", () => ({ writeWorking: vi.fn() }));

import { adoptWorkingDrafts, packedWorkingsFromPayload, spanJson } from "./packedWorkings.js";

const PAYLOAD = {
  kind: "ritual-set",
  items: [
    {
      ref: "workings:0",
      name: "Astarte",
      summary: "The method of devotion.",
      items: [
        { title: "The invocation of the Angel", cadence: "timesADay", perDay: 3, script: "..." },
      ],
      stages: [
        {
          name: "The First House",
          days: 41,
          criterion: "The sign received.",
          countFrom: "start",
          greek: "Α",
          key: "first-house",
          cadences: { "The invocation of the Angel": { cadence: "timesADay", perDay: 7 } },
          items: [{ title: "The oration of the house", cadence: "daily", script: "Say..." }],
        },
        {
          name: "The Waiting",
          untilSky: { kind: "lunations", count: 2 },
          opensAfter: { kind: "lunations", count: 2 },
          cadences: {
            "The invocation of the Angel": { cadence: "none" },
            "A title the working does not carry": { cadence: "daily" },
          },
        },
      ],
    },
    // A rite in the same container — not a working.
    { ref: "rites:0", name: "The Star Ruby", steps: [{ instruction: "Face EAST." }] },
    // An adoration set — not a working either.
    { ref: "sets:0", name: "Stations", body: "lunar", adorations: [{ script: "ΧΑΙΡΕ" }] },
  ],
};

describe("packedWorkingsFromPayload", () => {
  it("keeps only the workings out of the shared container", () => {
    const workings = packedWorkingsFromPayload(PAYLOAD);
    expect(workings.map((w) => w.name)).toEqual(["Astarte"]);
    expect(workings[0]?.stages).toHaveLength(2);
    expect(workings[0]?.items).toHaveLength(1);
  });

  it("tolerates garbage", () => {
    expect(packedWorkingsFromPayload(null)).toEqual([]);
    expect(packedWorkingsFromPayload({ items: [7, {}, { name: "x" }] })).toEqual([]);
  });
});

describe("spanJson", () => {
  it("writes the phone's SkySpan shape — count only for counted kinds", () => {
    expect(spanJson({ kind: "lunations", count: 2, degrees: 0, station: "", offsetDays: 0 })).toBe(
      '{"kind":"lunations","count":2}',
    );
    expect(spanJson({ kind: "toMoonAt", count: 1, degrees: 90, station: "", offsetDays: 0 })).toBe(
      '{"kind":"toMoonAt","degrees":90}',
    );
  });
});

describe("adoptWorkingDrafts", () => {
  const working = packedWorkingsFromPayload(PAYLOAD)[0];
  if (working === undefined) throw new Error("fixture parse failed");
  let seq = 0;
  const drafts = adoptWorkingDrafts(working, () => `id-${seq++}`);

  it("keeps the throughout item apart from the stage items", () => {
    expect(drafts.items).toHaveLength(2);
    const [throughout, staged] = drafts.items;
    expect(throughout?.stageId).toBeNull();
    expect(throughout?.script).toBe("...");
    expect(staged?.title).toBe("The oration of the house");
    expect(staged?.stageId).toBe(drafts.stages[0]?.id);
  });

  it("maps the opening rules as the phone does", () => {
    const [first, waiting] = drafts.stages;
    // A criterion with no span: the stage opens when declared.
    expect(first?.openRule).toBe("whenDeclared");
    expect(first?.requirement).toBe("forDays");
    expect(first?.requiredDays).toBe(41);
    expect(first?.countFrom).toBe("start");
    expect(first?.phaseKey).toBe("first-house");
    // A span to wait: afterSpan, and a sky-measured requirement.
    expect(waiting?.openRule).toBe("afterSpan");
    expect(waiting?.openSpan).toBe('{"kind":"lunations","count":2}');
    expect(waiting?.requirement).toBe("untilSky");
    expect(waiting?.requiredSpan).toBe('{"kind":"lunations","count":2}');
  });

  it("re-keys phase cadences from titles to item ids; unknown titles drop", () => {
    const throughoutId = drafts.items[0]?.id;
    const first = JSON.parse(drafts.stages[0]?.cadences ?? "{}");
    expect(first).toEqual({ [String(throughoutId)]: { cadence: "timesADay", perDay: 7 } });
    const waiting = JSON.parse(drafts.stages[1]?.cadences ?? "{}");
    // `none` survives (the phase sets the practice down entirely); the title
    // the working does not carry changed the cadence of nothing.
    expect(waiting).toEqual({ [String(throughoutId)]: { cadence: "none" } });
  });

  it("falls back to daily for a cadence this build cannot read", () => {
    const odd = adoptWorkingDrafts(
      {
        name: "W",
        summary: "",
        packTitle: "",
        stages: [],
        items: [{ title: "T", cadence: "everyFortnight", perDay: 1, script: "" }],
      },
      () => "x",
    );
    expect(odd.items[0]?.cadence).toBe("daily");
  });
});
