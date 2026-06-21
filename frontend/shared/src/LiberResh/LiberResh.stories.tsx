/**
 * Liber Resh stories — one per primitive plus a few interesting
 * variants (observed, faded past station, southern sun-arc, full
 * day's streak).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ReshNextAdoration } from "./ReshNextAdoration.js";
import { ReshStationCard } from "./ReshStationCard.js";
import {
  type ReshStreakDay,
  ReshStreakGrid,
} from "./ReshStreakGrid.js";
import { RESH_THELEMIC } from "./resh.js";
import { SunArcDiagram } from "./SunArcDiagram.js";

const meta = {
  title: "LiberResh",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 480,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── ReshStationCard ───────────────────────────────────────────────

export const StationCard_Upcoming: Story = {
  name: "Station card · upcoming (Sunset, Tum)",
  render: () => (
    <Frame>
      <ReshStationCard
        station="sunset"
        adoration={RESH_THELEMIC.stations.sunset}
        stationMin={20 * 60 + 51}
        stationMinUtc={17 * 60 + 51}
        isNext
        statusText="upcoming · in 6h 21m"
        onMarkObserved={() => {}}
      />
    </Frame>
  ),
};

export const StationCard_Observed: Story = {
  name: "Station card · observed with note (Sunrise)",
  render: () => (
    <Frame>
      <ReshStationCard
        station="sunrise"
        adoration={RESH_THELEMIC.stations.sunrise}
        stationMin={6 * 60 + 2}
        stationMinUtc={3 * 60 + 2}
        observation={{
          atMin: 6 * 60 + 9,
          note: "Before the others woke. Sea very still.",
        }}
      />
    </Frame>
  ),
};

export const StationCard_FadedPast: Story = {
  name: "Station card · faded (past, unobserved)",
  render: () => (
    <Frame>
      <ReshStationCard
        station="noon"
        adoration={RESH_THELEMIC.stations.noon}
        stationMin={13 * 60 + 26}
        stationMinUtc={10 * 60 + 26}
        isFaded
        statusText="not yet marked"
        onMarkObserved={() => {}}
      />
    </Frame>
  ),
};

// ─── ReshStreakGrid ────────────────────────────────────────────────

function buildDays(counts: number[]): ReshStreakDay[] {
  return counts.map((c, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    count: c,
  }));
}

export const StreakGrid_FaithfulRun: Story = {
  name: "Streak grid · 30+ day run, 3 of 4 today",
  render: () => (
    <Frame width={640}>
      <ReshStreakGrid
        days={buildDays([
          4, 4, 3, 4, 4, 4, 2, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 1, 4, 4, 4, 4, 4,
          4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3,
        ])}
        subtitle="3 of 4 kept so far today"
      />
    </Frame>
  ),
};

export const StreakGrid_LightStart: Story = {
  name: "Streak grid · 7 days, intermittent practice",
  render: () => (
    <Frame width={420}>
      <ReshStreakGrid
        days={buildDays([1, 0, 2, 0, 0, 3, 1])}
        subtitle="picking it back up"
      />
    </Frame>
  ),
};

// ─── ReshNextAdoration ─────────────────────────────────────────────

export const NextAdoration_Sunset: Story = {
  name: "Next adoration · Sunset / Tum",
  render: () => (
    <Frame width={760}>
      <ReshNextAdoration
        station="sunset"
        adoration={RESH_THELEMIC.stations.sunset}
        stationMin={20 * 60 + 51}
        stationMinUtc={17 * 60 + 51}
        countdown="6h 21m"
        liturgyAction={
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--accent)",
            }}
          >
            Open full liturgy →
          </span>
        }
      />
    </Frame>
  ),
};

export const NextAdoration_Midnight: Story = {
  name: "Next adoration · Midnight / Khephra",
  render: () => (
    <Frame width={760}>
      <ReshNextAdoration
        station="midnight"
        adoration={RESH_THELEMIC.stations.midnight}
        stationMin={86}
        stationMinUtc={86 - 180 + 1440}
        countdown="9h 56m"
      />
    </Frame>
  ),
};

// ─── SunArcDiagram ─────────────────────────────────────────────────

export const SunArc_Midday: Story = {
  name: "Sun arc · midday (fraction 0.5)",
  render: () => (
    <Frame width={300}>
      <SunArcDiagram
        daylightFraction={0.5}
        caption="Ra-Hoor-Khuit at the East, Hadit at the height, Tum at the West, Khephra in the deep below."
      />
    </Frame>
  ),
};

export const SunArc_EarlyAfternoon: Story = {
  name: "Sun arc · early afternoon (fraction 0.65)",
  render: () => (
    <Frame width={300}>
      <SunArcDiagram daylightFraction={0.65} />
    </Frame>
  ),
};

export const SunArc_NightSide: Story = {
  name: "Sun arc · night (sun below horizon)",
  render: () => (
    <Frame width={300}>
      <SunArcDiagram daylightFraction={-0.2} />
    </Frame>
  ),
};
