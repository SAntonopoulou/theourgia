/**
 * RelationshipStatusPill stories — one pill per declared status,
 * laid out in a single column for visual baseline comparison.
 */
import type { Meta, StoryObj } from "@storybook/react";

import type { EntityRelationshipStatus } from "../api/types.js";
import { RelationshipStatusPill } from "./RelationshipStatusPill.js";

const meta = {
  title: "RelationshipStatusPill",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      background: "var(--bg)",
      color: "var(--ink-soft)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      alignItems: "flex-start",
    }}
  >
    {children}
  </div>
);

const ALL: EntityRelationshipStatus[] = [
  "active",
  "open",
  "contracted",
  "observing",
  "dormant",
  "severed",
];

export const AllStates: Story = {
  name: "All six states",
  render: () => (
    <Frame>
      {ALL.map((status) => (
        <RelationshipStatusPill key={status} status={status} />
      ))}
    </Frame>
  ),
};

export const Severed_CarePalette: Story = {
  name: "Severed — care palette, not red",
  render: () => (
    <Frame>
      <RelationshipStatusPill status="severed" />
    </Frame>
  ),
};

export const LabelOverride: Story = {
  name: "Custom label",
  render: () => (
    <Frame>
      <RelationshipStatusPill status="active" label="Currently working" />
    </Frame>
  ),
};
