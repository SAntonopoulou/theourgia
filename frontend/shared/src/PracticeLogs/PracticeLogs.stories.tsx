/**
 * Practice Logs — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { AsanaPanel } from "./AsanaPanel.js";
import { BanishingPanel } from "./BanishingPanel.js";
import { DreamPanel } from "./DreamPanel.js";
import { LogTypeTablist } from "./LogTypeTablist.js";
import { PathworkingPanel } from "./PathworkingPanel.js";
import { PracticeLogsSurface } from "./PracticeLogsSurface.js";

const meta = {
  title: "PracticeLogs",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 1040,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div
    style={{
      background: "var(--bg)",
      color: "var(--ink)",
      padding: 24,
      maxWidth: width,
    }}
  >
    {children}
  </div>
);

// ─── Sub-primitives ──────────────────────────────────────────────

export const Tablist_Dream: Story = {
  name: "LogTypeTablist · Dream active",
  render: () => (
    <Frame width={620}>
      <LogTypeTablist value="dream" onChange={() => {}} />
    </Frame>
  ),
};

export const Tablist_Banish: Story = {
  name: "LogTypeTablist · Banishing active",
  render: () => (
    <Frame width={620}>
      <LogTypeTablist value="banish" onChange={() => {}} />
    </Frame>
  ),
};

// ─── Sub-panels ──────────────────────────────────────────────────

export const DreamPanel_Default: Story = {
  name: "DreamPanel · seeded with library dream",
  render: () => (
    <Frame>
      <DreamPanel />
    </Frame>
  ),
};

export const DreamPanel_NotLucid: Story = {
  name: "DreamPanel · lucid off",
  render: () => (
    <Frame>
      <DreamPanel initialLucid={false} />
    </Frame>
  ),
};

export const PathworkingPanel_Default: Story = {
  name: "PathworkingPanel · path 25 Samekh",
  render: () => (
    <Frame>
      <PathworkingPanel />
    </Frame>
  ),
};

export const PathworkingPanel_Aleph: Story = {
  name: "PathworkingPanel · path 11 Aleph (The Fool)",
  render: () => (
    <Frame>
      <PathworkingPanel initialPath={11} initialVision="" />
    </Frame>
  ),
};

export const AsanaPanel_Paused: Story = {
  name: "AsanaPanel · paused at 12:07",
  render: () => (
    <Frame>
      <AsanaPanel />
    </Frame>
  ),
};

export const BanishingPanel_SealOff: Story = {
  name: "BanishingPanel · default (plain-text help)",
  render: () => (
    <Frame>
      <BanishingPanel />
    </Frame>
  ),
};

export const BanishingPanel_SealOn: Story = {
  name: "BanishingPanel · seal ON (ciphertext promise)",
  render: () => (
    <Frame>
      <BanishingPanel initialSealOn />
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Dream: Story = {
  name: "PracticeLogsSurface · Dream tab",
  render: () => (
    <Frame width={1200}>
      <PracticeLogsSurface />
    </Frame>
  ),
};

export const Surface_Path: Story = {
  name: "PracticeLogsSurface · Pathworking tab",
  render: () => (
    <Frame width={1200}>
      <PracticeLogsSurface initialTab="path" />
    </Frame>
  ),
};

export const Surface_Asana: Story = {
  name: "PracticeLogsSurface · Āsana tab",
  render: () => (
    <Frame width={1200}>
      <PracticeLogsSurface initialTab="asana" />
    </Frame>
  ),
};

export const Surface_Banish: Story = {
  name: "PracticeLogsSurface · Banishing tab",
  render: () => (
    <Frame width={1200}>
      <PracticeLogsSurface initialTab="banish" />
    </Frame>
  ),
};
