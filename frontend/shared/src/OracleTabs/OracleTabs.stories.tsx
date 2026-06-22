/**
 * OracleTabs — secondary nav for the Phase-06 "Divination" cluster.
 * Five tabs (Tarot · I Ching · Geomancy · Runes · More), scrollable on
 * mobile, accent underline on active.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { OracleTabs } from "./OracleTabs.js";

const meta = {
  title: "Chrome/OracleTabs",
  component: OracleTabs,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    chromatic: { viewports: [375, 768, 1024, 1440] },
  },
  argTypes: {
    active: {
      control: "select",
      options: ["tarot", "iching", "geomancy", "runes", "more"],
    },
  },
} satisfies Meta<typeof OracleTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "var(--bg)", padding: "16px 0" }}>{children}</div>
);

export const Tarot: Story = {
  args: { active: "tarot" },
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

export const IChing: Story = {
  args: { active: "iching" },
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

export const Geomancy: Story = {
  args: { active: "geomancy" },
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

export const Runes: Story = {
  args: { active: "runes" },
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

export const More: Story = {
  args: { active: "more" },
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

export const NoActive: Story = {
  args: {},
  render: (args) => (
    <Frame>
      <OracleTabs {...args} />
    </Frame>
  ),
};

/**
 * Mobile scroll affordance — the nav scrolls horizontally inside a
 * narrow container without widening the page.
 */
export const MobileScroll: Story = {
  args: { active: "geomancy" },
  render: (args) => (
    <div style={{ width: 320, background: "var(--bg)", padding: "16px 0" }}>
      <OracleTabs {...args} />
    </div>
  ),
};
