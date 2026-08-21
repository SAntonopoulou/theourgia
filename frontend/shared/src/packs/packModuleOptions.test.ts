import { describe, expect, it } from "vitest";

import type { FeedPack } from "./packFeed.js";
import { moduleOptionsFromPayload, packModuleOptions } from "./packModuleOptions.js";

// A payload as pack_to_mbf writes it: options carried as `options:*` items with
// their whole definition (this is the real shape from a techniques pack).
const TECHNIQUES_PAYLOAD = {
  kind: "astro-techniques",
  items: [
    { ref: "techniques:the-lord-of-the-year", name: "The lord of the year", houses: [] },
    {
      ref: "options:options-0",
      key: "bond",
      label: "The loosing of the bond",
      detail: "When a releasing sequence reaches the opposite sign…",
      default: "none",
      choices: [
        { value: "none", label: "Mark it only", detail: "The sequence runs on." },
        { value: "toStart", label: "Return to the beginning", detail: "Circles seven signs." },
        { value: "skip", label: "Pass over it", detail: "Never holds a period." },
      ],
    },
  ],
};

function pack(over: Partial<FeedPack> & { id: string }): FeedPack {
  return { version: 1, title: over.id, description: "", mbfUrl: "", bytes: 100, ...over };
}

describe("reading a pack's option definitions", () => {
  it("reads the option, its choices, and the default", () => {
    const [opt] = moduleOptionsFromPayload(TECHNIQUES_PAYLOAD);
    expect(opt).toBeDefined();
    if (!opt) return;
    expect(opt.key).toBe("bond");
    expect(opt.label).toBe("The loosing of the bond");
    expect(opt.byDefault).toBe("none");
    expect(opt.choices.map((c) => c.value)).toEqual(["none", "toStart", "skip"]);
    expect(opt.choices[1]?.label).toBe("Return to the beginning");
  });

  it("falls back to byDefault, then the first choice, for the default", () => {
    const [byDefault] = moduleOptionsFromPayload({
      items: [
        {
          ref: "options:o",
          key: "k",
          byDefault: "b",
          choices: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
      ],
    });
    expect(byDefault?.byDefault).toBe("b");

    const [first] = moduleOptionsFromPayload({
      items: [{ ref: "options:o", key: "k", choices: [{ value: "a", label: "A" }] }],
    });
    expect(first?.byDefault).toBe("a");
  });

  it("ignores non-option items and options with no choices", () => {
    expect(
      moduleOptionsFromPayload({
        items: [
          { ref: "techniques:x", name: "not an option" },
          { ref: "options:empty", key: "k", choices: [] },
        ],
      }),
    ).toEqual([]);
  });

  it("is empty for a payload that is not a document", () => {
    expect(moduleOptionsFromPayload(null)).toEqual([]);
    expect(moduleOptionsFromPayload({ items: "nope" })).toEqual([]);
  });
});

describe("grouping options by the pack that owns them", () => {
  it("tags each option set with the pack id and name, A→Z, dropping the optionless", () => {
    const grouped = packModuleOptions([
      {
        pack: pack({ id: "theourgia.hellenistic.techniques", title: "Hellenistic techniques" }),
        payload: TECHNIQUES_PAYLOAD,
      },
      {
        pack: pack({ id: "theourgia.plain", title: "A plain pack" }),
        payload: { items: [{ ref: "rites:x" }] },
      },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.moduleId).toBe("theourgia.hellenistic.techniques");
    expect(grouped[0]?.moduleName).toBe("Hellenistic techniques");
    expect(grouped[0]?.options[0]?.key).toBe("bond");
  });
});
