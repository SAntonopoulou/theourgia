/**
 * EmptyState — the "nothing here yet" composition.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { EmptyState } from "./EmptyState.js";

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    glyph: "candle",
    title: "No entries yet",
    body: "Your first entry will land here. Begin with a single sentence — the page asks little.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    glyph: "feather",
    title: "An empty journal",
    body: "Whatever happens, write it down. Write it badly if you must.",
    action: <Button variant="primary">Begin an entry</Button>,
  },
};

export const Library: Story = {
  args: {
    glyph: "library",
    title: "No texts loaded",
    body: "Install a bundle to begin — the Hekate working set is a good first read.",
    action: <Button variant="secondary">Browse bundles</Button>,
  },
};

export const Synchronicity: Story = {
  args: {
    glyph: "star",
    title: "No synchronicities recorded",
    body: "When something meaningful crosses your path, note it here. The pattern is in the seeing.",
  },
};
