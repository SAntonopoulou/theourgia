/**
 * I Ching — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { hexagramName } from "../divination/index.js";
import { ChangingLinesPanel } from "./ChangingLinesPanel.js";
import { HexagramColumn } from "./HexagramColumn.js";
import { HexagramHeading } from "./HexagramHeading.js";
import { IChingSurface } from "./IChingSurface.js";
import { MethodPicker } from "./MethodPicker.js";

const meta = {
  title: "IChing",
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

export const Column_Empty: Story = {
  name: "HexagramColumn · empty (6 placeholders)",
  render: () => (
    <Frame width={260}>
      <HexagramColumn lines={[]} count={0} />
    </Frame>
  ),
};

export const Column_AllYang: Story = {
  name: "HexagramColumn · 乾 all yang (six solid bars)",
  render: () => (
    <Frame width={260}>
      <HexagramColumn lines={[7, 7, 7, 7, 7, 7]} count={6} />
    </Frame>
  ),
};

export const Column_AllYin: Story = {
  name: "HexagramColumn · 坤 all yin (six split bars)",
  render: () => (
    <Frame width={260}>
      <HexagramColumn lines={[8, 8, 8, 8, 8, 8]} count={6} />
    </Frame>
  ),
};

export const Column_Mixed_WithChanging: Story = {
  name: "HexagramColumn · mixed with changing-line accents",
  render: () => (
    <Frame width={260}>
      <HexagramColumn
        lines={[7, 8, 9, 7, 6, 8]}
        count={6}
        markChanging
      />
    </Frame>
  ),
};

export const Heading_Creative: Story = {
  name: "HexagramHeading · 1 The Creative (with composition)",
  render: () => (
    <Frame width={520}>
      <HexagramHeading
        hexagram={hexagramName(1)}
        composition="☰ Heaven over ☰ Heaven"
      />
    </Frame>
  ),
};

export const Heading_DarkeningOfLight: Story = {
  name: "HexagramHeading · 36 Darkening of the Light (NEVER red)",
  render: () => (
    <Frame width={520}>
      <HexagramHeading
        hexagram={hexagramName(36)}
        composition="☷ Earth over ☲ Fire"
      />
    </Frame>
  ),
};

export const Method_Coin: Story = {
  name: "MethodPicker · coin (active)",
  render: () => (
    <Frame width={620}>
      <MethodPicker value="coin" onChange={() => {}} />
    </Frame>
  ),
};

export const Method_Yarrow: Story = {
  name: "MethodPicker · yarrow (slower rite note)",
  render: () => (
    <Frame width={620}>
      <MethodPicker value="yarrow" onChange={() => {}} />
    </Frame>
  ),
};

export const ChangingLines_Panel: Story = {
  name: "ChangingLinesPanel · two changing lines, relating #36",
  render: () => (
    <Frame width={520}>
      <ChangingLinesPanel
        commentary={[
          {
            name: "Nine in the third place",
            text: "The line warns against forcing; let the matter ripen of itself.",
          },
          {
            name: "Six in the fifth place",
            text: "Strength at the centre: this is the line that carries the reading.",
          },
        ]}
        relating={hexagramName(36)}
      />
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Empty: Story = {
  name: "IChingSurface · empty (casting state)",
  render: () => (
    <Frame width={1200}>
      <IChingSurface />
    </Frame>
  ),
};

export const Surface_Yarrow: Story = {
  name: "IChingSurface · yarrow method (no 'Cast all six')",
  render: () => (
    <Frame width={1200}>
      <IChingSurface initialMethod="yarrow" />
    </Frame>
  ),
};
