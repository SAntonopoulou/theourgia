/**
 * Turning one script into another, both ways — the web half of the phone's
 * transliteration engine (practiseapp/lib/domain/linguistics/transliteration.dart).
 *
 * A scheme is an ordered list of `from → to` rules applied longest-match: the
 * longest `from` that matches at a position wins (`th→θ` beats `t→τ`); ties keep
 * authored order; anything unmatched passes through. Two directions:
 *   - latin_to_script — the input tool (type `theos`, get `θεος`), phonetic.
 *   - script_to_latin — tap-a-word reading (`θεός` → `theós`), scholarly.
 *
 * The tables live in the shared schemes.json — the SAME file the phone ships,
 * so a phone romanization and a web one agree. After a latin_to_script pass a
 * per-script finalize fixes Greek's final sigma and Hebrew's final forms.
 */

import schemesData from "./schemes.json" with { type: "json" };

export type TransliterationDirection = "latin_to_script" | "script_to_latin";

export interface TransliterationRule {
  from: string;
  to: string;
}

interface RawScheme {
  slug: string;
  script: string;
  direction: string;
  kind?: string;
  name: string;
  citation?: string;
  rules: TransliterationRule[];
}

// ── Per-script finalize ───────────────────────────────────────────────

const GREEK_MEDIAL_SIGMA = 0x03c3;
const GREEK_FINAL_SIGMA = 0x03c2;

function isGreekLetter(c: number): boolean {
  return (c >= 0x0370 && c <= 0x03ff) || (c >= 0x1f00 && c <= 0x1fff);
}

/** σ at a word's end becomes ς. */
function finalizeGreek(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === GREEK_MEDIAL_SIGMA) {
      const nextIsGreek = i + 1 < s.length && isGreekLetter(s.charCodeAt(i + 1));
      out += String.fromCharCode(nextIsGreek ? GREEK_MEDIAL_SIGMA : GREEK_FINAL_SIGMA);
    } else {
      out += s[i];
    }
  }
  return out;
}

const HEBREW_FINALS: Record<number, number> = {
  1499: 0x05da, // כ → ך
  1502: 0x05dd, // מ → ם
  1504: 0x05df, // נ → ן
  1508: 0x05e3, // פ → ף
  1510: 0x05e5, // צ → ץ
};

function isHebrewLetter(c: number): boolean {
  return c >= 0x05d0 && c <= 0x05ea;
}

/** The five letters with a distinct word-final shape. */
function finalizeHebrew(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const endOfWord = !(i + 1 < s.length && isHebrewLetter(s.charCodeAt(i + 1)));
    const mapped = endOfWord ? (HEBREW_FINALS[code] ?? code) : code;
    out += String.fromCharCode(mapped);
  }
  return out;
}

function finalize(script: string, s: string): string {
  if (script === "greek") return finalizeGreek(s);
  if (script === "hebrew") return finalizeHebrew(s);
  return s;
}

// ── The scheme and the library ────────────────────────────────────────

export class TransliterationScheme {
  readonly slug: string;
  readonly script: string;
  readonly direction: TransliterationDirection;
  readonly kind: string;
  readonly name: string;
  readonly citation: string;
  private readonly rules: TransliterationRule[];

  constructor(raw: RawScheme) {
    this.slug = raw.slug;
    this.script = raw.script;
    this.direction = raw.direction === "script_to_latin" ? "script_to_latin" : "latin_to_script";
    this.kind = raw.kind ?? "scholarly";
    this.name = raw.name;
    this.citation = raw.citation ?? "";
    // Stable longest-first: JS sort is stable, so ties keep authored order.
    this.rules = [...raw.rules].sort((a, b) => b.from.length - a.from.length);
  }

  apply(input: string): string {
    let out = "";
    let i = 0;
    while (i < input.length) {
      let matched: TransliterationRule | null = null;
      for (const rule of this.rules) {
        if (rule.from.length > 0 && input.startsWith(rule.from, i)) {
          matched = rule;
          break;
        }
      }
      if (matched) {
        out += matched.to;
        i += matched.from.length;
      } else {
        out += input[i];
        i += 1;
      }
    }
    return this.direction === "latin_to_script" ? finalize(this.script, out) : out;
  }
}

export class TransliterationLibrary {
  readonly schemes: TransliterationScheme[];

  constructor(raw: RawScheme[]) {
    this.schemes = raw.map((r) => new TransliterationScheme(r));
  }

  bySlug(slug: string): TransliterationScheme | undefined {
    return this.schemes.find((s) => s.slug === slug);
  }

  /** The input tool for a script: type romanized, get the script. */
  phoneticFor(script: string): TransliterationScheme | undefined {
    return this.schemes.find(
      (s) => s.script === script && s.kind === "phonetic" && s.direction === "latin_to_script",
    );
  }

  /** The scholarly readings (native → roman) for tap-a-word. */
  scholarlyFor(script: string): TransliterationScheme[] {
    return this.schemes.filter((s) => s.script === script && s.direction === "script_to_latin");
  }

  /** The default reading to show when a word is tapped. */
  readingFor(script: string): TransliterationScheme | undefined {
    return this.scholarlyFor(script)[0];
  }
}

/** The bundled library, from the shared schemes.json. */
export const library = new TransliterationLibrary(
  (schemesData as { schemes: RawScheme[] }).schemes,
);
