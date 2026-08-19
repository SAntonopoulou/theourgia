import { describe, expect, it } from "vitest";

import {
  type CorpusRow,
  indexByValue,
  isWordCorpusPack,
  parseCorpusMeta,
  parseEntries,
  wordsForValue,
} from "./parseCorpus.js";

describe("isWordCorpusPack", () => {
  it("recognises a corpus by its .words. namespace", () => {
    expect(isWordCorpusPack({ id: "theourgia.words.greek-diorisis" })).toBe(true);
    expect(isWordCorpusPack({ id: "theourgia.numbers.greek" })).toBe(false);
  });
});

describe("parseCorpusMeta", () => {
  const payload = {
    kind: "gematria-word-lists",
    items: [
      {
        id: "greek-diorisis",
        name: "Ancient Greek",
        system: "greek-milesian",
        conventions: ["default/default", "default/dropped"],
        entries_asset: "assets/words/greek-diorisis.txt",
        count: 442272,
      },
    ],
  };

  it("reads the metadata item", () => {
    const meta = parseCorpusMeta(payload);
    expect(meta?.system).toBe("greek-milesian");
    expect(meta?.conventions).toEqual(["default/default", "default/dropped"]);
    expect(meta?.entriesAsset).toBe("assets/words/greek-diorisis.txt");
  });

  it("returns null without items or an entries asset", () => {
    expect(parseCorpusMeta({})).toBeNull();
    expect(parseCorpusMeta({ items: [{ id: "x" }] })).toBeNull();
  });

  it("defaults conventions to one when absent", () => {
    const meta = parseCorpusMeta({
      items: [{ id: "x", entries_asset: "a.json" }],
    });
    expect(meta?.conventions).toEqual(["default/default"]);
  });
});

describe("parseEntries", () => {
  it("reads the small JSON array-of-arrays form", () => {
    const text = JSON.stringify([
      ["अंत", "", "end/conclusion", 1, 60],
      ["अ", "", "un-, not", 1, 0],
    ]);
    const rows = parseEntries("assets/words/sanskrit.json", text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      word: "अंत",
      translit: "",
      gloss: "end/conclusion",
      count: 1,
      values: [60],
    });
  });

  it("reads the large TSV form with one value column per convention", () => {
    const text = ["α\tὅς\t\t10204\t1\t1", "ααατον\tἀάατος\t\t2\t423\t423"].join("\n");
    const rows = parseEntries("assets/words/greek-diorisis.txt", text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ word: "α", translit: "ὅς", count: 10204, values: [1, 1] });
    expect(rows[1]?.values).toEqual([423, 423]);
  });

  it("skips blank lines and word-less rows", () => {
    const text = "α\t\t\t1\t1\n\n\t\t\t1\t2\n";
    expect(parseEntries("x.txt", text)).toHaveLength(1);
  });

  it("sniffs JSON even when the name is misleading", () => {
    const rows = parseEntries("x.txt", '[["α","","",1,1]]');
    expect(rows[0]?.word).toBe("α");
  });
});

describe("indexByValue and wordsForValue", () => {
  const rows: CorpusRow[] = [
    { word: "αβ", translit: "", gloss: "", count: 3, values: [3, 3] },
    { word: "βα", translit: "", gloss: "", count: 9, values: [3, 3] },
    { word: "γ", translit: "", gloss: "", count: 1, values: [3, 99] },
    { word: "δ", translit: "", gloss: "", count: 1, values: [4, 4] },
  ];

  it("indexes by the value of the chosen convention", () => {
    const idx0 = indexByValue(rows, 0);
    expect(
      idx0
        .get(3)
        ?.map((r) => r.word)
        .sort(),
    ).toEqual(["αβ", "βα", "γ"]);
    // Under the second convention γ is 99, so it leaves the 3-bucket.
    const idx1 = indexByValue(rows, 1);
    expect(
      idx1
        .get(3)
        ?.map((r) => r.word)
        .sort(),
    ).toEqual(["αβ", "βα"]);
  });

  it("returns matches most-attested first", () => {
    const idx = indexByValue(rows, 0);
    const match = wordsForValue(idx, 3);
    expect(match.total).toBe(3);
    expect(match.rows.map((r) => r.word)).toEqual(["βα", "αβ", "γ"]);
    expect(match.truncated).toBe(false);
  });

  it("caps and flags truncation", () => {
    const idx = indexByValue(rows, 0);
    const match = wordsForValue(idx, 3, 2);
    expect(match.rows).toHaveLength(2);
    expect(match.truncated).toBe(true);
    expect(match.total).toBe(3);
  });

  it("returns an empty match for a value nothing reaches", () => {
    const idx = indexByValue(rows, 0);
    expect(wordsForValue(idx, 777).total).toBe(0);
  });
});
