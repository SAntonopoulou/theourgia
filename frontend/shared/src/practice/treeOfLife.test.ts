import { describe, expect, it } from "vitest";

import {
  SEPHIROTH,
  SEPHIROTH_BY_NAME,
  TREE_OF_LIFE_PATHS,
  TREE_OF_LIFE_PATH_NUMBERS,
  pathByNumber,
} from "./treeOfLife.js";

describe("TREE_OF_LIFE_PATHS", () => {
  it("covers all 22 paths numbered 11..32", () => {
    const keys = Object.keys(TREE_OF_LIFE_PATHS)
      .map(Number)
      .sort((a, b) => a - b);
    expect(keys).toEqual(Array.from({ length: 22 }, (_, i) => 11 + i));
  });

  it("path 11 = Aleph / The Fool / Air / Kether → Chokmah", () => {
    expect(TREE_OF_LIFE_PATHS[11]).toMatchObject({
      hebrew: "א",
      letter: "Aleph",
      trump: "The Fool",
      attribution: "Air",
      route: "Kether → Chokmah",
      from: "Kether",
      to: "Chokmah",
    });
  });

  it("path 32 = Tau / The World / Saturn / Yesod → Malkuth", () => {
    expect(TREE_OF_LIFE_PATHS[32]).toMatchObject({
      hebrew: "ת",
      letter: "Tau",
      trump: "The World",
      attribution: "Saturn",
      route: "Yesod → Malkuth",
      from: "Yesod",
      to: "Malkuth",
    });
  });

  it("every path resolves to one of the 10 named sephiroth at both ends", () => {
    const names = SEPHIROTH.map((s) => s.name);
    for (const num of TREE_OF_LIFE_PATH_NUMBERS) {
      const p = TREE_OF_LIFE_PATHS[num]!;
      expect(names).toContain(p.from);
      expect(names).toContain(p.to);
    }
  });

  it("every Hebrew letter is unique across the 22 paths", () => {
    const letters = TREE_OF_LIFE_PATH_NUMBERS.map(
      (n) => TREE_OF_LIFE_PATHS[n]!.hebrew,
    );
    expect(new Set(letters).size).toBe(22);
  });

  it("every tarot trump is unique across the 22 paths (Major Arcana 0..XXI)", () => {
    const trumps = TREE_OF_LIFE_PATH_NUMBERS.map(
      (n) => TREE_OF_LIFE_PATHS[n]!.trump,
    );
    expect(new Set(trumps).size).toBe(22);
  });
});

describe("TREE_OF_LIFE_PATH_NUMBERS", () => {
  it("lists 11..32 in ascending order", () => {
    expect(TREE_OF_LIFE_PATH_NUMBERS).toEqual(
      Array.from({ length: 22 }, (_, i) => 11 + i),
    );
  });
});

describe("pathByNumber", () => {
  it("returns the matching path", () => {
    expect(pathByNumber(25).letter).toBe("Samekh");
  });

  it("throws for out-of-range numbers", () => {
    expect(() => pathByNumber(10)).toThrow(/Invalid/);
    expect(() => pathByNumber(33)).toThrow(/Invalid/);
  });
});

describe("SEPHIROTH", () => {
  it("contains exactly 10 sephiroth", () => {
    expect(SEPHIROTH).toHaveLength(10);
  });

  it("numbers run 1..10 with Kether first and Malkuth last", () => {
    expect(SEPHIROTH[0]).toMatchObject({ name: "Kether", number: 1 });
    expect(SEPHIROTH[9]).toMatchObject({ name: "Malkuth", number: 10 });
    expect(SEPHIROTH.map((s) => s.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("Tiphareth sits at the centre (x = 50)", () => {
    expect(SEPHIROTH_BY_NAME.Tiphareth.x).toBe(50);
  });

  it("Yesod and Malkuth are on the middle pillar", () => {
    expect(SEPHIROTH_BY_NAME.Yesod.x).toBe(50);
    expect(SEPHIROTH_BY_NAME.Malkuth.x).toBe(50);
  });

  it("Chokmah / Chesed / Netzach are on the right pillar (x > 50)", () => {
    expect(SEPHIROTH_BY_NAME.Chokmah.x).toBeGreaterThan(50);
    expect(SEPHIROTH_BY_NAME.Chesed.x).toBeGreaterThan(50);
    expect(SEPHIROTH_BY_NAME.Netzach.x).toBeGreaterThan(50);
  });

  it("Binah / Geburah / Hod are on the left pillar (x < 50)", () => {
    expect(SEPHIROTH_BY_NAME.Binah.x).toBeLessThan(50);
    expect(SEPHIROTH_BY_NAME.Geburah.x).toBeLessThan(50);
    expect(SEPHIROTH_BY_NAME.Hod.x).toBeLessThan(50);
  });
});
