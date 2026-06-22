/**
 * Magical Circle — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { CentrePicker } from "./CentrePicker.js";
import { CirclePreview } from "./CirclePreview.js";
import { MagicalCircleSurface } from "./MagicalCircleSurface.js";
import { PresetCircleLibrary } from "./PresetCircleLibrary.js";
import { RingConfig } from "./RingConfig.js";
import { RingsCompassRail } from "./RingsCompassRail.js";

const meta = {
  title: "MagicalCircle",
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

export const Rail_Default: Story = {
  name: "RingsCompassRail · 3 rings · Archangels active",
  render: () => (
    <Frame width={320}>
      <div style={{ height: 620 }}>
        <RingsCompassRail
          ringKinds={["glyphs", "glyphs", "inscription"]}
          activeRing={2}
          onPickRing={() => {}}
          onAddRing={() => {}}
          onRemoveRing={() => {}}
          compass="archangels"
          onPickCompass={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Rail_Watchtowers: Story = {
  name: "RingsCompassRail · 4 rings · Watchtowers active",
  render: () => (
    <Frame width={320}>
      <div style={{ height: 620 }}>
        <RingsCompassRail
          ringKinds={["inscription", "glyphs", "image", "blank"]}
          activeRing={1}
          onPickRing={() => {}}
          onAddRing={() => {}}
          onRemoveRing={() => {}}
          compass="watchtowers"
          onPickCompass={() => {}}
        />
      </div>
    </Frame>
  ),
};

// ─── Preview variants ────────────────────────────────────────────

export const Preview_Default: Story = {
  name: "CirclePreview · default (3 rings · archangels · hexagram)",
  render: () => (
    <Frame width={640}>
      <CirclePreview
        rings={[{ kind: "glyphs" }, { kind: "glyphs" }, { kind: "inscription" }]}
        compass="archangels"
        centre="hexagram"
      />
    </Frame>
  ),
};

export const Preview_Watchtowers_Pentagram: Story = {
  name: "CirclePreview · Watchtowers (elemental colours) · Pentagram",
  render: () => (
    <Frame width={640}>
      <CirclePreview
        rings={[{ kind: "inscription" }, { kind: "glyphs" }]}
        compass="watchtowers"
        centre="pentagram"
      />
    </Frame>
  ),
};

export const Preview_Unicursal: Story = {
  name: "CirclePreview · Greek winds · Unicursal hexagram",
  render: () => (
    <Frame width={640}>
      <CirclePreview
        rings={[{ kind: "glyphs" }]}
        compass="winds"
        centre="unicursal"
      />
    </Frame>
  ),
};

export const Preview_PrintTile: Story = {
  name: "CirclePreview · print-tile (A4 crop + 10cm calibration)",
  render: () => (
    <Frame width={640}>
      <CirclePreview
        rings={[{ kind: "glyphs" }, { kind: "inscription" }]}
        compass="archangels"
        centre="solomonic"
        printTile
      />
    </Frame>
  ),
};

// ─── Config variants ─────────────────────────────────────────────

export const Config_Inscription: Story = {
  name: "RingConfig · inscription (RTL Hebrew + script + direction)",
  render: () => (
    <Frame width={340}>
      <RingConfig kind="inscription" />
    </Frame>
  ),
};

export const Config_Glyphs: Story = {
  name: "RingConfig · glyphs (set picker + rotation)",
  render: () => (
    <Frame width={340}>
      <RingConfig kind="glyphs" />
    </Frame>
  ),
};

export const Config_Multi: Story = {
  name: "RingConfig · multi (sequence preview + edit)",
  render: () => (
    <Frame width={340}>
      <RingConfig kind="multi" />
    </Frame>
  ),
};

// ─── Centre picker ───────────────────────────────────────────────

export const Centre_Picker: Story = {
  name: "CentrePicker · 7 tiles · hexagram active",
  render: () => (
    <Frame width={300}>
      <CentrePicker value="hexagram" onChange={() => {}} />
    </Frame>
  ),
};

// ─── Library modal ───────────────────────────────────────────────

export const Library_Open: Story = {
  name: "PresetCircleLibrary · 5 PD presets",
  render: () => (
    <Frame width={1000}>
      <div
        style={{
          position: "relative",
          height: 620,
          background: "var(--bg-2)",
        }}
      >
        <PresetCircleLibrary open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "MagicalCircleSurface · default (Archangels · Hexagram)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicalCircleSurface />
      </div>
    </Frame>
  ),
};

export const Surface_Watchtowers: Story = {
  name: "MagicalCircleSurface · Watchtowers · Solomonic seal",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicalCircleSurface
          initialCompass="watchtowers"
          initialCentre="solomonic"
        />
      </div>
    </Frame>
  ),
};
