/**
 * PracticeNav — the practice-first sidebar (H12), successor to VaultNav.
 *
 * Two wings behind a foot switcher; "More tools" disclosure; quiet
 * Awaiting-judgment count; five-breakpoint contract driven by
 * ``data-nav-mode`` (force it via the ``navMode`` control).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { PracticeNav } from "./PracticeNav.js";

const meta = {
  title: "Chrome/PracticeNav",
  component: PracticeNav,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    active: {
      control: "select",
      options: [
        "today",
        "journal",
        "dailypractice",
        "practicelogs",
        "entities",
        "library",
        "calendar",
        "divination",
        "astragaloi",
        "sigils",
        "talismans",
        "circles",
        "tools",
        "magicsquares",
        "voces",
        "gematria",
        "translit",
        "voceslib",
        "synchronicities",
        "ladder",
        "awaitingjudgment",
        "analytics",
        "publications",
        "subscribers",
        "media",
        "audio",
        "pilgrimage",
        "icalfeed",
        "feed",
        "networks",
        "followers",
        "privateviewers",
        "plugins",
        "bundles",
        "sandbox",
        "agents",
      ],
    },
    navMode: {
      control: "select",
      options: ["auto", "drawer", "rail", "compact", "full"],
    },
    wing: { control: "select", options: ["practice", "platform"] },
  },
} satisfies Meta<typeof PracticeNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (width: number) => ({
  width,
  height: "100vh" as const,
  background: "var(--bg)" as const,
});

export const PracticeWing: Story = {
  args: { active: "today" },
  render: (args) => (
    <div style={frame(248)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const PlatformWing: Story = {
  args: { active: "plugins", wing: "platform" },
  render: (args) => (
    <div style={frame(248)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const AwaitingJudgmentCount: Story = {
  name: "Awaiting judgment · quiet count",
  args: { active: "awaitingjudgment", awaitingJudgmentCount: 3 },
  render: (args) => (
    <div style={frame(248)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const IconRail: Story = {
  name: "Tablet · 64px icon rail (forced)",
  args: { active: "today", navMode: "rail" },
  render: (args) => (
    <div style={frame(64)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const Compact: Story = {
  name: "Small desktop · 224px (forced)",
  args: { active: "today", navMode: "compact" },
  render: (args) => (
    <div style={frame(224)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const Drawer: Story = {
  name: "Phone drawer · 284px (forced)",
  args: { active: "today", navMode: "drawer" },
  render: (args) => (
    <div style={frame(284)}>
      <PracticeNav {...args} />
    </div>
  ),
};

export const WithIdentity: Story = {
  args: {
    active: "today",
    identity: { name: "Soror Ευ. Α.", role: "Sphere 9 · second month" },
  },
  render: (args) => (
    <div style={frame(248)}>
      <PracticeNav {...args} />
    </div>
  ),
};
