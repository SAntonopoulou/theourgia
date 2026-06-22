/**
 * Runes — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { drawRunes, findRune } from "../divination/index.js";
import { RuneBoard } from "./RuneBoard.js";
import { RuneReadingRail } from "./RuneReadingRail.js";
import { RuneSizePicker } from "./RuneSizePicker.js";
import { RuneTile } from "./RuneTile.js";
import { RunesSurface } from "./RunesSurface.js";

const meta = {
  title: "Runes",
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

export const Tile_Fehu: Story = {
  name: "RuneTile · Fehu (asymmetric, upright)",
  render: () => (
    <Frame width={200}>
      <RuneTile rune={findRune("Fehu")} />
    </Frame>
  ),
};

export const Tile_FehuMerk: Story = {
  name: "RuneTile · Fehu merkstave (rotated 180° + ⟲)",
  render: () => (
    <Frame width={200}>
      <RuneTile rune={findRune("Fehu")} merkstave />
    </Frame>
  ),
};

export const Tile_Gebo_Symmetric: Story = {
  name: "RuneTile · Gebo (symmetric — never merkstave per §S3.5)",
  render: () => (
    <Frame width={200}>
      <RuneTile rune={findRune("Gebo")} />
    </Frame>
  ),
};

export const Tile_Selected: Story = {
  name: "RuneTile · Sowilo selected",
  render: () => (
    <Frame width={200}>
      <RuneTile rune={findRune("Sowilo")} selected />
    </Frame>
  ),
};

export const SizePicker_Three: Story = {
  name: "RuneSizePicker · 3 (Norns) active",
  render: () => (
    <Frame width={520}>
      <RuneSizePicker value={3} onChange={() => {}} />
    </Frame>
  ),
};

// ─── Board layouts ──────────────────────────────────────────────

export const Board_SingleStave: Story = {
  name: "RuneBoard · single stave (centre)",
  render: () => (
    <Frame width={500}>
      <RuneBoard
        size={1}
        drawn={drawRunes(1, 4)}
        selected={0}
      />
    </Frame>
  ),
};

export const Board_ThreeNorns: Story = {
  name: "RuneBoard · three Norns (Urðr · Verðandi · Skuld)",
  render: () => (
    <Frame width={680}>
      <RuneBoard
        size={3}
        drawn={drawRunes(3, 4)}
        selected={1}
      />
    </Frame>
  ),
};

export const Board_FiveCross: Story = {
  name: "RuneBoard · five-stave cross",
  render: () => (
    <Frame width={800}>
      <RuneBoard
        size={5}
        drawn={drawRunes(5, 4)}
        selected={0}
      />
    </Frame>
  ),
};

// ─── Reading rail ───────────────────────────────────────────────

export const Rail_Upright: Story = {
  name: "RuneReadingRail · Fehu upright",
  render: () => (
    <Frame width={420}>
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: findRune("Fehu"),
          merkstave: false,
        }}
      />
    </Frame>
  ),
};

export const Rail_Merkstave: Story = {
  name: "RuneReadingRail · Fehu merkstave (pill, NEVER red)",
  render: () => (
    <Frame width={420}>
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "Urðr — what was",
          rune: findRune("Fehu"),
          merkstave: true,
        }}
      />
    </Frame>
  ),
};

export const Rail_SymmetricCallout: Story = {
  name: "RuneReadingRail · Gebo (symmetric callout, no merkstave)",
  render: () => (
    <Frame width={420}>
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: findRune("Gebo"),
          merkstave: false,
        }}
      />
    </Frame>
  ),
};

// ─── Surface ───────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "RunesSurface · default (three Norns)",
  render: () => (
    <Frame width={1200}>
      <RunesSurface />
    </Frame>
  ),
};

export const Surface_FiveCross: Story = {
  name: "RunesSurface · five-stave cross",
  render: () => (
    <Frame width={1200}>
      <RunesSurface initialSize={5} />
    </Frame>
  ),
};
