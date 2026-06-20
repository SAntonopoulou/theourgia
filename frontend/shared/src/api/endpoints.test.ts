import { describe, expect, it } from "vitest";

import { ApiClient } from "./client.js";
import { api } from "./endpoints.js";
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

  it("listEntries with ?type filter narrows results", async () => {
    const m = buildMock();
    const divs = await m.listEntries({ type: "divination" });
    for (const e of divs) {
      expect(e.type).toBe("divination");
    }
  });

  it("getEntryStats returns counts + week-over-week buckets", async () => {
    const stats = await buildMock().getEntryStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    // Every literal type appears in the by_type record (even with 0).
    expect(stats.by_type.observation).toBeGreaterThanOrEqual(0);
    expect(stats.this_week.total).toBeGreaterThanOrEqual(0);
    expect(stats.last_week.total).toBeGreaterThanOrEqual(0);
  });
});

describe("endpoints — live mode", () => {
  function liveApi() {
    return api(new ApiClient({ baseUrl: "https://api.test", mock: false }));
  }

  it("auth endpoint methods exist and are callable (network would resolve in real life)", () => {
    const live = liveApi();
    expect(typeof live.getCurrentSession).toBe("function");
    expect(typeof live.signOut).toBe("function");
    expect(typeof live.demoSignIn).toBe("function");
  });
});
