/**
 * Offerings surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  type ActivePractice,
  ActivePracticeCard,
} from "./ActivePracticeCard.js";
import {
  type OfferingRecord,
  OfferingTimelineCard,
} from "./OfferingTimelineCard.js";

const meta = {
  title: "Offerings",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 620,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── OfferingTimelineCard ─────────────────────────────────────────

const hekateDeipnon: OfferingRecord = {
  id: "o6",
  time: "23:30",
  entityName: "Hekate",
  reception: "overwhelming",
  items: [
    { kind: "food", label: "Food" },
    { kind: "wine", label: "Wine", qty: "1", unit: "cup" },
  ],
  intention: "Deipnon at the crossroads, the dark of the moon.",
  stamp: "Sun ☉ Gemini · dark moon · hour of Saturn",
};

const brigidGratitude: OfferingRecord = {
  id: "o3",
  time: "19:00",
  entityName: "Brigid",
  reception: "strong",
  items: [
    { kind: "milk", label: "Milk" },
    { kind: "flowers", label: "Flowers" },
  ],
  intention: "Gratitude for the mending of a long quarrel.",
  stamp: "Sun ☉ Gemini · waning crescent",
};

const yiayia: OfferingRecord = {
  id: "o5",
  time: "20:00",
  entityName: "Yiayia (María)",
  reception: "none",
  items: [
    { kind: "food", label: "Food" },
    { kind: "time", label: "Time" },
  ],
  intention: "Sunday remembrance at the kitchen ikon.",
  stamp: "Sun ☉ Gemini · waxing gibbous",
};

export const Timeline_Overwhelming: Story = {
  name: "Timeline · overwhelming reception (Hekate)",
  render: () => (
    <Frame>
      <OfferingTimelineCard
        offering={hekateDeipnon}
        onOpen={() => {}}
      />
    </Frame>
  ),
};

export const Timeline_Strong: Story = {
  name: "Timeline · strong reception (Brigid)",
  render: () => (
    <Frame>
      <OfferingTimelineCard
        offering={brigidGratitude}
        onOpen={() => {}}
      />
    </Frame>
  ),
};

export const Timeline_None: Story = {
  name: "Timeline · 'none' reception (care palette, never red)",
  render: () => (
    <Frame>
      <OfferingTimelineCard offering={yiayia} onOpen={() => {}} />
    </Frame>
  ),
};

export const Timeline_Day_Grouped: Story = {
  name: "Timeline · day-grouped stack",
  render: () => (
    <Frame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 11,
            }}
          >
            Today · 21 June
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 11,
            }}
          >
            <OfferingTimelineCard
              offering={hekateDeipnon}
              onOpen={() => {}}
            />
            <OfferingTimelineCard
              offering={brigidGratitude}
              onOpen={() => {}}
            />
          </div>
        </div>
      </div>
    </Frame>
  ),
};

// ─── ActivePracticeCard ───────────────────────────────────────────

const Toggleable = ({ initial }: { initial: ActivePractice }) => {
  const [practice, setPractice] = useState(initial);
  return (
    <Frame width={340}>
      <ActivePracticeCard
        practice={practice}
        onTogglePause={(active) => setPractice({ ...practice, active })}
        onRecord={() => {}}
      />
    </Frame>
  );
};

export const Practice_DeipnonSoon: Story = {
  name: "Practice · Deipnon (due soon, active)",
  render: () => (
    <Toggleable
      initial={{
        id: "p1",
        label: "Hekate's Deipnon",
        entityName: "Hekate",
        cadence: "Every dark moon",
        due: "Due in 2 days",
        soon: true,
        active: true,
      }}
    />
  ),
};

export const Practice_DailyLibation: Story = {
  name: "Practice · daily libation",
  render: () => (
    <Toggleable
      initial={{
        id: "p2",
        label: "Morning libation",
        entityName: "Agathos Daimon",
        cadence: "Daily at dawn",
        due: "Tomorrow · 06:00",
        soon: false,
        active: true,
      }}
    />
  ),
};

export const Practice_Paused: Story = {
  name: "Practice · paused (dimmed, calm)",
  render: () => (
    <Toggleable
      initial={{
        id: "p4",
        label: "Memorial candle",
        entityName: "Yiayia (María)",
        cadence: "Every Sunday",
        due: "In 4 days",
        soon: false,
        active: false,
      }}
    />
  ),
};
