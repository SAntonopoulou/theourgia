import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  RESH_STATION_ORDER,
  RESH_THELEMIC,
  RESH_TRADITIONS,
  formatMinute,
} from "./resh.js";
import { ReshNextAdoration } from "./ReshNextAdoration.js";
import { ReshStationCard } from "./ReshStationCard.js";
import {
  type ReshStreakDay,
  ReshStreakGrid,
} from "./ReshStreakGrid.js";
import { SunArcDiagram } from "./SunArcDiagram.js";

// ─── resh.ts constants + helpers ───────────────────────────────────

describe("Liber Resh constants", () => {
  it("exposes exactly four stations in canonical order", () => {
    expect(RESH_STATION_ORDER).toEqual([
      "sunrise",
      "noon",
      "sunset",
      "midnight",
    ]);
  });

  it("includes the Thelemic invocations verbatim (Liber CC 1911 PD)", () => {
    const sunrise = RESH_THELEMIC.stations.sunrise;
    expect(sunrise.godform).toBe("Ra-Hoor-Khuit");
    expect(sunrise.direction).toBe("the East");
    expect(sunrise.invocation).toBe(
      "Hail unto Thee who art Ra in Thy rising, even unto Thee who art Ra in Thy strength.",
    );
    expect(RESH_THELEMIC.stations.midnight.godform).toBe("Khephra");
  });

  it("marks non-Thelemic traditions as `soon`", () => {
    expect(RESH_TRADITIONS.thelemic.soon).toBe(false);
    expect(RESH_TRADITIONS.egyptian.soon).toBe(true);
    expect(RESH_TRADITIONS.gnostic.soon).toBe(true);
  });

  it("formatMinute renders HH:MM with midnight wrap", () => {
    expect(formatMinute(0)).toBe("00:00");
    expect(formatMinute(1439)).toBe("23:59");
    expect(formatMinute(1500)).toBe("01:00");
    expect(formatMinute(-90)).toBe("22:30");
  });
});

// ─── ReshStationCard ───────────────────────────────────────────────

describe("ReshStationCard", () => {
  const props = {
    station: "sunrise" as const,
    adoration: RESH_THELEMIC.stations.sunrise,
    stationMin: 6 * 60 + 2,
    stationMinUtc: 3 * 60 + 2,
  };

  it("renders station label + godform + direction", () => {
    render(<ReshStationCard {...props} />);
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.getByText("Ra-Hoor-Khuit")).toBeInTheDocument();
    expect(screen.getByText("the East")).toBeInTheDocument();
  });

  it("renders the verbatim invocation inside curly quotes", () => {
    render(<ReshStationCard {...props} />);
    expect(
      screen.getByText(/Hail unto Thee who art Ra in Thy rising/),
    ).toBeInTheDocument();
  });

  it("renders the local + UTC time strings", () => {
    render(<ReshStationCard {...props} />);
    expect(screen.getByText("06:02")).toBeInTheDocument();
    expect(screen.getByText("03:02Z")).toBeInTheDocument();
  });

  it("shows 'Mark observed' button + status when not observed", () => {
    const onMarkObserved = vi.fn();
    render(
      <ReshStationCard
        {...props}
        onMarkObserved={onMarkObserved}
        statusText="upcoming · in 2h 14m"
      />,
    );
    const btn = screen.getByText("Mark observed");
    expect(btn).toBeInTheDocument();
    expect(screen.getByText("upcoming · in 2h 14m")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onMarkObserved).toHaveBeenCalledOnce();
  });

  it("hides 'Mark observed' when an observation is provided", () => {
    render(
      <ReshStationCard
        {...props}
        observation={{ atMin: 6 * 60 + 9, note: "Sea very still." }}
      />,
    );
    expect(screen.queryByText("Mark observed")).toBeNull();
    expect(screen.getByText("Observed at 06:09")).toBeInTheDocument();
    expect(screen.getByText("Sea very still.")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(<ReshStationCard {...props} isNext />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-station")).toBe("sunrise");
    expect(root.getAttribute("data-observed")).toBe("false");
    expect(root.getAttribute("data-is-next")).toBe("true");
  });

  it("does not include --danger in the structural styling", () => {
    const { container } = render(
      <ReshStationCard
        {...props}
        observation={{ atMin: 6 * 60 + 9 }}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── ReshStreakGrid ────────────────────────────────────────────────

function buildDays(counts: number[]): ReshStreakDay[] {
  return counts.map((c, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    count: c,
  }));
}

describe("ReshStreakGrid", () => {
  it("renders one square per day", () => {
    const { container } = render(
      <ReshStreakGrid days={buildDays([4, 4, 3, 4, 0, 4])} />,
    );
    expect(container.querySelectorAll("[data-day]")).toHaveLength(6);
  });

  it("marks today (last entry) with data-is-today=true", () => {
    const { container } = render(
      <ReshStreakGrid days={buildDays([4, 4, 3])} />,
    );
    const todays = container.querySelectorAll('[data-is-today="true"]');
    expect(todays).toHaveLength(1);
    expect(todays[0]?.getAttribute("data-day")).toBe("2026-06-03");
  });

  it("computes the streak as the trailing run of days with count >= 1", () => {
    render(<ReshStreakGrid days={buildDays([4, 0, 4, 4, 3, 4])} />);
    const count = document.querySelector("[data-streak-count]");
    expect(count?.textContent).toBe("4"); // 4 trailing days >= 1
  });

  it("honours a streakOverride from the caller", () => {
    render(
      <ReshStreakGrid
        days={buildDays([4, 4])}
        streakOverride={42}
      />,
    );
    expect(
      document.querySelector("[data-streak-count]")?.textContent,
    ).toBe("42");
  });

  it("renders the legend with five swatches (0..4)", () => {
    const { container } = render(
      <ReshStreakGrid days={buildDays([1])} />,
    );
    const legend = container.querySelector("[data-legend]");
    expect(legend?.querySelectorAll("[data-legend-count]")).toHaveLength(5);
  });

  it("never uses --danger in the streak palette", () => {
    const { container } = render(
      <ReshStreakGrid days={buildDays([0, 0, 0])} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── ReshNextAdoration ─────────────────────────────────────────────

describe("ReshNextAdoration", () => {
  it("renders countdown + station + godform + direction + times", () => {
    render(
      <ReshNextAdoration
        station="sunset"
        adoration={RESH_THELEMIC.stations.sunset}
        stationMin={20 * 60 + 51}
        stationMinUtc={17 * 60 + 51}
        countdown="2h 14m"
      />,
    );
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("Tum")).toBeInTheDocument();
    expect(screen.getByText(/facing the West/)).toBeInTheDocument();
    expect(screen.getByText("20:51")).toBeInTheDocument();
    expect(screen.getByText("17:51 UTC")).toBeInTheDocument();
    expect(screen.getByText(/in 2h 14m/)).toBeInTheDocument();
  });

  it("renders the invocation verbatim", () => {
    render(
      <ReshNextAdoration
        station="sunset"
        adoration={RESH_THELEMIC.stations.sunset}
        stationMin={20 * 60 + 51}
        stationMinUtc={17 * 60 + 51}
        countdown="2h 14m"
      />,
    );
    expect(
      screen.getByText(
        /Hail unto Thee who art Tum in Thy setting, even unto Thee who art Tum in Thy joy/,
      ),
    ).toBeInTheDocument();
  });

  it("renders the optional liturgy-action slot", () => {
    render(
      <ReshNextAdoration
        station="sunrise"
        adoration={RESH_THELEMIC.stations.sunrise}
        stationMin={362}
        stationMinUtc={182}
        countdown="14h 32m"
        liturgyAction={<a href="/resh/liturgy">Open full liturgy →</a>}
      />,
    );
    expect(screen.getByText("Open full liturgy →")).toBeInTheDocument();
  });

  it("attaches the station data attribute", () => {
    const { container } = render(
      <ReshNextAdoration
        station="midnight"
        adoration={RESH_THELEMIC.stations.midnight}
        stationMin={86}
        stationMinUtc={86 - 180 + 1440}
        countdown="9h 56m"
      />,
    );
    expect(container.firstElementChild?.getAttribute("data-station")).toBe(
      "midnight",
    );
  });
});

// ─── SunArcDiagram ─────────────────────────────────────────────────

describe("SunArcDiagram", () => {
  it("renders four station ticks (sunrise / noon / sunset / midnight)", () => {
    const { container } = render(<SunArcDiagram daylightFraction={0.5} />);
    expect(container.querySelectorAll("[data-tick]")).toHaveLength(4);
  });

  it("renders the moving sun dot + halo when fraction is in [0,1]", () => {
    const { container } = render(<SunArcDiagram daylightFraction={0.4} />);
    expect(container.querySelector("[data-sun-dot]")).toBeInTheDocument();
    expect(container.querySelector("[data-sun-halo]")).toBeInTheDocument();
  });

  it("hides the sun + halo when below or above the horizon", () => {
    const { container } = render(<SunArcDiagram daylightFraction={-0.1} />);
    expect(container.querySelector("[data-sun-dot]")).toBeNull();
  });

  it("places the sun close to mid-arc at fraction 0.5", () => {
    const { container } = render(<SunArcDiagram daylightFraction={0.5} />);
    const dot = container.querySelector("[data-sun-dot]");
    // At fraction 0.5, theta = π/2 → cx = 120, cy = 22 (zenith).
    expect(Number(dot?.getAttribute("cx"))).toBeCloseTo(120, 0);
    expect(Number(dot?.getAttribute("cy"))).toBeCloseTo(22, 0);
  });

  it("renders the optional caption", () => {
    render(
      <SunArcDiagram
        daylightFraction={0.4}
        caption="Ra-Hoor-Khuit at the East, Hadit at the height."
      />,
    );
    expect(
      screen.getByText(/Ra-Hoor-Khuit at the East/),
    ).toBeInTheDocument();
  });
});
