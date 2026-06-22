import { describe, expect, it } from "vitest";

import { evalFormula } from "./evalFormula.js";
import {
  centreSymbol,
  nameRingPath,
  printTiles,
} from "./geometry.js";
import { hebNum } from "./hebrew.js";
import {
  doublyEvenSquare,
  isValidMagicSquare,
  magicConstant,
  magicSquare,
  PLANETARY_SQUARES,
  planetarySquare,
  siameseSquare,
} from "./magicSquares.js";
import {
  hashSeed,
  mulberry32,
  sigilCurve,
  sigilGlyph,
  sigilKamea,
  spareLetters,
} from "./sigil.js";

// ─── Magic squares ────────────────────────────────────────────────

describe("magic squares — fixtures", () => {
  it("ships seven planetary squares in sacred Saturn → Moon order", () => {
    expect(PLANETARY_SQUARES.map((p) => p.planet)).toEqual([
      "saturn",
      "jupiter",
      "mars",
      "sun",
      "venus",
      "mercury",
      "moon",
    ]);
  });

  it("magicConstant matches n(n²+1)/2", () => {
    expect(magicConstant(3)).toBe(15);
    expect(magicConstant(4)).toBe(34);
    expect(magicConstant(5)).toBe(65);
    expect(magicConstant(6)).toBe(111);
    expect(magicConstant(7)).toBe(175);
    expect(magicConstant(8)).toBe(260);
    expect(magicConstant(9)).toBe(369);
  });

  it.each(PLANETARY_SQUARES)(
    "%s — verifies as a normal magic square",
    (square) => {
      expect(isValidMagicSquare(square.cells)).toBe(true);
      expect(magicConstant(square.order)).toBe(square.magicConstant);
    },
  );

  it("Saturn ships the verbatim Agrippa 3×3 (4-9-2 / 3-5-7 / 8-1-6)", () => {
    const saturn = planetarySquare("saturn");
    expect(saturn.cells.map((r) => [...r])).toEqual([
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ]);
  });

  it("each planetary fixture carries the Agrippa 1531 citation", () => {
    for (const p of PLANETARY_SQUARES) {
      expect(p.citation.label).toBe("Agrippa 1531");
      expect(p.citation.cite).toContain("De Occulta Philosophia");
    }
  });
});

describe("magic squares — algorithmic constructors", () => {
  it("Siamese — odd orders 3, 5, 7, 9, 11 are valid magic squares", () => {
    for (const n of [3, 5, 7, 9, 11]) {
      expect(isValidMagicSquare(siameseSquare(n))).toBe(true);
    }
  });

  it("Siamese rejects non-odd orders", () => {
    expect(() => siameseSquare(4)).toThrow(/odd/);
    expect(() => siameseSquare(2)).toThrow(/odd/);
  });

  it("Doubly-even — orders 4, 8, 12 are valid magic squares", () => {
    for (const n of [4, 8, 12]) {
      expect(isValidMagicSquare(doublyEvenSquare(n))).toBe(true);
    }
  });

  it("Doubly-even rejects non-multiple-of-4 orders", () => {
    expect(() => doublyEvenSquare(6)).toThrow(/divisible by 4/);
    expect(() => doublyEvenSquare(5)).toThrow(/divisible by 4/);
  });

  it("magicSquare(n) returns the fixture for n ∈ 3..9", () => {
    expect(magicSquare(3)).toEqual([
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ]);
    expect(magicSquare(6)[0]![0]).toBe(6); // Sol fixture, top-left = 6
  });

  it("magicSquare(11) constructs a valid 11×11 via Siamese", () => {
    expect(isValidMagicSquare(magicSquare(11))).toBe(true);
  });

  it("magicSquare(12) constructs a valid 12×12 via doubly-even", () => {
    expect(isValidMagicSquare(magicSquare(12))).toBe(true);
  });
});

// ─── Hebrew numerals ──────────────────────────────────────────────

describe("hebNum", () => {
  it("renders single digits 1..9", () => {
    expect(hebNum(1)).toBe("א");
    expect(hebNum(5)).toBe("ה");
    expect(hebNum(9)).toBe("ט");
  });

  it("renders tens 10..90 with the proper Hebrew letter", () => {
    expect(hebNum(10)).toBe("י");
    expect(hebNum(20)).toBe("כ");
    expect(hebNum(50)).toBe("נ");
    expect(hebNum(90)).toBe("צ");
  });

  it("15 substitutes (טו) — never the divine name יה", () => {
    expect(hebNum(15)).toBe("טו");
    expect(hebNum(15)).not.toContain("יה");
  });

  it("16 substitutes (טז) — never the divine name יו", () => {
    expect(hebNum(16)).toBe("טז");
    expect(hebNum(16)).not.toContain("יו");
  });

  it("renders 81 (Luna max) as פא", () => {
    expect(hebNum(81)).toBe("פא");
  });

  it("renders zero / negative as empty string", () => {
    expect(hebNum(0)).toBe("");
    expect(hebNum(-1)).toBe("");
  });

  it("renders 100 as ק and 400 as ת", () => {
    expect(hebNum(100)).toBe("ק");
    expect(hebNum(400)).toBe("ת");
  });
});

// ─── Sandboxed formula evaluator ─────────────────────────────────

describe("evalFormula — happy paths", () => {
  it("evaluates a plain numeric literal", () => {
    const r = evalFormula("42");
    expect(r.ok && r.value).toBe(42);
  });

  it("strips the `r = ` notation prefix", () => {
    const r = evalFormula("r = 1 + 2");
    expect(r.ok && r.value).toBe(3);
  });

  it("respects operator precedence", () => {
    const r = evalFormula("1 + 2 * 3");
    expect(r.ok && r.value).toBe(7);
  });

  it("^ is right-associative exponentiation", () => {
    // 2^3^2 = 2^(3^2) = 2^9 = 512
    const r = evalFormula("2^3^2");
    expect(r.ok && r.value).toBe(512);
  });

  it("supports unary minus", () => {
    const r = evalFormula("-5 + 3");
    expect(r.ok && r.value).toBe(-2);
  });

  it("reads θ, g, t from the context", () => {
    const r = evalFormula("g * θ + t", { θ: 2, g: 3, t: 1 });
    expect(r.ok && r.value).toBe(7);
  });

  it("supports sin, cos, sqrt, pow", () => {
    expect(evalFormula("sin(0)").ok && (evalFormula("sin(0)") as { value: number }).value).toBe(0);
    expect(evalFormula("cos(0)").ok && (evalFormula("cos(0)") as { value: number }).value).toBe(1);
    expect(evalFormula("sqrt(16)").ok && (evalFormula("sqrt(16)") as { value: number }).value).toBe(4);
    expect(evalFormula("pow(2, 10)").ok && (evalFormula("pow(2, 10)") as { value: number }).value).toBe(1024);
  });

  it("recognises π and e", () => {
    const piResult = evalFormula("π");
    expect(piResult.ok && piResult.value).toBeCloseTo(Math.PI);
    const eResult = evalFormula("e");
    expect(eResult.ok && eResult.value).toBeCloseTo(Math.E);
  });
});

describe("evalFormula — sandbox safety", () => {
  it("rejects unknown identifiers (no global leak)", () => {
    const r = evalFormula("window");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain("Unknown identifier");
  });

  it("rejects function calls to unwhitelisted functions", () => {
    const r = evalFormula("alert(1)");
    expect(r.ok).toBe(false);
  });

  it("rejects property access syntax", () => {
    // `Math.PI` — dot is not in the lexer.
    const r = evalFormula("Math.PI");
    expect(r.ok).toBe(false);
  });

  it("rejects subscript syntax", () => {
    const r = evalFormula("arr[0]");
    expect(r.ok).toBe(false);
  });

  it("rejects bare identifiers like 'eval' or 'Function'", () => {
    expect(evalFormula("eval").ok).toBe(false);
    expect(evalFormula("Function").ok).toBe(false);
    expect(evalFormula("constructor").ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(evalFormula("").ok).toBe(false);
    expect(evalFormula("   ").ok).toBe(false);
  });

  it("returns ok=false on non-finite results without throwing", () => {
    const r = evalFormula("1 / 0");
    expect(r.ok).toBe(false);
  });

  it("rejects trailing garbage", () => {
    const r = evalFormula("1 + 2 garbage");
    expect(r.ok).toBe(false);
  });

  it("does not invoke setTimeout / setInterval / require", () => {
    expect(evalFormula("setTimeout(1)").ok).toBe(false);
    expect(evalFormula("require('fs')").ok).toBe(false);
  });
});

// ─── Sigil generators ─────────────────────────────────────────────

describe("mulberry32 — determinism", () => {
  it("same seed → same stream", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it("different seeds → different streams", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("hashSeed", () => {
  it("returns the same seed for the same input", async () => {
    const a = await hashSeed("morning grounding");
    const b = await hashSeed("morning grounding");
    expect(a).toBe(b);
  });

  it("salt changes the seed", async () => {
    const a = await hashSeed("intention", "");
    const b = await hashSeed("intention", "x");
    expect(a).not.toBe(b);
  });

  it("returns a positive 32-bit-range integer", async () => {
    const s = await hashSeed("anything");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe("sigilCurve — paths", () => {
  it("produces a non-empty SVG path for each family", () => {
    for (const family of ["rose", "lissajous", "harmonograph", "polar"] as const) {
      const d = sigilCurve({ family, seed: 7, points: 200 });
      expect(d).toMatch(/^M /);
      expect(d.length).toBeGreaterThan(50);
    }
  });

  it("same seed + family → same path", () => {
    const a = sigilCurve({ family: "rose", seed: 100, points: 300 });
    const b = sigilCurve({ family: "rose", seed: 100, points: 300 });
    expect(a).toBe(b);
  });

  it("clamps point counts to [20, 5000]", () => {
    expect(sigilCurve({ family: "rose", seed: 1, points: 10 }).length).toBeGreaterThan(0);
    expect(sigilCurve({ family: "rose", seed: 1, points: 50_000 }).length).toBeGreaterThan(0);
  });
});

describe("spareLetters", () => {
  it("strips vowels then dedupes", () => {
    expect(spareLetters("I want a quiet mind")).toEqual([
      "W", "N", "T", "Q", "M", "D",
    ]);
  });

  it("normalises case + ignores punctuation", () => {
    expect(spareLetters("Wax, Wane!")).toEqual(["W", "X", "N"]);
  });

  it("empty intention yields empty array", () => {
    expect(spareLetters("")).toEqual([]);
    expect(spareLetters("aeiou")).toEqual([]);
  });
});

describe("sigilGlyph", () => {
  it("renders a polyline through letter centroids", () => {
    const out = sigilGlyph("Make this real");
    expect(out.letters.length).toBeGreaterThan(0);
    expect(out.d).toMatch(/^M /);
    expect(out.points.length).toBe(out.letters.length);
  });

  it("empty intention returns empty path", () => {
    const out = sigilGlyph("");
    expect(out.d).toBe("");
    expect(out.letters).toEqual([]);
  });
});

describe("sigilKamea", () => {
  it("traces gematria digits through the Saturn square", () => {
    const saturn = planetarySquare("saturn").cells;
    const out = sigilKamea(saturn, [1, 5, 9]);
    expect(out.sequence).toHaveLength(3);
    expect(out.d).toMatch(/^M /);
  });

  it("ignores values not present in the square", () => {
    const saturn = planetarySquare("saturn").cells;
    const out = sigilKamea(saturn, [99, 100, 5]);
    // Only 5 is in the 3×3 — sequence has one entry.
    expect(out.sequence).toHaveLength(1);
  });

  it("empty sequence yields empty path", () => {
    const saturn = planetarySquare("saturn").cells;
    const out = sigilKamea(saturn, []);
    expect(out.d).toBe("");
  });
});

// ─── Geometry ─────────────────────────────────────────────────────

describe("nameRingPath", () => {
  it("returns the circumference = 2π·r", () => {
    const r = nameRingPath(100);
    expect(r.circumference).toBeCloseTo(2 * Math.PI * 100);
  });

  it("path begins at the top of the circle (12 o'clock)", () => {
    const r = nameRingPath(50, 0, 0);
    expect(r.d.startsWith("M 0 -50")).toBe(true);
  });

  it("supports negative radius without crashing (abs)", () => {
    const r = nameRingPath(-30);
    expect(r.circumference).toBeCloseTo(2 * Math.PI * 30);
  });
});

describe("centreSymbol", () => {
  it("pentagram has a star + a surrounding circle aux", () => {
    const s = centreSymbol("pentagram", 0, 0, 50);
    expect(s.d).toContain("M ");
    expect(s.auxD).toBeDefined();
  });

  it("hexagram is two interlocked triangles, no aux", () => {
    const s = centreSymbol("hexagram", 0, 0, 50);
    expect(s.d.match(/M /g)?.length).toBe(2);
    expect(s.auxD).toBeUndefined();
  });

  it("unicursal is a single continuous path", () => {
    const s = centreSymbol("unicursal", 0, 0, 50);
    expect(s.d.match(/M /g)?.length).toBe(1);
  });

  it("solomonic carries a surrounding circle aux", () => {
    const s = centreSymbol("solomonic", 0, 0, 50);
    expect(s.auxD).toBeDefined();
  });

  it("blank returns empty d", () => {
    expect(centreSymbol("blank").d).toBe("");
  });
});

describe("printTiles", () => {
  it("a small (200×200mm) source fits in a single A4 tile", () => {
    const r = printTiles(200, 200);
    expect(r.tiles).toHaveLength(1);
    expect(r.tiles[0]!.label).toBe("T1");
  });

  it("a large (500×500mm) source spans multiple tiles", () => {
    const r = printTiles(500, 500);
    expect(r.tiles.length).toBeGreaterThan(1);
  });

  it("tiles are labelled T1..Tn in row-major order", () => {
    const r = printTiles(400, 400);
    expect(r.tiles[0]!.label).toBe("T1");
    expect(r.tiles[r.tiles.length - 1]!.label).toBe(`T${r.tiles.length}`);
  });

  it("calibrationOnT1 is true when source ≥ 100mm wide", () => {
    expect(printTiles(150, 150).calibrationOnT1).toBe(true);
    expect(printTiles(50, 50).calibrationOnT1).toBe(false);
  });

  it("tile dimensions equal A4 portrait (210 × 297 mm)", () => {
    const r = printTiles(300, 300);
    expect(r.tiles[0]!.width).toBe(210);
    expect(r.tiles[0]!.height).toBe(297);
  });
});
