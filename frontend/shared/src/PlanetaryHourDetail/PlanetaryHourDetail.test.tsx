import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  DEFAULT_RULERSHIPS,
  PlanetaryHourDetail,
} from "./PlanetaryHourDetail.js";

describe("PlanetaryHourDetail", () => {
  it("renders the canonical name + ordinal line", () => {
    render(
      <PlanetaryHourDetail
        ruler="sun"
        ordinalInArc={6}
        isDay={true}
        startMin={14 * 60 + 30}
        endMin={15 * 60 + 44}
        lengthMin={74}
      />,
    );
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText(/Day-hour 7 of 12 · daylight/)).toBeInTheDocument();
  });

  it("formats begins / ends / length", () => {
    render(
      <PlanetaryHourDetail
        ruler="venus"
        ordinalInArc={0}
        isDay={false}
        startMin={20 * 60 + 51}
        endMin={21 * 60 + 36}
        lengthMin={45}
      />,
    );
    expect(screen.getByText("20:51")).toBeInTheDocument();
    expect(screen.getByText("21:36")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });

  it("renders the 'Now' badge when isNow is true", () => {
    const { container } = render(
      <PlanetaryHourDetail
        ruler="sun"
        ordinalInArc={6}
        isDay={true}
        startMin={870}
        endMin={945}
        lengthMin={75}
        isNow
      />,
    );
    expect(container.querySelector("[data-now-badge]")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("uses 'Selected hour' tag when isExplicitSelection but NOT now", () => {
    render(
      <PlanetaryHourDetail
        ruler="venus"
        ordinalInArc={0}
        isDay={false}
        startMin={1251}
        endMin={1296}
        lengthMin={45}
        isExplicitSelection
      />,
    );
    expect(screen.getByText("Selected hour")).toBeInTheDocument();
  });

  it("uses the canonical favours + note from DEFAULT_RULERSHIPS when not overridden", () => {
    render(
      <PlanetaryHourDetail
        ruler="sat"
        ordinalInArc={0}
        isDay={false}
        startMin={0}
        endMin={60}
        lengthMin={60}
      />,
    );
    DEFAULT_RULERSHIPS.sat.favours.forEach((f) => {
      expect(screen.getByText(f)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Saturn governs limit and duration/),
    ).toBeInTheDocument();
  });

  it("allows the caller to override favours + note", () => {
    render(
      <PlanetaryHourDetail
        ruler="sun"
        ordinalInArc={6}
        isDay={true}
        startMin={870}
        endMin={945}
        lengthMin={75}
        rulership={{
          favours: ["Crown chakra", "Royal blessings"],
          note: "Bespoke note for this surface.",
        }}
      />,
    );
    expect(screen.getByText("Crown chakra")).toBeInTheDocument();
    expect(
      screen.getByText("Bespoke note for this surface."),
    ).toBeInTheDocument();
  });

  it("renders the color-strip top accent", () => {
    const { container } = render(
      <PlanetaryHourDetail
        ruler="mars"
        ordinalInArc={3}
        isDay={true}
        startMin={600}
        endMin={675}
        lengthMin={75}
      />,
    );
    expect(container.querySelector("[data-color-strip]")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <PlanetaryHourDetail
        ruler="moon"
        ordinalInArc={0}
        isDay={false}
        startMin={1251}
        endMin={1296}
        lengthMin={45}
        isNow
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("planetary-hour-detail");
    expect(root.getAttribute("data-ruler")).toBe("moon");
    expect(root.getAttribute("data-is-now")).toBe("true");
  });

  it("'Night-hour N of 12 · night' phrasing fires when isDay=false", () => {
    render(
      <PlanetaryHourDetail
        ruler="moon"
        ordinalInArc={4}
        isDay={false}
        startMin={0}
        endMin={45}
        lengthMin={45}
      />,
    );
    expect(screen.getByText(/Night-hour 5 of 12 · night/)).toBeInTheDocument();
  });
});
