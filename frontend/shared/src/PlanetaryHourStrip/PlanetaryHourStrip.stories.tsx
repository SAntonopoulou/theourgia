/**
 * PlanetaryHourStrip stories — Athens solstice (long day, short
 * night, dramatic proportional widths), Reykjavik winter (inverted
 * dramatic widths), polar 24×60m fallback.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  type ClassicalPlanet,
  type PlanetaryHourCell,
  PlanetaryHourStrip,
} from "./PlanetaryHourStrip.js";

const meta = {
  title: "PlanetaryHourStrip",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: 1100 }}>
    {children}
  </div>
);

const HSEQ: ClassicalPlanet[] = [
  "sun",
  "venus",
  "merc",
  "moon",
  "sat",
  "jup",
  "mars",
];

function buildHours({
  sunrise,
  sunset,
  polar = false,
}: {
  sunrise: number;
  sunset: number;
  polar?: boolean;
}): PlanetaryHourCell[] {
  const dayLen = sunset - sunrise;
  const nightLen = 1440 - dayLen;
  const dayHour = dayLen / 12;
  const nightHour = nightLen / 12;
  const hours: PlanetaryHourCell[] = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const lengthMin = polar ? 60 : isDay ? dayHour : nightHour;
    const startMin = polar
      ? i * 60
      : isDay
        ? sunrise + i * dayHour
        : sunset + (i - 12) * nightHour;
    hours.push({
      idx: i,
      ruler: HSEQ[i % 7]!,
      isDay,
      startMin: startMin % 1440,
      lengthMin,
    });
  }
  return hours;
}

const Interactive = ({
  sunrise,
  sunset,
  nowMin,
  polar = false,
}: {
  sunrise: number;
  sunset: number;
  nowMin?: number;
  polar?: boolean;
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const hours = buildHours({ sunrise, sunset, polar });
  const dayLen = polar ? 720 : sunset - sunrise;
  const nightLen = polar ? 720 : 1440 - dayLen;
  return (
    <Frame>
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        nowMin={nowMin}
        sunriseMin={polar ? undefined : sunrise}
        activeIdx={activeIdx}
        onSelect={setActiveIdx}
      />
    </Frame>
  );
};

export const Athens_Solstice: Story = {
  name: "Athens · 21 June 2026 · long day · 14:30",
  render: () => (
    <Interactive sunrise={6 * 60 + 2} sunset={20 * 60 + 51} nowMin={14 * 60 + 30} />
  ),
};

export const Reykjavik_Winter: Story = {
  name: "Reykjavík · short day · midday",
  render: () => (
    <Interactive sunrise={11 * 60 + 22} sunset={15 * 60 + 30} nowMin={13 * 60} />
  ),
};

export const Equinox: Story = {
  name: "Equinox · day and night equal",
  render: () => (
    <Interactive sunrise={6 * 60} sunset={18 * 60} nowMin={12 * 60} />
  ),
};

export const Polar_Fallback: Story = {
  name: "Polar fallback · 24×60m from midnight",
  render: () => (
    <Interactive
      sunrise={0}
      sunset={720}
      nowMin={14 * 60 + 30}
      polar
    />
  ),
};

export const NoNowMarker: Story = {
  name: "No NOW marker · static teaching diagram",
  render: () => {
    const hours = buildHours({ sunrise: 6 * 60 + 2, sunset: 20 * 60 + 51 });
    return (
      <Frame>
        <PlanetaryHourStrip
          hours={hours}
          dayLengthMin={20 * 60 + 51 - (6 * 60 + 2)}
          nightLengthMin={1440 - (20 * 60 + 51 - (6 * 60 + 2))}
          showNow={false}
        />
      </Frame>
    );
  },
};
