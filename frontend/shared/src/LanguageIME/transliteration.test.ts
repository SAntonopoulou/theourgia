import { describe, expect, it } from "vitest";
import { devanagariToIast, iastToDevanagari } from "./devanagari.js";
import {
  TRANSLITERATION_SCRIPTS,
  canTransliterate,
  readingName,
  toLatin,
  toScript,
} from "./phoneticInput.js";
import { library } from "./transliteration.js";

describe("the bundled schemes", () => {
  it("has a phonetic input scheme for every typed script (bar Sanskrit)", () => {
    for (const script of ["greek", "coptic", "hebrew", "arabic"]) {
      expect(library.phoneticFor(script), script).toBeDefined();
    }
  });

  it("has a scholarly reading for every script", () => {
    for (const script of TRANSLITERATION_SCRIPTS) {
      expect(library.readingFor(script), script).toBeDefined();
    }
  });
});

describe("toScript — romanized in, native out", () => {
  it("Greek, with the final sigma", () => {
    expect(toScript("greek", "theos")).toBe("θεος");
    expect(toScript("greek", "logos")).toBe("λογος");
    expect(toScript("greek", "sophia")).toBe("σοφια");
  });

  it("Greek breathing dropped, long vowels", () => {
    expect(toScript("greek", "hagia")).toBe("αγια");
    expect(toScript("greek", "w")).toBe("ω");
  });

  it("Coptic Demotic letters", () => {
    expect(toScript("coptic", "shai")).toBe("ϣⲁⲓ");
  });

  it("Hebrew unpointed with final forms", () => {
    expect(toScript("hebrew", "shlom")).toBe("שלום");
    expect(toScript("hebrew", "mlk")).toBe("מלך");
  });

  it("Arabic dotted emphatics", () => {
    expect(toScript("arabic", "salaam")).toBe("سلام");
    expect(toScript("arabic", ".sad")).toBe("صد");
  });

  it("Sanskrit hops through IAST into Devanagari", () => {
    expect(toScript("sanskrit", "mantram")).toBe("मन्त्रम्");
    expect(toScript("sanskrit", "k.r.s.na")).toBe("कृष्ण");
    expect(toScript("sanskrit", "OM")).toBe("ॐ");
  });

  it("an unknown script passes through", () => {
    expect(toScript("latin", "verbum")).toBe("verbum");
  });
});

describe("toLatin — native read back", () => {
  it("reads Greek back, folding accents", () => {
    expect(toLatin("greek", "θεός")).toBe("theos");
    expect(readingName("greek")).toBe("ALA-LC (Greek)");
  });

  it("reads Devanagari with inherent vowels restored", () => {
    expect(toLatin("sanskrit", "कृष्ण")).toBe("kṛṣṇa");
  });
});

describe("the Devanagari assembler and reader round-trip", () => {
  it("survives IAST → Devanagari → IAST", () => {
    for (const word of ["ka", "kṛṣṇa", "namaḥ", "mantram", "ki"]) {
      expect(devanagariToIast(iastToDevanagari(word)), word).toBe(word);
    }
  });
});

describe("canTransliterate", () => {
  it("knows the five scripts", () => {
    for (const s of TRANSLITERATION_SCRIPTS) expect(canTransliterate(s)).toBe(true);
    expect(canTransliterate("latin")).toBe(false);
  });
});
