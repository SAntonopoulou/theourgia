/**
 * Drawer — side panel for filters, settings, lineage detail rails. Slides
 * in from left or right; honors reduced-motion.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { Drawer, type DrawerProps } from "./Drawer.js";

const meta = {
  title: "Overlays/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  args: { open: false, side: "right", title: "Lineage detail", onClose: () => undefined, children: null },
  argTypes: {
    side: { control: "radio", options: ["left", "right"] },
    width: { control: { type: "number", min: 240, max: 720 } },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper(props: Omit<DrawerProps, "open" | "onClose" | "children">) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 28 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer {...props} open={open} onClose={() => setOpen(false)}>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", margin: 0 }}>
          A drawer holds adjacent context — filters, an attestation rail, the lineage
          provenance for the currently-selected card. Close it with the ✕ icon, the backdrop,
          or Escape.
        </p>
      </Drawer>
    </div>
  );
}

export const Right: Story = {
  args: { side: "right", title: "Lineage" },
  render: (args) => <Wrapper {...args} />,
};

export const Left: Story = {
  args: { side: "left", title: "Filters" },
  render: (args) => <Wrapper {...args} />,
};
