/** ItemsComposer — chip selector + free-text for the 14-item offering palette. */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { type ChosenItem, ItemsComposer } from "./ItemsComposer.js";

const meta = {
  title: "Compose/ItemsComposer",
  component: ItemsComposer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    value: [] as ChosenItem[],
    onChange: () => {},
  },
} satisfies Meta<typeof ItemsComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 560, padding: 16, background: "var(--bg)", borderRadius: 12 }}>
    {children}
  </div>
);

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState<ChosenItem[]>([]);
    return (
      <Frame>
        <ItemsComposer value={value} onChange={setValue} />
      </Frame>
    );
  },
};

export const PreChosen: Story = {
  render: () => {
    const [value, setValue] = useState<ChosenItem[]>([
      { k: "wine", qty: "1", unit: "cup" },
      { k: "honey", qty: "1", unit: "tablespoon" },
      { k: "incense", qty: "", unit: "" },
    ]);
    return (
      <Frame>
        <ItemsComposer value={value} onChange={setValue} />
      </Frame>
    );
  },
};

export const WithCustomItem: Story = {
  render: () => {
    const [value, setValue] = useState<ChosenItem[]>([
      { k: "wine", qty: "", unit: "" },
      { k: "myrrh", qty: "", unit: "", custom: true },
    ]);
    return (
      <Frame>
        <ItemsComposer value={value} onChange={setValue} />
      </Frame>
    );
  },
};

export const CustomPalette: Story = {
  name: "Custom palette (feeding methods)",
  render: () => {
    const [value, setValue] = useState<ChosenItem[]>([]);
    return (
      <Frame>
        <ItemsComposer
          value={value}
          onChange={setValue}
          commonKinds={[
            { k: "energy", label: "Energy", cat: "body" },
            { k: "attention", label: "Attention", cat: "time" },
            { k: "sigil-gaze", label: "Sigil-gaze", cat: "solid" },
            { k: "breath", label: "Breath", cat: "body" },
          ]}
          customPlaceholder="+ another feeding method"
        />
      </Frame>
    );
  },
};
