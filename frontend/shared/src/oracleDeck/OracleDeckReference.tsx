/**
 * OracleDeckReference — the web reference for an installed deck pack.
 *
 * The live draw is elsewhere (the Tarot surface, on its built-in deck). This is
 * for reading the deck packs the account has installed — a custom tarot, the
 * Elder Futhark, an oracle of one's own: its cards, grouped as the deck groups
 * them, and the spreads it carries. Read client-side from the same `oracle-deck`
 * packs the phone draws with.
 */

import type { CSSProperties } from "react";

import {
  type OracleDeck,
  type OracleDeckPack,
  type OracleSpread,
  groupCards,
} from "./packDecks.js";

export interface NamedDeckSet {
  title: string;
  pack: OracleDeckPack;
}

export interface OracleDeckReferenceProps {
  packs: readonly NamedDeckSet[];
  className?: string;
  style?: CSSProperties;
}

function cardDetail(facets: Record<string, string>): string {
  return facets.rank ?? facets.court ?? facets.roman ?? facets.number ?? "";
}

function DeckBlock({ deck }: { deck: OracleDeck }) {
  const groups = groupCards(deck.cards);
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, margin: "0 0 2px" }}>
          {deck.name}
        </h3>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
          {deck.cards.length} cards
          {deck.tradition && ` · ${deck.tradition}`}
          {deck.orientations.length > 1 && ` · ${deck.orientations.join(" / ")}`}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.label} style={{ marginTop: 10 }}>
          {groups.length > 1 && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 5,
              }}
            >
              {group.label}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {group.cards.map((card) => {
              const detail = cardDetail(card.facets);
              return (
                <span
                  key={card.id}
                  style={{
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm, 4px)",
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                  }}
                  title={detail ? `${card.name} · ${detail}` : card.name}
                >
                  {card.name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function SpreadBlock({ spread }: { spread: OracleSpread }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0 }}>
          {spread.name}
        </h4>
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
          {spread.positions.length} {spread.positions.length === 1 ? "position" : "positions"}
        </span>
      </div>
      {spread.summary && (
        <p
          style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-mute)", margin: "4px 0 0" }}
        >
          {spread.summary}
        </p>
      )}
      {spread.positions.length > 0 && (
        <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
          {spread.positions.map((pos, i) => (
            <li
              key={`${pos.name}-${i}`}
              style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-soft)", marginBottom: 2 }}
            >
              <span style={{ color: "var(--ink)" }}>{pos.name}</span>
              {pos.asks && ` — ${pos.asks}`}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function OracleDeckReference({ packs, className, style }: OracleDeckReferenceProps) {
  const withContent = packs.filter((p) => p.pack.decks.length > 0 || p.pack.spreads.length > 0);
  if (withContent.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No deck packs installed. Install one from Packs — the general seventy-eight, the Elder
          Futhark — and its cards and spreads appear here. (The live draw is on the Tarot surface;
          here you can read the decks you hold.)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto", ...style }}
      className={className}
    >
      {withContent.map(({ title, pack }) => (
        <section
          key={title}
          style={{ marginBottom: 32, borderBottom: "1px solid var(--line)", paddingBottom: 20 }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 14px" }}>
            {title}
          </h2>
          {pack.decks.map((deck) => (
            <DeckBlock key={deck.id} deck={deck} />
          ))}
          {pack.spreads.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                Spreads
              </div>
              {pack.spreads.map((spread) => (
                <SpreadBlock key={spread.id} spread={spread} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
