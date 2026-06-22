/**
 * Oaths surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { OathCard, type OathRecord } from "./OathCard.js";
import {
  OATH_STATUS_ORDER,
  OathStatusPill,
} from "./OathStatusPill.js";

const meta = {
  title: "Oaths",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 460,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── OathStatusPill ───────────────────────────────────────────────

export const StatusPills_All: Story = {
  name: "OathStatusPill · all five",
  render: () => (
    <Frame width={360}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {OATH_STATUS_ORDER.map((s) => (
          <OathStatusPill key={s} status={s} />
        ))}
      </div>
    </Frame>
  ),
};

export const StatusPill_Broken: Story = {
  name: "OathStatusPill · broken (care palette, no red)",
  render: () => (
    <Frame width={140}>
      <OathStatusPill status="broken" />
    </Frame>
  ),
};

// ─── OathCard ─────────────────────────────────────────────────────

const dailyPractice: OathRecord = {
  id: "o1",
  title: "Daily morning practice",
  meta: "To self · taken 1 Jan 2026 · monthly renewal",
  status: "active",
  sealed: true,
  text: "I rise before the sun and adore the dawn, every day, this year.",
  checkpointDue: "Due in 3 days · monthly reflection",
};

const silenceOath: OathRecord = {
  id: "o2",
  title: "Vow of silence on the rite",
  meta: "To the tradition · taken 12 May 2026",
  status: "active",
  sealed: true,
  text: "What I learn in the inner chamber stays in the inner chamber.",
};

const visibleOath: OathRecord = {
  id: "o3",
  title: "Pledge to attend the Beltane fire",
  meta: "To the coven · taken 1 May 2025",
  status: "fulfilled",
  sealed: false,
  text: "I will be there, no matter the weather, every year I can.",
};

const overdue: OathRecord = {
  ...dailyPractice,
  id: "o4",
  checkpointDue: "Overdue · monthly reflection 2 days past",
  checkpointOverdue: true,
};

const broken: OathRecord = {
  id: "o5",
  title: "Three-month abstention",
  meta: "To self · taken 1 Mar 2026 · ended",
  status: "broken",
  sealed: true,
};

const Toggleable = ({ initial }: { initial: OathRecord }) => {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <Frame>
      <OathCard
        oath={initial}
        unlockedForSession={unlocked}
        onRequestUnlock={() => setUnlocked(true)}
        onReviewCheckpoint={() => {}}
      />
    </Frame>
  );
};

export const Card_Sealed_Locked: Story = {
  name: "OathCard · sealed (locked) · active",
  render: () => <Toggleable initial={dailyPractice} />,
};

export const Card_Visible_Fulfilled: Story = {
  name: "OathCard · not sealed · fulfilled",
  render: () => (
    <Frame>
      <OathCard oath={visibleOath} />
    </Frame>
  ),
};

export const Card_OverdueCheckpoint: Story = {
  name: "OathCard · overdue checkpoint",
  render: () => (
    <Frame>
      <OathCard
        oath={overdue}
        onReviewCheckpoint={() => {}}
        onRequestUnlock={() => {}}
      />
    </Frame>
  ),
};

export const Card_Broken_Sealed: Story = {
  name: "OathCard · broken · sealed (care palette only)",
  render: () => (
    <Frame>
      <OathCard oath={broken} onRequestUnlock={() => {}} />
    </Frame>
  ),
};

export const Card_SilenceOath_Unlocked: Story = {
  name: "OathCard · silence vow, unlocked",
  render: () => (
    <Frame>
      <OathCard oath={silenceOath} unlockedForSession />
    </Frame>
  ),
};
