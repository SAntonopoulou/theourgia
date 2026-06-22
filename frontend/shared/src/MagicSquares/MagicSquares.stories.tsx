/**
 * Magic Squares — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { MagicSquaresSurface } from "./MagicSquaresSurface.js";
import { PlanetaryRail } from "./PlanetaryRail.js";
import { SquareView } from "./SquareView.js";

const meta = {
  title: "MagicSquares",
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

// ─── Rail variants ───────────────────────────────────────────────

export const Rail_Saturn: Story = {
  name: "PlanetaryRail · Saturn active",
  render: () => (
    <Frame width={280}>
      <div style={{ height: 620 }}>
        <PlanetaryRail
          value="saturn"
          customValue={null}
          customSquares={[]}
          onPick={() => {}}
          onNew={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Rail_WithCustom: Story = {
  name: "PlanetaryRail · custom binding square selected",
  render: () => (
    <Frame width={280}>
      <div style={{ height: 620 }}>
        <PlanetaryRail
          value="custom"
          customValue="demo-binding"
          customSquares={[
            { id: "demo-binding", name: "Square of binding", order: 5 },
          ]}
          onPick={() => {}}
          onNew={() => {}}
        />
      </div>
    </Frame>
  ),
};

// ─── SquareView variants ─────────────────────────────────────────

const saturnCells = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
] as const;

export const View_Saturn: Story = {
  name: "SquareView · Saturn (view — planet sigil overlay)",
  render: () => (
    <Frame width={300}>
      <SquareView cells={saturnCells} order={3} mode="view" />
    </Frame>
  ),
};

export const Trace_Saturn: Story = {
  name: "SquareView · Saturn (trace — 5 cells picked)",
  render: () => (
    <Frame width={300}>
      <SquareView
        cells={saturnCells}
        order={3}
        mode="trace"
        trace={[0, 1, 4, 7, 6]}
      />
    </Frame>
  ),
};

export const Build_Empty5x5: Story = {
  name: "SquareView · Build (custom 5×5 empty)",
  render: () => (
    <Frame width={400}>
      <SquareView cells={null} order={5} mode="build" />
    </Frame>
  ),
};

// ─── Surface variants ────────────────────────────────────────────

export const Surface_Saturn: Story = {
  name: "MagicSquaresSurface · Saturn (default)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface />
      </div>
    </Frame>
  ),
};

export const Surface_Jupiter: Story = {
  name: "MagicSquaresSurface · Jupiter",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface initialSquare="jupiter" />
      </div>
    </Frame>
  ),
};

export const Surface_Mars: Story = {
  name: "MagicSquaresSurface · Mars (5×5 Siamese)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface initialSquare="mars" />
      </div>
    </Frame>
  ),
};

export const Surface_Sun: Story = {
  name: "MagicSquaresSurface · Sun (6×6 Agrippa fixture)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface initialSquare="sun" />
      </div>
    </Frame>
  ),
};

export const Surface_Moon: Story = {
  name: "MagicSquaresSurface · Moon (9×9 — largest fixture)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface initialSquare="moon" />
      </div>
    </Frame>
  ),
};

export const Surface_Custom: Story = {
  name: "MagicSquaresSurface · custom (Build mode + 'source is you')",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <MagicSquaresSurface
          initialSquare="custom"
          initialCustomId="demo-binding"
        />
      </div>
    </Frame>
  ),
};
