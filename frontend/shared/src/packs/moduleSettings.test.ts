import { describe, expect, it } from "vitest";

import {
  ENABLED_OPTION_KEY,
  buildModuleSettingEntry,
  chosenValue,
  clearModuleSettingEntry,
  disabledModuleIdsFromEntries,
  moduleSettingId,
  moduleSettingsFromEntries,
} from "./moduleSettings.js";

const NOW = "2026-08-21T12:00:00.000Z";

describe("module option choices on the record", () => {
  it("round-trips a chosen value", () => {
    const entry = buildModuleSettingEntry({
      moduleId: "theourgia.numbers.greek",
      optionKey: "iotaSubscript",
      value: "dropped",
      now: NOW,
    });
    expect(entry.kind).toBe("module-setting");
    expect(entry.id).toBe("theourgia.numbers.greek::iotaSubscript");
    const settings = moduleSettingsFromEntries([entry]);
    expect(chosenValue(settings, "theourgia.numbers.greek", "iotaSubscript")).toBe("dropped");
  });

  it("the entry id is deterministic, so re-choosing overwrites", () => {
    expect(moduleSettingId("m", "k")).toBe(
      buildModuleSettingEntry({ moduleId: "m", optionKey: "k", value: "x", now: NOW }).id,
    );
  });

  it("a later entry for the same option wins", () => {
    const first = buildModuleSettingEntry({ moduleId: "m", optionKey: "k", value: "a", now: NOW });
    const second = buildModuleSettingEntry({
      moduleId: "m",
      optionKey: "k",
      value: "b",
      now: "2026-08-21T13:00:00.000Z",
    });
    expect(chosenValue(moduleSettingsFromEntries([first, second]), "m", "k")).toBe("b");
  });

  it("a tombstone returns the option to its default (no value)", () => {
    const set = buildModuleSettingEntry({ moduleId: "m", optionKey: "k", value: "a", now: NOW });
    const cleared = clearModuleSettingEntry({
      moduleId: "m",
      optionKey: "k",
      now: "2026-08-21T13:00:00.000Z",
    });
    expect(chosenValue(moduleSettingsFromEntries([set, cleared]), "m", "k")).toBeUndefined();
  });

  it("reads which packs are turned off — default on, tombstone re-enables", () => {
    const off = buildModuleSettingEntry({
      moduleId: "pack.a",
      optionKey: ENABLED_OPTION_KEY,
      value: "false",
      now: NOW,
    });
    const onAgain = buildModuleSettingEntry({
      moduleId: "pack.b",
      optionKey: ENABLED_OPTION_KEY,
      value: "true",
      now: NOW,
    });
    expect(disabledModuleIdsFromEntries([off, onAgain])).toEqual(["pack.a"]);

    // Resetting the disabled pack turns it back on.
    const reset = clearModuleSettingEntry({
      moduleId: "pack.a",
      optionKey: ENABLED_OPTION_KEY,
      now: "2026-08-21T13:00:00.000Z",
    });
    expect(disabledModuleIdsFromEntries([off, reset])).toEqual([]);
  });

  it("ignores other kinds and malformed docs", () => {
    const settings = moduleSettingsFromEntries([
      { kind: "observance", doc: { moduleId: "m", optionKey: "k", value: "x" } },
      { kind: "module-setting", doc: { moduleId: "", optionKey: "k", value: "x" } },
      { kind: "module-setting", doc: null },
    ]);
    expect(settings.size).toBe(0);
  });
});
