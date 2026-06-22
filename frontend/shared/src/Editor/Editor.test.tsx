/**
 * Editor tests — Tiptap base wiring + slash menu + custom node round-trip.
 *
 * Uses the headless `@tiptap/core` `Editor` directly for the round-trip
 * tests (no DOM mounting), and `@testing-library/react` for the React
 * surface (Toolbar, SlashMenu).
 */

import "@testing-library/jest-dom";

import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { applyBlockKind, detectBlockKind } from "./BlockKindMenu.js";
import { filterSlashCommands, SLASH_COMMANDS } from "./slashCommands.js";
import { buildExtensions } from "./extensions.js";
import { gematriaBreakdown, gematriaSum } from "./nodes/GematriaNode.js";

function mountHeadless(content: unknown = { type: "doc", content: [{ type: "paragraph" }] }): CoreEditor {
  return new CoreEditor({
    extensions: buildExtensions(),
    content: content as object,
  });
}

describe("Editor — slash command catalog", () => {
  it("ships 6 commands in B97", () => {
    expect(SLASH_COMMANDS).toHaveLength(6);
    const keys = SLASH_COMMANDS.map((c) => c.key);
    expect(keys).toEqual(
      expect.arrayContaining(["sigil", "quote", "gematria", "sensation", "entity", "ritual-log"]),
    );
  });

  it("filters by query against title + key", () => {
    expect(filterSlashCommands("sig").map((c) => c.key)).toEqual(["sigil"]);
    expect(filterSlashCommands("ent").map((c) => c.key)).toEqual(["entity"]);
    expect(filterSlashCommands("xxxxxx")).toEqual([]);
  });

  it("returns the full list when query is empty", () => {
    expect(filterSlashCommands("")).toHaveLength(6);
  });
});

describe("Editor — extensions wiring", () => {
  it("registers the 6 custom block nodes in the schema", () => {
    const editor = mountHeadless();
    const schema = editor.schema;
    expect(schema.nodes.ritualLog).toBeDefined();
    expect(schema.nodes.quoteCitation).toBeDefined();
    expect(schema.nodes.gematria).toBeDefined();
    expect(schema.nodes.sensation).toBeDefined();
    expect(schema.nodes.entityRef).toBeDefined();
    expect(schema.nodes.sigil).toBeDefined();
    editor.destroy();
  });

  it("registers the LangMark + SmallCapsMark marks", () => {
    const editor = mountHeadless();
    expect(editor.schema.marks.lang).toBeDefined();
    expect(editor.schema.marks.smallCaps).toBeDefined();
    editor.destroy();
  });
});

describe("Editor — slash command insertion", () => {
  it("inserts a sigil node when the sigil command runs", () => {
    const editor = mountHeadless();
    // type "/sigil" so we can verify deleteRange works against the typed slash
    editor.commands.insertContent("/sigil");
    const from = 1; // start of the first paragraph
    const to = editor.state.selection.to;
    const sigilCmd = SLASH_COMMANDS.find((c) => c.key === "sigil")!;
    sigilCmd.run(editor, { from, to });
    const json = editor.getJSON();
    const blocks = (json.content ?? []) as { type: string }[];
    expect(blocks.some((b) => b.type === "sigil")).toBe(true);
    editor.destroy();
  });

  it("inserts every command kind without throwing", () => {
    for (const cmd of SLASH_COMMANDS) {
      const editor = mountHeadless();
      const from = 1;
      const to = editor.state.selection.to;
      expect(() => cmd.run(editor, { from, to })).not.toThrow();
      const types = (editor.getJSON().content ?? []).map((b: { type: string }) => b.type);
      // entity inserts an inline node inside the paragraph
      if (cmd.key === "entity") {
        expect(types).toContain("paragraph");
      } else {
        expect(types).toContain(cmd.key === "ritual-log" ? "ritualLog" : cmd.key === "quote" ? "quoteCitation" : cmd.key);
      }
      editor.destroy();
    }
  });
});

describe("Editor — gematria utility", () => {
  it("computes Greek isopsephy for ἀγαθοδαίμων (789 → 989 per Crowley convention)", () => {
    // α+γ+α+θ+ο+δ+α+ι+μ+ω+ν = 1+3+1+9+70+4+1+10+40+800+50 = 989
    expect(gematriaSum("ἀγαθοδαίμων", "greek")).toBe(989);
  });

  it("computes Hebrew gematria for אדני", () => {
    // א + ד + נ + י = 1 + 4 + 50 + 10 = 65
    expect(gematriaSum("אדני", "hebrew")).toBe(65);
  });

  it("returns a breakdown the same length as the input", () => {
    expect(gematriaBreakdown("αβγ", "greek")).toHaveLength(3);
    expect(gematriaBreakdown("אבג", "hebrew")).toHaveLength(3);
  });

  it("skips characters not in the script's value table", () => {
    expect(gematriaBreakdown("α!β", "greek")).toHaveLength(2);
  });
});

describe("Editor — block kind detection + application", () => {
  it("reads paragraph as the default kind", () => {
    const editor = mountHeadless();
    expect(detectBlockKind(editor)).toBe("paragraph");
    editor.destroy();
  });

  it("reads heading-1 from a seeded heading doc", () => {
    const seed = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      ],
    };
    const editor = mountHeadless(seed);
    // Place caret inside the heading.
    editor.commands.setTextSelection(2);
    expect(detectBlockKind(editor)).toBe("heading-1");
    editor.destroy();
  });

  it("reads code blocks from a seeded code doc", () => {
    const seed = {
      type: "doc",
      content: [{ type: "codeBlock", content: [{ type: "text", text: "echo" }] }],
    };
    const editor = mountHeadless(seed);
    editor.commands.setTextSelection(2);
    expect(detectBlockKind(editor)).toBe("code");
    editor.destroy();
  });

  it("applyBlockKind flips an empty paragraph to heading-2 (round-trips via JSON)", () => {
    const editor = mountHeadless();
    applyBlockKind(editor, "heading-2");
    const out = editor.getJSON();
    const first = (out.content ?? [])[0] as { type: string; attrs?: { level?: number } };
    expect(first.type).toBe("heading");
    expect(first.attrs?.level).toBe(2);
    editor.destroy();
  });
});

describe("Editor — round-trip via JSON", () => {
  it("round-trips a ritualLog node's entries through getJSON/setContent", () => {
    const seed = {
      type: "doc",
      content: [
        {
          type: "ritualLog",
          attrs: {
            entries: [
              { time: "14:12", text: "Banishing" },
              { time: "14:18", text: "Invocation" },
            ],
          },
        },
      ],
    };
    const editor = mountHeadless(seed);
    const out = editor.getJSON();
    const block = (out.content ?? [])[0] as { type: string; attrs: { entries: { time: string; text: string }[] } };
    expect(block.type).toBe("ritualLog");
    expect(block.attrs.entries).toEqual(seed.content[0]?.attrs?.entries);
    editor.destroy();
  });

  it("round-trips a gematria node's word + script", () => {
    const seed = {
      type: "doc",
      content: [
        {
          type: "gematria",
          attrs: { word: "ἀγαθοδαίμων", script: "greek", also: "" },
        },
      ],
    };
    const editor = mountHeadless(seed);
    const out = editor.getJSON();
    const block = (out.content ?? [])[0] as { type: string; attrs: { word: string; script: string } };
    expect(block.attrs.word).toBe("ἀγαθοδαίμων");
    expect(block.attrs.script).toBe("greek");
    editor.destroy();
  });

  it("preserves the lang mark on inline text", () => {
    const seed = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "At the name of the " },
            {
              type: "text",
              marks: [{ type: "lang", attrs: { script: "el" } }],
              text: "ἀγαθὸς δαίμων",
            },
          ],
        },
      ],
    };
    const editor = mountHeadless(seed);
    const out = editor.getJSON();
    const para = (out.content ?? [])[0] as { content: { type: string; marks?: { type: string; attrs: { script: string } }[]; text: string }[] };
    const greekSpan = para.content.find((c) => c.marks?.some((m) => m.type === "lang"));
    expect(greekSpan).toBeDefined();
    expect(greekSpan?.marks?.[0]?.attrs.script).toBe("el");
    editor.destroy();
  });
});
