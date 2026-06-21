/**
 * SensationConfig stories — default (warmth/7), low-intensity void,
 * and a delete-only mode for review surfaces.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import type { BodyMarker } from "../BodySilhouette/BodySilhouette.js";
import { SensationConfig } from "./SensationConfig.js";

const meta = {
  title: "SensationConfig",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "16px 17px",
      width: 340,
      background: "var(--bg-2)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--line-2)",
      borderRadius: 14,
    }}
  >
    {children}
  </div>
);

const initial: BodyMarker = {
  id: "m1",
  view: "front",
  x: 0.5,
  y: 0.33,
  type: "warmth",
  intensity: 7,
  color: "#D98A4E",
  notes: "Steady heat blooming at the heart through the invocation.",
};

const Editor = ({ start }: { start: BodyMarker }) => {
  const [marker, setMarker] = useState(start);
  return (
    <Frame>
      <SensationConfig
        marker={marker}
        onChange={(patch) => setMarker({ ...marker, ...patch })}
        onDelete={() => {}}
        onDone={() => {}}
      />
    </Frame>
  );
};

export const Warmth_Default: Story = {
  name: "Warmth · intensity 7",
  render: () => <Editor start={initial} />,
};

export const Void_LowIntensity: Story = {
  name: "Void · intensity 2",
  render: () => (
    <Editor
      start={{
        id: "m2",
        view: "front",
        x: 0.5,
        y: 0.2,
        type: "void",
        intensity: 2,
        color: "#7C828B",
      }}
    />
  ),
};

export const Pleasure_HighIntensity: Story = {
  name: "Pleasure · intensity 10",
  render: () => (
    <Editor
      start={{
        id: "m3",
        view: "front",
        x: 0.5,
        y: 0.33,
        type: "pleasure",
        intensity: 10,
        color: "#C77FA0",
        notes: "Overwhelming wave on the consecration.",
      }}
    />
  ),
};

export const Minimal_NoActions: Story = {
  name: "Minimal · no Done / Delete",
  render: () => (
    <Frame>
      <SensationConfig marker={initial} onChange={() => {}} />
    </Frame>
  ),
};
