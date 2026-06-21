/**
 * BeingsTabs — secondary nav for the Phase-05 "Magical beings" cluster.
 * Eight tabs, scrollable on mobile, accent underline on active.
 *
 * Pairs with the AppShell topbar — embed under it on every ledger
 * surface (Entities · Offerings · Contracts · Oaths · Initiations ·
 * Servitors · Attestations · Aliases).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { BeingsTabs } from "./BeingsTabs.js";

const meta = {
  title: "Chrome/BeingsTabs",
  component: BeingsTabs,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    chromatic: { viewports: [375, 768, 1024, 1440] },
  },
  argTypes: {
    active: {
      control: "select",
      options: [
        "entities",
        "offerings",
        "contracts",
        "oaths",
        "initiations",
        "servitors",
        "attestations",
        "aliases",
      ],
    },
  },
} satisfies Meta<typeof BeingsTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "var(--bg)", padding: "16px 0" }}>{children}</div>
);

export const Entities: Story = {
  args: { active: "entities" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Offerings: Story = {
  args: { active: "offerings" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Contracts: Story = {
  args: { active: "contracts" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Oaths: Story = {
  args: { active: "oaths" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Initiations: Story = {
  args: { active: "initiations" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Servitors: Story = {
  args: { active: "servitors" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Attestations: Story = {
  args: { active: "attestations" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const Aliases: Story = {
  args: { active: "aliases" },
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

export const NoActive: Story = {
  args: {},
  render: (args) => (
    <Frame>
      <BeingsTabs {...args} />
    </Frame>
  ),
};

/**
 * Mobile scroll affordance — the nav scrolls horizontally inside a
 * narrow container without widening the page.
 */
export const MobileScroll: Story = {
  args: { active: "oaths" },
  render: (args) => (
    <div style={{ width: 320, background: "var(--bg)", padding: "16px 0" }}>
      <BeingsTabs {...args} />
    </div>
  ),
};
