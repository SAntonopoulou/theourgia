import { describe, expect, it } from "vitest";
import { packOffersKind, parsePackFeed } from "./packFeed.js";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:pack="https://theourgia.com/ns/pack">
  <channel>
    <title>Theourgia packs</title>
    <item>
      <title>Cards &amp; spreads 1</title>
      <guid isPermaLink="false">theourgia.cards.general@1</guid>
      <description>A plain seventy-eight &amp; a library of spreads.</description>
      <pack:id>theourgia.cards.general</pack:id>
      <pack:version>1</pack:version>
      <enclosure url="https://theourgia.com/packs/theourgia-cards-general-v1.mbf" type="application/x-mbf" length="2869"/>
    </item>
    <item>
      <title>Greek isopsephy 2</title>
      <pack:id>theourgia.numbers.greek</pack:id>
      <pack:version>2</pack:version>
      <pack:kind>number-system</pack:kind>
      <enclosure url="https://theourgia.com/packs/theourgia-numbers-greek-v2.mbf" type="application/x-mbf" length="4096"/>
    </item>
    <item>
      <title>The whole tradition 3</title>
      <pack:id>theourgia.bundle</pack:id>
      <pack:version>3</pack:version>
      <pack:kind>bundle</pack:kind>
      <pack:contains>calendar rite adoration-set</pack:contains>
      <enclosure url="https://theourgia.com/packs/theourgia-bundle-v3.mbf" type="application/x-mbf" length="99999"/>
    </item>
    <item>
      <title>broken, no id or url</title>
    </item>
  </channel>
</rss>`;

describe("parsePackFeed", () => {
  it("parses each well-formed item and skips the broken one", () => {
    const packs = parsePackFeed(SAMPLE);
    expect(packs).toHaveLength(3);
  });

  it("reads the kind, and a bundle's contained kinds", () => {
    const packs = parsePackFeed(SAMPLE);
    // A feed written before the field: kind "", contains [] — tolerated.
    expect(packs[0]?.kind).toBe("");
    expect(packs[0]?.contains).toEqual([]);
    expect(packs[1]?.kind).toBe("number-system");
    const bundle = packs[2];
    expect(bundle?.kind).toBe("bundle");
    expect(bundle?.contains).toEqual(["calendar", "rite", "adoration-set"]);
    // A practice surface asks by kind; a bundle answers for what it contains.
    if (!bundle) return;
    expect(packOffersKind(bundle, ["rite"])).toBe(true);
    expect(packOffersKind(bundle, ["sitting"])).toBe(false);
  });

  it("reads id, version, url, size, and decodes entities", () => {
    const cards = parsePackFeed(SAMPLE)[0];
    expect(cards).toBeDefined();
    if (!cards) return;
    expect(cards.id).toBe("theourgia.cards.general");
    expect(cards.version).toBe(1);
    // The feed bakes the version into <title>; the parser strips it — the
    // version rides in its own field and surfaces print it themselves.
    expect(cards.title).toBe("Cards & spreads");
    expect(cards.description).toContain("seventy-eight &");
    expect(cards.mbfUrl).toBe("https://theourgia.com/packs/theourgia-cards-general-v1.mbf");
    expect(cards.bytes).toBe(2869);
  });

  it("defaults version to 1 and bytes to 0 when absent", () => {
    const p = parsePackFeed(
      `<item><pack:id>x.y</pack:id><enclosure url="https://h/x.mbf"/></item>`,
    )[0];
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.version).toBe(1);
    expect(p.bytes).toBe(0);
  });

  it("an empty feed is empty, not an error", () => {
    expect(parsePackFeed("<rss></rss>")).toEqual([]);
  });
});
