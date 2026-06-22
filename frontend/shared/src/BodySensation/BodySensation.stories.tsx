/**
 * Body Sensation surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import type { BodyMarker } from "../BodySilhouette/BodySilhouette.js";
import { BodyMarkerLegend } from "./BodyMarkerLegend.js";
import { SensationTypeGrid } from "./SensationTypeGrid.js";
import type { SensationType } from "../SensationConfig/SensationConfig.js";

const meta = {
  title: "BodySensation",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 340,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── SensationTypeGrid ────────────────────────────────────────────

const Picker = ({ initial }: { initial: SensationType }) => {
  const [value, setValue] = useState<SensationType>(initial);
  return (
    <Frame width={300}>
      <SensationTypeGrid value={value} onChange={setValue} />
    </Frame>
  );
};

export const Grid_Warmth: Story = {
  name: "SensationTypeGrid · warmth active",
  render: () => <Picker initial="warmth" />,
};

export const Grid_Void: Story = {
  name: "SensationTypeGrid · void active",
  render: () => <Picker initial="void" />,
};

export const Grid_Subset: Story = {
  name: "SensationTypeGrid · subset (warmth · coolness · void)",
  render: () => (
    <Frame width={180}>
      <SensationTypeGrid
        value="warmth"
        types={["warmth", "coolness", "void"]}
      />
    </Frame>
  ),
};

// ─── BodyMarkerLegend ─────────────────────────────────────────────

const tonightMarkers: BodyMarker[] = [
  {
    id: "m1",
    view: "front",
    x: 0.5,
    y: 0.21,
    type: "pressure",
    intensity: 4,
    color: "#8A7BB0",
    notes: "Band across the brow, like a circlet.",
  },
  {
    id: "m2",
    view: "front",
    x: 0.5,
    y: 0.33,
    type: "warmth",
    intensity: 7,
    color: "#D98A4E",
    notes: "Steady heat at the heart.",
  },
  {
    id: "m3",
    view: "front",
    x: 0.5,
    y: 0.43,
    type: "vibration",
    intensity: 6,
    color: "#5AA0C0",
    notes: "Low hum at the solar plexus.",
  },
  {
    id: "m4",
    view: "palm",
    x: 0.5,
    y: 0.5,
    type: "tingling",
    intensity: 5,
    color: "#6FBFA0",
  },
];

export const Legend_FourMarkers: Story = {
  name: "BodyMarkerLegend · four markers (heart-rite)",
  render: () => (
    <Frame>
      <BodyMarkerLegend
        markers={tonightMarkers}
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const Legend_Empty: Story = {
  name: "BodyMarkerLegend · empty",
  render: () => (
    <Frame>
      <BodyMarkerLegend markers={[]} />
    </Frame>
  ),
};

export const Legend_OneMarker: Story = {
  name: "BodyMarkerLegend · single marking",
  render: () => (
    <Frame>
      <BodyMarkerLegend
        markers={[tonightMarkers[1]!]}
        onSelect={() => {}}
      />
    </Frame>
  ),
};
