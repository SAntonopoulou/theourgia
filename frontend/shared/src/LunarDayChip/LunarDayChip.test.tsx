import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodayContextRead } from "../api/types.js";
import { LunarDayChip } from "./index.js";

function context(overrides: Partial<TodayContextRead> = {}): TodayContextRead {
  return {
    date: "2026-07-25",
    attic: {
      year: 3,
      year_span: "2026/27",
      month: 1,
      month_name: "Hekatombaion",
      day: 29,
      month_length: 29,
      is_intercalary_year: false,
    },
    observance: null,
    moon: { phase_angle: 351.4, phase_name: "Waning crescent" },
    attribution: "Attic reckoning computed locally.",
    ...overrides,
  };
}

describe("LunarDayChip", () => {
  it("leads with the Deipnon observance — the actionable part, not the phase", () => {
    render(<LunarDayChip context={context({ observance: "deipnon" })} />);
    expect(screen.getByText("Deipnon tonight — dark moon")).toBeInTheDocument();
    expect(screen.getByText("Hekatombaion 29")).toBeInTheDocument();
    expect(screen.getByText(/the offering goes to the crossroads after dark/i)).toBeInTheDocument();
  });

  it("renders the Noumenia state on day 1", () => {
    render(
      <LunarDayChip
        context={context({
          observance: "noumenia",
          attic: { ...context().attic, day: 1 },
          moon: { phase_angle: 8, phase_name: "New moon" },
        })}
      />,
    );
    expect(screen.getByText("Noumenia — the month begins")).toBeInTheDocument();
    expect(screen.getByText(/First day of Hekatombaion/i)).toBeInTheDocument();
    expect(screen.getByText("Hekatombaion 1")).toBeInTheDocument();
  });

  it("renders the Agathos Daimon state on day 2", () => {
    render(
      <LunarDayChip
        context={context({
          observance: "agathos_daimon",
          attic: { ...context().attic, day: 2 },
          moon: { phase_angle: 20, phase_name: "Waxing crescent" },
        })}
      />,
    );
    expect(screen.getByText("Agathos Daimon — the second day")).toBeInTheDocument();
    expect(screen.getByText(/a libation to the Agathos Daimon/i)).toBeInTheDocument();
  });

  it("falls back to the phase name on an ordinary day", () => {
    render(
      <LunarDayChip
        context={context({
          attic: { ...context().attic, day: 14 },
          moon: { phase_angle: 178, phase_name: "Full moon" },
        })}
      />,
    );
    expect(screen.getByText("Full moon")).toBeInTheDocument();
    expect(screen.getByText(/Day 14 of Hekatombaion/i)).toBeInTheDocument();
  });

  it("exposes the observance as a data hook and derives illumination", () => {
    const { container } = render(<LunarDayChip context={context({ observance: "deipnon" })} />);
    const chip = container.querySelector('[data-component="lunar-day-chip"]');
    expect(chip).toHaveAttribute("data-observance", "deipnon");
    // cos(351.4°) ≈ 0.9887 → illumination ≈ 1% — the phase percentage is
    // secondary detail, never the headline.
    expect(screen.getByText(/waning crescent, 1%/i)).toBeInTheDocument();
  });

  it("renders the optional trailing action", () => {
    render(
      <LunarDayChip
        context={context({ observance: "deipnon" })}
        action={<a href="/calendar">Observances</a>}
      />,
    );
    expect(screen.getByText("Observances")).toBeInTheDocument();
  });
});
