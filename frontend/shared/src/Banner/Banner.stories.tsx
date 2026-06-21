/**
 * Banner — page-level notice with semantic tone.
 *
 * Per `feedback_ui_modals_only.md`, no native browser banners. Theme tone
 * carried by line + soft-tinted background.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Banner } from "./Banner.js";

const meta = {
  title: "Primitives/Banner",
  component: Banner,
  tags: ["autodocs"],
  args: {
    tone: "info",
    title: "The breath steadies",
    body: "A short note set under the title — keep editorial copy tight.",
  },
  argTypes: {
    tone: { control: "select", options: ["info", "success", "warning", "danger"] },
    dismissible: { control: "boolean" },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { tone: "info" } };
export const Success: Story = {
  args: { tone: "success", title: "Signed and sealed", body: "Your attestation is live in the trust web." },
};
export const Warning: Story = {
  args: {
    tone: "warning",
    title: "Self-signed key",
    body: "This identity has no third-party attestation. Add witnesses or accept the caveat.",
  },
};
export const Danger: Story = {
  args: {
    tone: "danger",
    title: "Federation revoked",
    body: "This peer's verifying key was rotated; existing references are now untrusted.",
  },
};
export const Dismissible: Story = {
  args: { tone: "info", dismissible: true, onDismiss: () => undefined, title: "A new edition is available." },
};
