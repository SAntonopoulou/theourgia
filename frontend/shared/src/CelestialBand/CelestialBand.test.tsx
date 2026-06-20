import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CelestialBand } from "./index.js";

// Greenwich-ish, summer 2026 (around the solstice). suncalc handles the
// real sunrise/sunset; we just verify the band renders the expected
// labels for the supplied `now`.

const GREENWICH = { lat: 51.4769, lng: 0 };

describe("CelestialBand", () => {
  it("renders the planetary-hour label in full variant", () => {
    const now = new Date(2026, 5, 21, 12, 0); // 2026-06-21 noon — Sunday
    render(<CelestialBand lat={GREENWICH.lat} lng={GREENWICH.lng} now={now} refreshMs={null} />);
    expect(screen.getByText(/Hour of/)).toBeInTheDocument();
    expect(screen.getByText(/today belongs to/)).toBeInTheDocument();
  });

  it("renders a sunrise + sunset readout in full variant", () => {
    const now = new Date(2026, 5, 21, 12, 0);
    render(<CelestialBand lat={GREENWICH.lat} lng={GREENWICH.lng} now={now} refreshMs={null} />);
    expect(screen.getByText(/sunrise/)).toBeInTheDocument();
    expect(screen.getByText(/sunset/)).toBeInTheDocument();
  });

  it("renders a lunar phase + percent in full variant", () => {
    const now = new Date(2026, 5, 21, 12, 0);
    render(<CelestialBand lat={GREENWICH.lat} lng={GREENWICH.lng} now={now} refreshMs={null} />);
    // The exact percent depends on suncalc; just check a digit + % is shown.
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });

  it("compact variant collapses to one line", () => {
    const now = new Date(2026, 5, 21, 12, 0);
    const { container } = render(
      <CelestialBand
        lat={GREENWICH.lat}
        lng={GREENWICH.lng}
        now={now}
        refreshMs={null}
        variant="compact"
      />,
    );
    expect(container.querySelector('[data-celestial-band="compact"]')).not.toBeNull();
    expect(container.querySelector('[data-celestial-band="full"]')).toBeNull();
  });

  it("respects the supplied `now` (Sunday noon → Sunday's day-ruler is Sun)", () => {
    const sundayNoon = new Date(2026, 5, 21, 12, 0); // 2026-06-21 = Sunday
    render(
      <CelestialBand lat={GREENWICH.lat} lng={GREENWICH.lng} now={sundayNoon} refreshMs={null} />,
    );
    // Sunday's day-ruler is the Sun.
    expect(screen.getByText(/today belongs to\s+Sun/i)).toBeInTheDocument();
  });
});
