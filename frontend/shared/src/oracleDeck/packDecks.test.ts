import { describe, expect, it } from "vitest";

import { groupCards, packToOracleDeck } from "./packDecks.js";

const payload = {
  kind: "oracle-deck",
  items: [
    {
      ref: "decks:generic78",
      id: "generic78",
      name: "The general seventy-eight",
      tradition: "Generic",
      orientations: ["upright", "reversed"],
      cards: [
        { id: "t00", name: "0 · The Fool", facets: { class: "trump", number: "0", roman: "0" } },
        { id: "w01", name: "Ace of Wands", facets: { suit: "Wands", rank: "Ace" } },
        { id: "w02", name: "Two of Wands", facets: { suit: "Wands", rank: "2" } },
      ],
    },
    {
      ref: "spreads:single",
      id: "single",
      name: "A single card",
      summary: "One card, one question.",
      positions: [{ name: "The card", asks: "What you asked", x: 0, y: 0 }],
    },
    { ref: "spreads:cross", id: "cross", name: "The cross", summary: "", positions: [] },
  ],
};

describe("packToOracleDeck", () => {
  it("reads decks with their cards and orientations", () => {
    const { decks } = packToOracleDeck(payload);
    expect(decks).toHaveLength(1);
    expect(decks[0]?.tradition).toBe("Generic");
    expect(decks[0]?.orientations).toEqual(["upright", "reversed"]);
    expect(decks[0]?.cards).toHaveLength(3);
    expect(decks[0]?.cards[0]?.facets.class).toBe("trump");
  });

  it("reads spreads with their positions", () => {
    const { spreads } = packToOracleDeck(payload);
    expect(spreads.map((s) => s.id)).toEqual(["single", "cross"]);
    expect(spreads[0]?.positions[0]).toEqual({ name: "The card", asks: "What you asked" });
  });

  it("coerces numeric facets to strings", () => {
    const { decks } = packToOracleDeck({
      items: [
        { ref: "decks:d", id: "d", name: "D", cards: [{ id: "c", name: "C", facets: { n: 5 } }] },
      ],
    });
    expect(decks[0]?.cards[0]?.facets.n).toBe("5");
  });

  it("returns empty structures for a payload with no items", () => {
    expect(packToOracleDeck({})).toEqual({ decks: [], spreads: [] });
    expect(packToOracleDeck(null)).toEqual({ decks: [], spreads: [] });
  });
});

describe("groupCards", () => {
  it("groups by suit then class, preserving first-seen order", () => {
    const { decks } = packToOracleDeck(payload);
    const groups = groupCards(decks[0]?.cards ?? []);
    expect(groups.map((g) => g.label)).toEqual(["trump", "Wands"]);
    expect(groups[1]?.cards.map((c) => c.name)).toEqual(["Ace of Wands", "Two of Wands"]);
  });

  it("falls back to one group when a deck carries no suit or class", () => {
    const runes = [
      { id: "f", name: "Fehu", facets: {} },
      { id: "u", name: "Uruz", facets: {} },
    ];
    const groups = groupCards(runes);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("The cards");
  });
});
