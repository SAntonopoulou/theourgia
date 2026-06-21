/**
 * Button — every variant × every size, plus the loading and icon slots.
 *
 * Stories cover what Foundations spec promises:
 *   primary / secondary / ghost / danger / quiet
 *   sm / md / lg
 *   iconStart / iconEnd / both
 *   loading dim state
 *   disabled state
 *
 * Switch the Tradition + Mode globals in the Storybook toolbar to verify
 * every variant survives the four theme axes intact.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./Button.js";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Press to seal",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger", "quiet"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    iconStart: { control: "text" },
    iconEnd: { control: "text" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger", children: "Archive working" } };
export const Quiet: Story = { args: { variant: "quiet", children: "Edit" } };

export const Small: Story = { args: { variant: "primary", size: "sm" } };
export const Medium: Story = { args: { variant: "primary", size: "md" } };
export const Large: Story = { args: { variant: "primary", size: "lg" } };

export const WithStartIcon: Story = {
  args: { variant: "primary", iconStart: "candle", children: "Begin the work" },
};

export const Loading: Story = {
  args: { variant: "primary", loading: true, children: "Saving…" },
};

export const Disabled: Story = {
  args: { variant: "primary", disabled: true, children: "Not yet sealed" },
};

/**
 * Side-by-side: every variant at the default size, on the active surface.
 * Use this story to spot palette-token drift across themes.
 */
export const VariantRow: Story = {
  args: { children: "Variant" },
  render: () => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="quiet">Quiet</Button>
    </div>
  ),
};

/**
 * Every size in one frame so heights (30 / 38 / 46) read cleanly.
 */
export const SizeRow: Story = {
  args: { children: "Size" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
