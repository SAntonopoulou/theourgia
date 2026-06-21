/**
 * PromptDialog — modal text input (no native ``window.prompt``). Use
 * ``validate`` to gate submit; the dialog disables Confirm when the
 * validator returns an error string.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { PromptDialog, type PromptDialogProps } from "./PromptDialog.js";

const meta = {
  title: "Overlays/PromptDialog",
  component: PromptDialog,
  tags: ["autodocs"],
  args: {
    open: false,
    title: "Rename this identity",
    label: "Display name",
    confirmLabel: "Save",
    onSubmit: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof PromptDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper(props: Omit<PromptDialogProps, "open" | "onSubmit" | "onCancel">) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 12 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open</Button>
      <PromptDialog
        {...props}
        open={open}
        onSubmit={(v) => {
          setValue(v);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
      {value !== null ? (
        <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>submitted: {value}</code>
      ) : null}
    </div>
  );
}

export const Plain: Story = {
  args: { defaultValue: "Aspasia" },
  render: (args) => <Wrapper {...args} />,
};

export const WithValidation: Story = {
  args: {
    title: "Set a magickal name",
    label: "Display name",
    defaultValue: "",
    placeholder: "e.g. Soror Ev. A.",
    validate: (v) => (v.length < 2 ? "At least two characters." : null),
  },
  render: (args) => <Wrapper {...args} />,
};
