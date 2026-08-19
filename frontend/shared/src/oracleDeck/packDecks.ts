/**
 * Read an `oracle-deck` pack into its decks and spreads — for the web reference.
 *
 * The phone draws with these: it shuffles the deck and lays a spread. The live
 * draw already exists on the web (the Tarot surface), on its own built-in deck.
 * What was missing is *reading an installed deck pack* — a custom tarot, the
 * Elder Futhark, an oracle of one's own — to see its cards and the spreads it
 * carries. That is what this reference does, from the same packs the phone uses.
 *
 * The payload is the phone's deck reshaped to MBF: `decks:*` items (each with
 * its cards) and `spreads:*` items. Card facets are kept as they arrive — a
 * tarot's `class`/`suit`/`rank`, a rune's own — so the surface can group by
 * whatever a deck happens to carry.
 *
 * Types are `Oracle`-prefixed so they do not collide with the tarot engine's
 * own `Spread`/`SpreadPosition` or the deck designer's `DeckCard`.
 */

export interface OracleCard {
  id: string;
  name: string;
  /** Whatever the deck carries — class, suit, rank, number, court. */
  facets: Record<string, string>;
}

export interface OracleDeck {
  id: string;
  name: string;
  tradition: string;
  orientations: string[];
  cards: OracleCard[];
}

export interface OracleSpreadPosition {
  name: string;
  asks: string;
}

export interface OracleSpread {
  id: string;
  name: string;
  summary: string;
  positions: OracleSpreadPosition[];
}

export interface OracleDeckPack {
  decks: OracleDeck[];
  spreads: OracleSpread[];
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function facetsOf(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") out[key] = raw;
    else if (typeof raw === "number") out[key] = String(raw);
  }
  return out;
}

function cardsOf(value: unknown): OracleCard[] {
  if (!Array.isArray(value)) return [];
  const out: OracleCard[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") continue;
    const card = raw as Record<string, unknown>;
    const id = typeof card.id === "string" ? card.id : null;
    const name = typeof card.name === "string" ? card.name : null;
    if (id === null || name === null) continue;
    out.push({ id, name, facets: facetsOf(card.facets) });
  }
  return out;
}

function positionsOf(value: unknown): OracleSpreadPosition[] {
  if (!Array.isArray(value)) return [];
  const out: OracleSpreadPosition[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") continue;
    const pos = raw as Record<string, unknown>;
    if (typeof pos.name !== "string") continue;
    out.push({ name: pos.name, asks: typeof pos.asks === "string" ? pos.asks : "" });
  }
  return out;
}

export function packToOracleDeck(payload: unknown): OracleDeckPack {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return { decks: [], spreads: [] };

  const decks: OracleDeck[] = [];
  const spreads: OracleSpread[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const ref = typeof item.ref === "string" ? item.ref : "";

    if (ref.startsWith("decks:")) {
      const id = typeof item.id === "string" ? item.id : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (id === null || name === null) continue;
      decks.push({
        id,
        name,
        tradition: typeof item.tradition === "string" ? item.tradition : "",
        orientations: strings(item.orientations),
        cards: cardsOf(item.cards),
      });
    } else if (ref.startsWith("spreads:")) {
      const id = typeof item.id === "string" ? item.id : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (id === null || name === null) continue;
      spreads.push({
        id,
        name,
        summary: typeof item.summary === "string" ? item.summary : "",
        positions: positionsOf(item.positions),
      });
    }
  }
  return { decks, spreads };
}

/**
 * Group a deck's cards by the facet that best organises it — `class` for a
 * tarot's trumps, then `suit` for its minors, and a single "The cards" group
 * for a deck (like the runes) that carries neither.
 */
export function groupCards(cards: readonly OracleCard[]): { label: string; cards: OracleCard[] }[] {
  const groups: { label: string; cards: OracleCard[] }[] = [];
  const byLabel = new Map<string, OracleCard[]>();
  const order: string[] = [];

  for (const card of cards) {
    const label = card.facets.suit ?? card.facets.class ?? "The cards";
    let bucket = byLabel.get(label);
    if (bucket === undefined) {
      bucket = [];
      byLabel.set(label, bucket);
      order.push(label);
    }
    bucket.push(card);
  }
  for (const label of order) {
    groups.push({ label, cards: byLabel.get(label) ?? [] });
  }
  return groups;
}
