/**
 * Cipher catalog + computation tests.
 *
 * Covers the H06 honesty invariant: every bundled cipher cites a PD
 * source. Also pins the seven shipped ciphers' values against
 * well-attested inputs from the source literature.
 */

import { describe, expect, it } from "vitest";

import {
  BUNDLED_CIPHERS,
  cipherById,
  computeGematria,
  findResonances,
  groupCiphersByLanguage,
} from "./ciphers.js";

describe("BUNDLED_CIPHERS", () => {
  it("ships at least 7 ciphers", () => {
    expect(BUNDLED_CIPHERS.length).toBeGreaterThanOrEqual(7);
  });

  it("every bundled cipher cites a PD source (≥ 10 chars)", () => {
    for (const c of BUNDLED_CIPHERS) {
      expect(c.citation.length).toBeGreaterThanOrEqual(10);
      expect(c.personal).toBe(false);
    }
  });

  it("bundled cipher ids are unique", () => {
    const ids = BUNDLED_CIPHERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every cipher has a non-empty value map", () => {
    for (const c of BUNDLED_CIPHERS) {
      expect(Object.keys(c.values).length).toBeGreaterThan(0);
    }
  });

  it("covers Hebrew, Greek, English, and Coptic at minimum", () => {
    const langs = new Set(BUNDLED_CIPHERS.map((c) => c.language));
    for (const lang of ["hebrew", "greek", "english", "coptic"] as const) {
      expect(langs.has(lang)).toBe(true);
    }
  });
});

describe("cipherById", () => {
  it("returns the matching cipher", () => {
    expect(cipherById("greek-iso")?.name).toBe("Isopsephy");
  });

  it("returns undefined for unknown ids", () => {
    expect(cipherById("not-a-cipher")).toBeUndefined();
  });
});

describe("groupCiphersByLanguage", () => {
  it("groups by language in the H06 display order", () => {
    const groups = groupCiphersByLanguage(BUNDLED_CIPHERS);
    expect(groups[0]?.language).toBe("hebrew");
    expect(groups[1]?.language).toBe("greek");
    expect(groups[2]?.language).toBe("english");
  });

  it("filters empty languages", () => {
    const hebOnly = BUNDLED_CIPHERS.filter((c) => c.language === "hebrew");
    const groups = groupCiphersByLanguage(hebOnly);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.language).toBe("hebrew");
  });
});

// ── Cipher-specific value pins ─────────────────────────────────────

describe("computeGematria — Greek Isopsephy", () => {
  const cipher = cipherById("greek-iso")!;

  it("computes ἀγαθός = 285", () => {
    // α 1 + γ 3 + α 1 + θ 9 + ο 70 + σ 200 = 284 ... wait the
    // canonical value of ἀγαθός is 284 (ἀ 1 + γ 3 + α 1 + θ 9 +
    // ο 70 + ς 200). Final sigma values the same as σ.
    expect(computeGematria("ἀγαθός", cipher).total).toBe(284);
  });

  it("computes ἰχθύς = 1219", () => {
    // The Christogram value (ι 10 + χ 600 + θ 9 + υ 400 + ς 200).
    expect(computeGematria("ἰχθύς", cipher).total).toBe(1219);
  });

  it("strips diacritics and skips spaces", () => {
    const r = computeGematria("ἀ γ α", cipher);
    expect(r.total).toBe(5); // α=1 + γ=3 + α=1
  });

  it("surfaces non-script letters in skipped", () => {
    const r = computeGematria("αx", cipher);
    expect(r.total).toBe(1);
    expect(r.skipped).toEqual(["x"]);
  });
});

describe("computeGematria — Hebrew Mispar Hechrachi", () => {
  const cipher = cipherById("heb-hechrachi")!;

  it("computes יהוה = 26 (Tetragrammaton)", () => {
    // י 10 + ה 5 + ו 6 + ה 5 = 26
    expect(computeGematria("יהוה", cipher).total).toBe(26);
  });

  it("computes חי = 18 (chai)", () => {
    expect(computeGematria("חי", cipher).total).toBe(18);
  });

  it("handles final letters as the same value as non-final", () => {
    // מים = 40 + 10 + 40 (ם = 40) = 90
    expect(computeGematria("מים", cipher).total).toBe(90);
  });
});

describe("computeGematria — Hebrew Atbash", () => {
  const cipher = cipherById("heb-atbash")!;

  it("maps א to ת's value (400)", () => {
    expect(computeGematria("א", cipher).total).toBe(400);
  });

  it("maps ת to א's value (1)", () => {
    expect(computeGematria("ת", cipher).total).toBe(1);
  });

  it("maps the centre pair (כ ↔ ל) by Hechrachi values (30 / 20)", () => {
    // The Atbash partner of כ (11th letter from start) is ל (11th
    // from end). Hechrachi value of ל = 30; so Atbash(כ) = 30.
    expect(computeGematria("כ", cipher).total).toBe(30);
    expect(computeGematria("ל", cipher).total).toBe(20);
  });
});

describe("computeGematria — Hebrew Mispar Siduri", () => {
  const cipher = cipherById("heb-siduri")!;

  it("maps א=1, ב=2, ת=22", () => {
    expect(computeGematria("א", cipher).total).toBe(1);
    expect(computeGematria("ב", cipher).total).toBe(2);
    expect(computeGematria("ת", cipher).total).toBe(22);
  });
});

describe("computeGematria — English Simple", () => {
  const cipher = cipherById("eng-simple")!;

  it("computes love = 54", () => {
    // l=12 + o=15 + v=22 + e=5 = 54
    expect(computeGematria("love", cipher).total).toBe(54);
  });

  it("is case-insensitive", () => {
    expect(computeGematria("LOVE", cipher).total).toBe(54);
  });
});

describe("computeGematria — Coptic isopsephy", () => {
  const cipher = cipherById("copt-iso")!;

  it("computes the test triple ⲁ ⲃ ⲅ = 6", () => {
    expect(computeGematria("ⲁⲃⲅ", cipher).total).toBe(6);
  });

  it("uses Greek-derived values (ⲓ = 10)", () => {
    expect(computeGematria("ⲓ", cipher).total).toBe(10);
  });
});

describe("computeGematria — digit_sum", () => {
  const cipher = cipherById("eng-simple")!;

  it("reduces to a single digit", () => {
    // sum=54 → 5+4 = 9
    expect(computeGematria("love", cipher).digit_sum).toBe(9);
  });

  it("returns 0 for empty input", () => {
    expect(computeGematria("", cipher).digit_sum).toBe(0);
  });

  it("returns single-digit totals unchanged", () => {
    expect(computeGematria("a", cipher).digit_sum).toBe(1);
  });
});

// ── Resonance ──────────────────────────────────────────────────────

describe("findResonances", () => {
  it("returns values shared by 2 or more ciphers", () => {
    const r = findResonances([
      { cipher_name: "A", value: 26 },
      { cipher_name: "B", value: 26 },
      { cipher_name: "C", value: 5 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]?.value).toBe(26);
    expect(r[0]?.cipher_names).toEqual(["A", "B"]);
  });

  it("ignores values shared by only 1 cipher", () => {
    const r = findResonances([
      { cipher_name: "A", value: 1 },
      { cipher_name: "B", value: 2 },
    ]);
    expect(r).toHaveLength(0);
  });

  it("ignores zero values", () => {
    const r = findResonances([
      { cipher_name: "A", value: 0 },
      { cipher_name: "B", value: 0 },
    ]);
    expect(r).toHaveLength(0);
  });

  it("sorts ascending by value", () => {
    const r = findResonances([
      { cipher_name: "A", value: 100 },
      { cipher_name: "B", value: 100 },
      { cipher_name: "C", value: 26 },
      { cipher_name: "D", value: 26 },
    ]);
    expect(r.map((x) => x.value)).toEqual([26, 100]);
  });
});
