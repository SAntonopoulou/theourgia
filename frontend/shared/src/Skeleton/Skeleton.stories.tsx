/**
 * Skeleton — placeholder shimmer for content that is loading. Honors
 * ``prefers-reduced-motion`` (the shimmer is suppressed; the box stays
 * static).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "./Skeleton.js";

const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  args: { kind: "text", width: 240, height: 16 },
  argTypes: {
    kind: { control: "radio", options: ["text", "rect", "circle"] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = { args: { kind: "text", width: 280, height: 14 } };
export const Block: Story = { args: { kind: "rect", width: 320, height: 120 } };
export const Avatar: Story = { args: { kind: "circle", width: 44, height: 44 } };

export const EntryPlaceholder: Story = {
  args: {},
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380 }}>
      <Skeleton kind="text" width="60%" height={20} />
      <Skeleton kind="text" width="100%" height={14} />
      <Skeleton kind="text" width="92%" height={14} />
      <Skeleton kind="text" width="84%" height={14} />
      <Skeleton kind="rect" width="100%" height={140} />
    </div>
  ),
};
