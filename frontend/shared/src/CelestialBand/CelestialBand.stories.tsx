/**
 * CelestialBand — date · lunar phase · planetary day · planetary hour.
 *
 * The band is timezone-aware: pass lat/lng for the practitioner's
 * location. Stories use Athens (the etymology home of *theourgia*) and
 * a Pacific Northwest coordinate to show the contrast.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { CelestialBand } from "./CelestialBand.js";

const meta = {
  title: "Foundations/CelestialBand",
  component: CelestialBand,
  tags: ["autodocs"],
  // Fixed "now" so stories are deterministic on CI; the live Today surface
  // sets `now=new Date()` and refreshes every minute.
  args: { lat: 37.9838, lng: 23.7275, now: new Date("2026-06-21T08:30:00Z") },
  argTypes: {
    variant: { control: "radio", options: ["full", "compact"] },
    lat: { control: { type: "number", min: -90, max: 90 } },
    lng: { control: { type: "number", min: -180, max: 180 } },
  },
} satisfies Meta<typeof CelestialBand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AthensSummerSolstice: Story = {
  args: { lat: 37.9838, lng: 23.7275, now: new Date("2026-06-21T08:30:00Z"), variant: "full" },
};

export const PortlandWinterSolstice: Story = {
  args: { lat: 45.5152, lng: -122.6784, now: new Date("2026-12-21T16:45:00Z"), variant: "full" },
};

export const Compact: Story = {
  args: { lat: 37.9838, lng: 23.7275, now: new Date("2026-06-21T08:30:00Z"), variant: "compact" },
};
