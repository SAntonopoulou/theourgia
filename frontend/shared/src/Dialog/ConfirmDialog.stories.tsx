/**
 * ConfirmDialog — modal overlay used everywhere a destructive or
 * constructive action needs verification (Archive working, Block peer,
 * Release now, etc.). Per `feedback_ui_modals_only.md`, no native
 * ``window.confirm`` anywhere in product code.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog.js";

const meta = {
  title: "Overlays/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  args: {
    open: false,
    title: "Archive this working?",
    body: "Archived workings can be restored from your trash for 30 days.",
    confirmLabel: "Archive",
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
  argTypes: {
    tone: { control: "select", options: ["destructive", "constructive", "neutral"] },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper(props: Omit<ConfirmDialogProps, "open" | "onConfirm" | "onCancel">) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 28 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open
      </Button>
      <ConfirmDialog {...props} open={open} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}

export const Destructive: Story = {
  args: {
    tone: "destructive",
    title: "Archive “Solstice working”?",
    body: "The working will be hidden but kept for 30 days.",
    confirmLabel: "Archive working",
  },
  render: (args) => <Wrapper {...args} />,
};

export const Constructive: Story = {
  args: {
    tone: "constructive",
    title: "Release this issue now?",
    body: "Subscribers will receive “The Theurgist's Almanac · Vol. III” immediately.",
    confirmLabel: "Release now",
  },
  render: (args) => <Wrapper {...args} />,
};

export const Neutral: Story = {
  args: {
    tone: "neutral",
    title: "Apply this filter to the journal?",
    body: "Filters can be removed any time.",
    confirmLabel: "Apply",
  },
  render: (args) => <Wrapper {...args} />,
};
