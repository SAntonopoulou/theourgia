/**
 * IconButton — square glyph-only button. The ``label`` is **required** —
 * it becomes the accessible name even though it isn't visible.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { IconButton } from "./IconButton.js";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: { glyph: "candle", label: "Begin the working" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger", "quiet"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost", glyph: "scroll", label: "View" } };
export const Primary: Story = { args: { variant: "primary", glyph: "feather", label: "Begin entry" } };
export const Danger: Story = { args: { variant: "danger", glyph: "lock", label: "Revoke" } };

export const SizeRow: Story = {
  args: { glyph: "moon", label: "Toggle mode" },
  render: () => (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <IconButton variant="secondary" size="sm" glyph="moon" label="Mode" />
      <IconButton variant="secondary" size="md" glyph="moon" label="Mode" />
      <IconButton variant="secondary" size="lg" glyph="moon" label="Mode" />
    </div>
  ),
};
