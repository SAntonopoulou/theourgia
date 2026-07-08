/**
 * Deck + spread designer route — b108-2hc.
 *
 * Tabs between DeckDesignerSurface + SpreadDesignerSurface.
 * All prompts + confirmations use shared modals — no native
 * window.alert / prompt / confirm (per the UI modals-only rule).
 */

import {
  ConfirmDialog,
  DeckDesignerSurface,
  type DeckCard,
  type DeckDetail,
  type DeckSummary,
  PromptDialog,
  SpreadDesignerSurface,
  type SpreadDetail,
  type SpreadSummary,
  Skeleton,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { apiMethods } from "../data/api.js";

type Tab = "decks" | "spreads";

function toastOk(title: string): void {
  Toast.push({ tone: "success", title });
}

function toastError(title: string, body: unknown): void {
  Toast.push({
    tone: "warning",
    title,
    body: body instanceof Error ? body.message : String(body ?? ""),
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function DeckDesignerRoute() {
  useTopbar(
    () => ({
      title: "Deck & spread designer",
      subtitle: "Build custom tarot / oracle decks and reading spreads",
    }),
    [],
  );

  const [tab, setTab] = useState<Tab>("decks");
  const [loading, setLoading] = useState<boolean>(true);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeck, setActiveDeck] = useState<DeckDetail | null>(null);
  const [spreads, setSpreads] = useState<SpreadSummary[]>([]);
  const [activeSpread, setActiveSpread] = useState<SpreadDetail | null>(null);

  // Modal state.
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const [creatingSpread, setCreatingSpread] = useState<boolean>(false);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [deletingSpreadId, setDeletingSpreadId] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    try {
      const rows = (await apiMethods.listTarotDecks()) as unknown as DeckSummary[];
      setDecks(rows);
    } catch (e) {
      toastError("Could not load decks", e);
    }
  }, []);

  const loadSpreads = useCallback(async () => {
    try {
      const rows = (await apiMethods.listTarotSpreads()) as unknown as SpreadSummary[];
      setSpreads(rows);
    } catch (e) {
      toastError("Could not load spreads", e);
    }
  }, []);

  const loadDeckDetail = useCallback(async (id: string) => {
    try {
      const row = (await apiMethods.getTarotDeck(id)) as unknown as DeckDetail;
      setActiveDeck(row);
    } catch (e) {
      toastError("Could not load deck", e);
    }
  }, []);

  const loadSpreadDetail = useCallback(async (id: string) => {
    try {
      const row = (await apiMethods.getTarotSpread(id)) as unknown as SpreadDetail;
      setActiveSpread(row);
    } catch (e) {
      toastError("Could not load spread", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadDecks(), loadSpreads()]).finally(() =>
      setLoading(false),
    );
  }, [loadDecks, loadSpreads]);

  // ── deck actions ─────────────────────────────────────────────

  const handleCreateDeckSubmit = useCallback(
    async (name: string) => {
      setCreatingDeck(false);
      try {
        const created = (await apiMethods.createTarotDeck({
          name,
          slug: slugify(name) || "deck",
          cards: [
            {
              position: 0,
              slug: "placeholder",
              name: "Placeholder card",
              suit: "major",
            },
          ],
        })) as unknown as DeckDetail;
        await loadDecks();
        setActiveDeck(created);
        toastOk("Deck created");
      } catch (e) {
        toastError("Could not create deck", e);
      }
    },
    [loadDecks],
  );

  const confirmDeleteDeck = useCallback(async () => {
    if (!deletingDeckId) return;
    const id = deletingDeckId;
    setDeletingDeckId(null);
    try {
      await apiMethods.deleteTarotDeck(id);
      await loadDecks();
      if (activeDeck?.id === id) setActiveDeck(null);
      toastOk("Deck deleted");
    } catch (e) {
      toastError("Could not delete deck", e);
    }
  }, [activeDeck, deletingDeckId, loadDecks]);

  const handleSaveDeckMetadata = useCallback(
    async (patch: Partial<DeckDetail>) => {
      if (!activeDeck) return;
      try {
        await apiMethods.updateTarotDeck(
          activeDeck.id,
          patch as Record<string, unknown>,
        );
        await loadDeckDetail(activeDeck.id);
      } catch (e) {
        toastError("Could not save", e);
      }
    },
    [activeDeck, loadDeckDetail],
  );

  const handleAddCard = useCallback(
    async (card: DeckCard) => {
      if (!activeDeck) return;
      try {
        await apiMethods.addTarotCard(
          activeDeck.id,
          card as unknown as Record<string, unknown>,
        );
        await loadDeckDetail(activeDeck.id);
        await loadDecks();
        toastOk("Card added");
      } catch (e) {
        toastError("Could not add card", e);
      }
    },
    [activeDeck, loadDeckDetail, loadDecks],
  );

  const handleUpdateCard = useCallback(
    async (cardId: string, patch: Partial<DeckCard>) => {
      if (!activeDeck) return;
      try {
        await apiMethods.updateTarotCard(
          cardId,
          patch as Record<string, unknown>,
        );
        await loadDeckDetail(activeDeck.id);
        toastOk("Card saved");
      } catch (e) {
        toastError("Could not save card", e);
      }
    },
    [activeDeck, loadDeckDetail],
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!activeDeck) return;
      try {
        await apiMethods.deleteTarotCard(cardId);
        await loadDeckDetail(activeDeck.id);
        await loadDecks();
        toastOk("Card deleted");
      } catch (e) {
        toastError("Could not delete card", e);
      }
    },
    [activeDeck, loadDeckDetail, loadDecks],
  );

  // ── spread actions ────────────────────────────────────────────

  const handleCreateSpreadSubmit = useCallback(
    async (name: string) => {
      setCreatingSpread(false);
      try {
        const created = (await apiMethods.createTarotSpread({
          name,
          slug: slugify(name) || "spread",
          kind: "custom",
          positions: [{ index: 0, name: "Position 1", x: 50, y: 50 }],
        })) as unknown as SpreadDetail;
        await loadSpreads();
        setActiveSpread(created);
        toastOk("Spread created");
      } catch (e) {
        toastError("Could not create spread", e);
      }
    },
    [loadSpreads],
  );

  const confirmDeleteSpread = useCallback(async () => {
    if (!deletingSpreadId) return;
    const id = deletingSpreadId;
    setDeletingSpreadId(null);
    try {
      await apiMethods.deleteTarotSpread(id);
      await loadSpreads();
      if (activeSpread?.id === id) setActiveSpread(null);
      toastOk("Spread deleted");
    } catch (e) {
      toastError("Could not delete spread", e);
    }
  }, [activeSpread, deletingSpreadId, loadSpreads]);

  const handleSaveSpread = useCallback(
    async (patch: Partial<SpreadDetail>) => {
      if (!activeSpread) return;
      try {
        await apiMethods.updateTarotSpread(
          activeSpread.id,
          patch as Record<string, unknown>,
        );
        await loadSpreadDetail(activeSpread.id);
        toastOk("Spread saved");
      } catch (e) {
        toastError("Could not save spread", e);
      }
    },
    [activeSpread, loadSpreadDetail],
  );

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <Skeleton kind="text" width="60%" />
        <Skeleton kind="text" width="80%" />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-4)" }} data-route="deck-designer">
      <nav
        role="tablist"
        style={{
          display: "flex",
          gap: 8,
          marginBottom: "var(--space-4)",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "decks"}
          onClick={() => setTab("decks")}
          style={tabStyle(tab === "decks")}
        >
          Decks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "spreads"}
          onClick={() => setTab("spreads")}
          style={tabStyle(tab === "spreads")}
        >
          Spreads
        </button>
      </nav>

      {tab === "decks" ? (
        <DeckDesignerSurface
          decks={decks}
          activeDeck={activeDeck}
          onSelectDeck={(id) => void loadDeckDetail(id)}
          onCreateDeck={() => setCreatingDeck(true)}
          onDeleteDeck={(id) => setDeletingDeckId(id)}
          onSaveDeckMetadata={(p) => void handleSaveDeckMetadata(p)}
          onAddCard={(c) => void handleAddCard(c)}
          onUpdateCard={(id, p) => void handleUpdateCard(id, p)}
          onDeleteCard={(id) => void handleDeleteCard(id)}
        />
      ) : (
        <SpreadDesignerSurface
          spreads={spreads}
          activeSpread={activeSpread}
          onSelectSpread={(id) => void loadSpreadDetail(id)}
          onCreateSpread={() => setCreatingSpread(true)}
          onDeleteSpread={(id) => setDeletingSpreadId(id)}
          onSaveSpread={(p) => void handleSaveSpread(p)}
        />
      )}

      <PromptDialog
        open={creatingDeck}
        title="New deck"
        label="Deck name"
        placeholder="e.g. My Marseille Deck"
        confirmLabel="Create"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        onSubmit={(v) => void handleCreateDeckSubmit(v.trim())}
        onCancel={() => setCreatingDeck(false)}
      />
      <PromptDialog
        open={creatingSpread}
        title="New spread"
        label="Spread name"
        placeholder="e.g. Three-Card Reflection"
        confirmLabel="Create"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        onSubmit={(v) => void handleCreateSpreadSubmit(v.trim())}
        onCancel={() => setCreatingSpread(false)}
      />
      <ConfirmDialog
        open={deletingDeckId !== null}
        tone="destructive"
        title="Delete this deck?"
        body="This action can't be undone. All cards in the deck are removed too."
        confirmLabel="Delete deck"
        onConfirm={() => void confirmDeleteDeck()}
        onCancel={() => setDeletingDeckId(null)}
      />
      <ConfirmDialog
        open={deletingSpreadId !== null}
        tone="destructive"
        title="Delete this spread?"
        body="This action can't be undone."
        confirmLabel="Delete spread"
        onConfirm={() => void confirmDeleteSpread()}
        onCancel={() => setDeletingSpreadId(null)}
      />
    </div>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "var(--space-2) var(--space-3)",
    background: active ? "var(--bg-2)" : "transparent",
    color: active ? "var(--accent)" : "var(--ink)",
    border: "1px solid var(--line-2)",
    borderBottom: active ? "2px solid var(--accent)" : "1px solid var(--line-2)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    font: "var(--type-label)",
  };
}
