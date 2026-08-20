import { describe, expect, it } from "vitest";

import { type ScriptSpan, isRiteEmpty, parseRite, spokenOnly } from "./riteScript.js";

/** Terse helpers so the expectations read like the rite. */
const spoken = (text: string, emphasised = false): ScriptSpan => ({
  kind: "spoken",
  text,
  emphasised,
});
const instruction = (text: string): ScriptSpan => ({ kind: "instruction", text });

describe("parseRite — the marks", () => {
  it("reads a `#` line as a heading, hashes and space stripped", () => {
    expect(parseRite("# The Qabalistic Cross")).toEqual([
      { kind: "heading", text: "The Qabalistic Cross" },
    ]);
    expect(parseRite("###  Banishing")).toEqual([{ kind: "heading", text: "Banishing" }]);
  });

  it("keeps a blank line as a break, not collapsed", () => {
    const blocks = parseRite("Say this\n\nthen this");
    expect(blocks.map((b) => b.kind)).toEqual(["line", "break", "line"]);
  });

  it("reads `(…)` as an instruction and the rest as spoken", () => {
    expect(parseRite("(face East) Great is Isis")).toEqual([
      { kind: "line", spans: [instruction("face East"), spoken(" Great is Isis")] },
    ]);
  });

  it("reads `*word*` as vibrated emphasis inside the spoken run", () => {
    expect(parseRite("I call upon *ΙΑΩ*")).toEqual([
      { kind: "line", spans: [spoken("I call upon "), spoken("ΙΑΩ", true)] },
    ]);
  });

  it("keeps nested parens inside the instruction, not a second one", () => {
    expect(parseRite("(turn (slowly)) widdershins")).toEqual([
      { kind: "line", spans: [instruction("turn (slowly)"), spoken(" widdershins")] },
    ]);
  });

  it("runs an unclosed paren to the end of the line as an instruction", () => {
    expect(parseRite("(raise the dagger")).toEqual([
      { kind: "line", spans: [instruction("raise the dagger")] },
    ]);
  });

  it("leaves an unmatched asterisk as a literal asterisk", () => {
    expect(parseRite("five * five")).toEqual([{ kind: "line", spans: [spoken("five * five")] }]);
  });

  it("leaves polytonic Greek exactly as typed", () => {
    const line = "ἀγαθὴ τύχη";
    const blocks = parseRite(line);
    expect(blocks).toEqual([{ kind: "line", spans: [spoken(line)] }]);
  });
});

describe("spokenOnly / isRiteEmpty", () => {
  it("strips instructions, headings and breaks to the words alone", () => {
    const script = "# Cross\n(touch the brow) Unto Thee\n\n(touch the breast) the Kingdom";
    expect(spokenOnly(script)).toBe("Unto Thee\nthe Kingdom");
  });

  it("treats whitespace-only as empty", () => {
    expect(isRiteEmpty("   \n\t")).toBe(true);
    expect(isRiteEmpty("a")).toBe(false);
  });
});
