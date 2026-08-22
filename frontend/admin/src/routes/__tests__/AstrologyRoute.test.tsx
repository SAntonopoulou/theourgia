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
  // The server-derived reading for the chart above: the Sun below the
  // horizon (arc from the Descendant ≥ 180°) makes it nocturnal, and the
  // nocturnal Fortune is Asc + Sun − Moon = 147.5°.
  const DOCTRINE = {
    sect: {
      sect: "nocturnal",
      light: "moon",
      benefic: "venus",
      malefic_contrary: "saturn",
      is_borderline: false,
    },
    lots: [
      { id: "fortune", label: "Fortune", longitude: 147.5 },
      { id: "spirit", label: "Spirit", longitude: 237.1 },
    ],
    dignities: [
      {
        body_id: "sun",
        sign: "Leo",
        domicile_lord: "sun",
        exaltation_lord: null,
        triplicity_lord: "jupiter",
        bound_lord: "saturn",
        decan_lord: "jupiter",
        held: ["domicile"],
        debilities: [],
        peregrine: false,
      },
      {
        body_id: "moon",
        sign: "Aries",
        domicile_lord: "mars",
        exaltation_lord: "sun",
        triplicity_lord: "jupiter",
        bound_lord: "jupiter",
        decan_lord: "mars",
        held: [],
        debilities: [],
        peregrine: true,
      },
    ],
    doctrine: {
      solar_phase: "paulus",
      predominator: "valensWholeSign",
      exaltation_degrees: "signLevel",
      saturn_exaltation_degree: 21,
      venus_exaltation_degree: 27,
      maltreatment_contested_sextile: true,
      void_of_course: "signBounded",
    },
    attribution: "Swiss Ephemeris",
  };
  return {
    CHART,
    DOCTRINE,
    getMyLocation: vi.fn(() => Promise.resolve({ lat: 41.0, lng: -80.0 })),
    getChart: vi.fn(() => Promise.resolve(CHART)),
    getChartDoctrine: vi.fn(() => Promise.resolve(DOCTRINE)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiMethods: {
    getMyLocation: mocks.getMyLocation,
    getChart: mocks.getChart,
    getChartDoctrine: mocks.getChartDoctrine,
  },
}));

import { AstrologyRoute } from "../AstrologyRoute.js";

afterEach(() => {
  mocks.getMyLocation.mockClear();
  mocks.getChart.mockClear();
  mocks.getChartDoctrine.mockClear();
});

describe("AstrologyRoute", () => {
  it("casts from the saved location and draws the placements", async () => {
    render(<AstrologyRoute />);

    // The bodies reach the surface once the cast returns — they appear in both
    // the legend and the dignities table, so there is more than one of each.
    expect((await screen.findAllByText("Sun")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Moon").length).toBeGreaterThan(0);

    // It cast at the user's stored coordinates.
    expect(mocks.getChart).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 41.0, longitude: -80.0 }),
    );

    // The angles are read off the returned houses.
    expect(screen.getByText(/Ascendant/)).toBeInTheDocument();

    // The traditional reading is fetched from the server (debounced behind the
    // cast) and shown: sect, then the Lots by name.
    expect(await screen.findByText(/nocturnal/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Fortune")).toBeInTheDocument();
    expect(mocks.getChartDoctrine).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 41.0, longitude: -80.0 }),
    );
  });
});
