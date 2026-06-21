/**
 * AlertDialog — single-acknowledge modal for warnings and errors. Use
 * when the action cannot be undone and the user must read before
 * dismissing.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { AlertDialog, type AlertDialogProps } from "./AlertDialog.js";

const meta = {
  title: "Overlays/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  args: {
    open: false,
    title: "Federation key changed",
    body: "This peer's verifying key was rotated. Existing references are now untrusted; re-attest to restore.",
    acknowledgeLabel: "Understood",
    onAcknowledge: () => undefined,
  },
  argTypes: {
    tone: { control: "select", options: ["warning", "danger", "info"] },
    dismissible: { control: "boolean" },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper(props: Omit<AlertDialogProps, "open" | "onAcknowledge">) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 28 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open</Button>
      <AlertDialog {...props} open={open} onAcknowledge={() => setOpen(false)} />
    </div>
  );
}

export const Warning: Story = {
  args: {
    tone: "warning",
    title: "Self-signed key",
    body: "This identity has no third-party attestation. Add witnesses or accept the caveat.",
    acknowledgeLabel: "I understand",
  },
  render: (args) => <Wrapper {...args} />,
};

export const Danger: Story = {
  args: {
    tone: "danger",
    title: "Federation key revoked",
    body: "All references signed under this key are now untrusted.",
    acknowledgeLabel: "I see",
  },
  render: (args) => <Wrapper {...args} />,
};

export const Info: Story = {
  args: {
    tone: "info",
    title: "Bundle installed",
    body: "“Hekate · A Working Bundle” added 11 items to your vault. Review in Library.",
    acknowledgeLabel: "Open Library",
  },
  render: (args) => <Wrapper {...args} />,
};
