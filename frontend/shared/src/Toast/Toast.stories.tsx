/**
 * Toast — transient notification with semantic tone. Mount
 * ``<ToastProvider />`` once at the app root; then ``Toast.push(...)``
 * from anywhere.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { Toast, ToastProvider } from "./Toast.js";

const meta = {
  title: "Overlays/Toast",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Trigger = ({ tone }: { tone: "info" | "success" | "warning" | "error" }) => (
  <Button
    variant="secondary"
    onClick={() =>
      Toast.push({
        tone,
        title:
          tone === "success"
            ? "Saved to the journal"
            : tone === "warning"
              ? "Self-signed key"
              : tone === "error"
                ? "Federation refused"
                : "A new issue is ready",
        body:
          tone === "warning"
            ? "This identity has no third-party attestation."
            : undefined,
      })
    }
  >
    Push {tone}
  </Button>
);

export const PushButtons: Story = {
  render: () => (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Trigger tone="info" />
        <Trigger tone="success" />
        <Trigger tone="warning" />
        <Trigger tone="error" />
      </div>
      <ToastProvider />
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <div style={{ padding: 28 }}>
      <Button
        variant="primary"
        onClick={() =>
          Toast.push({
            tone: "success",
            title: "Working archived",
            body: "Restorable from trash for 30 days.",
            action: { label: "Undo", onClick: () => Toast.push({ tone: "info", title: "Restored." }) },
          })
        }
      >
        Archive working
      </Button>
      <ToastProvider />
    </div>
  ),
};
