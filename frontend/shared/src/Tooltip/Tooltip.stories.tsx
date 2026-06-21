/**
 * Tooltip — keyboard-accessible hover/focus hint. Default delay is 400ms;
 * dismiss with Escape.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { Tooltip } from "./Tooltip.js";

// Tooltip requires `children` — stub a placeholder so render-only stories
// don't have to repeat it.
const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: { label: "Saved to the journal", children: <span /> },
  argTypes: {
    placement: { control: "select", options: ["top", "bottom", "left", "right"] },
    delay: { control: { type: "number", min: 0, max: 1000 } },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {
  args: { placement: "top" },
  render: (args) => (
    <div style={{ padding: 60 }}>
      <Tooltip {...args}>
        <Button variant="secondary">Hover me</Button>
      </Tooltip>
    </div>
  ),
};

export const Bottom: Story = {
  args: { placement: "bottom" },
  render: (args) => (
    <div style={{ padding: 60 }}>
      <Tooltip {...args}>
        <Button variant="secondary">Hover me</Button>
      </Tooltip>
    </div>
  ),
};
