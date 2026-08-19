import { describe, expect, it } from "vitest";
import { packToCiphers } from "./packCiphers.js";

const GREEK_PAYLOAD = {
  kind: "gematria-systems",
  items: [
    {
      id: "greek-milesian",
      name: "Isopsephy",
      script: "Ἑλληνικά",
      methods: [{ source: "Attested across antiquity. Public domain." }],
      tables: {
        default: { α: 1, β: 2, ω: 800 },
      },
    },
    {
      id: "hebrew",
      name: "Mispar Hechrachi",
      script: "עברית",
      tables: {
        default: { א: 1, ב: 2 },
        siduri: { א: 1, ב: 2 },
      },
    },
  ],
};

describe("packToCiphers", () => {
  it("maps each table to a cipher with the right language and values", () => {
    const ciphers = packToCiphers(GREEK_PAYLOAD);
    const greek = ciphers.find((c) => c.id === "pack:greek-milesian");
    expect(greek).toBeDefined();
    if (!greek) return;
    expect(greek.language).toBe("greek");
    expect(greek.values.α).toBe(1);
    expect(greek.values.ω).toBe(800);
    expect(greek.personal).toBe(false);
    expect(greek.citation).toContain("antiquity");
  });

  it("gives each named table its own cipher", () => {
    const ids = packToCiphers(GREEK_PAYLOAD).map((c) => c.id);
    expect(ids).toContain("pack:hebrew"); // default
    expect(ids).toContain("pack:hebrew:siduri"); // named
  });

  it("infers hebrew from the id", () => {
    const heb = packToCiphers(GREEK_PAYLOAD).find((c) => c.id === "pack:hebrew");
    expect(heb?.language).toBe("hebrew");
  });

  it("a malformed payload yields no ciphers, never throws", () => {
    expect(packToCiphers(null)).toEqual([]);
    expect(packToCiphers({ items: "nope" })).toEqual([]);
    expect(packToCiphers({ items: [{ id: "x" }] })).toEqual([]); // no tables
  });
});
