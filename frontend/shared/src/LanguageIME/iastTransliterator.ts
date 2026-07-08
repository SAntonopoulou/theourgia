/**
 * IAST Sanskrit romanization transducer.
 *
 * b108-2gz · FEATURES §7 — "romanization-to-script autocompletion".
 *
 * Maps ASCII Sanskrit conventions to Unicode IAST diacritics. The
 * table is intentionally small + explicit — anything not matched
 * passes through verbatim. Sequences are applied longest-first so
 * "aa" beats "a".
 *
 * Convention: type ASCII on the left, get IAST on the right.
 *
 *   aa → ā       ii → ī       uu → ū
 *   .r → ṛ       .l → ḷ       .rr → ṝ     .ll → ḹ
 *   .n → ṇ       .t → ṭ       .d → ḍ
 *   ~n → ñ       .m → ṃ       .h → ḥ
 *   "n → ṅ
 *   s' → ś       .s → ṣ
 *   OM → oṁ
 */

export type IastInputRule = {
  pattern: string;
  replacement: string;
};

// Ordered longest-first so multi-char sequences beat shorter prefixes.
export const IAST_RULES: readonly IastInputRule[] = [
  { pattern: ".rr", replacement: "ṝ" },
  { pattern: ".ll", replacement: "ḹ" },
  { pattern: "aa", replacement: "ā" },
  { pattern: "ii", replacement: "ī" },
  { pattern: "uu", replacement: "ū" },
  { pattern: ".r", replacement: "ṛ" },
  { pattern: ".l", replacement: "ḷ" },
  { pattern: ".n", replacement: "ṇ" },
  { pattern: ".t", replacement: "ṭ" },
  { pattern: ".d", replacement: "ḍ" },
  { pattern: ".m", replacement: "ṃ" },
  { pattern: ".h", replacement: "ḥ" },
  { pattern: "~n", replacement: "ñ" },
  { pattern: '"n', replacement: "ṅ" },
  { pattern: ".s", replacement: "ṣ" },
  { pattern: "s'", replacement: "ś" },
  { pattern: "OM", replacement: "oṁ" },
];

/**
 * Applies IAST rules to a full string. Non-matching characters pass
 * through. Rules are checked in order so first-listed wins where
 * patterns overlap (e.g. ".rr" beats ".r" beats "r").
 */
export function transliterateIast(input: string): string {
  let output = "";
  let i = 0;
  while (i < input.length) {
    let matched: IastInputRule | null = null;
    for (const rule of IAST_RULES) {
      if (input.startsWith(rule.pattern, i)) {
        matched = rule;
        break;
      }
    }
    if (matched) {
      output += matched.replacement;
      i += matched.pattern.length;
    } else {
      output += input[i];
      i += 1;
    }
  }
  return output;
}
