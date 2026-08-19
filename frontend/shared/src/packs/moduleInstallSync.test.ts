import { describe, expect, it } from "vitest";

import {
  type RecordEntry,
  moduleInstallEntry,
  offeredFromOtherDevices,
  packSyncEnabled,
  parseModuleInstalls,
  setPackSyncEnabled,
} from "./moduleInstallSync.js";

describe("moduleInstallEntry", () => {
  it("advertises the fact, never a corpus", () => {
    const entry = moduleInstallEntry(
      { id: "theourgia.words.greek-diorisis", title: "Ancient Greek", version: 2 },
      "2026-08-20T09:00:00.000Z",
    );
    expect(entry.kind).toBe("module-install");
    expect(entry.id).toBe("theourgia.words.greek-diorisis");
    expect(entry.deleted_at_utc).toBeNull();
    expect(entry.doc).toEqual({
      v: 1,
      name: "Ancient Greek",
      moduleKind: "",
      version: 2,
      enabled: true,
    });
    // No payload, no corpus.
    expect(entry.doc.payload).toBeUndefined();
  });
});

describe("parseModuleInstalls", () => {
  const entries: RecordEntry[] = [
    {
      id: "theourgia.numbers.sanskrit",
      kind: "module-install",
      doc: { v: 1, name: "Katapayadi", moduleKind: "number-system", version: 1, enabled: true },
      updated_at_utc: "2026-08-20T09:00:00.000Z",
      deleted_at_utc: null,
    },
    // A different kind on the same shelf — ignored.
    {
      id: "obs-1",
      kind: "observance",
      doc: {},
      updated_at_utc: "2026-08-20T09:00:00.000Z",
      deleted_at_utc: null,
    },
    // A tombstoned install fact — ignored (uninstalls stay local).
    {
      id: "theourgia.numbers.hebrew",
      kind: "module-install",
      doc: { name: "Hebrew", version: 1, enabled: true },
      updated_at_utc: "2026-08-20T09:00:00.000Z",
      deleted_at_utc: "2026-08-20T10:00:00.000Z",
    },
  ];

  it("reads only live install facts", () => {
    const facts = parseModuleInstalls(entries);
    expect(facts.map((f) => f.id)).toEqual(["theourgia.numbers.sanskrit"]);
    expect(facts[0]?.moduleKind).toBe("number-system");
  });

  it("dedupes by id, keeping the last seen", () => {
    const facts = parseModuleInstalls([
      {
        id: "p",
        kind: "module-install",
        doc: { name: "old", version: 1, enabled: true },
        updated_at_utc: "a",
        deleted_at_utc: null,
      },
      {
        id: "p",
        kind: "module-install",
        doc: { name: "new", version: 2, enabled: true },
        updated_at_utc: "b",
        deleted_at_utc: null,
      },
    ]);
    expect(facts).toHaveLength(1);
    expect(facts[0]?.name).toBe("new");
  });
});

describe("offeredFromOtherDevices", () => {
  const facts = parseModuleInstalls([
    {
      id: "theourgia.words.greek-diorisis",
      kind: "module-install",
      doc: { name: "Greek", version: 2, enabled: true },
      updated_at_utc: "a",
      deleted_at_utc: null,
    },
    {
      id: "theourgia.numbers.sanskrit",
      kind: "module-install",
      doc: { name: "Sanskrit", version: 1, enabled: true },
      updated_at_utc: "a",
      deleted_at_utc: null,
    },
  ]);

  it("offers only what the account does not already hold", () => {
    // Installed slugs can be dotted or hyphenated — both match.
    const offered = offeredFromOtherDevices(facts, ["theourgia-words-greek-diorisis"]);
    expect(offered.map((f) => f.id)).toEqual(["theourgia.numbers.sanskrit"]);
  });

  it("offers nothing when everything advertised is already installed", () => {
    const offered = offeredFromOtherDevices(facts, [
      "theourgia.words.greek-diorisis",
      "theourgia.numbers.sanskrit",
    ]);
    expect(offered).toEqual([]);
  });
});

describe("packSyncEnabled / setPackSyncEnabled", () => {
  function fakeStore(): Storage {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    };
  }

  it("is off by default and round-trips the choice", () => {
    const store = fakeStore();
    expect(packSyncEnabled(store)).toBe(false);
    setPackSyncEnabled(true, store);
    expect(packSyncEnabled(store)).toBe(true);
    setPackSyncEnabled(false, store);
    expect(packSyncEnabled(store)).toBe(false);
  });
});
