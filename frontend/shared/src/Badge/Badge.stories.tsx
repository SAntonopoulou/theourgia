/**
 * Badge — every tone, with and without a glyph.
 *
 * The color-never-alone rule (Foundations § Accessibility) means
 * production usage should pair tone with a glyph for color-blind safety;
 * the bare-tone variants are included for layout audits only.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./Badge.js";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Pending", tone: "neutral" },
  argTypes: {
    tone: { control: "select", options: ["neutral", "info", "success", "warning", "danger", "trust"] },
    glyph: { control: "text" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: "neutral", children: "Draft" } };
export const Info: Story = { args: { tone: "info", glyph: "star", children: "Connected" } };
export const Success: Story = { args: { tone: "success", glyph: "shield", children: "Signed" } };
export const Warning: Story = { args: { tone: "warning", glyph: "key", children: "Self-signed" } };
export const Danger: Story = { args: { tone: "danger", glyph: "lock", children: "Revoked" } };
export const Trust: Story = { args: { tone: "trust", glyph: "sigil", children: "Federated" } };

export const ToneMatrix: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Badge tone="neutral">Draft</Badge>
      <Badge tone="info">Connected</Badge>
      <Badge tone="success">Signed</Badge>
      <Badge tone="warning">Self-signed</Badge>
      <Badge tone="danger">Revoked</Badge>
      <Badge tone="trust">Federated</Badge>
    </div>
  ),
};
