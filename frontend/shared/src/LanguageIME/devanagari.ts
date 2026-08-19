/**
 * Devanagari from IAST, and back — the web mirror of the phone's
 * practiseapp/lib/domain/linguistics/devanagari.dart.
 *
 * Devanagari is syllabic: a consonant carries an inherent 'a' (क="ka"), another
 * vowel is a sign (कि="ki"), a bare consonant needs a virama (क्="k"), and
 * consonants with no vowel between them stack (क्ष). So Sanskrit input flows
 * roman → IAST → the assembler here; tap-a-word reads Devanagari back with the
 * inherent 'a' restored.
 */

const VIRAMA = "्"; // ्

// Consonant base letters — each already carries the inherent 'a'.
const BASE: Record<string, string> = {
  k: "क",
  kh: "ख",
  g: "ग",
  gh: "घ",
  ṅ: "ङ",
  c: "च",
  ch: "छ",
  j: "ज",
  jh: "झ",
  ñ: "ञ",
  ṭ: "ट",
  ṭh: "ठ",
  ḍ: "ड",
  ḍh: "ढ",
  ṇ: "ण",
  t: "त",
  th: "थ",
  d: "द",
  dh: "ध",
  n: "न",
  p: "प",
  ph: "फ",
  b: "ब",
  bh: "भ",
  m: "म",
  y: "य",
  r: "र",
  l: "ल",
  v: "व",
  ś: "श",
  ṣ: "ष",
  s: "स",
  h: "ह",
};

// Independent vowels — the syllable-initial forms.
const INDEPENDENT: Record<string, string> = {
  a: "अ",
  ā: "आ",
  i: "इ",
  ī: "ई",
  u: "उ",
  ū: "ऊ",
  ṛ: "ऋ",
  ṝ: "ॠ",
  ḷ: "ऌ",
  ḹ: "ॡ",
  e: "ए",
  ai: "ऐ",
  o: "ओ",
  au: "औ",
};

// Vowel signs (matras) — hung on the preceding consonant. 'a' has none.
const MATRA: Record<string, string> = {
  ā: "ा",
  i: "ि",
  ī: "ी",
  u: "ु",
  ū: "ू",
  ṛ: "ृ",
  ṝ: "ॄ",
  ḷ: "ॢ",
  ḹ: "ॣ",
  e: "े",
  ai: "ै",
  o: "ो",
  au: "ौ",
};

const SPECIAL: Record<string, string> = {
  ṃ: "ं", // anusvara
  ṁ: "ं", // the OM-style anusvara
  ḥ: "ः", // visarga
  m̐: "ँ", // candrabindu
};

type Cat = "consonant" | "vowel" | "special";
interface Phoneme {
  s: string;
  cat: Cat;
}

// All phonemes, longest-first so 'kh' beats 'k', 'ai' beats 'a'.
const PHONEMES: Phoneme[] = [
  ...Object.keys(BASE).map((s): Phoneme => ({ s, cat: "consonant" })),
  ...Object.keys(INDEPENDENT).map((s): Phoneme => ({ s, cat: "vowel" })),
  ...Object.keys(SPECIAL).map((s): Phoneme => ({ s, cat: "special" })),
].sort((a, b) => b.s.length - a.s.length);

interface Token {
  s: string;
  cat: Cat | "other";
}

function tokenize(iast: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < iast.length) {
    let matched: Phoneme | null = null;
    for (const ph of PHONEMES) {
      if (iast.startsWith(ph.s, i)) {
        matched = ph;
        break;
      }
    }
    if (matched) {
      tokens.push(matched);
      i += matched.s.length;
    } else {
      tokens.push({ s: iast[i] ?? "", cat: "other" });
      i += 1;
    }
  }
  return tokens;
}

/** Turn an IAST string into Devanagari. */
export function iastToDevanagari(iast: string): string {
  const trimmed = iast.trim();
  if (trimmed === "oṁ" || trimmed === "oṃ" || trimmed === "auṁ") return "ॐ";

  const tokens = tokenize(iast);
  let out = "";
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === undefined) break;
    if (t.cat === "consonant") {
      out += BASE[t.s] ?? "";
      i++;
      const next = tokens[i];
      if (next !== undefined && next.cat === "vowel") {
        if (next.s !== "a") out += MATRA[next.s] ?? ""; // 'a' is inherent
        i++;
      } else {
        out += VIRAMA; // bare consonant or cluster join
      }
    } else if (t.cat === "vowel") {
      out += INDEPENDENT[t.s] ?? "";
      i++;
    } else if (t.cat === "special") {
      out += SPECIAL[t.s] ?? "";
      i++;
    } else {
      out += t.s;
      i++;
    }
  }
  return out;
}

// Reverse maps for the reader.
const CONSONANT_TO_IAST: Record<string, string> = Object.fromEntries(
  Object.entries(BASE).map(([k, v]) => [v, k]),
);
const MATRA_TO_IAST: Record<string, string> = Object.fromEntries(
  Object.entries(MATRA).map(([k, v]) => [v, k]),
);
const INDEPENDENT_TO_IAST: Record<string, string> = Object.fromEntries(
  Object.entries(INDEPENDENT).map(([k, v]) => [v, k]),
);
const SPECIAL_TO_IAST: Record<string, string> = {
  "ं": "ṃ",
  "ः": "ḥ",
  "ँ": "m̐",
};

/**
 * Read Devanagari back to IAST, restoring the inherent 'a' the flat table
 * cannot — a consonant sounds "ka" unless a sign or virama says otherwise.
 */
export function devanagariToIast(deva: string): string {
  let out = "";
  for (let i = 0; i < deva.length; i++) {
    const ch = deva[i];
    if (ch === undefined) continue;
    if (ch === "ॐ") {
      out += "oṁ";
      continue;
    }
    const cons = CONSONANT_TO_IAST[ch];
    if (cons !== undefined) {
      out += cons;
      const next = i + 1 < deva.length ? deva[i + 1] : undefined;
      const matra = next !== undefined ? MATRA_TO_IAST[next] : undefined;
      if (matra !== undefined) {
        out += matra;
        i++;
      } else if (next === VIRAMA) {
        i++; // bare consonant — no inherent vowel
      } else {
        out += "a"; // the inherent vowel sounds
      }
      continue;
    }
    const vowel = INDEPENDENT_TO_IAST[ch];
    if (vowel !== undefined) {
      out += vowel;
      continue;
    }
    const special = SPECIAL_TO_IAST[ch];
    if (special !== undefined) {
      out += special;
      continue;
    }
    if (ch === VIRAMA) continue;
    out += ch;
  }
  return out;
}
