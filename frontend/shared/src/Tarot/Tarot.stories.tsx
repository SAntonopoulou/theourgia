/**
 * Tarot — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { buildDeck, drawSpread } from "../divination/index.js";
import { CardReadingRail } from "./CardReadingRail.js";
import { DeckPicker } from "./DeckPicker.js";
import { QuestionBanner } from "./QuestionBanner.js";
import { SpreadBoard } from "./SpreadBoard.js";
import { SpreadPicker } from "./SpreadPicker.js";
import { TarotCardFace } from "./TarotCardFace.js";
import { TarotHistoryRow } from "./TarotHistoryRow.js";
import { TarotSurface } from "./TarotSurface.js";

const meta = {
  title: "Tarot",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 1200,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div
    style={{
      background: "var(--bg)",
      color: "var(--ink)",
      padding: 16,
      maxWidth: width,
    }}
  >
    {children}
  </div>
);

const deck = buildDeck();
const fool = deck[0]!;
const aceOfWands = deck[22]!;
const tower = deck.find((c) => c.name === "The Tower")!;

// ─── Sub-primitives ──────────────────────────────────────────────

export const CardFace_Major: Story = {
  name: "TarotCardFace · Major Arcana (The Fool)",
  render: () => (
    <Frame width={200}>
      <TarotCardFace card={fool} width={120} />
    </Frame>
  ),
};

export const CardFace_Minor: Story = {
  name: "TarotCardFace · Minor Arcana (Ace of Wands)",
  render: () => (
    <Frame width={200}>
      <TarotCardFace card={aceOfWands} width={120} />
    </Frame>
  ),
};

export const CardFace_Reversed: Story = {
  name: "TarotCardFace · reversed (the gentle ⟲, never red)",
  render: () => (
    <Frame width={200}>
      <TarotCardFace card={tower} width={120} reversed />
    </Frame>
  ),
};

export const CardFace_FaceDown: Story = {
  name: "TarotCardFace · face-down",
  render: () => (
    <Frame width={200}>
      <TarotCardFace card={fool} width={120} faceDown />
    </Frame>
  ),
};

export const CardFace_Selected: Story = {
  name: "TarotCardFace · selected (accent ring)",
  render: () => (
    <Frame width={200}>
      <TarotCardFace card={fool} width={120} selected />
    </Frame>
  ),
};

export const DeckPicker_RWS: Story = {
  name: "DeckPicker · Rider–Waite–Smith (PD)",
  render: () => (
    <Frame width={320}>
      <DeckPicker />
    </Frame>
  ),
};

export const SpreadPicker_AllFive: Story = {
  name: "SpreadPicker · all five spreads, three-card active",
  render: () => (
    <Frame width={520}>
      <SpreadPicker value="three" onChange={() => {}} />
    </Frame>
  ),
};

export const QuestionBanner_WithEdit: Story = {
  name: "QuestionBanner · with Edit",
  render: () => (
    <Frame width={620}>
      <QuestionBanner
        question="Should I bring the working forward to the solstice?"
        onEdit={() => {}}
      />
    </Frame>
  ),
};

// ─── Spread boards ───────────────────────────────────────────────

export const Board_Three: Story = {
  name: "SpreadBoard · three-card (Past · Present · Future)",
  render: () => (
    <Frame width={620}>
      <SpreadBoard
        spread="three"
        drawn={drawSpread("three", 42)}
        selected={1}
      />
    </Frame>
  ),
};

export const Board_Celtic: Story = {
  name: "SpreadBoard · Celtic Cross (10 positions, Crossing rotated)",
  render: () => (
    <Frame width={800}>
      <SpreadBoard
        spread="celtic"
        drawn={drawSpread("celtic", 42)}
        selected={0}
      />
    </Frame>
  ),
};

export const Board_Year: Story = {
  name: "SpreadBoard · Year ahead (12-month wheel + centre)",
  render: () => (
    <Frame width={800}>
      <SpreadBoard
        spread="year"
        drawn={drawSpread("year", 42)}
        selected={12}
      />
    </Frame>
  ),
};

// ─── Reading rail ────────────────────────────────────────────────

export const Rail_Ready: Story = {
  name: "CardReadingRail · ready (empty prompt)",
  render: () => (
    <Frame width={420}>
      <CardReadingRail drawn={null} />
    </Frame>
  ),
};

export const Rail_Drawn: Story = {
  name: "CardReadingRail · drawn card with Waite citation",
  render: () => {
    const draw = drawSpread("three", 42);
    return (
      <Frame width={420}>
        <CardReadingRail drawn={draw[0]} />
      </Frame>
    );
  },
};

export const Rail_Reversed: Story = {
  name: "CardReadingRail · reversed card (pill, never red)",
  render: () => {
    const draw = drawSpread("three", 42);
    const reversed = { ...draw[0]!, reversed: true };
    return (
      <Frame width={420}>
        <CardReadingRail drawn={reversed} />
      </Frame>
    );
  },
};

// ─── History row ─────────────────────────────────────────────────

export const HistoryRow_Single: Story = {
  name: "TarotHistoryRow · single past reading",
  render: () => (
    <Frame width={720}>
      <TarotHistoryRow
        date="19 Jun 2026"
        title="On whether to keep the oath sealed"
        cardsLine="The Hermit · The Moon · The Star"
        spreadLabel="Three-card"
      />
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "TarotSurface · default three-card draw",
  render: () => (
    <Frame width={1200}>
      <TarotSurface />
    </Frame>
  ),
};

export const Surface_History: Story = {
  name: "TarotSurface · History view",
  render: () => (
    <Frame width={1200}>
      <TarotSurface
        view="history"
        pastReadings={[
          {
            id: "r1",
            date: "19 Jun 2026",
            title: "On whether to keep the oath sealed",
            cardsLine: "The Hermit · The Moon · The Star",
            spreadKind: "three",
          },
          {
            id: "r2",
            date: "12 Jun 2026",
            title: "The Beltane working, in review",
            cardsLine: "Wheel of Fortune (rev) · The Tower · The Sun · …",
            spreadKind: "celtic",
          },
          {
            id: "r3",
            date: "29 May 2026",
            title: "A single card for the dark moon",
            cardsLine: "The High Priestess",
            spreadKind: "single",
          },
        ]}
      />
    </Frame>
  ),
};
