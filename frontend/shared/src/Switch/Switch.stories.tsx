/**
 * Switch — boolean toggle. Use the controls to flip ``checked`` or watch
 * keyboard activation (Space / Enter) work naturally because the underlying
 * element is a ``<button role="switch">``.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Switch } from "./Switch.js";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: {
    label: "Quiet hours",
    checked: false,
    // Stub default — stories override via `render` to wire local state so
    // the toggle reads as live in the canvas.
    onChange: () => undefined,
  },
  argTypes: {
    labelPosition: { control: "radio", options: ["start", "end"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  render: (args) => {
    const [v, setV] = useState(args.checked);
    return <Switch {...args} checked={v} onChange={setV} />;
  },
};

export const On: Story = {
  args: { checked: true },
  render: (args) => {
    const [v, setV] = useState(args.checked ?? true);
    return <Switch {...args} checked={v} onChange={setV} />;
  },
};

export const LabelAfter: Story = {
  args: { checked: true, labelPosition: "end", label: "Send to journal" },
  render: (args) => {
    const [v, setV] = useState(args.checked ?? true);
    return <Switch {...args} checked={v} onChange={setV} />;
  },
};

export const Disabled: Story = {
  args: { checked: false, disabled: true, label: "Wellbeing nudges" },
  render: (args) => {
    return <Switch {...args} onChange={() => undefined} />;
  },
};
