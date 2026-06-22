import { describe, expect, it } from "vitest";

import {
  GEO_ATTRIBUTIONS,
  GEO_FIGURES,
  GEO_FIGURE_ORDER,
  GEO_MEANINGS,
  type GeoFigure,
  combine,
  deriveShield,
  figureName,
  generateMothers,
} from "./engine.js";

// ─── Data tables ──────────────────────────────────────────────────

describe("Geomancy data tables", () => {
  it("GEO_FIGURES enumerates all 16 binary keys (1111..2222)", () => {
    const keys = Object.keys(GEO_FIGURES);
    expect(keys).toHaveLength(16);
    // Every 4-line pattern of {1,2} is present and unique.
    for (let a = 1; a <= 2; a++) {
      for (let b = 1; b <= 2; b++) {
        for (let c = 1; c <= 2; c++) {
          for (let d = 1; d <= 2; d++) {
            const key = `${a}${b}${c}${d}`;
            expect(GEO_FIGURES[key]).toBeDefined();
          }
        }
      }
    }
  });

  it("GEO_FIGURES values are 16 distinct names", () => {
    const names = Object.values(GEO_FIGURES);
    expect(new Set(names).size).toBe(16);
  });

  it("GEO_MEANINGS covers every figure name", () => {
    const names = Object.values(GEO_FIGURES);
    for (const name of names) {
      expect(GEO_MEANINGS[name]).toBeDefined();
      expect(GEO_MEANINGS[name].length).toBeGreaterThan(20);
    }
  });

  it("GEO_ATTRIBUTIONS covers every figure name", () => {
    const names = Object.values(GEO_FIGURES);
    for (const name of names) {
      expect(GEO_ATTRIBUTIONS[name]).toBeDefined();
    }
  });

  it("GEO_FIGURE_ORDER lists all 16 names in canonical FIG-key order", () => {
    expect(GEO_FIGURE_ORDER).toHaveLength(16);
    expect(GEO_FIGURE_ORDER[0]).toBe("Via");
    expect(GEO_FIGURE_ORDER[15]).toBe("Populus");
    expect(new Set(GEO_FIGURE_ORDER).size).toBe(16);
  });

  it("Carcer + Rubeus + Cauda Draconis meanings make difficulty textual, not chromatic", () => {
    // Tone-rule audit (H04 §S3.1): the chrome must NEVER recolour these
    // figures red; the meaning text carries the difficulty.
    expect(GEO_MEANINGS.Carcer).toContain("Read as information, not condemnation");
    expect(GEO_MEANINGS.Rubeus).toContain("cautionary");
    expect(GEO_MEANINGS["Cauda Draconis"]).toContain("ending");
  });
});

// ─── figureName ────────────────────────────────────────────────────

describe("figureName", () => {
  it("maps the four corner figures correctly", () => {
    expect(figureName([1, 1, 1, 1])).toBe("Via");
    expect(figureName([2, 2, 2, 2])).toBe("Populus");
    expect(figureName([2, 1, 2, 1])).toBe("Acquisitio");
    expect(figureName([1, 2, 1, 2])).toBe("Amissio");
  });

  it("returns null for an invalid figure pattern", () => {
    // GeoFigure is typed [1|2, ...] so this requires a cast — but the
    // function defends against unexpected runtime input.
    expect(figureName([3, 1, 1, 1] as unknown as GeoFigure)).toBeNull();
  });
});

// ─── combine ───────────────────────────────────────────────────────

describe("combine", () => {
  it("same line → 2 (even / double); different lines → 1 (odd / single)", () => {
    // [1,1,1,1] + [1,1,1,1] = [2,2,2,2] (all match)
    expect(combine([1, 1, 1, 1], [1, 1, 1, 1])).toEqual([2, 2, 2, 2]);
    // [1,1,1,1] + [2,2,2,2] = [1,1,1,1] (all differ)
    expect(combine([1, 1, 1, 1], [2, 2, 2, 2])).toEqual([1, 1, 1, 1]);
  });

  it("Via combined with itself yields Populus (named: Populus is Via reduced)", () => {
    const via: GeoFigure = [1, 1, 1, 1];
    const result = combine(via, via);
    expect(figureName(result)).toBe("Populus");
  });

  it("commutative — combine(a,b) === combine(b,a)", () => {
    const a: GeoFigure = [1, 2, 1, 2];
    const b: GeoFigure = [2, 2, 1, 1];
    expect(combine(a, b)).toEqual(combine(b, a));
  });

  it("works element-wise on mixed lines", () => {
    const a: GeoFigure = [1, 2, 1, 2];
    const b: GeoFigure = [1, 1, 2, 2];
    // line 0: 1=1 → 2; line 1: 2≠1 → 1; line 2: 1≠2 → 1; line 3: 2=2 → 2
    expect(combine(a, b)).toEqual([2, 1, 1, 2]);
  });
});

// ─── deriveShield ──────────────────────────────────────────────────

describe("deriveShield", () => {
  // Mockup's default Mothers (line 166 of Geomancy.dc.html).
  const defaultMothers: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
    [1, 2, 1, 1],
    [2, 1, 1, 2],
    [1, 1, 2, 2],
    [2, 2, 1, 1],
  ];

  it("daughters[i] is the transpose: line j of Mother j's i-th line", () => {
    const shield = deriveShield(defaultMothers);
    // Daughter 1's lines = [M1[0], M2[0], M3[0], M4[0]]
    expect(shield.daughters[0]).toEqual([
      defaultMothers[0][0],
      defaultMothers[1][0],
      defaultMothers[2][0],
      defaultMothers[3][0],
    ]);
    expect(shield.daughters[3]).toEqual([
      defaultMothers[0][3],
      defaultMothers[1][3],
      defaultMothers[2][3],
      defaultMothers[3][3],
    ]);
  });

  it("nieces 1-2 = combine(M1,M2), combine(M3,M4)", () => {
    const shield = deriveShield(defaultMothers);
    expect(shield.nieces[0]).toEqual(
      combine(defaultMothers[0], defaultMothers[1]),
    );
    expect(shield.nieces[1]).toEqual(
      combine(defaultMothers[2], defaultMothers[3]),
    );
  });

  it("nieces 3-4 = combine(D1,D2), combine(D3,D4)", () => {
    const shield = deriveShield(defaultMothers);
    expect(shield.nieces[2]).toEqual(
      combine(shield.daughters[0], shield.daughters[1]),
    );
    expect(shield.nieces[3]).toEqual(
      combine(shield.daughters[2], shield.daughters[3]),
    );
  });

  it("witnesses + judge cascade", () => {
    const shield = deriveShield(defaultMothers);
    expect(shield.rightWitness).toEqual(
      combine(shield.nieces[0], shield.nieces[1]),
    );
    expect(shield.leftWitness).toEqual(
      combine(shield.nieces[2], shield.nieces[3]),
    );
    expect(shield.judge).toEqual(
      combine(shield.rightWitness, shield.leftWitness),
    );
  });

  it("reconciler = combine(judge, M1)", () => {
    const shield = deriveShield(defaultMothers);
    expect(shield.reconciler).toEqual(
      combine(shield.judge, defaultMothers[0]),
    );
  });

  it("houses I..XII = [M1..M4, D1..D4, N1..N4]", () => {
    const shield = deriveShield(defaultMothers);
    expect(shield.houses).toHaveLength(12);
    expect(shield.houses[0]).toBe(shield.mothers[0]);
    expect(shield.houses[3]).toBe(shield.mothers[3]);
    expect(shield.houses[4]).toBe(shield.daughters[0]);
    expect(shield.houses[7]).toBe(shield.daughters[3]);
    expect(shield.houses[8]).toBe(shield.nieces[0]);
    expect(shield.houses[11]).toBe(shield.nieces[3]);
  });

  it("all four Mothers = Populus produces an entire Populus shield", () => {
    const allPopulus: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
      [2, 2, 2, 2],
      [2, 2, 2, 2],
      [2, 2, 2, 2],
      [2, 2, 2, 2],
    ];
    const shield = deriveShield(allPopulus);
    // Combining Populus with itself = Populus (everything matches).
    expect(shield.judge).toEqual([2, 2, 2, 2]);
    expect(figureName(shield.judge)).toBe("Populus");
    expect(figureName(shield.reconciler)).toBe("Populus");
    shield.houses.forEach((h) => expect(h).toEqual([2, 2, 2, 2]));
  });

  it("Mothers Via, Populus, Via, Populus gives a known intermediate cascade", () => {
    const mothers: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
      [1, 1, 1, 1], // Via
      [2, 2, 2, 2], // Populus
      [1, 1, 1, 1], // Via
      [2, 2, 2, 2], // Populus
    ];
    const shield = deriveShield(mothers);
    // Daughters[0] = [M1[0],M2[0],M3[0],M4[0]] = [1,2,1,2] = Amissio
    expect(figureName(shield.daughters[0])).toBe("Amissio");
    // Niece 1 = combine(Via, Populus) = all differ = Via
    expect(figureName(shield.nieces[0])).toBe("Via");
  });
});

// ─── generateMothers ───────────────────────────────────────────────

describe("generateMothers", () => {
  it("produces four Mothers of four lines each, every line ∈ {1, 2}", () => {
    const mothers = generateMothers();
    expect(mothers).toHaveLength(4);
    for (const m of mothers) {
      expect(m).toHaveLength(4);
      for (const line of m) {
        expect([1, 2]).toContain(line);
      }
    }
  });

  it("respects the supplied random source (seeded determinism)", () => {
    // Random source returning 0 always → every line is 1 → all four Mothers = Via.
    const allOnes = generateMothers(() => 0);
    expect(allOnes).toEqual([
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ]);
    // Random source returning ≥0.5 → every line is 2 → all four Mothers = Populus.
    const allTwos = generateMothers(() => 0.9);
    expect(allTwos).toEqual([
      [2, 2, 2, 2],
      [2, 2, 2, 2],
      [2, 2, 2, 2],
      [2, 2, 2, 2],
    ]);
  });
});
