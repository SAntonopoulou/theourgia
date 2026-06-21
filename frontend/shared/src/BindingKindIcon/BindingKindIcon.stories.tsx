/** BindingKindIcon — engraving glyph per contract binding kind. */
import type { Meta, StoryObj } from "@storybook/react";

import { type BindingKind, BindingKindIcon, bindingKindLabel } from "./index.js";

const meta = {
  title: "Compose/BindingKindIcon",
  component: BindingKindIcon,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    kind: {
      control: "select",
      options: [
        "verbal",
        "written",
        "blood",
        "breath",
        "item-bound",
        "name-bound",
        "other",
      ],
    },
    size: { control: { type: "range", min: 12, max: 48, step: 2 } },
  },
} satisfies Meta<typeof BindingKindIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL_KINDS: BindingKind[] = [
  "verbal",
  "written",
  "blood",
  "breath",
  "item-bound",
  "name-bound",
  "other",
];

export const AllKinds: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        padding: 24,
        background: "var(--bg)",
        color: "var(--ink-soft)",
      }}
    >
      {ALL_KINDS.map((kind) => (
        <div
          key={kind}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 16,
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--bg-sunk)",
          }}
        >
          <BindingKindIcon kind={kind} size={32} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>
            {bindingKindLabel(kind)}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Single: Story = {
  args: { kind: "blood", size: 32 },
  render: (args) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--bg)",
        color: "var(--ink-soft)",
      }}
    >
      <BindingKindIcon {...args} />
    </div>
  ),
};
