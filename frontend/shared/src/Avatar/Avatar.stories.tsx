/**
 * Avatar — initials / glyph / photo-based identity medallion. The
 * "Aspasia" and "Theophrastos" personae below are the magickal-name
 * placeholders used across the demo surfaces (see
 * ``feedback_user_magickal_name.md``).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "./Avatar.js";

const meta = {
  title: "Identity/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { identity: { name: "Aspasia" } },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = { args: { identity: { name: "Aspasia" } } };

export const WithGlyph: Story = {
  args: { identity: { name: "Theophrastos", glyph: "candle" } },
};

export const Tonal: Story = {
  args: { identity: { name: "Diotima", glyph: "moon", tone: "info" } },
};

export const Sizes: Story = {
  args: { identity: { name: "" } },
  render: () => (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <Avatar identity={{ name: "Aspasia" }} size="sm" />
      <Avatar identity={{ name: "Aspasia" }} size="md" />
      <Avatar identity={{ name: "Aspasia" }} size="lg" />
    </div>
  ),
};

export const Personae: Story = {
  args: { identity: { name: "" } },
  render: () => (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <Avatar identity={{ name: "Aspasia", glyph: "candle", tone: "accent" }} size="md" />
      <Avatar identity={{ name: "Theophrastos", glyph: "library", tone: "info" }} size="md" />
      <Avatar identity={{ name: "Diotima", glyph: "moon", tone: "neutral" }} size="md" />
    </div>
  ),
};
