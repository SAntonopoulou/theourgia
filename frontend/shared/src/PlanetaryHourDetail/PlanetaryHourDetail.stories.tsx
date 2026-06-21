/**
 * PlanetaryHourDetail stories — one per ruler so the editorial copy
 * has a visual sanity check, plus a Now-badge story and a selected
 * (non-now) story.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { PlanetaryHourDetail } from "./PlanetaryHourDetail.js";

const meta = {
  title: "PlanetaryHourDetail",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: 360 }}>
    {children}
  </div>
);

export const Sun_Now: Story = {
  name: "Sun · current hour",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="sun"
        ordinalInArc={6}
        isDay
        startMin={14 * 60 + 30}
        endMin={15 * 60 + 44}
        lengthMin={74}
        isNow
      />
    </Frame>
  ),
};

export const Venus_Selected: Story = {
  name: "Venus · selected (not now)",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="venus"
        ordinalInArc={2}
        isDay
        startMin={8 * 60 + 30}
        endMin={9 * 60 + 44}
        lengthMin={74}
        isExplicitSelection
      />
    </Frame>
  ),
};

export const Mars_NightHour: Story = {
  name: "Mars · night-hour 3 of 12",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="mars"
        ordinalInArc={2}
        isDay={false}
        startMin={22 * 60 + 23}
        endMin={23 * 60 + 8}
        lengthMin={45}
      />
    </Frame>
  ),
};

export const Saturn_Binding: Story = {
  name: "Saturn · binding / boundaries",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="sat"
        ordinalInArc={0}
        isDay={false}
        startMin={0}
        endMin={45}
        lengthMin={45}
      />
    </Frame>
  ),
};

export const Mercury_Letters: Story = {
  name: "Mercury · letters & study",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="merc"
        ordinalInArc={3}
        isDay
        startMin={9 * 60 + 30}
        endMin={10 * 60 + 44}
        lengthMin={74}
      />
    </Frame>
  ),
};

export const Jupiter_Increase: Story = {
  name: "Jupiter · increase",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="jup"
        ordinalInArc={4}
        isDay
        startMin={11 * 60 + 0}
        endMin={12 * 60 + 14}
        lengthMin={74}
      />
    </Frame>
  ),
};

export const Moon_Tides: Story = {
  name: "Moon · tides / dreams",
  render: () => (
    <Frame>
      <PlanetaryHourDetail
        ruler="moon"
        ordinalInArc={5}
        isDay={false}
        startMin={2 * 60 + 6}
        endMin={2 * 60 + 51}
        lengthMin={45}
      />
    </Frame>
  ),
};
