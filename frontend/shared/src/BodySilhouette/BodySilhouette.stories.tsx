/**
 * BodySilhouette stories — one per view, plus a markered front and a
 * morphology comparison row.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  BodySilhouette,
  type BodyMarker,
} from "./BodySilhouette.js";

const meta = {
  title: "BodySilhouette",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 18,
      background:
        "radial-gradient(120% 90% at 50% 0%, var(--bg-3), var(--bg-2))",
      borderRadius: 14,
      border: "1px solid var(--line)",
      display: "flex",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

const markers: BodyMarker[] = [
  {
    id: "m1",
    view: "front",
    x: 0.5,
    y: 0.205,
    type: "pressure",
    intensity: 4,
    color: "#8A7BB0",
  },
  {
    id: "m2",
    view: "front",
    x: 0.5,
    y: 0.33,
    type: "warmth",
    intensity: 7,
    color: "#D98A4E",
  },
  {
    id: "m3",
    view: "front",
    x: 0.5,
    y: 0.43,
    type: "vibration",
    intensity: 6,
    color: "#5AA0C0",
  },
  {
    id: "m4",
    view: "front",
    x: 0.275,
    y: 0.52,
    type: "tingling",
    intensity: 5,
    color: "#6FBFA0",
  },
];

export const Front_Empty: Story = {
  name: "Front · empty stage",
  render: () => (
    <Frame>
      <BodySilhouette view="front" />
    </Frame>
  ),
};

export const Front_WithMarkers: Story = {
  name: "Front · four markers",
  render: () => (
    <Frame>
      <BodySilhouette view="front" markers={markers} selectedId="m2" />
    </Frame>
  ),
};

export const Back_View: Story = {
  name: "Back view",
  render: () => (
    <Frame>
      <BodySilhouette view="back" />
    </Frame>
  ),
};

export const Left_Profile: Story = {
  name: "Left profile",
  render: () => (
    <Frame>
      <BodySilhouette view="left" />
    </Frame>
  ),
};

export const Palm_View: Story = {
  name: "Palm view",
  render: () => (
    <Frame>
      <BodySilhouette view="palm" />
    </Frame>
  ),
};

export const Sole_View: Story = {
  name: "Sole view",
  render: () => (
    <Frame>
      <BodySilhouette view="sole" />
    </Frame>
  ),
};

export const Morphology_Broad: Story = {
  name: "Front · broad morphology",
  render: () => (
    <Frame>
      <BodySilhouette view="front" morphology="broad" />
    </Frame>
  ),
};

export const Morphology_Slim: Story = {
  name: "Front · slim morphology",
  render: () => (
    <Frame>
      <BodySilhouette view="front" morphology="slim" />
    </Frame>
  ),
};
