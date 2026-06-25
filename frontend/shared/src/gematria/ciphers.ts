/**
 * Gematria cipher catalog — H06 §S6.1 (Gematria Calculator) substrate.
 *
 * Extends the B97 Editor gematria engine (`Editor/nodes/GematriaNode.tsx`)
 * to a full catalog of ciphers across multiple scripts. Each cipher
 * carries provenance per the H06 citation honesty rule: every bundled
 * cipher cites the public-domain source it derives from. Custom
 * ciphers (practitioner-authored at runtime) ship marked
 * ``personal: true`` and are excluded from any future cross-vault
 * shared-study aggregation.
 *
 * The seven ciphers shipped here are all deterministically derivable
 * from PD sources or PD transforms:
 *
 *   1. Greek Isopsephy           — Classical letter values (PD; PGM-era)
 *   2. Greek Ordinal             — α=1..ω=24 transform of Isopsephy
 *   3. Hebrew Mispar Hechrachi   — Absolute value (PD; Sefer Yetzirah)
 *   4. Hebrew Mispar Siduri      — Ordinal א=1..ת=22 transform
 *   5. Hebrew Atbash             — Substitution cipher (PD; ancient)
 *   6. English Simple            — A=1..Z=26 ordinal (PD; convention)
 *   7. Coptic Isopsephy          — Coptic letter values (Greek-derived)
 *
 * Additional ciphers (Hebrew Mispar Gadol/Katan, Crowley ALW,
 * Arabic Abjad, Sanskrit Katapayadi) are queued for a follow-up
 * batch where the build side can verify each one against a
 * citable PD source — the project does not invent cipher data.
 */

export type CipherLanguage =
  | "greek"
  | "hebrew"
  | "english"
  | "coptic"
  | "arabic"
  | "sanskrit"
  | "custom";

export interface Cipher {
  /** Stable id used by the API + the picker UI. */
  id: string;
  /** Display name. */
  name: string;
  /** Source language family. */
  language: CipherLanguage;
  /** PD citation. Empty string ONLY for `personal: true` ciphers. */
  citation: string;
  /** When true, the cipher was authored by the practitioner and
   *  should NOT be aggregated into shared studies. */
  personal: boolean;
  /** Mapping from a *normalised* (lowercased, diacritics-stripped)
   *  character to its numeric value. Letters not in the map are
   *  skipped + surfaced in the breakdown. */
  values: Readonly<Record<string, number>>;
}

// ── Base mapping tables ──────────────────────────────────────────

const GREEK_ISO: Readonly<Record<string, number>> = {
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ϝ: 6, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϙ: 90, ϟ: 90,
  ρ: 100, σ: 200, ς: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700,
  ω: 800, ϡ: 900,
};

// Greek ordinal: α=1..ω=24, drop the obsolete digamma/koppa/sampi.
const GREEK_ORD: Readonly<Record<string, number>> = (() => {
  const letters = "αβγδεζηθικλμνξοπρστυφχψω";
  const m: Record<string, number> = {};
  Array.from(letters).forEach((ch, i) => {
    m[ch] = i + 1;
  });
  // Final sigma + alternative final shares the value of σ.
  m["ς"] = m["σ"]!;
  return m;
})();

const HEB_HECHRACHI: Readonly<Record<string, number>> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50,
  ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200,
  ש: 300, ת: 400,
};

// Hebrew Mispar Siduri (ordinal): א=1..ת=22. Final forms share their
// non-final partner's value.
const HEB_SIDURI: Readonly<Record<string, number>> = (() => {
  const order = "אבגדהוזחטיכלמנסעפצקרשת";
  const m: Record<string, number> = {};
  Array.from(order).forEach((ch, i) => {
    m[ch] = i + 1;
  });
  // Final forms mirror their non-final partners.
  m["ך"] = m["כ"]!;
  m["ם"] = m["מ"]!;
  m["ן"] = m["נ"]!;
  m["ף"] = m["פ"]!;
  m["ץ"] = m["צ"]!;
  return m;
})();

// Hebrew Atbash: substitution cipher (first letter ↔ last letter).
// Atbash value of a letter is the Hechrachi value of its Atbash partner.
const HEB_ATBASH: Readonly<Record<string, number>> = (() => {
  const order = "אבגדהוזחטיכלמנסעפצקרשת";
  const arr = Array.from(order);
  const m: Record<string, number> = {};
  arr.forEach((ch, i) => {
    const partner = arr[arr.length - 1 - i]!;
    m[ch] = HEB_HECHRACHI[partner] ?? 0;
  });
  // Final forms map to their partner's atbash value.
  m["ך"] = m["כ"]!;
  m["ם"] = m["מ"]!;
  m["ן"] = m["נ"]!;
  m["ף"] = m["פ"]!;
  m["ץ"] = m["צ"]!;
  return m;
})();

const ENG_SIMPLE: Readonly<Record<string, number>> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < 26; i++) {
    m[String.fromCharCode(97 + i)] = i + 1;
  }
  return m;
})();

// Coptic alphabet inherits the Greek isopsephic system. We map the
// Coptic codepoints to their Greek equivalents (faithful 1:1 to the
// classical Coptic numbering tradition).
const COPTIC_ISO: Readonly<Record<string, number>> = {
  ⲁ: 1, ⲃ: 2, ⲅ: 3, ⲇ: 4, ⲉ: 5, ⲋ: 6, ⲍ: 7, ⲏ: 8, ⲑ: 9,
  ⲓ: 10, ⲕ: 20, ⲗ: 30, ⲙ: 40, ⲛ: 50, ⲝ: 60, ⲟ: 70, ⲡ: 80,
  ϥ: 90, ⲣ: 100, ⲥ: 200, ⲧ: 300, ⲩ: 400, ⲫ: 500, ⲭ: 600,
  ⲯ: 700, ⲱ: 800, ϣ: 900, ϫ: 90,
};

// ── Bundled cipher catalog ────────────────────────────────────────

export const BUNDLED_CIPHERS: readonly Cipher[] = [
  {
    id: "greek-iso",
    name: "Isopsephy",
    language: "greek",
    citation:
      "Classical Greek isopsephy — attested across antiquity (e.g. PGM IV.3007). Public domain.",
    personal: false,
    values: GREEK_ISO,
  },
  {
    id: "greek-ord",
    name: "Ordinal",
    language: "greek",
    citation:
      "Ordinal transform of the Greek alphabet (α=1…ω=24). Convention; public domain.",
    personal: false,
    values: GREEK_ORD,
  },
  {
    id: "heb-hechrachi",
    name: "Mispar Hechrachi",
    language: "hebrew",
    citation:
      "Sefer Yetzirah 1:1 (c. 2nd-6th c. CE). Traditional absolute value. Public domain.",
    personal: false,
    values: HEB_HECHRACHI,
  },
  {
    id: "heb-siduri",
    name: "Mispar Siduri",
    language: "hebrew",
    citation:
      "Ordinal transform of the Hebrew alphabet (א=1…ת=22). Traditional kabbalistic method. Public domain.",
    personal: false,
    values: HEB_SIDURI,
  },
  {
    id: "heb-atbash",
    name: "Atbash",
    language: "hebrew",
    citation:
      "Hebrew substitution cipher attested in Jeremiah 25:26, 51:41. Public domain.",
    personal: false,
    values: HEB_ATBASH,
  },
  {
    id: "eng-simple",
    name: "Simple",
    language: "english",
    citation:
      "Convention: A=1…Z=26 ordinal. Public domain.",
    personal: false,
    values: ENG_SIMPLE,
  },
  {
    id: "copt-iso",
    name: "Coptic isopsephy",
    language: "coptic",
    citation:
      "Coptic letter values inherit the Greek isopsephic system. Public domain.",
    personal: false,
    values: COPTIC_ISO,
  },
] as const;

/** Return the bundled cipher with the given id, or undefined. */
export function cipherById(id: string): Cipher | undefined {
  return BUNDLED_CIPHERS.find((c) => c.id === id);
}

/** Group cipher list by language. The grouping order matches the
 *  H06 dc.html: Hebrew → Greek → English → Arabic → Sanskrit →
 *  Coptic. Languages with no shipped ciphers are omitted. */
const LANG_ORDER: CipherLanguage[] = [
  "hebrew",
  "greek",
  "english",
  "arabic",
  "sanskrit",
  "coptic",
  "custom",
];

export function groupCiphersByLanguage(
  ciphers: readonly Cipher[],
): { language: CipherLanguage; ciphers: Cipher[] }[] {
  const groups = new Map<CipherLanguage, Cipher[]>();
  for (const c of ciphers) {
    const list = groups.get(c.language) ?? [];
    list.push(c);
    groups.set(c.language, list);
  }
  return LANG_ORDER.filter((l) => groups.has(l)).map((l) => ({
    language: l,
    ciphers: groups.get(l)!,
  }));
}

// ── Computation ───────────────────────────────────────────────────

/** Per-letter breakdown of a word's value under a cipher. Letters
 *  not in the cipher's table are surfaced in ``skipped``. */
export interface GematriaBreakdown {
  /** Per-counted-letter pairs (letter, value). */
  parts: { letter: string; value: number }[];
  /** Letters in the input that the cipher doesn't map. */
  skipped: string[];
  /** Sum of every part's value. */
  total: number;
  /** Repeated digital-sum collapse (reduce to a single digit). */
  digit_sum: number;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ҃ͅ-҉]/g, "")
    .normalize("NFC");
}

function reduceToDigit(n: number): number {
  let v = Math.abs(n);
  while (v > 9) {
    v = String(v)
      .split("")
      .reduce((acc, c) => acc + Number(c), 0);
  }
  return v;
}

/** Compute the value of ``text`` under ``cipher``. */
export function computeGematria(
  text: string,
  cipher: Pick<Cipher, "values">,
): GematriaBreakdown {
  const chars = Array.from(normalise(text));
  const parts: { letter: string; value: number }[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const ch of chars) {
    if (ch.trim() === "") continue;
    const v = cipher.values[ch];
    if (v === undefined) {
      // Only flag letters (unicode L*) as skipped — punctuation and
      // numbers are silently ignored.
      if (/\p{L}/u.test(ch)) skipped.push(ch);
      continue;
    }
    parts.push({ letter: ch, value: v });
    total += v;
  }
  return {
    parts,
    skipped,
    total,
    digit_sum: reduceToDigit(total),
  };
}

// ── Cross-cipher resonance ────────────────────────────────────────

/** A value shared by two or more ciphers for the same input. */
export interface CipherResonance {
  value: number;
  /** Names of the ciphers that produced this value, in input order. */
  cipher_names: string[];
}

/** Find values that appear under two or more selected ciphers for
 *  the given input. The H06 surface shows the top 5 resonances. */
export function findResonances(
  results: readonly { cipher_name: string; value: number }[],
): CipherResonance[] {
  const byValue = new Map<number, string[]>();
  for (const r of results) {
    if (r.value <= 0) continue;
    const names = byValue.get(r.value) ?? [];
    names.push(r.cipher_name);
    byValue.set(r.value, names);
  }
  const resonances: CipherResonance[] = [];
  for (const [value, names] of byValue.entries()) {
    if (names.length >= 2) {
      resonances.push({ value, cipher_names: names });
    }
  }
  resonances.sort((a, b) => a.value - b.value);
  return resonances;
}

// Sanity guard: each bundled cipher non-empty values map.
for (const c of BUNDLED_CIPHERS) {
  if (Object.keys(c.values).length === 0) {
    throw new Error(`Bundled cipher ${c.id} has an empty values map.`);
  }
}
