/**
 * Stat — a single metric: label, value, optional sparkline + delta.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Stat } from "./Stat.js";

const meta = {
  title: "Primitives/Stat",
  component: Stat,
  tags: ["autodocs"],
  args: { label: "Entries this lunation", value: 14 },
  argTypes: {
    tone: { control: "select", options: ["neutral", "positive", "negative"] },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const WithDelta: Story = {
  args: { label: "Hub members", value: 213, delta: 12, tone: "positive", deltaUnit: "this month" },
};

export const NegativeDelta: Story = {
  args: { label: "Federation peers", value: 7, delta: -2, tone: "negative", deltaUnit: "since Wednesday" },
};

export const WithSparkline: Story = {
  args: {
    label: "Cadence (entries / day)",
    value: 1.4,
    spark: [0, 1, 2, 1, 0, 2, 3, 1, 2, 1, 0, 2, 4, 1, 2],
    delta: 0.3,
    tone: "positive",
  },
};

export const Row: Story = {
  args: { label: "", value: "" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <Stat label="Entries this lunation" value={14} delta={3} tone="positive" deltaUnit="" />
      <Stat label="Synchronicities" value={6} delta={-1} tone="negative" deltaUnit="vs. last lunation" />
      <Stat label="Library reads" value={28} delta={0} tone="neutral" />
    </div>
  ),
};
