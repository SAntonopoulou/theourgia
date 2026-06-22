/**
 * Voces Magicae — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { DEMO_VOCES } from "./copy.js";
import { NewVoceModal } from "./NewVoceModal.js";
import { VoceDetailDrawer } from "./VoceDetailDrawer.js";
import { VoceRow } from "./VoceRow.js";
import { VocesMagicaeSurface } from "./VocesMagicaeSurface.js";
import { Waveform } from "./Waveform.js";

const meta = {
  title: "VocesMagicae",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 1280,
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

// ─── Primitives ──────────────────────────────────────────────────

export const Waveform_Seeded: Story = {
  name: "Waveform · deterministic seed",
  render: () => (
    <Frame width={300}>
      <Waveform seed={42} />
    </Frame>
  ),
};

export const Row_BuiltIn: Story = {
  name: "VoceRow · built-in (‡ marker · 2 recordings)",
  render: () => (
    <Frame width={900}>
      <VoceRow voce={DEMO_VOCES.find((v) => v.builtin)!} />
    </Frame>
  ),
};

export const Row_NoRecordings: Story = {
  name: "VoceRow · no recording yet",
  render: () => (
    <Frame width={900}>
      <VoceRow
        voce={DEMO_VOCES.find((v) => v.recs.length === 0)!}
      />
    </Frame>
  ),
};

// ─── Drawer ──────────────────────────────────────────────────────

export const Drawer_WithRecordings: Story = {
  name: "VoceDetailDrawer · with recordings + workings",
  render: () => (
    <Frame width={1100}>
      <div
        style={{
          position: "relative",
          height: 720,
          background: "var(--bg-2)",
        }}
      >
        <VoceDetailDrawer
          open
          voce={DEMO_VOCES.find((v) => v.recs.length > 0)!}
          onClose={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Drawer_NoRecordings: Story = {
  name: "VoceDetailDrawer · no recordings (verbatim empty note)",
  render: () => (
    <Frame width={1100}>
      <div
        style={{
          position: "relative",
          height: 720,
          background: "var(--bg-2)",
        }}
      >
        <VoceDetailDrawer
          open
          voce={DEMO_VOCES.find((v) => v.recs.length === 0)!}
          onClose={() => {}}
        />
      </div>
    </Frame>
  ),
};

// ─── Modal ───────────────────────────────────────────────────────

export const Modal_Empty: Story = {
  name: "NewVoceModal · empty (Save disabled · accent border · required note)",
  render: () => (
    <Frame width={900}>
      <div
        style={{
          position: "relative",
          height: 760,
          background: "var(--bg-2)",
        }}
      >
        <NewVoceModal open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "VocesMagicaeSurface · default (All · 6 voces)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <VocesMagicaeSurface />
      </div>
    </Frame>
  ),
};

export const Surface_Hekate: Story = {
  name: "VocesMagicaeSurface · Hekate-tradition (2 voces)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <VocesMagicaeSurface initialTradition="hekate" />
      </div>
    </Frame>
  ),
};
