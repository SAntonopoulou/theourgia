/**
 * Progress — value-over-max bar with optional label, or an animated
 * indeterminate state when ``value`` is omitted.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Progress } from "./Progress.js";

const meta = {
  title: "Primitives/Progress",
  component: Progress,
  tags: ["autodocs"],
  args: { value: 60, max: 100, label: "Reading · The Hymns of Orpheus" },
  argTypes: {
    size: { control: "radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Half: Story = {};

export const Small: Story = { args: { value: 40, size: "sm" } };

export const Complete: Story = { args: { value: 100, label: "Sealed" } };

export const Indeterminate: Story = {
  args: { value: undefined, label: "Federation probe in flight", ariaLabel: "Loading…" },
};

export const Series: Story = {
  args: { value: 0, label: "" },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
      <Progress value={20} label="Cleansing · Sage smoke" />
      <Progress value={55} label="Invocation · Names sung" />
      <Progress value={85} label="Charge · Sigil held" />
      <Progress value={100} label="Banishing · The circle closed" />
    </div>
  ),
};
