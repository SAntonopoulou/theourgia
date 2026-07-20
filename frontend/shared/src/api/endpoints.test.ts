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
    // Seed session's display_name switched to a neutral "Practitioner"
    // in b108-2ex (magickal-name leak scrub in fixtures.ts).
    expect(session?.display_name).toBe("Practitioner");
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

  it("searchEntries matches title/excerpt and reports sealed_excluded_count > 0", async () => {
    const r = await buildMock().searchEntries({ q: "candle" });
    expect(r.hits.length).toBeGreaterThanOrEqual(1);
    for (const hit of r.hits) {
      expect(`${hit.title} ${hit.excerpt}`.toLowerCase()).toContain("candle");
      expect(hit.visibility).toBeDefined();
    }
    expect(r.total).toBe(r.hits.length);
    // Mock always exercises the SealedExcludedCallout path.
    expect(r.sealed_excluded_count).toBeGreaterThan(0);
  });

  it("searchEntries kind filter composes with the query", async () => {
    const m = buildMock();
    // "candle" hit is an observation — filtering to divination excludes it.
    const r = await m.searchEntries({ q: "candle", kind: ["divination"] });
    expect(r.hits).toHaveLength(0);
    const r2 = await m.searchEntries({ q: "candle", kind: ["observation"] });
    expect(r2.hits.length).toBeGreaterThanOrEqual(1);
  });

  it("getEntryStats returns counts + week-over-week buckets", async () => {
    const stats = await buildMock().getEntryStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    // Every literal type appears in the by_type record (even with 0).
    expect(stats.by_type.observation).toBeGreaterThanOrEqual(0);
    expect(stats.this_week.total).toBeGreaterThanOrEqual(0);
    expect(stats.last_week.total).toBeGreaterThanOrEqual(0);
  });

  it("getEntryDetail returns the body + visibility + sealed + published_at fields", async () => {
    const m = buildMock();
    const list = await m.listEntries();
    const first = list[0]!;
    const detail = await m.getEntryDetail(first.id);
    expect(detail.id).toBe(first.id);
    expect(typeof detail.body).toBe("string");
    expect(["personal", "viewer", "hub", "public"]).toContain(detail.visibility);
    expect(typeof detail.sealed).toBe("boolean");
    expect(detail.published_at === null || typeof detail.published_at === "string").toBe(true);
  });

  it("updateEntryBody persists the body for getEntryDetail to read back", async () => {
    const m = buildMock();
    const list = await m.listEntries();
    const first = list[0]!;
    const docJson = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    await m.updateEntryBody(first.id, { body: docJson });
    const detail = await m.getEntryDetail(first.id);
    expect(detail.body).toBe(docJson);
  });

  it("publishEntry sets published_at on the entry", async () => {
    const m = buildMock();
    const list = await m.listEntries();
    const first = list[0]!;
    const result = await m.publishEntry(first.id);
    expect(result.published_at).toBeTruthy();
    expect(typeof result.published_at).toBe("string");
  });

  it("getEntryDetail by unknown id throws NotFoundError", async () => {
    await expect(buildMock().getEntryDetail("does-not-exist")).rejects.toThrow(/not found/i);
  });

  it("updateEntry persists visibility + sealed back into getEntryDetail", async () => {
    const m = buildMock();
    const list = await m.listEntries();
    const first = list[0]!;
    await m.updateEntry(first.id, { visibility: "viewer", sealed: true });
    const detail = await m.getEntryDetail(first.id);
    expect(detail.visibility).toBe("viewer");
    expect(detail.sealed).toBe(true);
  });

  it("getChart returns placements + houses + aspects + attribution", async () => {
    const m = buildMock();
    const chart = await m.getChart({
      when: new Date().toISOString(),
      latitude: 51.5074,
      longitude: -0.1278,
    });
    expect(chart.placements.length).toBeGreaterThan(0);
    expect(chart.houses.cusps).toHaveLength(12);
    expect(chart.aspects.length).toBeGreaterThanOrEqual(0);
    expect(typeof chart.attribution).toBe("string");
  });

  it("getWellbeingNudge defaults to opted out — no resources, never shown", async () => {
    const nudge = await buildMock().getWellbeingNudge();
    expect(nudge.enabled).toBe(false);
    expect(nudge.show).toBe(false);
    expect(nudge.resources).toEqual([]);
  });

  it("putWellbeingNudge opts in and returns the resource starter list", async () => {
    const m = buildMock();
    const on = await m.putWellbeingNudge({ enabled: true });
    expect(on.enabled).toBe(true);
    expect(on.resources.length).toBeGreaterThan(0);
    for (const r of on.resources) {
      expect(r.region).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.url).toMatch(/^https:\/\//);
    }
    const off = await m.putWellbeingNudge({ enabled: false });
    expect(off.enabled).toBe(false);
    expect(off.resources).toEqual([]);
  });

  it("dismissWellbeingNudge keeps show=false (mute honored)", async () => {
    const m = buildMock();
    await m.putWellbeingNudge({ enabled: true });
    const dismissed = await m.dismissWellbeingNudge();
    expect(dismissed.enabled).toBe(true);
    expect(dismissed.show).toBe(false);
  });
});

describe("endpoints — divination lite fixtures (v1-014)", () => {
  it("createPendulumReading + listPendulumReadings round-trip", async () => {
    const m = buildMock();
    const created = await m.createPendulumReading({
      question: "Will it rain?",
      outcome: "yes",
      asked_at: "2026-07-16T10:00:00.000Z",
    });
    expect(created.question).toBe("Will it rain?");
    expect(created.outcome).toBe("yes");
    expect(created.asked_at).toBe("2026-07-16T10:00:00.000Z");
    expect(created.calibration).toBeNull();
    const list = await m.listPendulumReadings();
    expect(list.some((r) => r.id === created.id)).toBe(true);
  });

  it("castHorary returns a chart snapshot + listHoraryReadings sees it", async () => {
    const m = buildMock();
    const cast = await m.castHorary({
      question: "Where is the lost ring?",
      latitude: 37.9755,
      longitude: 23.7348,
      location_label: "Athens",
    });
    expect(cast.latitude).toBe(37.9755);
    expect(cast.location_label).toBe("Athens");
    expect(cast.chart_snapshot).toBeTruthy();
    expect(cast.interpretation).toBeNull();
    const list = await m.listHoraryReadings();
    expect(list.some((r) => r.id === cast.id)).toBe(true);
  });

  it("scrying start → end round-trips vision notes + duration", async () => {
    const m = buildMock();
    const started = await m.startScryingSession({ mode: "black_mirror" });
    expect(started.mode).toBe("black_mirror");
    expect(started.ended_at).toBeNull();
    expect(started.duration_seconds).toBeNull();
    const ended = await m.endScryingSession(started.id, {
      vision_notes: "A door of pale stone, half-open.",
    });
    expect(ended.id).toBe(started.id);
    expect(ended.vision_notes).toBe("A door of pale stone, half-open.");
    expect(ended.ended_at).not.toBeNull();
    expect(ended.duration_seconds).not.toBeNull();
    const list = await m.listScryingSessions();
    const found = list.find((s) => s.id === started.id);
    expect(found?.vision_notes).toBe("A door of pale stone, half-open.");
  });

  it("scrying start honours an explicit trance-measured window", async () => {
    const m = buildMock();
    const started = await m.startScryingSession({
      mode: "crystal",
      started_at: "2026-07-16T20:00:00.000Z",
    });
    const ended = await m.endScryingSession(started.id, {
      ended_at: "2026-07-16T20:12:48.000Z",
      vision_notes: "Rings within rings.",
    });
    expect(ended.duration_seconds).toBe(768);
  });

  it("endScryingSession with an unknown id rejects NotFound", async () => {
    await expect(
      buildMock().endScryingSession("does-not-exist", { vision_notes: "x" }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("endpoints — relational ledger (v1-019)", () => {
  it("listOfferings covers all five reception levels", async () => {
    const rows = await buildMock().listOfferings();
    const levels = new Set(rows.map((o) => o.reception_perceived));
    for (const level of ["none", "faint", "clear", "strong", "overwhelming"]) {
      expect(levels.has(level as never)).toBe(true);
    }
  });

  it("createOffering appends a row", async () => {
    const m = buildMock();
    const before = await m.listOfferings();
    const created = await m.createOffering({
      entity_id: "ent-hekate",
      offered_at: "2026-06-22T21:00:00Z",
      items: [{ kind: "wine", quantity: "1", unit: "cup" }],
      intention: "test",
      reception_perceived: "clear",
    });
    expect(created.entity_id).toBe("ent-hekate");
    const after = await m.listOfferings();
    expect(after.length).toBe(before.length + 1);
  });

  it("updateRecurringOffering toggles is_active (pause/resume)", async () => {
    const m = buildMock();
    const rows = await m.listRecurringOfferings();
    const target = rows.find((r) => r.is_active);
    expect(target).toBeDefined();
    const paused = await m.updateRecurringOffering(target!.id, { is_active: false });
    expect(paused.is_active).toBe(false);
    // Restore so the module-level fixture stays deterministic for
    // other tests in this file.
    await m.updateRecurringOffering(target!.id, { is_active: true });
  });

  it("listContracts covers all six statuses and filters by contract_status", async () => {
    const m = buildMock();
    const rows = await m.listContracts();
    const statuses = new Set(rows.map((c) => c.status));
    for (const s of ["draft", "active", "fulfilled", "expired", "dissolved", "breached"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
    const active = await m.listContracts({ status: "active" });
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active.every((c) => c.status === "active")).toBe(true);
  });

  it("fulfillObligation flips the matched obligation only", async () => {
    const m = buildMock();
    const updated = await m.fulfillObligation("ct-active", {
      side: "theirs",
      obligation_id: "ob-theirs-2",
      new_status: "fulfilled",
      fulfilled_at: "2026-06-21T12:00:00Z",
    });
    const flipped = updated.their_obligations.find((o) => o.id === "ob-theirs-2");
    expect(flipped?.status).toBe("fulfilled");
    expect(flipped?.fulfilled_at).toBe("2026-06-21T12:00:00Z");
    const untouched = updated.their_obligations.find((o) => o.id === "ob-theirs-1");
    expect(untouched?.status).toBe("in-progress");
  });

  it("listOaths covers all five statuses; sealed rows never carry text", async () => {
    const rows = await buildMock().listOaths();
    const statuses = new Set(rows.map((o) => o.status));
    for (const s of ["active", "fulfilled", "broken", "renounced", "lapsed"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
    for (const o of rows.filter((r) => r.sealed)) {
      expect(o.text).toBeNull();
    }
  });

  it("createOath sealed drops the plaintext; unsealed keeps it", async () => {
    const m = buildMock();
    const sealed = await m.createOath({
      kind: "self",
      taken_at: "2026-06-22T00:00:00Z",
      text: "should be dropped",
      encryption_mode: "sealed",
      encrypted_payload: "b64-ciphertext",
    });
    expect(sealed.sealed).toBe(true);
    expect(sealed.text).toBeNull();
    const open = await m.createOath({
      kind: "community",
      taken_at: "2026-06-22T00:00:00Z",
      text: "kept in the open",
      encryption_mode: "none",
    });
    expect(open.sealed).toBe(false);
    expect(open.text).toBe("kept in the open");
  });

  it("listInitiations is minimal + always sealed, all four statuses", async () => {
    const rows = await buildMock().listInitiations();
    const statuses = new Set(rows.map((i) => i.status));
    for (const s of ["active", "lapsed", "suspended", "resigned"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
    for (const i of rows) {
      expect(i.sealed).toBe(true);
      // The read model must never leak sealed fields.
      expect("encrypted_payload" in i).toBe(false);
      expect("grade_or_degree" in i).toBe(false);
    }
  });

  it("listServitors covers all four statuses; feedServitor stamps last_fed_at", async () => {
    const m = buildMock();
    const rows = await m.listServitors();
    const statuses = new Set(rows.map((s) => s.status));
    for (const s of ["active", "dormant", "retired", "decommissioned"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
    const fed = await m.feedServitor("sv-active", { fed_at: "2026-06-22T21:10:00Z" });
    expect(fed.last_fed_at).toBe("2026-06-22T21:10:00Z");
  });

  it("servitor tasks list covers all four task statuses; create appends", async () => {
    const m = buildMock();
    const tasks = await m.listServitorTasks("sv-active");
    const statuses = new Set(tasks.map((t) => t.status));
    for (const s of ["pending", "in-progress", "completed", "abandoned"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
    const created = await m.createServitorTask("sv-active", {
      description: "Carry the message",
      given_at: "2026-06-22T00:00:00Z",
    });
    expect(created.status).toBe("pending");
    const after = await m.listServitorTasks("sv-active");
    expect(after.length).toBe(tasks.length + 1);
  });
});

describe("endpoints — magickal bundles (v1-020)", () => {
  it("bundledList returns the seven bundled packages with counts + licenses", async () => {
    const r = await buildMock().bundledList();
    expect(r.bundles.map((b) => b.slug)).toEqual([
      "hellenic-pantheon",
      "thelemic-ritual-set",
      "classic-tarot-spreads",
      "pgm-voces-selection",
      "planetary-correspondences",
      "traditional-incense-recipes",
      "dream-symbols-traditional",
    ]);
    for (const pkg of r.bundles) {
      expect(pkg.license.length).toBeGreaterThan(0);
      const counted = Object.values(pkg.item_counts).reduce((a, b) => a + b, 0);
      expect(counted).toBe(pkg.total_items);
      expect(pkg.total_items).toBeGreaterThan(0);
    }
  });

  it("bundlesInstalled lists install records with attribution always present", async () => {
    const r = await buildMock().bundlesInstalled();
    expect(r.bundles.length).toBeGreaterThanOrEqual(1);
    for (const b of r.bundles) {
      expect(b.attribution.length).toBeGreaterThan(0);
      expect(b.author_name.length).toBeGreaterThan(0);
    }
  });

  it("bundledImport records the install and reports every item", async () => {
    const m = buildMock();
    const before = await m.bundlesInstalled();
    const r = await m.bundledImport("classic-tarot-spreads");
    expect(r.total).toBe(5);
    expect(r.imported).toBe(5);
    expect(r.skipped).toBe(0);
    expect(r.signature_verdict).toBe("unsigned");
    const after = await m.bundlesInstalled();
    expect(after.bundles.length).toBe(before.bundles.length + 1);
  });

  it("bundledImport reports opaque kinds as listed-not-imported, honestly", async () => {
    const r = await buildMock().bundledImport("planetary-correspondences");
    expect(r.imported).toBe(0);
    expect(r.skipped).toBe(7);
    expect(r.total).toBe(7);
    for (const item of r.results) {
      expect(item.status).toBe("skipped");
      expect(item.detail).toContain("no v1 importer");
      expect(item.created_id).toBeNull();
    }
  });

  it("bundledImport with an unknown slug rejects NotFound", async () => {
    await expect(buildMock().bundledImport("no-such-bundle")).rejects.toThrow(
      /unknown bundled package/i,
    );
  });

  it("bundlesPreview returns the manifest + unsigned warning (warn, never block)", async () => {
    const file = new Blob(["fake-mbf"], { type: "application/zip" });
    const r = await buildMock().bundlesPreview(file);
    expect(r.signature.verdict).toBe("unsigned");
    expect(r.unsigned_warning).toMatch(/unsigned/i);
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.attribution.length).toBeGreaterThan(0);
  });

  it("bundlesImport uploads multipart and reports totals", async () => {
    const file = new Blob(["fake-mbf"], { type: "application/zip" });
    const r = await buildMock().bundlesImport(file, ["entities-1"]);
    expect(r.total).toBeGreaterThan(0);
    expect(r.imported + r.skipped).toBe(r.total);
  });

  it("bundlesExport resolves a Blob", async () => {
    const blob = await buildMock().bundlesExport("pantheon");
    expect(blob).toBeInstanceOf(Blob);
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
