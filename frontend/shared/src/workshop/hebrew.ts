/**
 * Hebrew gematria numerals — the labels rendered as small overlay
 * glyphs on each magic-square cell. Composes 1..400 directly + the
 * standard scribal substitutions for 15 (→ טו, not יה — avoids the
 * divine name YH) and 16 (→ טז, not יו — the same scribal courtesy
 * extends to YW).
 *
 * 500..900 use the 5 "sofit" / final-letter forms (ך ם ן ף ץ) but
 * Agrippa's magic squares never exceed 81, so we only need 1..81.
 * Higher values supported for general utility; flagged `final=true`
 * to let callers render the sofit variant when desired.
 *
 * Reference: Aryeh Kaplan, *Sefer Yetzirah: The Book of Creation*,
 * appendix B (1990); cross-checked against MathPazuzu, Stenring 1923.
 */

const ONES: readonly string[] = [
  "", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט",
];

const TENS: readonly string[] = [
  "", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ",
];

const HUNDREDS: readonly string[] = [
  "", "ק", "ר", "ש", "ת",
];

/** Hebrew numeral for `n` (1..999). Returns `""` for n <= 0.
 *
 *  Scribal substitutions:
 *  - 15 = 9 + 6 (טו) instead of 10 + 5 (יה — divine name YH).
 *  - 16 = 9 + 7 (טז) instead of 10 + 6 (יו — divine name YW).
 *
 *  For 100..499, hundreds compose with ק/ר/ש/ת directly; 500..900
 *  fall back to ת + smaller hundreds (תק = 500, תר = 600, …) which
 *  is the standard non-sofit composition. Returns `""` for n > 999.
 */
export function hebNum(n: number): string {
  if (!Number.isFinite(n)) return "";
  const v = Math.floor(n);
  if (v <= 0) return "";

  if (v === 15) return "טו";
  if (v === 16) return "טז";

  if (v >= 1000) return "";

  let h = Math.floor(v / 100);
  let t = Math.floor((v % 100) / 10);
  let o = v % 10;

  let s = "";

  if (h > 0) {
    if (h <= 4) {
      s += HUNDREDS[h]!;
    } else {
      // 500..900 → ת + remaining hundreds.
      let rem = h;
      while (rem >= 4) {
        s += "ת";
        rem -= 4;
      }
      if (rem > 0) s += HUNDREDS[rem]!;
    }
  }

  // Apply 15/16 substitutions inside the last two-digit cluster.
  const lowTwo = t * 10 + o;
  if (lowTwo === 15) {
    s += "טו";
    return s;
  }
  if (lowTwo === 16) {
    s += "טז";
    return s;
  }

  if (t > 0) s += TENS[t]!;
  if (o > 0) s += ONES[o]!;
  return s;
}
