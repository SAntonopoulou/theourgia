/**
 * Chip — display / toggle / removable modes, with an optional glyph slot.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Chip } from "./Chip.js";

const meta = {
  title: "Primitives/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { label: "Hellenic" },
  argTypes: {
    glyph: { control: "text" },
    selected: { control: "boolean" },
    disabled: { control: "boolean" },
    removable: { control: "boolean" },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = { args: {} };
export const DisplayWithGlyph: Story = { args: { glyph: "ritual", label: "Working" } };

export const ToggleIdle: Story = {
  args: { selected: false },
  render: (args) => {
    const [selected, setSelected] = useState(args.selected ?? false);
    return <Chip {...args} selected={selected} onToggle={setSelected} />;
  },
};

export const ToggleSelected: Story = {
  args: { selected: true },
  render: (args) => {
    const [selected, setSelected] = useState(args.selected ?? true);
    return <Chip {...args} selected={selected} onToggle={setSelected} />;
  },
};

export const Removable: Story = {
  args: { selected: true, removable: true, label: "Solstice" },
  render: (args) => {
    const [selected, setSelected] = useState(args.selected ?? true);
    if (!selected) return <em style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>(removed)</em>;
    return <Chip {...args} selected={selected} onToggle={setSelected} />;
  },
};

export const FilterRow: Story = {
  args: { label: "Filters" },
  render: () => {
    const [active, setActive] = useState<Set<string>>(new Set(["Hellenic", "Solstice"]));
    const toggle = (label: string) => {
      const next = new Set(active);
      next.has(label) ? next.delete(label) : next.add(label);
      setActive(next);
    };
    const labels = ["Base", "Hellenic", "Thelemic", "Solstice", "New moon", "Equinox"];
    return (
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {labels.map((label) => (
          <Chip
            key={label}
            label={label}
            selected={active.has(label)}
            onToggle={() => toggle(label)}
          />
        ))}
      </div>
    );
  },
};
