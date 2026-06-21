/**
 * Chart — SVG natal/event chart renderer.
 *
 * Stories use static placement data so the visual diff is stable
 * across machines. Live API integration happens at the consuming
 * surface (admin Today + Divination, public Profile if the user
 * shares).
 *
 * The reference instant is the 2026 northern summer solstice cast
 * at Athens (37.9838°N, 23.7275°E), tropical zodiac, Placidus
 * houses. Values are illustrative — actual chart calc lives in the
 * backend.
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Chart, ChartLegend } from "./index.js";

const DEMO_PLACEMENTS = [
  { body_id: "sun", body_name: "Sun", glyph: "☉", tropical_longitude: 90.5, tropical_sign: "Cancer", house: 10, is_retrograde: false },
  { body_id: "moon", body_name: "Moon", glyph: "☽", tropical_longitude: 215.2, tropical_sign: "Scorpio", house: 3, is_retrograde: false },
  { body_id: "mercury", body_name: "Mercury", glyph: "☿", tropical_longitude: 114.7, tropical_sign: "Cancer", house: 10, is_retrograde: false },
  { body_id: "venus", body_name: "Venus", glyph: "♀", tropical_longitude: 129.3, tropical_sign: "Leo", house: 11, is_retrograde: false },
  { body_id: "mars", body_name: "Mars", glyph: "♂", tropical_longitude: 54.8, tropical_sign: "Taurus", house: 8, is_retrograde: false },
  { body_id: "jupiter", body_name: "Jupiter", glyph: "♃", tropical_longitude: 118.4, tropical_sign: "Cancer", house: 10, is_retrograde: false },
  { body_id: "saturn", body_name: "Saturn", glyph: "♄", tropical_longitude: 6.5, tropical_sign: "Aries", house: 7, is_retrograde: false },
  { body_id: "uranus", body_name: "Uranus", glyph: "♅", tropical_longitude: 95.1, tropical_sign: "Cancer", house: 10, is_retrograde: false },
  { body_id: "neptune", body_name: "Neptune", glyph: "♆", tropical_longitude: 359.2, tropical_sign: "Pisces", house: 6, is_retrograde: true },
  { body_id: "pluto", body_name: "Pluto", glyph: "♇", tropical_longitude: 304.4, tropical_sign: "Aquarius", house: 5, is_retrograde: true },
];

const DEMO_HOUSES = {
  cusps: [152.3, 176.2, 205.1, 238.0, 270.0, 298.0, 332.3, 356.2, 25.1, 58.0, 90.0, 118.0],
  ascendant: 152.3,
  midheaven: 58.0,
};

const DEMO_ASPECTS = [
  { body_a: "sun", body_b: "jupiter", kind: "conjunction" as const, orb: 4.1 },
  { body_a: "moon", body_b: "venus", kind: "square" as const, orb: 3.9 },
  { body_a: "mercury", body_b: "saturn", kind: "trine" as const, orb: 1.8 },
  { body_a: "venus", body_b: "neptune", kind: "trine" as const, orb: 4.5 },
  { body_a: "mars", body_b: "pluto", kind: "opposition" as const, orb: 5.5 },
];

const meta = {
  title: "Astrology/Chart",
  component: Chart,
  tags: ["autodocs"],
  args: {
    placements: DEMO_PLACEMENTS,
    houses: DEMO_HOUSES,
    aspects: DEMO_ASPECTS,
    title: "Summer Solstice 2026 · Athens",
    description: "Tropical chart cast for 2026-06-21 12:00 UTC at 37.98°N 23.73°E.",
    size: 480,
    attribution:
      "Astrological calculations powered by Swiss Ephemeris by Astrodienst AG. " +
      "Ephemeris data derived from the JPL DE441 (NASA/JPL).",
  },
  argTypes: {
    size: { control: { type: "number", min: 240, max: 720 } },
    showAspects: { control: "boolean" },
    showHouses: { control: "boolean" },
  },
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoAspects: Story = { args: { showAspects: false } };

export const NoHouses: Story = { args: { showHouses: false } };

export const Compact: Story = { args: { size: 320 } };

export const WithLegend: Story = {
  args: {},
  render: (args) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <Chart {...args} />
      <ChartLegend placements={DEMO_PLACEMENTS} />
    </div>
  ),
};
