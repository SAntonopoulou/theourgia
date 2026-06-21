/**
 * LunarPhaseWidget stories — one per canonical phase, plus loading
 * and error states, plus a southern-hemisphere variant to verify the
 * limb-flip math.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  LunarPhaseWidget,
  type LunarHemisphere,
} from "./LunarPhaseWidget.js";

const meta = {
  title: "LunarPhaseWidget",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      maxWidth: 460,
      background: "var(--bg)",
    }}
  >
    {children}
  </div>
);

const Toggleable = ({
  daysSinceNewMoon,
  initial = "north",
  nextPhase,
}: {
  daysSinceNewMoon: number;
  initial?: LunarHemisphere;
  nextPhase?: { label: string; in: string };
}) => {
  const [hemisphere, setHemisphere] = useState<LunarHemisphere>(initial);
  return (
    <Frame>
      <LunarPhaseWidget
        daysSinceNewMoon={daysSinceNewMoon}
        hemisphere={hemisphere}
        onHemisphereChange={setHemisphere}
        nextPhase={nextPhase}
      />
    </Frame>
  );
};

export const WaxingCrescent: Story = {
  name: "Waxing crescent (day 6)",
  render: () => (
    <Toggleable
      daysSinceNewMoon={6}
      nextPhase={{ label: "First quarter in", in: "2 days 4 hours" }}
    />
  ),
};

export const FirstQuarter: Story = {
  name: "First quarter (day 7.38)",
  render: () => <Toggleable daysSinceNewMoon={7.38} />,
};

export const WaxingGibbous: Story = {
  name: "Waxing gibbous (day 11)",
  render: () => <Toggleable daysSinceNewMoon={11} />,
};

export const FullMoon: Story = {
  name: "Full moon (day 14.77)",
  render: () => <Toggleable daysSinceNewMoon={14.77} />,
};

export const WaningGibbous: Story = {
  name: "Waning gibbous (day 18)",
  render: () => <Toggleable daysSinceNewMoon={18} />,
};

export const LastQuarter: Story = {
  name: "Last quarter (day 22.15)",
  render: () => <Toggleable daysSinceNewMoon={22.15} />,
};

export const WaningCrescent: Story = {
  name: "Waning crescent (day 25)",
  render: () => <Toggleable daysSinceNewMoon={25} />,
};

export const SouthernHemisphere: Story = {
  name: "Southern hemisphere · waxing crescent",
  render: () => <Toggleable daysSinceNewMoon={6} initial="south" />,
};

export const Loading: Story = {
  name: "Loading",
  render: () => (
    <Frame>
      <LunarPhaseWidget daysSinceNewMoon={6} state="loading" />
    </Frame>
  ),
};

export const Error_State: Story = {
  name: "Error — data unavailable",
  render: () => (
    <Frame>
      <LunarPhaseWidget daysSinceNewMoon={6} state="error" />
    </Frame>
  ),
};
