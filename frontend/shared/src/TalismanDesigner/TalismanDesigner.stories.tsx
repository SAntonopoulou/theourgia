/**
 * Talisman Designer — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ElectionPickerModal } from "./ElectionPickerModal.js";
import { FaceTablist } from "./FaceTablist.js";
import { LayerConfig } from "./LayerConfig.js";
import { LayerPanel } from "./LayerPanel.js";
import { SealedSaveDialog } from "./SealedSaveDialog.js";
import { TalismanCanvas } from "./TalismanCanvas.js";
import { TalismanDesignerSurface } from "./TalismanDesignerSurface.js";

const meta = {
  title: "TalismanDesigner",
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

export const Tablist_Front: Story = {
  name: "FaceTablist · Front active",
  render: () => (
    <Frame width={220}>
      <FaceTablist value="front" onChange={() => {}} />
    </Frame>
  ),
};

export const Tablist_Back: Story = {
  name: "FaceTablist · Back active",
  render: () => (
    <Frame width={220}>
      <FaceTablist value="back" onChange={() => {}} />
    </Frame>
  ),
};

export const Layers_Front_Square: Story = {
  name: "LayerPanel · Front · Magic square active",
  render: () => (
    <Frame width={300}>
      <div style={{ height: 460 }}>
        <LayerPanel
          face="front"
          value="square"
          onChange={() => {}}
          onMirror={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Layers_Back_Sigil: Story = {
  name: "LayerPanel · Back · Sigil active",
  render: () => (
    <Frame width={300}>
      <div style={{ height: 460 }}>
        <LayerPanel
          face="back"
          value="sigil"
          onChange={() => {}}
          onMirror={() => {}}
        />
      </div>
    </Frame>
  ),
};

// ─── Canvas ──────────────────────────────────────────────────────

export const Canvas_Front: Story = {
  name: "TalismanCanvas · Front (Jupiter kamea + Yophiel trace)",
  render: () => (
    <Frame width={600}>
      <TalismanCanvas face="front" />
    </Frame>
  ),
};

export const Canvas_Back: Story = {
  name: "TalismanCanvas · Back (planetary character + ring)",
  render: () => (
    <Frame width={600}>
      <TalismanCanvas face="back" />
    </Frame>
  ),
};

export const Canvas_Front_NoGrid: Story = {
  name: "TalismanCanvas · Front (snap-grid OFF)",
  render: () => (
    <Frame width={600}>
      <TalismanCanvas face="front" snapGrid={false} />
    </Frame>
  ),
};

// ─── LayerConfig variants ────────────────────────────────────────

export const Config_Background: Story = {
  name: "LayerConfig · background (texture chips)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="background" />
    </Frame>
  ),
};

export const Config_Border: Story = {
  name: "LayerConfig · border (RTL Hebrew + rotation)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="border" />
    </Frame>
  ),
};

export const Config_Square: Story = {
  name: "LayerConfig · square (picker + scale + position)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="square" />
    </Frame>
  ),
};

export const Config_Sigil: Story = {
  name: "LayerConfig · sigil (2 sigils + Add)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="sigil" />
    </Frame>
  ),
};

export const Config_Inscriptions: Story = {
  name: "LayerConfig · inscriptions (Latin + Hebrew + Add)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="inscriptions" />
    </Frame>
  ),
};

export const Config_Image: Story = {
  name: "LayerConfig · image (upload + opacity)",
  render: () => (
    <Frame width={340}>
      <LayerConfig layer="image" />
    </Frame>
  ),
};

// ─── Overlays ────────────────────────────────────────────────────

export const Election_Modal: Story = {
  name: "ElectionPickerModal · 3 Jupiter windows",
  render: () => (
    <Frame width={1000}>
      <div
        style={{
          position: "relative",
          height: 540,
          background: "var(--bg-2)",
        }}
      >
        <ElectionPickerModal open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

export const SaveDialog_Default: Story = {
  name: "SealedSaveDialog · default (seal OFF · --seal-off help)",
  render: () => (
    <Frame width={1000}>
      <div
        style={{
          position: "relative",
          height: 520,
          background: "var(--bg-2)",
        }}
      >
        <SealedSaveDialog open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

export const SaveDialog_Sealed: Story = {
  name: "SealedSaveDialog · sealed (Initiation linked · --seal palette)",
  render: () => (
    <Frame width={1000}>
      <div
        style={{
          position: "relative",
          height: 520,
          background: "var(--bg-2)",
        }}
      >
        <SealedSaveDialog open onClose={() => {}} initiationLinked />
      </div>
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Front: Story = {
  name: "TalismanDesignerSurface · Front · square layer",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <TalismanDesignerSurface />
      </div>
    </Frame>
  ),
};

export const Surface_Back: Story = {
  name: "TalismanDesignerSurface · Back · border layer",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <TalismanDesignerSurface
          initialFace="back"
          initialLayer="border"
        />
      </div>
    </Frame>
  ),
};
