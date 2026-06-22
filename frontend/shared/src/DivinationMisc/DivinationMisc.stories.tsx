/**
 * Divination Misc — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { BibliomancyPanel } from "./BibliomancyPanel.js";
import { DivinationMiscSurface } from "./DivinationMiscSurface.js";
import { HoraryPanel } from "./HoraryPanel.js";
import { HoraryWheel } from "./HoraryWheel.js";
import { MethodTablist } from "./MethodTablist.js";
import { PendulumDial } from "./PendulumDial.js";
import { PendulumPanel } from "./PendulumPanel.js";
import { ScryingPanel } from "./ScryingPanel.js";
import { Speculum } from "./Speculum.js";

const meta = {
  title: "DivinationMisc",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 1200,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div
    style={{
      background: "var(--bg)",
      color: "var(--ink)",
      padding: 16,
      maxWidth: width,
    }}
  >
    {children}
  </div>
);

// ─── Sub-primitives ──────────────────────────────────────────────

export const Tablist_Pendulum: Story = {
  name: "MethodTablist · pendulum active",
  render: () => (
    <Frame width={640}>
      <MethodTablist value="pendulum" onChange={() => {}} />
    </Frame>
  ),
};

export const Dial_Yes: Story = {
  name: "PendulumDial · Yes (22°)",
  render: () => (
    <Frame width={200}>
      <PendulumDial answer="Yes" />
    </Frame>
  ),
};

export const Dial_No: Story = {
  name: "PendulumDial · No (-22°)",
  render: () => (
    <Frame width={200}>
      <PendulumDial answer="No" />
    </Frame>
  ),
};

export const Dial_Maybe: Story = {
  name: "PendulumDial · Maybe (6°)",
  render: () => (
    <Frame width={200}>
      <PendulumDial answer="Maybe" />
    </Frame>
  ),
};

export const Wheel: Story = {
  name: "HoraryWheel · 12-house whole-sign chart",
  render: () => (
    <Frame width={320}>
      <HoraryWheel />
    </Frame>
  ),
};

export const Speculum_Mirror: Story = {
  name: "Speculum · black mirror",
  render: () => (
    <Frame width={260}>
      <Speculum medium="mirror" />
    </Frame>
  ),
};

export const Speculum_Crystal: Story = {
  name: "Speculum · crystal",
  render: () => (
    <Frame width={260}>
      <Speculum medium="crystal" />
    </Frame>
  ),
};

export const Speculum_Water: Story = {
  name: "Speculum · water",
  render: () => (
    <Frame width={260}>
      <Speculum medium="water" />
    </Frame>
  ),
};

export const Speculum_Fire: Story = {
  name: "Speculum · fire",
  render: () => (
    <Frame width={260}>
      <Speculum medium="fire" />
    </Frame>
  ),
};

// ─── Panels ──────────────────────────────────────────────────────

export const Panel_Pendulum: Story = {
  name: "PendulumPanel · calibration + ask + dial + log",
  render: () => (
    <Frame>
      <PendulumPanel />
    </Frame>
  ),
};

export const Panel_Bibliomancy: Story = {
  name: "BibliomancyPanel · source + method + passage",
  render: () => (
    <Frame>
      <BibliomancyPanel />
    </Frame>
  ),
};

export const Panel_Horary: Story = {
  name: "HoraryPanel · chart + 5 steps + judgement",
  render: () => (
    <Frame>
      <HoraryPanel />
    </Frame>
  ),
};

export const Panel_Scrying: Story = {
  name: "ScryingPanel · medium + speculum + vision capture",
  render: () => (
    <Frame>
      <ScryingPanel />
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "DivinationMiscSurface · default (pendulum)",
  render: () => (
    <Frame width={1200}>
      <DivinationMiscSurface />
    </Frame>
  ),
};

export const Surface_Horary: Story = {
  name: "DivinationMiscSurface · horary opened",
  render: () => (
    <Frame width={1200}>
      <DivinationMiscSurface initialMethod="horary" />
    </Frame>
  ),
};
