import { describe, expect, it } from "vitest";

import { ApiClient } from "./client.js";
import { NotImplementedError, api } from "./endpoints.js";
import { defaultFixtures } from "./fixtures.js";

function buildMock(): ReturnType<typeof api> {
  return api(new ApiClient({ baseUrl: "", mock: true, fixtureFor: defaultFixtures }));
}

describe("endpoints — mock mode", () => {
  it("getHealth returns {status:'ok'}", async () => {
    const x = await buildMock().getHealth();
    expect(x).toEqual({ status: "ok" });
  });

  it("getReadiness returns checks", async () => {
    const x = await buildMock().getReadiness();
    expect(x.checks?.database).toBe("ok");
  });

  it("getMeta returns instance metadata", async () => {
    const x = await buildMock().getMeta();
    expect(x.api_version).toBe("v1");
    expect(x.environment).toBe("development");
  });

  it("getCurrentSession returns the seeded session", async () => {
    const session = await buildMock().getCurrentSession();
    expect(session?.display_name).toBe("Soror Ευ. Α.");
  });

  it("listEntries returns the seeded entries", async () => {
    const entries = await buildMock().listEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });

  it("createEntry appends a new entry", async () => {
    const m = buildMock();
    const before = await m.listEntries();
    const created = await m.createEntry({
      title: "test",
      type: "observation",
      excerpt: "x",
      glyph: "feather",
    });
    expect(created.title).toBe("test");
    const after = await m.listEntries();
    expect(after.length).toBe(before.length + 1);
  });

  it("getEntry by unknown id throws NotFoundError", async () => {
    await expect(buildMock().getEntry("does-not-exist")).rejects.toThrow(/not found/i);
  });
});

describe("endpoints — live mode", () => {
  function liveApi() {
    return api(new ApiClient({ baseUrl: "https://api.test", mock: false }));
  }

  it("auth endpoints still throw NotImplementedError (backend route pending)", async () => {
    await expect(liveApi().getCurrentSession()).rejects.toBeInstanceOf(NotImplementedError);
    await expect(liveApi().signOut()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
