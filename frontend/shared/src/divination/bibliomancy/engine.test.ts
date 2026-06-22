import { describe, expect, it } from "vitest";

import {
  BIBLIOMANCY_METHODS,
  type BibliomancySource,
  bibliomancyOpen,
} from "./engine.js";

const chaldeanOracles: BibliomancySource = {
  lines: [
    "There is a certain Intelligible One whom it behoves to apprehend",
    "with the flower of the Mind.",
    "Things divine cannot be obtained by mortal natures",
    "which understand corporeally,",
    "but only by those who are unmantled — naked.",
    "The Soul of mortals draws God within itself.",
    "Theurgists fall not, so as to be ranked among the herd.",
  ],
  linesPerPage: 4,
  citation: "The Chaldean Oracles",
};

describe("BIBLIOMANCY_METHODS", () => {
  it("lists three methods in the canonical order", () => {
    expect(BIBLIOMANCY_METHODS.map((m) => m.key)).toEqual([
      "page-finger",
      "random-line",
      "verse-number",
    ]);
  });

  it("attaches the mockup's verbatim notes per method", () => {
    expect(BIBLIOMANCY_METHODS[0]?.note).toBe(
      "opened at random, finger laid on the page",
    );
    expect(BIBLIOMANCY_METHODS[1]?.note).toBe(
      "a single line chosen by lot",
    );
    expect(BIBLIOMANCY_METHODS[2]?.note).toBe(
      "numbered by lot, then located",
    );
  });
});

describe("bibliomancyOpen — page-finger", () => {
  it("uses page-then-line addressing", () => {
    // random() = 0 → page 0; random() = 0 → line 0 within that page.
    const r = bibliomancyOpen(chaldeanOracles, "page-finger", () => 0);
    expect(r.passage).toBe(chaldeanOracles.lines[0]);
    expect(r.reference).toContain("p. 1");
  });

  it("never picks past the last page", () => {
    // 7 lines / 4 per page = 2 pages. random() = 0.99 → page index 1.
    const r = bibliomancyOpen(chaldeanOracles, "page-finger", () => 0.99);
    expect(r.reference).toContain("p. 2");
  });

  it("defaults linesPerPage to 32 when omitted", () => {
    const dense: BibliomancySource = {
      lines: Array.from({ length: 100 }, (_, i) => `line ${i}`),
      citation: "Dense",
    };
    // 100 lines / default 32 per page = 4 pages. random() = 0 → page 1.
    const r = bibliomancyOpen(dense, "page-finger", () => 0);
    expect(r.reference).toBe("Dense, p. 1");
  });
});

describe("bibliomancyOpen — random-line", () => {
  it("picks across the whole book", () => {
    const r = bibliomancyOpen(chaldeanOracles, "random-line", () => 0);
    expect(r.passage).toBe(chaldeanOracles.lines[0]);
    expect(r.reference).toBe("The Chaldean Oracles, l. 1");
  });

  it("never picks past the last line", () => {
    const r = bibliomancyOpen(chaldeanOracles, "random-line", () => 0.99);
    expect(r.reference).toBe(
      `The Chaldean Oracles, l. ${chaldeanOracles.lines.length}`,
    );
  });
});

describe("bibliomancyOpen — verse-number", () => {
  it("uses the § sigil in the reference", () => {
    const r = bibliomancyOpen(chaldeanOracles, "verse-number", () => 0);
    expect(r.reference).toBe("The Chaldean Oracles, § 1");
  });
});

describe("bibliomancyOpen — edge cases", () => {
  it("throws on an empty source", () => {
    expect(() =>
      bibliomancyOpen(
        { lines: [], citation: "x" },
        "random-line",
        () => 0,
      ),
    ).toThrow(/must not be empty/);
  });
});
