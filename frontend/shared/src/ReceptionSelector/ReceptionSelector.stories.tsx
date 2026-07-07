/** ReceptionSelector — 5-pill scale for offering reception. */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  type ReceptionLevel,
  ReceptionSelector,
} from "./ReceptionSelector.js";

const meta = {
  title: "Compose/ReceptionSelector",
  component: ReceptionSelector,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    value: "none" as const,
    onChange: () => {},
  },
  argTypes: {
    value: {
      control: "select",
      options: ["none", "faint", "clear", "strong", "overwhelming"],
    },
  },
} satisfies Meta<typeof ReceptionSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 540, padding: 16, background: "var(--bg)", borderRadius: 12 }}>
    {children}
  </div>
);

function Live({ initial }: { initial: ReceptionLevel }) {
  const [value, setValue] = useState<ReceptionLevel>(initial);
  return (
    <Frame>
      <ReceptionSelector value={value} onChange={setValue} showHint />
    </Frame>
  );
}

export const NoneSelected: Story = {
  render: () => <Live initial="none" />,
};

export const FaintSelected: Story = {
  render: () => <Live initial="faint" />,
};

export const ClearSelected: Story = {
  render: () => <Live initial="clear" />,
};

export const StrongSelected: Story = {
  render: () => <Live initial="strong" />,
};

export const OverwhelmingSelected: Story = {
  render: () => <Live initial="overwhelming" />,
};

export const WithoutHint: Story = {
  args: { value: "clear" as const, onChange: () => {} },
  render: (args) => (
    <Frame>
      <ReceptionSelector {...args} />
    </Frame>
  ),
};
