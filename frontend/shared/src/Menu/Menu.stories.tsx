/**
 * Menu — keyboard-accessible action menu anchored to a trigger. Used for
 * surface kebab menus (Identity actions, Bundle actions, etc.).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { IconButton } from "../Button/IconButton.js";
import { Menu, type MenuItem } from "./Menu.js";

const meta = {
  title: "Overlays/Menu",
  component: Menu,
  tags: ["autodocs"],
  args: { trigger: <Button variant="secondary">Open menu</Button>, items: [] },
  argTypes: {
    placement: { control: "select", options: ["top", "bottom", "left", "right"] },
    align: { control: "select", options: ["start", "center", "end"] },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const IDENTITY_ITEMS: MenuItem[] = [
  { kind: "label", label: "Acting as" },
  { kind: "item", label: "Aspasia (vault owner)", onSelect: () => undefined, glyph: "candle" },
  { kind: "item", label: "Theophrastos (author)", onSelect: () => undefined, glyph: "library" },
  { kind: "item", label: "Soror Ev. A. (private)", onSelect: () => undefined, glyph: "moon" },
  { kind: "separator" },
  { kind: "item", label: "Manage identities…", onSelect: () => undefined, glyph: "key" },
];

const ROW_ITEMS: MenuItem[] = [
  { kind: "item", label: "Open", onSelect: () => undefined, glyph: "scroll" },
  { kind: "item", label: "Copy link", onSelect: () => undefined, glyph: "feather" },
  { kind: "separator" },
  { kind: "item", label: "Archive", onSelect: () => undefined, glyph: "library" },
  { kind: "item", label: "Delete", onSelect: () => undefined, glyph: "lock", tone: "danger" },
];

export const IdentityPicker: Story = {
  args: {
    trigger: <Button variant="secondary">Acting as Aspasia ▾</Button>,
    items: IDENTITY_ITEMS,
  },
};

export const RowActions: Story = {
  args: {
    trigger: <IconButton variant="ghost" glyph="entity" label="Row actions" />,
    items: ROW_ITEMS,
  },
};

export const Disabled: Story = {
  args: {
    trigger: <Button variant="secondary">Open menu</Button>,
    items: [
      { kind: "item", label: "Edit", onSelect: () => undefined },
      { kind: "item", label: "Release now", onSelect: () => undefined, disabled: true },
      { kind: "separator" },
      { kind: "item", label: "Cancel release", onSelect: () => undefined, tone: "danger" },
    ],
  },
};
