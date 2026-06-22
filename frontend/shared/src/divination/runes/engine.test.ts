import { describe, expect, it } from "vitest";

import {
  ELDER_FUTHARK,
  SYMMETRIC_RUNES,
  buildFuthark,
  drawRunes,
  findRune,
  layoutForSize,
} from "./engine.js";

// ─── Dataset integrity ────────────────────────────────────────────

describe("Elder Futhark dataset", () => {
  it("contains exactly 24 staves", () => {
    expect(ELDER_FUTHARK).toHaveLength(24);
  });

  it("every stave has glyph + protoGermanic + keyword + upright", () => {
    for (const rune of ELDER_FUTHARK) {
      expect(rune.glyph.length).toBeGreaterThan(0);
      expect(rune.protoGermanic).toMatch(/^\*/);
      expect(rune.keyword.length).toBeGreaterThan(0);
      expect(rune.upright.length).toBeGreaterThan(20);
    }
  });

  it("Fehu is the opening stave and Othala is the closing one", () => {
    expect(ELDER_FUTHARK[0]?.name).toBe("Fehu");
    expect(ELDER_FUTHARK[23]?.name).toBe("Othala");
  });

  it("exactly 9 staves are symmetric (verbatim from the mockup dataset)", () => {
    // The H04 supplement §S3.5 prose enumerates 8 (omits Mannaz), but
    // the mockup data marks Mannaz (ᛗ — rotationally symmetric) as
    // symmetric. The data wins per "port the accurate mockups; don't
    // re-derive."
    const symmetric = ELDER_FUTHARK.filter((r) => r.symmetric).map(
      (r) => r.name,
    );
    expect(symmetric).toHaveLength(9);
    // Order = canonical Futhark sequence (Gebo@6 · Hagalaz@8 · Isa@10
    // · Jera@11 · Eihwaz@12 · Sowilo@15 · Mannaz@19 · Ingwaz@21 ·
    // Dagaz@22). Mannaz follows Sowilo in the Futhark, not precedes it.
    expect(symmetric).toEqual([
      "Gebo",
      "Hagalaz",
      "Isa",
      "Jera",
      "Eihwaz",
      "Sowilo",
      "Mannaz",
      "Ingwaz",
      "Dagaz",
    ]);
  });

  it("symmetric staves have NULL merkstave; asymmetric ones have a string", () => {
    for (const rune of ELDER_FUTHARK) {
      if (rune.symmetric) {
        expect(rune.merkstave).toBeNull();
      } else {
        expect(typeof rune.merkstave).toBe("string");
        expect(rune.merkstave!.length).toBeGreaterThan(10);
      }
    }
  });

  it("Nauthiz upright text carries the tone discipline verbatim", () => {
    // H04 §S3.1 — difficulty is information, not chrome. Verbatim
    // editorial from the .dc.html: "Difficulty here is instruction,
    // not doom."
    const nauthiz = findRune("Nauthiz");
    expect(nauthiz.upright).toContain(
      "Difficulty here is instruction, not doom.",
    );
  });

  it("SYMMETRIC_RUNES is consistent with the dataset", () => {
    const fromDataset = ELDER_FUTHARK.filter((r) => r.symmetric).map(
      (r) => r.name,
    );
    expect(SYMMETRIC_RUNES).toEqual(fromDataset);
  });
});

// ─── buildFuthark + findRune ──────────────────────────────────────

describe("buildFuthark + findRune", () => {
  it("buildFuthark returns a fresh array of 24 staves", () => {
    const a = buildFuthark();
    const b = buildFuthark();
    expect(a).toHaveLength(24);
    expect(a).not.toBe(b);
  });

  it("findRune resolves a known stave", () => {
    expect(findRune("Sowilo").keyword).toBe("the sun");
    expect(findRune("Othala").keyword).toBe("inheritance");
  });

  it("findRune throws for an unknown name", () => {
    expect(() => findRune("NotARune" as never)).toThrow(
      /Unknown rune/,
    );
  });
});

// ─── layoutForSize ────────────────────────────────────────────────

describe("layoutForSize", () => {
  it("size=1 → single-stave layout, centre", () => {
    const layout = layoutForSize(1);
    expect(layout.positions).toHaveLength(1);
    expect(layout.positions[0]).toEqual({
      x: 50,
      y: 50,
      label: "The stave",
    });
  });

  it("size=3 → the three Norns with verbatim labels", () => {
    const layout = layoutForSize(3);
    expect(layout.name).toBe(
      "The Norns · what was · what is · what shall be",
    );
    expect(layout.positions.map((p) => p.label)).toEqual([
      "Urðr — what was",
      "Verðandi — what is",
      "Skuld — what shall be",
    ]);
  });

  it("size=5 → five-stave cross with verbatim labels", () => {
    const layout = layoutForSize(5);
    expect(layout.name).toBe("The five-stave cross");
    expect(layout.positions).toHaveLength(5);
    expect(layout.positions.map((p) => p.label)).toEqual([
      "The matter",
      "What crowns it",
      "Where it tends",
      "What underlies it",
      "What has passed",
    ]);
  });
});

// ─── drawRunes ─────────────────────────────────────────────────────

describe("drawRunes", () => {
  it("returns exactly N runes for size N", () => {
    expect(drawRunes(1, 42)).toHaveLength(1);
    expect(drawRunes(3, 42)).toHaveLength(3);
    expect(drawRunes(5, 42)).toHaveLength(5);
  });

  it("draws without repeats", () => {
    const draw = drawRunes(5, 42);
    const names = draw.map((d) => d.rune.name);
    expect(new Set(names).size).toBe(5);
  });

  it("attaches the correct position labels from the layout", () => {
    const draw = drawRunes(3, 42);
    expect(draw.map((d) => d.positionLabel)).toEqual([
      "Urðr — what was",
      "Verðandi — what is",
      "Skuld — what shall be",
    ]);
  });

  it("seeded with the same seed → deterministic identical draw", () => {
    const a = drawRunes(5, 12345);
    const b = drawRunes(5, 12345);
    expect(a.map((d) => d.rune.name)).toEqual(b.map((d) => d.rune.name));
    expect(a.map((d) => d.merkstave)).toEqual(b.map((d) => d.merkstave));
  });

  it("symmetric staves NEVER come up merkstave (the §S3.5 rule)", () => {
    // Hammer many draws to cover the RNG space; any symmetric stave
    // that came up reversed would break the honesty rule.
    for (let seed = 1; seed < 200; seed++) {
      const draw = drawRunes(5, seed);
      for (const d of draw) {
        if (d.rune.symmetric) {
          expect(d.merkstave).toBe(false);
        }
      }
    }
  });

  it("supports an injected random source (e.g. always-zero)", () => {
    // random() === 0 → idx = 0 (Fehu first), merkstave roll 0 < 0.3 → true.
    const draw = drawRunes(1, () => 0);
    expect(draw[0]?.rune.name).toBe("Fehu");
    expect(draw[0]?.merkstave).toBe(true);
  });

  it("injected random source forces symmetric stave to upright anyway", () => {
    // random() === 0 picks Fehu (idx 0). What about ensuring symmetric
    // staves stay upright? Force the second-pick path: random
    // sequence biased to land on Gebo first.
    let calls = 0;
    const source = () => {
      // First call selects idx — Gebo is at index 6 in ELDER_FUTHARK.
      // 6 / 24 = 0.25; return 0.27 so floor(0.27*24) = 6 → Gebo.
      // Second call is the merkstave roll; symmetric short-circuits
      // before reading it, but we return 0.0 (would-be merk if it ran).
      calls += 1;
      return calls === 1 ? 0.27 : 0.0;
    };
    const draw = drawRunes(1, source);
    expect(draw[0]?.rune.name).toBe("Gebo");
    expect(draw[0]?.rune.symmetric).toBe(true);
    expect(draw[0]?.merkstave).toBe(false);
  });
});
