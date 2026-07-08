import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { DeckDesignerSurface, type DeckDetail } from "./DeckDesignerSurface.js";
import {
  SpreadDesignerSurface,
  type SpreadDetail,
} from "./SpreadDesignerSurface.js";

const sampleDecks = [
  {
    id: "d1",
    name: "My Personal Deck",
    slug: "personal",
    card_count: 78,
    is_builtin: false,
    language: "en",
    tradition: "custom",
  },
  {
    id: "d2",
    name: "Rider-Waite",
    slug: "rider-waite",
    card_count: 78,
    is_builtin: true,
    language: "en",
    tradition: "rider_waite",
  },
];

const sampleDeck: DeckDetail = {
  id: "d1",
  name: "My Personal Deck",
  slug: "personal",
  card_count: 3,
  is_builtin: false,
  language: "en",
  tradition: "custom",
  creator: "me",
  license: "CC-BY",
  description: "notes",
  reversal_convention: true,
  cards: [
    {
      id: "c1",
      position: 0,
      slug: "the-fool",
      name: "The Fool",
      suit: "major",
      arcana_number: 0,
    },
    {
      id: "c2",
      position: 1,
      slug: "the-magician",
      name: "The Magician",
      suit: "major",
      arcana_number: 1,
    },
    {
      id: "c3",
      position: 22,
      slug: "ace-wands",
      name: "Ace of Wands",
      suit: "wands",
    },
  ],
};

const builtinDeck: DeckDetail = { ...sampleDeck, id: "d2", is_builtin: true };

describe("DeckDesignerSurface", () => {
  it("renders one entry per deck in the sidebar", () => {
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={null}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    const buttons = container.querySelectorAll(
      '[data-role="deck-list"] button[data-active]',
    );
    expect(buttons).toHaveLength(sampleDecks.length);
  });

  it("marks the active deck via data-active", () => {
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={sampleDeck}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    const active = container.querySelector('button[data-active="true"]');
    expect(active?.textContent).toContain("My Personal Deck");
  });

  it("renders every card of the active deck", () => {
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={sampleDeck}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    const items = container.querySelectorAll(
      '[data-role="cards"] li[data-card-id]',
    );
    expect(items).toHaveLength(sampleDeck.cards.length);
  });

  it("cards render in ascending position order", () => {
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={sampleDeck}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    const items = Array.from(
      container.querySelectorAll('[data-role="cards"] li[data-card-id]'),
    );
    expect(items[0]?.getAttribute("data-card-id")).toBe("c1");
    expect(items[2]?.getAttribute("data-card-id")).toBe("c3");
  });

  it("disables card-editing fieldsets for built-in decks", () => {
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={builtinDeck}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={vi.fn()}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    // No "Add card" fieldset when read-only.
    expect(
      container.querySelector('fieldset[data-role="new-card"]'),
    ).toBeNull();
    // Metadata fieldset is present but disabled.
    const meta = container.querySelector(
      'fieldset[data-role="deck-metadata"]',
    );
    expect(meta?.getAttribute("disabled")).not.toBeNull();
  });

  it("onAddCard fires with the composed card when filled", () => {
    const onAddCard = vi.fn();
    const { container } = render(
      <DeckDesignerSurface
        decks={sampleDecks}
        activeDeck={sampleDeck}
        onSelectDeck={vi.fn()}
        onCreateDeck={vi.fn()}
        onDeleteDeck={vi.fn()}
        onSaveDeckMetadata={vi.fn()}
        onAddCard={onAddCard}
        onUpdateCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />,
    );
    const [_pos, slug, name] = container.querySelectorAll(
      '[data-role="new-card"] input',
    );
    fireEvent.change(slug!, { target: { value: "two-cups" } });
    fireEvent.change(name!, { target: { value: "Two of Cups" } });
    const addBtn = Array.from(
      container.querySelectorAll('[data-role="new-card"] button'),
    ).find((b) => b.textContent === "Add card") as HTMLButtonElement;
    fireEvent.click(addBtn);
    expect(onAddCard).toHaveBeenCalledTimes(1);
    const arg = onAddCard.mock.calls[0]![0];
    expect(arg.slug).toBe("two-cups");
    expect(arg.name).toBe("Two of Cups");
  });
});

// ── Spread designer ───────────────────────────────────────────────

const sampleSpreads = [
  {
    id: "s1",
    name: "My Spread",
    slug: "mine",
    is_builtin: false,
    kind: "custom",
  },
  {
    id: "s2",
    name: "Celtic Cross",
    slug: "celtic-cross",
    is_builtin: true,
    kind: "celtic_cross",
  },
];

const sampleSpread: SpreadDetail = {
  id: "s1",
  name: "My Spread",
  slug: "mine",
  is_builtin: false,
  kind: "custom",
  description: null,
  positions: [
    { index: 0, name: "Past", x: 20, y: 50 },
    { index: 1, name: "Present", x: 50, y: 50 },
    { index: 2, name: "Future", x: 80, y: 50 },
  ],
  layout_json: {},
};

describe("SpreadDesignerSurface", () => {
  it("renders every spread in the sidebar", () => {
    const { container } = render(
      <SpreadDesignerSurface
        spreads={sampleSpreads}
        activeSpread={null}
        onSelectSpread={vi.fn()}
        onCreateSpread={vi.fn()}
        onDeleteSpread={vi.fn()}
        onSaveSpread={vi.fn()}
      />,
    );
    const buttons = container.querySelectorAll(
      '[data-role="spread-list"] button[data-active]',
    );
    expect(buttons).toHaveLength(sampleSpreads.length);
  });

  it("renders one canvas position per input position", () => {
    const { container } = render(
      <SpreadDesignerSurface
        spreads={sampleSpreads}
        activeSpread={sampleSpread}
        onSelectSpread={vi.fn()}
        onCreateSpread={vi.fn()}
        onDeleteSpread={vi.fn()}
        onSaveSpread={vi.fn()}
      />,
    );
    const positions = container.querySelectorAll("[data-position-index]");
    expect(positions).toHaveLength(sampleSpread.positions.length);
  });

  it("adding a position increases the count", () => {
    const { container } = render(
      <SpreadDesignerSurface
        spreads={sampleSpreads}
        activeSpread={sampleSpread}
        onSelectSpread={vi.fn()}
        onCreateSpread={vi.fn()}
        onDeleteSpread={vi.fn()}
        onSaveSpread={vi.fn()}
      />,
    );
    const addBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Add position",
    ) as HTMLButtonElement;
    fireEvent.click(addBtn);
    const positions = container.querySelectorAll("[data-position-index]");
    expect(positions).toHaveLength(sampleSpread.positions.length + 1);
  });

  it("onSaveSpread receives the edited positions when Save is clicked", () => {
    const onSaveSpread = vi.fn();
    const { container } = render(
      <SpreadDesignerSurface
        spreads={sampleSpreads}
        activeSpread={sampleSpread}
        onSelectSpread={vi.fn()}
        onCreateSpread={vi.fn()}
        onDeleteSpread={vi.fn()}
        onSaveSpread={onSaveSpread}
      />,
    );
    const addBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Add position",
    ) as HTMLButtonElement;
    fireEvent.click(addBtn);
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Save positions",
    ) as HTMLButtonElement;
    fireEvent.click(saveBtn);
    expect(onSaveSpread).toHaveBeenCalledTimes(1);
    const patch = onSaveSpread.mock.calls[0]![0];
    expect(patch.positions).toHaveLength(sampleSpread.positions.length + 1);
  });

  it("built-in spreads disable the edit controls", () => {
    const builtin: SpreadDetail = { ...sampleSpread, is_builtin: true };
    const { container } = render(
      <SpreadDesignerSurface
        spreads={sampleSpreads}
        activeSpread={builtin}
        onSelectSpread={vi.fn()}
        onCreateSpread={vi.fn()}
        onDeleteSpread={vi.fn()}
        onSaveSpread={vi.fn()}
      />,
    );
    // The name text inputs on each row should be disabled.
    const nameInputs = container.querySelectorAll(
      'input[type="text"][aria-label^="Position "]',
    );
    for (const inp of nameInputs) {
      expect((inp as HTMLInputElement).disabled).toBe(true);
    }
    // Add + Delete buttons not rendered.
    const addBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Add position",
    );
    expect(addBtn).toBeUndefined();
  });
});
