import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LunarPhaseWidget } from "./LunarPhaseWidget.js";
import {
  moonPath,
  phaseMetricsFromDays,
  phaseName,
} from "./moonPath.js";

describe("moonPath math", () => {
  it("returns empty path for new moon (illumination 0)", () => {
    expect(moonPath(0, true)).toBe("");
    expect(moonPath(0.0005, true)).toBe("");
  });

  it("returns a full disc for full moon (illumination 1)", () => {
    const d = moonPath(1, true);
    expect(d).toContain("M50,6"); // start at top
    expect(d).toContain("Z");
    // No second arc with a smaller radius — full disc is two semi-arcs of r.
    expect(d.split("A").length).toBe(3); // two A commands → split into 3 parts
  });

  it("crescent path uses an opposite sweep flag from gibbous (waxing)", () => {
    const crescent = moonPath(0.25, true);
    const gibbous = moonPath(0.75, true);
    expect(crescent).not.toEqual(gibbous);
    // Both are non-empty
    expect(crescent.length).toBeGreaterThan(0);
    expect(gibbous.length).toBeGreaterThan(0);
  });

  it("phaseMetricsFromDays converts 14.77 days to ~full", () => {
    const m = phaseMetricsFromDays(14.77); // half-synodic
    expect(m.illumination).toBeGreaterThan(0.99);
    expect(m.waxing).toBe(false); // crossed the halfway point
  });

  it("phaseMetricsFromDays converts 6 days to a waxing crescent", () => {
    const m = phaseMetricsFromDays(6);
    expect(m.waxing).toBe(true);
    expect(m.illumination).toBeGreaterThan(0.2);
    expect(m.illumination).toBeLessThan(0.5);
  });

  it("phaseName resolves boundaries correctly", () => {
    expect(phaseName(0, true)).toBe("New moon");
    expect(phaseName(1, true)).toBe("Full moon");
    expect(phaseName(0.5, true)).toBe("First quarter");
    expect(phaseName(0.5, false)).toBe("Last quarter");
    expect(phaseName(0.25, true)).toBe("Waxing crescent");
    expect(phaseName(0.75, true)).toBe("Waxing gibbous");
    expect(phaseName(0.25, false)).toBe("Waning crescent");
    expect(phaseName(0.75, false)).toBe("Waning gibbous");
  });
});

describe("LunarPhaseWidget", () => {
  it("renders the current phase name", () => {
    render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    expect(screen.getByTestId("phase-name").textContent).toMatch(
      /Waxing crescent/,
    );
  });

  it("renders the illumination percentage", () => {
    render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    expect(screen.getByText(/illuminated/i)).toBeInTheDocument();
  });

  it("renders the phase angle in degrees", () => {
    render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    expect(screen.getByText(/phase angle/i)).toBeInTheDocument();
  });

  it("renders the 8-cell phase cycle rail", () => {
    const { container } = render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    expect(container.querySelectorAll("[data-cycle-step]")).toHaveLength(8);
  });

  it("highlights the current step in the cycle rail", () => {
    const { container } = render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    const current = container.querySelectorAll('[data-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("data-cycle-step")).toMatch(
      /Waxing crescent/,
    );
  });

  it("renders the optional next-phase line", () => {
    render(
      <LunarPhaseWidget
        daysSinceNewMoon={6}
        nextPhase={{ label: "First quarter in", in: "2 days 4 hours" }}
      />,
    );
    expect(screen.getByText(/First quarter in/i)).toBeInTheDocument();
    expect(screen.getByText("2 days 4 hours")).toBeInTheDocument();
  });

  it("toggles hemisphere when the southern button is clicked", () => {
    const onHemisphereChange = vi.fn();
    render(
      <LunarPhaseWidget
        daysSinceNewMoon={6}
        onHemisphereChange={onHemisphereChange}
      />,
    );
    fireEvent.click(screen.getByText("Southern"));
    expect(onHemisphereChange).toHaveBeenCalledWith("south");
  });

  it("flips the limb-brightens-on label per hemisphere", () => {
    const { rerender } = render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    expect(screen.getByText(/limb brightens on the right/i)).toBeInTheDocument();
    rerender(<LunarPhaseWidget daysSinceNewMoon={6} hemisphere="south" />);
    expect(screen.getByText(/limb brightens on the left/i)).toBeInTheDocument();
  });

  it("attaches data-hemisphere + data-state attributes", () => {
    const { container } = render(
      <LunarPhaseWidget daysSinceNewMoon={6} hemisphere="south" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-hemisphere")).toBe("south");
    expect(root.getAttribute("data-state")).toBe("normal");
  });

  it("renders loading skeleton when state=loading", () => {
    const { container } = render(
      <LunarPhaseWidget daysSinceNewMoon={6} state="loading" />,
    );
    expect(container.querySelectorAll(".skel").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-cycle-step]')).toBeNull();
  });

  it("renders error state when state=error", () => {
    render(<LunarPhaseWidget daysSinceNewMoon={6} state="error" />);
    expect(screen.getByText(/Lunar data unavailable/i)).toBeInTheDocument();
  });

  it("the role=img wrapper carries an accessible name with phase + percent", () => {
    render(<LunarPhaseWidget daysSinceNewMoon={6} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toMatch(/Waxing crescent/);
    expect(img.getAttribute("aria-label")).toMatch(/% illuminated/);
  });
});
