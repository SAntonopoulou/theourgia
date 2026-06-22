import { describe, expect, it } from "vitest";

import {
  HEX_NAMES_CN,
  HEX_NAMES_EN,
  HEX_NAMES_PINYIN,
  KING_WEN,
  type LineValue,
  TRIGRAMS,
  castLine,
  castSixLines,
  hexagramName,
  hexagramNumber,
  isChanging,
  isYang,
  lowerTrigram,
  transformation,
  trigramComposition,
  upperTrigram,
} from "./engine.js";

// ─── Line predicates ──────────────────────────────────────────────

describe("line predicates", () => {
  it("isYang: 7 and 9 are yang; 6 and 8 are yin", () => {
    expect(isYang(7)).toBe(true);
    expect(isYang(9)).toBe(true);
    expect(isYang(6)).toBe(false);
    expect(isYang(8)).toBe(false);
  });

  it("isChanging: 6 and 9 change; 7 and 8 are stable", () => {
    expect(isChanging(6)).toBe(true);
    expect(isChanging(9)).toBe(true);
    expect(isChanging(7)).toBe(false);
    expect(isChanging(8)).toBe(false);
  });
});

// ─── Trigram tables ───────────────────────────────────────────────

describe("trigram tables", () => {
  it("TRIGRAMS has 8 entries with glyphs", () => {
    expect(TRIGRAMS).toHaveLength(8);
    const glyphs = TRIGRAMS.map((t) => t.glyph).join("");
    expect(glyphs).toBe("☷☳☵☱☶☲☴☰");
  });

  it("KING_WEN has 8 rows × 8 columns covering all 64 hexagrams", () => {
    const keys = Object.keys(KING_WEN);
    expect(keys).toHaveLength(8);
    const allNumbers = new Set<number>();
    for (const key of keys) {
      const row = KING_WEN[key]!;
      expect(row).toHaveLength(8);
      for (const n of row) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(64);
        allNumbers.add(n);
      }
    }
    expect(allNumbers.size).toBe(64);
  });
});

// ─── Trigram resolution ───────────────────────────────────────────

describe("lowerTrigram + upperTrigram", () => {
  // Hexagram 1 "The Creative" / Qian — six yang lines.
  const allYang: LineValue[] = [7, 7, 7, 7, 7, 7];
  // Hexagram 2 "The Receptive" / Kun — six yin lines.
  const allYin: LineValue[] = [8, 8, 8, 8, 8, 8];

  it("Qian over Qian — both trigrams are Heaven", () => {
    expect(lowerTrigram(allYang).name).toBe("Qian");
    expect(upperTrigram(allYang).name).toBe("Qian");
  });

  it("Kun over Kun — both trigrams are Earth", () => {
    expect(lowerTrigram(allYin).name).toBe("Kun");
    expect(upperTrigram(allYin).name).toBe("Kun");
  });
});

// ─── Hexagram resolution ──────────────────────────────────────────

describe("hexagramNumber", () => {
  it("all yang (Qian/Qian) = #1 The Creative", () => {
    expect(hexagramNumber([7, 7, 7, 7, 7, 7])).toBe(1);
  });

  it("all yin (Kun/Kun) = #2 The Receptive", () => {
    expect(hexagramNumber([8, 8, 8, 8, 8, 8])).toBe(2);
  });

  it("Earth over Heaven = #11 Tai (Peace)", () => {
    // Lower = Qian (yang yang yang), Upper = Kun (yin yin yin)
    expect(hexagramNumber([7, 7, 7, 8, 8, 8])).toBe(11);
  });

  it("Heaven over Earth = #12 Pi (Standstill)", () => {
    expect(hexagramNumber([8, 8, 8, 7, 7, 7])).toBe(12);
  });

  it("Fire over Water = #64 Wei Ji (Before Completion)", () => {
    // Lower = Kan (Water = yin yang yin = 0,1,0 = binary 2)
    // Upper = Li (Fire  = yang yin yang = 1,0,1 = binary 5)
    expect(hexagramNumber([8, 7, 8, 7, 8, 7])).toBe(64);
  });

  it("Water over Fire = #63 Ji Ji (After Completion)", () => {
    expect(hexagramNumber([7, 8, 7, 8, 7, 8])).toBe(63);
  });

  it("rejects line arrays of wrong length", () => {
    expect(() => hexagramNumber([7, 7, 7] as LineValue[])).toThrow(
      /exactly 6 lines/,
    );
  });

  it("the old yin / old yang variants resolve identically (the changing flag is separate)", () => {
    // 9 reads as yang for trigram resolution; 6 reads as yin.
    expect(hexagramNumber([9, 9, 9, 9, 9, 9])).toBe(1); // same as all 7s
    expect(hexagramNumber([6, 6, 6, 6, 6, 6])).toBe(2); // same as all 8s
  });
});

// ─── trigramComposition ───────────────────────────────────────────

describe("trigramComposition", () => {
  it("all yang renders as Heaven over Heaven", () => {
    expect(trigramComposition([7, 7, 7, 7, 7, 7])).toBe(
      "☰ Heaven over ☰ Heaven",
    );
  });

  it("yang lower / yin upper = Earth over Heaven", () => {
    expect(trigramComposition([7, 7, 7, 8, 8, 8])).toBe(
      "☷ Earth over ☰ Heaven",
    );
  });
});

// ─── transformation ───────────────────────────────────────────────

describe("transformation", () => {
  it("no changing lines → relating = primary", () => {
    const lines: LineValue[] = [7, 7, 7, 7, 7, 7];
    const t = transformation(lines);
    expect(t.changingLines).toEqual([]);
    expect(t.relating).toBe(hexagramNumber(lines));
  });

  it("a single 9 (old yang) flips that line to 8 (young yin)", () => {
    // Primary: [7,7,9,7,7,7] = Qian/Qian = #1; changing line 2.
    // Relating: [7,7,8,7,7,7] — upper trigram unchanged, lower
    // becomes [7,7,8] = Dui (Lake) yes? Lower binary: y(7)+2y(7)+4y(8)
    // = 1+2+0 = 3 → Dui. Upper Qian (Heaven). KW.Dui[Qian] = first col = 10.
    const lines: LineValue[] = [7, 7, 9, 7, 7, 7];
    const t = transformation(lines);
    expect(t.changingLines).toEqual([2]);
    expect(t.relating).toBe(10);
  });

  it("captures the indexes of every changing line", () => {
    const lines: LineValue[] = [9, 7, 6, 8, 9, 6];
    const t = transformation(lines);
    expect(t.changingLines).toEqual([0, 2, 4, 5]);
  });
});

// ─── Hexagram names ──────────────────────────────────────────────

describe("hexagramName", () => {
  it("returns CN + Pinyin + English for #1", () => {
    expect(hexagramName(1)).toEqual({
      number: 1,
      chinese: "乾",
      pinyin: "Qián",
      english: "The Creative",
    });
  });

  it("returns the difficult hexagrams without recolouring (#23, #36)", () => {
    // H04 §S3.1 — the chrome must never tint these red; the meaning
    // carries the difficulty. Names ship with their traditional
    // resonance ("Splitting Apart", "Darkening of the Light").
    expect(hexagramName(23).english).toBe("Splitting Apart");
    expect(hexagramName(36).english).toBe("Darkening of the Light");
  });

  it("rejects out-of-range King-Wen numbers", () => {
    expect(() => hexagramName(0)).toThrow(/Invalid/);
    expect(() => hexagramName(65)).toThrow(/Invalid/);
  });

  it("HEX_NAMES_CN + PY + EN all have 65 entries (index 0 blank)", () => {
    expect(HEX_NAMES_CN).toHaveLength(65);
    expect(HEX_NAMES_PINYIN).toHaveLength(65);
    expect(HEX_NAMES_EN).toHaveLength(65);
    expect(HEX_NAMES_CN[0]).toBe("");
    expect(HEX_NAMES_PINYIN[0]).toBe("");
    expect(HEX_NAMES_EN[0]).toBe("");
  });
});

// ─── castLine + castSixLines ──────────────────────────────────────

describe("castLine", () => {
  it("coin: random() === 0 → all heads → 9 (old yang)", () => {
    // Three coins: each Math.random() < 0.5 → heads (1). 6 + 3 = 9.
    expect(castLine("coin", () => 0)).toBe(9);
  });

  it("coin: random() === 0.99 → all tails → 6 (old yin)", () => {
    expect(castLine("coin", () => 0.99)).toBe(6);
  });

  it("coin returns only values in {6,7,8,9}", () => {
    for (let seed = 0; seed < 50; seed++) {
      const v = castLine("coin");
      expect([6, 7, 8, 9]).toContain(v);
    }
  });

  it("yarrow boundary: r < 1/16 → 6", () => {
    expect(castLine("yarrow", () => 0)).toBe(6);
    expect(castLine("yarrow", () => 1 / 32)).toBe(6);
  });

  it("yarrow boundary: 1/16 ≤ r < 6/16 → 7", () => {
    expect(castLine("yarrow", () => 1 / 16)).toBe(7);
    expect(castLine("yarrow", () => 5.9 / 16)).toBe(7);
  });

  it("yarrow boundary: 6/16 ≤ r < 13/16 → 8", () => {
    expect(castLine("yarrow", () => 6 / 16)).toBe(8);
    expect(castLine("yarrow", () => 12.9 / 16)).toBe(8);
  });

  it("yarrow boundary: r ≥ 13/16 → 9", () => {
    expect(castLine("yarrow", () => 13 / 16)).toBe(9);
    expect(castLine("yarrow", () => 0.99)).toBe(9);
  });

  it("yarrow odds DIFFER from coin (the §S3.2 honesty rule)", () => {
    // Empirical test: count line distribution across 1600 casts
    // each. Yarrow should produce more 8s (7/16 ≈ 0.44) than coin
    // (3/8 = 0.375); fewer 9s; markedly fewer 6s.
    const N = 1600;
    let rng = 1;
    const lcg = () => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 4294967296;
    };
    const coinCount: Record<LineValue, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    const yarrowCount: Record<LineValue, number> = {
      6: 0,
      7: 0,
      8: 0,
      9: 0,
    };
    for (let i = 0; i < N; i++) coinCount[castLine("coin", lcg)] += 1;
    for (let i = 0; i < N; i++) yarrowCount[castLine("yarrow", lcg)] += 1;

    // 6's: coin ≈ 200 (12.5%), yarrow ≈ 100 (6.25%) — yarrow has
    // markedly fewer 6's.
    expect(coinCount[6]).toBeGreaterThan(yarrowCount[6]);
    // 8's: yarrow ≈ 700 (43.75%), coin ≈ 600 (37.5%) — yarrow has
    // more 8s.
    expect(yarrowCount[8]).toBeGreaterThan(coinCount[8]);
  });
});

describe("castSixLines", () => {
  it("returns exactly six lines", () => {
    expect(castSixLines("coin")).toHaveLength(6);
  });

  it("respects the supplied random source", () => {
    const sixteen9s = castSixLines("coin", () => 0);
    expect(sixteen9s.every((v) => v === 9)).toBe(true);
  });
});
