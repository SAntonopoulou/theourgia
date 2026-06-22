/**
 * Geomancy — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type GeoFigure,
  deriveShield,
} from "../divination/index.js";
import {
  DEFAULT_MOTHERS,
} from "./copy.js";
import { GeoFigureView } from "./GeoFigureView.js";
import { GeoHouseChart } from "./GeoHouseChart.js";
import { GeoShield } from "./GeoShield.js";
import { GeoVerdict } from "./GeoVerdict.js";
import { GeomancySurface } from "./GeomancySurface.js";
import { MotherCell } from "./MotherCell.js";

const meta = {
  title: "Geomancy",
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

const sampleShield = deriveShield(DEFAULT_MOTHERS);

// ─── Sub-primitives ──────────────────────────────────────────────

export const Figure_Via: Story = {
  name: "GeoFigureView · Via (all single points)",
  render: () => (
    <Frame width={200}>
      <GeoFigureView figure={[1, 1, 1, 1]} />
    </Frame>
  ),
};

export const Figure_Populus: Story = {
  name: "GeoFigureView · Populus (all double points)",
  render: () => (
    <Frame width={200}>
      <GeoFigureView figure={[2, 2, 2, 2]} />
    </Frame>
  ),
};

export const Figure_Carcer: Story = {
  name: "GeoFigureView · Carcer (the difficult one, NEVER red)",
  render: () => (
    <Frame width={200}>
      <GeoFigureView figure={[1, 2, 2, 1]} color="var(--accent)" />
    </Frame>
  ),
};

export const Mother_ReadOnly: Story = {
  name: "MotherCell · Mother 1 read-only (Via)",
  render: () => (
    <Frame width={200}>
      <MotherCell index={0} figure={[1, 1, 1, 1]} />
    </Frame>
  ),
};

export const Mother_Editable: Story = {
  name: "MotherCell · Mother 2 editable (paper mode)",
  render: () => (
    <Frame width={200}>
      <MotherCell index={1} figure={[1, 2, 1, 2]} editable />
    </Frame>
  ),
};

export const Shield_Pyramid: Story = {
  name: "GeoShield · full pyramid cascade",
  render: () => (
    <Frame width={900}>
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
          padding: "26px 22px",
          overflowX: "auto",
        }}
      >
        <GeoShield shield={sampleShield} />
      </div>
    </Frame>
  ),
};

export const HouseChart_FirstSelected: Story = {
  name: "GeoHouseChart · House I selected",
  render: () => (
    <Frame width={620}>
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={0}
        onSelectHouse={() => {}}
      />
    </Frame>
  ),
};

export const HouseChart_TenthSelected: Story = {
  name: "GeoHouseChart · House X (calling) selected",
  render: () => (
    <Frame width={620}>
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={9}
        onSelectHouse={() => {}}
      />
    </Frame>
  ),
};

export const Verdict_FirstHouse: Story = {
  name: "GeoVerdict · House I · the querent",
  render: () => (
    <Frame width={420}>
      <GeoVerdict shield={sampleShield} selectedHouse={0} />
    </Frame>
  ),
};

export const Verdict_CarcerHouse: Story = {
  name: "GeoVerdict · Carcer (difficulty in text, never chrome)",
  render: () => {
    const carcerMothers: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
      [1, 2, 2, 1],
      [1, 2, 2, 1],
      [1, 2, 2, 1],
      [1, 2, 2, 1],
    ];
    const carcerShield = deriveShield(carcerMothers);
    return (
      <Frame width={420}>
        <GeoVerdict shield={carcerShield} selectedHouse={0} />
      </Frame>
    );
  },
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Default: Story = {
  name: "GeomancySurface · default (gen method, demo mothers)",
  render: () => (
    <Frame width={1200}>
      <GeomancySurface />
    </Frame>
  ),
};

export const Surface_Paper: Story = {
  name: "GeomancySurface · paper method (tap-to-toggle Mothers)",
  render: () => (
    <Frame width={1200}>
      <GeomancySurface initialMethod="paper" />
    </Frame>
  ),
};
