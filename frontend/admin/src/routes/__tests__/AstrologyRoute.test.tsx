/**
 * AstrologyRoute — casts a chart on mount from the saved location and draws
 * the wheel. Covers: the saved location seeds the cast, and the server's
 * placements reach the legend (so the ChartResponse → <Chart> path holds).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const CHART = {
    instant: "2026-08-20T00:00:00Z",
    julian_day: 2461000,
    latitude: 41.0,
    longitude: -80.0,
    zodiac: "tropical",
    house_system: "placidus",
    placements: [
      {
        body_id: "sun",
        body_name: "Sun",
        glyph: "☉",
        tropical_longitude: 147.5,
        tropical_sign: "Leo",
        house: 5,
        is_retrograde: false,
      },
      {
        body_id: "moon",
        body_name: "Moon",
        glyph: "☽",
        tropical_longitude: 12.3,
        tropical_sign: "Aries",
        house: 1,
        is_retrograde: false,
      },
    ],
    houses: {
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 12.3,
      midheaven: 282.0,
    },
    aspects: [],
    attribution: "Swiss Ephemeris",
  };
  return {
    CHART,
    getMyLocation: vi.fn(() => Promise.resolve({ lat: 41.0, lng: -80.0 })),
    getChart: vi.fn(() => Promise.resolve(CHART)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiMethods: {
    getMyLocation: mocks.getMyLocation,
    getChart: mocks.getChart,
  },
}));

import { AstrologyRoute } from "../AstrologyRoute.js";

afterEach(() => {
  mocks.getMyLocation.mockClear();
  mocks.getChart.mockClear();
});

describe("AstrologyRoute", () => {
  it("casts from the saved location and draws the placements", async () => {
    render(<AstrologyRoute />);

    // The legend lists the server's bodies once the cast returns.
    expect(await screen.findByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Moon")).toBeInTheDocument();

    // It cast at the user's stored coordinates.
    expect(mocks.getChart).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 41.0, longitude: -80.0 }),
    );

    // The angles are read off the returned houses.
    expect(screen.getByText(/Ascendant/)).toBeInTheDocument();
  });
});
