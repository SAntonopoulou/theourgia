import { describe, expect, it } from "vitest";

import {
  SPREAD_ORDER,
  type SpreadKind,
  buildDeck,
  drawSpread,
  spreadLayout,
} from "./engine.js";

// ─── buildDeck ─────────────────────────────────────────────────────

describe("buildDeck", () => {
  it("produces 78 cards (22 Majors + 4×14 Minors)", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(78);
    expect(deck.filter((c) => c.kind === "Major Arcana")).toHaveLength(22);
    expect(deck.filter((c) => c.kind === "Minor Arcana")).toHaveLength(56);
  });

  it("Majors carry numeral 0..XXI and no suit", () => {
    const deck = buildDeck();
    const majors = deck.filter((c) => c.kind === "Major Arcana");
    expect(majors[0]?.numeral).toBe("0");
    expect(majors[0]?.name).toBe("The Fool");
    expect(majors[21]?.numeral).toBe("XXI");
    expect(majors[21]?.name).toBe("The World");
    majors.forEach((m) => {
      expect(m.suit).toBeNull();
      expect(m.rank).toBeNull();
      expect(m.suitGlyph).toBeNull();
    });
  });

  it("Minors are ordered Wands·Cups·Swords·Pentacles, each Ace..King", () => {
    const deck = buildDeck();
    const minors = deck.filter((c) => c.kind === "Minor Arcana");
    expect(minors[0]?.name).toBe("Ace of Wands");
    expect(minors[13]?.name).toBe("King of Wands");
    expect(minors[14]?.name).toBe("Ace of Cups");
    expect(minors[42]?.name).toBe("Ace of Pentacles");
    expect(minors[55]?.name).toBe("King of Pentacles");
  });

  it("each Minor carries its alchemical suit glyph", () => {
    const deck = buildDeck();
    const aces = deck.filter(
      (c) => c.kind === "Minor Arcana" && c.rank === "Ace",
    );
    expect(aces.find((c) => c.suit === "Wands")?.suitGlyph).toBe("🜂");
    expect(aces.find((c) => c.suit === "Cups")?.suitGlyph).toBe("🜄");
    expect(aces.find((c) => c.suit === "Swords")?.suitGlyph).toBe("🜁");
    expect(aces.find((c) => c.suit === "Pentacles")?.suitGlyph).toBe(
      "🜃",
    );
  });

  it("every card name is unique", () => {
    const deck = buildDeck();
    const names = deck.map((c) => c.name);
    expect(new Set(names).size).toBe(78);
  });

  it("returns a fresh array — callers can't mutate the shared deck", () => {
    const a = buildDeck();
    const b = buildDeck();
    expect(a).not.toBe(b);
  });
});

// ─── spreadLayout ──────────────────────────────────────────────────

describe("spreadLayout", () => {
  it("single = one centre position 'The card'", () => {
    const s = spreadLayout("single");
    expect(s.name).toBe("Single card");
    expect(s.positions).toHaveLength(1);
    expect(s.positions[0]).toEqual({ x: 50, y: 50, label: "The card" });
  });

  it("three = Past · Present · Future, verbatim", () => {
    const s = spreadLayout("three");
    expect(s.name).toBe("Past · Present · Future");
    expect(s.positions.map((p) => p.label)).toEqual([
      "Past",
      "Present",
      "Future",
    ]);
  });

  it("celtic = 10 positions with the Crossing card rotated 90°", () => {
    const s = spreadLayout("celtic");
    expect(s.name).toBe("Celtic Cross");
    expect(s.positions).toHaveLength(10);
    // The Crossing card is the second position with rot: 90.
    expect(s.positions[1]?.label).toBe("Crossing");
    expect(s.positions[1]?.rot).toBe(90);
    // All other positions have no rotation.
    s.positions.forEach((p, i) => {
      if (i !== 1) expect(p.rot).toBeUndefined();
    });
  });

  it("celtic position labels verbatim", () => {
    const s = spreadLayout("celtic");
    expect(s.positions.map((p) => p.label)).toEqual([
      "Present",
      "Crossing",
      "Foundation",
      "Recent past",
      "Crown",
      "Near future",
      "Self",
      "Environment",
      "Hopes & fears",
      "Outcome",
    ]);
  });

  it("relationship = 5 positions, labels verbatim", () => {
    const s = spreadLayout("relationship");
    expect(s.name).toBe("Relationship");
    expect(s.positions.map((p) => p.label)).toEqual([
      "You",
      "Them",
      "The bond",
      "Foundation",
      "Where it tends",
    ]);
  });

  it("year = 12 months on a clock face + centre 'The year' (13 total)", () => {
    const s = spreadLayout("year");
    expect(s.name).toBe("Year ahead");
    expect(s.positions).toHaveLength(13);
    expect(s.positions[12]?.label).toBe("The year");
    expect(s.positions[12]?.x).toBe(50);
    expect(s.positions[12]?.y).toBe(50);
    // Month 1 sits at the top (-90°).
    expect(s.positions[0]?.label).toBe("Month 1");
    expect(s.positions[0]?.y).toBeCloseTo(10); // 50 + 40·sin(-90°) = 10
  });

  it("SPREAD_ORDER lists all 5 kinds", () => {
    expect(SPREAD_ORDER).toEqual([
      "single",
      "three",
      "celtic",
      "relationship",
      "year",
    ]);
  });
});

// ─── drawSpread ────────────────────────────────────────────────────

describe("drawSpread", () => {
  it("returns one DrawnCard per spread position", () => {
    expect(drawSpread("single", 42)).toHaveLength(1);
    expect(drawSpread("three", 42)).toHaveLength(3);
    expect(drawSpread("celtic", 42)).toHaveLength(10);
    expect(drawSpread("relationship", 42)).toHaveLength(5);
    expect(drawSpread("year", 42)).toHaveLength(13);
  });

  it("draws without repeats — every card name unique within a draw", () => {
    const draw = drawSpread("celtic", 999);
    const names = draw.map((d) => d.card.name);
    expect(new Set(names).size).toBe(10);
  });

  it("attaches the correct position label from the spread", () => {
    const draw = drawSpread("three", 42);
    expect(draw.map((d) => d.positionLabel)).toEqual([
      "Past",
      "Present",
      "Future",
    ]);
  });

  it("seeded with the same seed → deterministic identical draw", () => {
    const a = drawSpread("celtic", 12345);
    const b = drawSpread("celtic", 12345);
    expect(a.map((d) => d.card.name)).toEqual(
      b.map((d) => d.card.name),
    );
    expect(a.map((d) => d.reversed)).toEqual(b.map((d) => d.reversed));
  });

  it("different seeds produce different draws (probabilistically)", () => {
    // 78 cards, three slots — two random seeds almost never collide.
    const a = drawSpread("three", 1);
    const b = drawSpread("three", 2);
    expect(a.map((d) => d.card.name)).not.toEqual(
      b.map((d) => d.card.name),
    );
  });

  it("supports an injected random source", () => {
    // random() === 0 → first card (idx 0 = The Fool); reversed roll 0 < 0.28 → true.
    const draw = drawSpread("single", () => 0);
    expect(draw[0]?.card.name).toBe("The Fool");
    expect(draw[0]?.reversed).toBe(true);
  });

  it("reversal probability matches the mockup's 28% threshold", () => {
    // Empirical: across 1000 draws, ~28% should be reversed.
    let rng = 7;
    const lcg = () => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 4294967296;
    };
    let reversedCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const d = drawSpread("single", lcg);
      if (d[0]?.reversed) reversedCount += 1;
    }
    // 28% ± a generous statistical margin.
    expect(reversedCount).toBeGreaterThan(N * 0.2);
    expect(reversedCount).toBeLessThan(N * 0.38);
  });

  it("works for all 5 SpreadKinds", () => {
    for (const kind of SPREAD_ORDER as SpreadKind[]) {
      const draw = drawSpread(kind, 1);
      expect(draw.length).toBe(spreadLayout(kind).positions.length);
    }
  });
});
