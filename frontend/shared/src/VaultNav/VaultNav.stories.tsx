/**
 * VaultNav — the left-rail nav of the admin shell. Renders the section
 * tree + Quick capture + Settings cog.
 *
 * The default link renderer is a plain ``<a>``; production wires a
 * router-aware ``LinkComponent`` (see `App.tsx` for the
 * react-router-dom adapter).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { VaultNav } from "./VaultNav.js";

const meta = {
  title: "Chrome/VaultNav",
  component: VaultNav,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    active: {
      control: "select",
      options: [
        "today",
        "journal",
        "synchronicities",
        "entities",
        "library",
        "calendar",
        "divination",
        "sigil",
        "circle",
        "talismans",
        "analytics",
        "feed",
        "hubs",
      ],
    },
  },
} satisfies Meta<typeof VaultNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {
  args: { active: "today" },
  render: (args) => (
    <div style={{ width: 248, height: "100vh", background: "var(--bg)" }}>
      <VaultNav {...args} />
    </div>
  ),
};

export const Journal: Story = {
  args: { active: "journal" },
  render: (args) => (
    <div style={{ width: 248, height: "100vh", background: "var(--bg)" }}>
      <VaultNav {...args} />
    </div>
  ),
};

export const Divination: Story = {
  args: { active: "divination" },
  render: (args) => (
    <div style={{ width: 248, height: "100vh", background: "var(--bg)" }}>
      <VaultNav {...args} />
    </div>
  ),
};

export const WithIdentity: Story = {
  args: {
    active: "today",
    identity: { name: "Aspasia", role: "Vault owner" },
  },
  render: (args) => (
    <div style={{ width: 248, height: "100vh", background: "var(--bg)" }}>
      <VaultNav {...args} />
    </div>
  ),
};
