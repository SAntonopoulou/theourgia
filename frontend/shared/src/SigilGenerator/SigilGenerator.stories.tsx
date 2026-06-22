/**
 * Sigil Generator — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { CarriesPanel } from "./CarriesPanel.js";
import { ChargeSaveDialog } from "./ChargeSaveDialog.js";
import { ConfigPanel } from "./ConfigPanel.js";
import { ExportMenu } from "./ExportMenu.js";
import { ModeRail } from "./ModeRail.js";
import { OperationsToolbar } from "./OperationsToolbar.js";
import { OwnedDeckOverlay } from "./OwnedDeckOverlay.js";
import { SigilGeneratorSurface } from "./SigilGeneratorSurface.js";
import { SigilLibraryPanel } from "./SigilLibraryPanel.js";
import { SigilPreview } from "./SigilPreview.js";

const meta = {
  title: "SigilGenerator",
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

// ─── Sub-primitives ──────────────────────────────────────────────

export const ModeRail_Spare: Story = {
  name: "ModeRail · Letter elimination active",
  render: () => (
    <Frame width={260}>
      <div style={{ height: 540 }}>
        <ModeRail value="spare" onChange={() => {}} />
      </div>
    </Frame>
  ),
};

export const ModeRail_Kamea: Story = {
  name: "ModeRail · Kamea pathing active",
  render: () => (
    <Frame width={260}>
      <div style={{ height: 540 }}>
        <ModeRail value="kamea" onChange={() => {}} />
      </div>
    </Frame>
  ),
};

export const Preview_Spare: Story = {
  name: "SigilPreview · spare mode",
  render: () => (
    <Frame width={480}>
      <SigilPreview mode="spare" intention="It is my Will to walk unseen." />
    </Frame>
  ),
};

export const Preview_Kamea_Saturn: Story = {
  name: "SigilPreview · kamea (Saturn 3×3)",
  render: () => (
    <Frame width={480}>
      <SigilPreview
        mode="kamea"
        intention="It is my Will to walk unseen."
        square="saturn"
      />
    </Frame>
  ),
};

export const Preview_Hashed_Polar: Story = {
  name: "SigilPreview · hashed-vector (polar)",
  render: () => (
    <Frame width={480}>
      <SigilPreview
        mode="hashed"
        intention="quiet mind"
        family="polar"
      />
    </Frame>
  ),
};

export const Preview_Harmonograph: Story = {
  name: "SigilPreview · harmonograph",
  render: () => (
    <Frame width={480}>
      <SigilPreview mode="harmonograph" intention="steady hand" />
    </Frame>
  ),
};

export const Config_Kamea: Story = {
  name: "ConfigPanel · kamea (planetary tiles + cipher pills)",
  render: () => (
    <Frame width={640}>
      <ConfigPanel
        mode="kamea"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />
    </Frame>
  ),
};

export const Config_Hashed: Story = {
  name: "ConfigPanel · hashed (4 curve families)",
  render: () => (
    <Frame width={640}>
      <ConfigPanel
        mode="hashed"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />
    </Frame>
  ),
};

export const Config_Formula_InvalidError: Story = {
  name: "ConfigPanel · formula with --warn error (never --danger)",
  render: () => (
    <Frame width={640}>
      <ConfigPanel
        mode="formula"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
        formulaError="Unknown identifier: window"
      />
    </Frame>
  ),
};

export const Operations: Story = {
  name: "OperationsToolbar · default state",
  render: () => (
    <Frame width={640}>
      <OperationsToolbar
        scale={320}
        rotate={0}
        color="var(--accent)"
        onScale={() => {}}
        onRotate={() => {}}
        onColor={() => {}}
        onMirror={() => {}}
      />
    </Frame>
  ),
};

export const ExportMenu_Closed: Story = {
  name: "ExportMenu · closed trigger",
  render: () => (
    <Frame width={260}>
      <ExportMenu open={false} onToggle={() => {}} />
    </Frame>
  ),
};

export const ExportMenu_Open: Story = {
  name: "ExportMenu · open (4 formats)",
  render: () => (
    <Frame width={260}>
      <div style={{ height: 240, position: "relative" }}>
        <ExportMenu open onToggle={() => {}} />
      </div>
    </Frame>
  ),
};

export const Carries_WithCitation: Story = {
  name: "CarriesPanel · with citation (kamea)",
  render: () => (
    <Frame width={340}>
      <div style={{ height: 640 }}>
        <CarriesPanel
          intention="It is my Will to walk unseen."
          onIntentionChange={() => {}}
          onSave={() => {}}
          citation="Cornelius Agrippa, De Occulta Philosophia II.22, 1531"
        />
      </div>
    </Frame>
  ),
};

export const Carries_NoCitation: Story = {
  name: "CarriesPanel · no citation (custom mode)",
  render: () => (
    <Frame width={340}>
      <div style={{ height: 640 }}>
        <CarriesPanel
          intention="quiet mind"
          onIntentionChange={() => {}}
          onSave={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Dialog_ChargeSave: Story = {
  name: "ChargeSaveDialog · the committed-make moment",
  render: () => (
    <Frame width={1000}>
      <div style={{ position: "relative", height: 500, background: "var(--bg-2)" }}>
        <ChargeSaveDialog open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

export const Library_Open: Story = {
  name: "SigilLibraryPanel · open with 12 demo sigils",
  render: () => (
    <Frame width={1000}>
      <div style={{ position: "relative", height: 700, background: "var(--bg-2)" }}>
        <SigilLibraryPanel open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

export const OwnedDeck_Open: Story = {
  name: "OwnedDeckOverlay · personal-only --warn (never --danger)",
  render: () => (
    <Frame width={1000}>
      <div style={{ position: "relative", height: 500, background: "var(--bg-2)" }}>
        <OwnedDeckOverlay open onClose={() => {}} />
      </div>
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Spare: Story = {
  name: "SigilGeneratorSurface · spare (default)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <SigilGeneratorSurface />
      </div>
    </Frame>
  ),
};

export const Surface_Kamea: Story = {
  name: "SigilGeneratorSurface · kamea (Agrippa citation visible)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <SigilGeneratorSurface initialMode="kamea" />
      </div>
    </Frame>
  ),
};

export const Surface_Formula: Story = {
  name: "SigilGeneratorSurface · formula (sandboxed whitelist help)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <SigilGeneratorSurface initialMode="formula" />
      </div>
    </Frame>
  ),
};
