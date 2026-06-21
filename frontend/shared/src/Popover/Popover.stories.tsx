/**
 * Popover — anchored floating panel. Use when the content is freeform
 * (date picker, share-link details, transit detail card) rather than a
 * structured action list (which is Menu's job).
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { Popover } from "./Popover.js";

const meta = {
  title: "Overlays/Popover",
  component: Popover,
  tags: ["autodocs"],
  args: { open: false, onClose: () => undefined, trigger: <Button>Trigger</Button>, children: null },
  argTypes: {
    placement: { control: "select", options: ["top", "bottom", "left", "right"] },
    align: { control: "select", options: ["start", "center", "end"] },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DateDetail: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 28 }}>
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          trigger={<Button variant="secondary" onClick={() => setOpen((v) => !v)}>Sat 21 June 2026</Button>}
          placement="bottom"
        >
          <div style={{ padding: 14, minWidth: 240 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 8 }}>
              Summer solstice
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", lineHeight: 1.6 }}>
              Sun enters Cancer · sunrise 04:43 local · the longest day. Workings dedicated to
              expansion, solar power, public-facing intentions.
            </div>
          </div>
        </Popover>
      </div>
    );
  },
};

export const Share: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 28 }}>
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          trigger={<Button variant="secondary" onClick={() => setOpen((v) => !v)}>Share</Button>}
          placement="bottom"
          align="end"
        >
          <div style={{ padding: 14, minWidth: 280 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 8 }}>
              Share link
            </div>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", wordBreak: "break-all" }}>
              https://vault.example.org/p/wHr3kQ
            </code>
            <div style={{ marginTop: 10, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>
              Anyone with this link can read · expires in 7 days
            </div>
          </div>
        </Popover>
      </div>
    );
  },
};
