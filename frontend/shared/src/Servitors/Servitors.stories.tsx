/**
 * Servitors surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ServitorListItem } from "./ServitorListItem.js";
import {
  SERVITOR_STATUS_ORDER,
  ServitorStatusPill,
} from "./ServitorStatusPill.js";
import {
  ServitorTaskCard,
  TASK_STATUS_ORDER,
} from "./ServitorTaskCard.js";

const meta = {
  title: "Servitors",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 360,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── ServitorStatusPill ───────────────────────────────────────────

export const StatusPills_All: Story = {
  name: "ServitorStatusPill · all four",
  render: () => (
    <Frame width={380}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SERVITOR_STATUS_ORDER.map((s) => (
          <ServitorStatusPill key={s} status={s} />
        ))}
      </div>
    </Frame>
  ),
};

// ─── ServitorListItem ─────────────────────────────────────────────

export const ListItem_ThresholdGuardian: Story = {
  name: "ServitorListItem · Threshold Guardian, feed elapsed",
  render: () => (
    <Frame width={320}>
      <ServitorListItem
        id="s1"
        name="The Threshold Guardian"
        kindLabel="Servitor"
        status="active"
        sigil="⚛"
        feedHint="Feeding elapsed"
        feedOverdue
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Egregore: Story = {
  name: "ServitorListItem · Lyceum egregore",
  render: () => (
    <Frame width={320}>
      <ServitorListItem
        id="s2"
        name="Lyceum study circle"
        kindLabel="Egregore"
        status="active"
        sigil="⨺"
        feedHint="Group feeding · 12 days"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Dormant: Story = {
  name: "ServitorListItem · dormant",
  render: () => (
    <Frame width={320}>
      <ServitorListItem
        id="s3"
        name="Quill servitor"
        kindLabel="Servitor"
        status="dormant"
        sigil="✶"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Decommissioned: Story = {
  name: "ServitorListItem · decommissioned (care palette)",
  render: () => (
    <Frame width={320}>
      <ServitorListItem
        id="s4"
        name="Old guard at the gate"
        kindLabel="Servitor"
        status="decommissioned"
        sigil="◇"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

// ─── ServitorTaskCard ─────────────────────────────────────────────

export const Task_Standing: Story = {
  name: "ServitorTaskCard · standing charge",
  render: () => (
    <Frame width={460}>
      <ServitorTaskCard
        id="t1"
        description="Hold the threshold against what is unwelcome."
        status="in-progress"
        meta="Standing charge · since 2 Feb"
      />
    </Frame>
  ),
};

export const Task_Completed_WithOutcome: Story = {
  name: "ServitorTaskCard · completed with outcome",
  render: () => (
    <Frame width={460}>
      <ServitorTaskCard
        id="t2"
        description="Convey a message to a friend in distress."
        status="completed"
        meta="Sent · 11 May 2026"
        outcome="They wrote the next day, calmer."
      />
    </Frame>
  ),
};

export const Task_Abandoned: Story = {
  name: "ServitorTaskCard · abandoned (care palette)",
  render: () => (
    <Frame width={460}>
      <ServitorTaskCard
        id="t3"
        description="Bind the lapsed contract."
        status="abandoned"
        meta="Stood down · 28 May"
        outcome="The contract was instead let lapse on its own."
      />
    </Frame>
  ),
};

export const Task_AllStatuses: Story = {
  name: "ServitorTaskCard · all four statuses",
  render: () => (
    <Frame width={460}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 9 }}
      >
        {TASK_STATUS_ORDER.map((s, i) => (
          <ServitorTaskCard
            key={s}
            id={`t-${i}`}
            description={`Sample task for status: ${s}.`}
            status={s}
            meta={`Status example — ${s}`}
          />
        ))}
      </div>
    </Frame>
  ),
};
