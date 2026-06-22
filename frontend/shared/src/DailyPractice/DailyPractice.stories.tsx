/**
 * Daily Practice Tracker — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import type { CompletionStatus } from "../practice/index.js";
import { DailyPracticeTracker, type DailyPractice } from "./DailyPracticeTracker.js";
import { DefinePracticeDrawer } from "./DefinePracticeDrawer.js";
import { Last7DaysDots } from "./Last7DaysDots.js";
import { PracticeCard } from "./PracticeCard.js";
import { PracticeStatusIcon } from "./PracticeStatusIcon.js";
import { StreakGrid35 } from "./StreakGrid35.js";
import { TodayStatusChip } from "./TodayStatusChip.js";

const meta = {
  title: "DailyPractice",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Deterministic 35-day history matching the mockup's `hist(seed, density)`
// generator (lines 273-282). Seed 2 / density 0.74 — Morning grounding.
function mockHistory(seed: number, density: number): CompletionStatus[] {
  const out: CompletionStatus[] = [];
  for (let d = 0; d < 35; d++) {
    const r = ((d * 13 + seed * 7 + 3) % 17) / 17;
    if (r < density) out.push("done");
    else if (r < density + 0.12) out.push("skip");
    else out.push("miss");
  }
  return out;
}

const Frame = ({ children, width = 1040 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ background: "var(--bg)", color: "var(--ink)", padding: 16, maxWidth: width }}>
    {children}
  </div>
);

// ─── Tier 1 surface ──────────────────────────────────────────────

const morningGrounding: DailyPractice = {
  id: "grounding",
  name: "Morning grounding",
  cadenceHuman: "Daily at dawn",
  intention:
    "Begin the day on my own ground before anything is asked of me.",
  entity: null,
  status: "pending",
  streak: 12,
  streakLabel: "day streak",
  history: mockHistory(2, 0.74),
};

const devotionToHekate: DailyPractice = {
  id: "hekate",
  name: "Devotion to Hekate",
  cadenceHuman: "Every dark moon",
  intention: "Tend the crossroads; keep the lamp lit.",
  entity: { name: "Hekate", glyph: "☽" },
  status: "done",
  streak: 6,
  streakLabel: "kept in a row",
  history: mockHistory(5, 0.92),
};

const banishingBeforeSleep: DailyPractice = {
  id: "lbrp",
  name: "Banishing before sleep",
  cadenceHuman: "Daily before sleep",
  intention: null,
  entity: { name: "The Threshold Guardian", glyph: "⛧" },
  status: "done",
  streak: 4,
  streakLabel: "day streak",
  history: mockHistory(9, 0.6),
};

export const Populated: Story = {
  name: "DailyPracticeTracker · populated (three practices)",
  render: () => (
    <Frame>
      <DailyPracticeTracker
        practices={[morningGrounding, devotionToHekate, banishingBeforeSleep]}
        todayLong="Sunday, 22 June 2026"
        hourChip="Sun — 14:30"
        beings={["Hekate", "Hermes", "The Threshold Guardian"]}
      />
    </Frame>
  ),
};

export const Empty: Story = {
  name: "DailyPracticeTracker · empty state",
  render: () => (
    <Frame>
      <DailyPracticeTracker practices={[]} />
    </Frame>
  ),
};

// ─── Sub-primitives ──────────────────────────────────────────────

export const StreakGrid_AllDone: Story = {
  name: "StreakGrid35 · all kept (35 done)",
  render: () => (
    <Frame width={260}>
      <StreakGrid35 history={Array.from({ length: 35 }, () => "done")} />
    </Frame>
  ),
};

export const StreakGrid_Mixed: Story = {
  name: "StreakGrid35 · mixed (mockup default)",
  render: () => (
    <Frame width={260}>
      <StreakGrid35 history={mockHistory(2, 0.74)} />
    </Frame>
  ),
};

export const Last7_AllDone: Story = {
  name: "Last7DaysDots · all kept",
  render: () => (
    <Frame width={260}>
      <Last7DaysDots history={Array.from({ length: 7 }, () => "done")} />
    </Frame>
  ),
};

export const Last7_Mixed: Story = {
  name: "Last7DaysDots · mixed (done · skip · miss)",
  render: () => (
    <Frame width={260}>
      <Last7DaysDots
        history={["done", "done", "skip", "miss", "done", "miss", "done"]}
      />
    </Frame>
  ),
};

export const StatusIcons_AllThree: Story = {
  name: "PracticeStatusIcon · done · skipped · pending",
  render: () => (
    <Frame width={200}>
      <div style={{ display: "flex", gap: 14 }}>
        <PracticeStatusIcon status="done" />
        <PracticeStatusIcon status="skipped" />
        <PracticeStatusIcon status="pending" />
      </div>
    </Frame>
  ),
};

export const TodayChips_AllThree: Story = {
  name: "TodayStatusChip · all three statuses",
  render: () => (
    <Frame width={520}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <TodayStatusChip name="Morning grounding" status="done" />
        <TodayStatusChip name="Devotion to Hekate" status="skipped" />
        <TodayStatusChip name="Banishing before sleep" status="pending" />
      </div>
    </Frame>
  ),
};

// ─── PracticeCard variants ───────────────────────────────────────

export const Card_Pending: Story = {
  name: "PracticeCard · pending (Mark complete + Note a skip)",
  render: () => (
    <Frame>
      <PracticeCard
        id="grounding"
        name="Morning grounding"
        cadenceHuman="Daily at dawn"
        intention="Begin the day on my own ground before anything is asked of me."
        status="pending"
        streak={12}
        streakLabel="day streak"
        history={mockHistory(2, 0.74)}
      />
    </Frame>
  ),
};

export const Card_Done: Story = {
  name: "PracticeCard · done (Undo + Kept-today copy)",
  render: () => (
    <Frame>
      <PracticeCard
        id="hekate"
        name="Devotion to Hekate"
        cadenceHuman="Every dark moon"
        intention="Tend the crossroads; keep the lamp lit."
        entity={{ name: "Hekate", glyph: "☽" }}
        status="done"
        streak={6}
        streakLabel="kept in a row"
        history={mockHistory(5, 0.92)}
      />
    </Frame>
  ),
};

export const Card_Skipped: Story = {
  name: "PracticeCard · skipped (the wellbeing copy, never red)",
  render: () => (
    <Frame>
      <PracticeCard
        id="lbrp"
        name="Banishing before sleep"
        cadenceHuman="Daily before sleep"
        entity={{ name: "The Threshold Guardian", glyph: "⛧" }}
        status="skipped"
        streak={0}
        streakLabel="day streak"
        history={mockHistory(9, 0.6)}
      />
    </Frame>
  ),
};

// ─── Drawer ──────────────────────────────────────────────────────

export const Drawer_Open: Story = {
  name: "DefinePracticeDrawer · open with defaults",
  render: () => (
    <Frame>
      <div style={{ position: "relative", minHeight: 600 }}>
        <DefinePracticeDrawer
          open
          onClose={() => {}}
          beings={["Hekate", "Hermes", "The Threshold Guardian"]}
        />
      </div>
    </Frame>
  ),
};
