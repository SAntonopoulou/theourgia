/**
 * StatusDot — small colored dot + label, pairs tone with text so the
 * status reads without color (Foundations § Accessibility).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { StatusDot } from "./StatusDot.js";

const meta = {
  title: "Primitives/StatusDot",
  component: StatusDot,
  tags: ["autodocs"],
  args: { status: "ok", label: "Online" },
  argTypes: {
    status: { control: "select", options: ["ok", "warn", "error", "neutral", "pending"] },
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OK: Story = { args: { status: "ok", label: "Online · 38ms" } };
export const Warn: Story = { args: { status: "warn", label: "Degraded · 412ms" } };
export const Error: Story = { args: { status: "error", label: "Offline · last 03:12 UTC" } };
export const Neutral: Story = { args: { status: "neutral", label: "Unknown" } };
export const Pending: Story = { args: { status: "pending", label: "Probing…" } };

export const StatusRow: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <StatusDot status="ok" label="API · 32ms" />
      <StatusDot status="ok" label="Database · 8ms" />
      <StatusDot status="warn" label="Email relay · 712ms" />
      <StatusDot status="pending" label="Federation probe · in flight" />
      <StatusDot status="error" label="Push provider · refused" />
    </div>
  ),
};
