/**
 * Deck designer — list a user's custom decks + edit one.
 *
 * FEATURES §4 · "Custom deck + spread designer". This surface is
 * intentionally functional-not-fancy: form fields for deck metadata,
 * a card list with add / edit / delete controls, and an inline
 * card-editor form. Drag-and-drop card art comes in a follow-up
 * polish batch.
 */

import { type CSSProperties, useMemo, useState } from "react";

export type DeckSuit = "major" | "wands" | "cups" | "swords" | "pentacles";

export interface DeckCard {
  id?: string;
  position: number;
  slug: string;
  name: string;
  suit: DeckSuit;
  arcana_number?: number | null;
  upright_meaning?: string | null;
  reversed_meaning?: string | null;
}

export interface DeckSummary {
  id: string;
  name: string;
  slug: string;
  card_count: number;
  is_builtin: boolean;
  language: string;
  tradition: string;
}

export interface DeckDetail extends DeckSummary {
  creator: string | null;
  license: string | null;
  description: string | null;
  reversal_convention: boolean;
  cards: DeckCard[];
}

export interface DeckDesignerSurfaceProps {
  decks: DeckSummary[];
  activeDeck: DeckDetail | null;
  onSelectDeck: (id: string) => void;
  onCreateDeck: () => void;
  onDeleteDeck: (id: string) => void;
  onSaveDeckMetadata: (patch: Partial<DeckDetail>) => void;
  onAddCard: (card: DeckCard) => void;
  onUpdateCard: (cardId: string, patch: Partial<DeckCard>) => void;
  onDeleteCard: (cardId: string) => void;
  className?: string;
  style?: CSSProperties;
}

const SUIT_LABEL: Record<DeckSuit, string> = {
  major: "Major arcana",
  wands: "Wands",
  cups: "Cups",
  swords: "Swords",
  pentacles: "Pentacles",
};

export function DeckDesignerSurface({
  decks,
  activeDeck,
  onSelectDeck,
  onCreateDeck,
  onDeleteDeck,
  onSaveDeckMetadata,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  className,
  style,
}: DeckDesignerSurfaceProps) {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<DeckCard>({
    position: 0,
    slug: "",
    name: "",
    suit: "major",
  });

  const canEdit = activeDeck && !activeDeck.is_builtin;
  const suits: DeckSuit[] = ["major", "wands", "cups", "swords", "pentacles"];

  const nextPosition = useMemo(() => {
    if (!activeDeck) return 0;
    const positions = activeDeck.cards.map((c) => c.position);
    return positions.length ? Math.max(...positions) + 1 : 0;
  }, [activeDeck]);

  return (
    <div
      className={className}
      data-component="deck-designer"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: "var(--space-4)",
        ...style,
      }}
    >
      <aside data-role="deck-list">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-2)",
          }}
        >
          <h3 style={{ font: "var(--type-eyebrow)", color: "var(--muted)" }}>
            Decks
          </h3>
          <button
            type="button"
            onClick={onCreateDeck}
            style={{
              padding: "var(--space-1) var(--space-2)",
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              font: "var(--type-label)",
            }}
          >
            New
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                data-active={d.id === activeDeck?.id}
                onClick={() => onSelectDeck(d.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2)",
                  marginBottom: "var(--space-1)",
                  background:
                    d.id === activeDeck?.id ? "var(--bg-2)" : "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  font: "var(--type-body)",
                }}
              >
                <div>{d.name}</div>
                <div
                  style={{
                    font: "var(--type-caption)",
                    color: "var(--muted)",
                  }}
                >
                  {d.card_count} cards
                  {d.is_builtin ? " · built-in" : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section data-role="deck-editor">
        {!activeDeck ? (
          <p style={{ color: "var(--muted)" }}>
            Select a deck to edit or create a new one.
          </p>
        ) : (
          <>
            <header style={{ marginBottom: "var(--space-4)" }}>
              <h2 style={{ font: "var(--type-title)" }}>{activeDeck.name}</h2>
              {activeDeck.is_builtin ? (
                <p style={{ color: "var(--muted)" }}>
                  Built-in decks are read-only. Duplicate to edit.
                </p>
              ) : null}
            </header>

            <fieldset
              disabled={!canEdit}
              style={{
                border: "1px solid var(--line-2)",
                padding: "var(--space-3)",
                marginBottom: "var(--space-4)",
                borderRadius: "var(--radius-sm)",
              }}
              data-role="deck-metadata"
            >
              <legend
                style={{ font: "var(--type-label)", color: "var(--muted)" }}
              >
                Deck metadata
              </legend>
              <label
                style={{ display: "block", font: "var(--type-label)" }}
              >
                Name
                <input
                  type="text"
                  defaultValue={activeDeck.name}
                  onBlur={(e) =>
                    onSaveDeckMetadata({ name: e.target.value })
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "block", font: "var(--type-label)" }}
              >
                Creator / artist credit
                <input
                  type="text"
                  defaultValue={activeDeck.creator ?? ""}
                  onBlur={(e) =>
                    onSaveDeckMetadata({ creator: e.target.value })
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "block", font: "var(--type-label)" }}
              >
                License
                <input
                  type="text"
                  defaultValue={activeDeck.license ?? ""}
                  onBlur={(e) =>
                    onSaveDeckMetadata({ license: e.target.value })
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "block", font: "var(--type-label)" }}
              >
                Description
                <textarea
                  defaultValue={activeDeck.description ?? ""}
                  onBlur={(e) =>
                    onSaveDeckMetadata({ description: e.target.value })
                  }
                  rows={2}
                  style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
                />
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDeleteDeck(activeDeck.id)}
                  style={{
                    padding: "var(--space-2)",
                    background: "transparent",
                    color: "var(--care)",
                    border: "1px solid var(--care)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    font: "var(--type-label)",
                    marginTop: "var(--space-2)",
                  }}
                >
                  Delete deck
                </button>
              )}
            </fieldset>

            <section data-role="cards">
              <h3 style={{ font: "var(--type-label)" }}>
                Cards ({activeDeck.cards.length})
              </h3>
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: "var(--space-3)",
                }}
              >
                {activeDeck.cards
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((c) => (
                    <li
                      key={c.id ?? `pos-${c.position}`}
                      data-card-id={c.id}
                      style={{
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--radius-sm)",
                        padding: "var(--space-2)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      {editingCardId === c.id ? (
                        <CardEditor
                          card={c}
                          onSave={(patch) => {
                            if (c.id) {
                              onUpdateCard(c.id, patch);
                            }
                            setEditingCardId(null);
                          }}
                          onCancel={() => setEditingCardId(null)}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div>
                              #{c.position} · {c.name}
                            </div>
                            <div
                              style={{
                                font: "var(--type-caption)",
                                color: "var(--muted)",
                              }}
                            >
                              {SUIT_LABEL[c.suit]}
                              {c.arcana_number != null
                                ? ` · ${c.arcana_number}`
                                : ""}
                            </div>
                          </div>
                          {canEdit && c.id && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setEditingCardId(c.id ?? null)}
                                style={smallButtonStyle}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => c.id && onDeleteCard(c.id)}
                                style={{
                                  ...smallButtonStyle,
                                  color: "var(--care)",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
              </ol>

              {canEdit && (
                <fieldset
                  data-role="new-card"
                  style={{
                    border: "1px dashed var(--line-2)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <legend
                    style={{
                      font: "var(--type-label)",
                      color: "var(--muted)",
                    }}
                  >
                    Add card
                  </legend>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 1fr 140px",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={newCard.position || nextPosition}
                      onChange={(e) =>
                        setNewCard({
                          ...newCard,
                          position: Number(e.target.value),
                        })
                      }
                      style={inputStyle}
                      aria-label="Position"
                    />
                    <input
                      type="text"
                      placeholder="Slug (the-fool)"
                      value={newCard.slug}
                      onChange={(e) =>
                        setNewCard({ ...newCard, slug: e.target.value })
                      }
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Name (The Fool)"
                      value={newCard.name}
                      onChange={(e) =>
                        setNewCard({ ...newCard, name: e.target.value })
                      }
                      style={inputStyle}
                    />
                    <select
                      value={newCard.suit}
                      onChange={(e) =>
                        setNewCard({
                          ...newCard,
                          suit: e.target.value as DeckSuit,
                        })
                      }
                      style={inputStyle}
                    >
                      {suits.map((s) => (
                        <option key={s} value={s}>
                          {SUIT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!newCard.slug || !newCard.name}
                    onClick={() => {
                      onAddCard({
                        ...newCard,
                        position: newCard.position || nextPosition,
                      });
                      setNewCard({
                        position: 0,
                        slug: "",
                        name: "",
                        suit: "major",
                      });
                    }}
                    style={{
                      padding: "var(--space-2)",
                      background: "var(--accent)",
                      color: "var(--bg)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor:
                        newCard.slug && newCard.name
                          ? "pointer"
                          : "not-allowed",
                      opacity: newCard.slug && newCard.name ? 1 : 0.5,
                    }}
                  >
                    Add card
                  </button>
                </fieldset>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}

interface CardEditorProps {
  card: DeckCard;
  onSave: (patch: Partial<DeckCard>) => void;
  onCancel: () => void;
}

function CardEditor({ card, onSave, onCancel }: CardEditorProps) {
  const [name, setName] = useState<string>(card.name);
  const [upright, setUpright] = useState<string>(card.upright_meaning ?? "");
  const [reversed, setReversed] = useState<string>(
    card.reversed_meaning ?? "",
  );
  return (
    <div data-role="card-editor">
      <label style={{ display: "block", font: "var(--type-label)" }}>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", font: "var(--type-label)" }}>
        Upright meaning
        <textarea
          value={upright}
          onChange={(e) => setUpright(e.target.value)}
          rows={2}
          style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
        />
      </label>
      <label style={{ display: "block", font: "var(--type-label)" }}>
        Reversed meaning
        <textarea
          value={reversed}
          onChange={(e) => setReversed(e.target.value)}
          rows={2}
          style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() =>
            onSave({
              name,
              upright_meaning: upright,
              reversed_meaning: reversed,
            })
          }
          style={{
            ...smallButtonStyle,
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
          }}
        >
          Save
        </button>
        <button type="button" onClick={onCancel} style={smallButtonStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-2)",
  marginBottom: "var(--space-2)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
};

const smallButtonStyle: CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};
