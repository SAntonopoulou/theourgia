import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import {
  type PlanetaryHourCell,
  PlanetaryHourStrip,
  formatDuration,
  formatTime,
} from "./PlanetaryHourStrip.js";

/**
 * Build a Sunday-rooted 24-hour set with the Athens-solstice
 * timings used in the design's worked example.
 */
function buildAthens(): {
  hours: PlanetaryHourCell[];
  sunrise: number;
  sunset: number;
  dayLen: number;
  nightLen: number;
} {
  const HSEQ = ["sun", "venus", "merc", "moon", "sat", "jup", "mars"] as const;
  const sunrise = 6 * 60 + 2; // 06:02
  const sunset = 20 * 60 + 51; // 20:51
  const dayLen = sunset - sunrise;
  const nightLen = 1440 - dayLen;
  const dayHour = dayLen / 12;
  const nightHour = nightLen / 12;
  const hours: PlanetaryHourCell[] = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const lengthMin = isDay ? dayHour : nightHour;
    const startMin = isDay ? sunrise + i * dayHour : sunset + (i - 12) * nightHour;
    hours.push({
      idx: i,
      ruler: HSEQ[i % 7]!,
      isDay,
      startMin: startMin % 1440,
      lengthMin,
    });
  }
  return { hours, sunrise, sunset, dayLen, nightLen };
}

describe("formatTime / formatDuration", () => {
  it("formatTime wraps minutes >= 1440 cleanly", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(1439)).toBe("23:59");
    expect(formatTime(1500)).toBe("01:00"); // wrap
    expect(formatTime(-60)).toBe("23:00"); // negative wrap
  });

  it("formatDuration formats hours+minutes", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h 0m");
    expect(formatDuration(125)).toBe("2h 5m");
  });
});

describe("PlanetaryHourStrip", () => {
  it("renders 24 cells", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
      />,
    );
    expect(container.querySelectorAll("[data-hour-idx]")).toHaveLength(24);
  });

  it("each cell's flex-grow matches its true length in minutes", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
      />,
    );
    const cells = container.querySelectorAll("[data-hour-idx]");
    const day1 = cells[0] as HTMLElement;
    const night1 = cells[12] as HTMLElement;
    expect(Number(day1.style.flexGrow)).toBeCloseTo(hours[0]!.lengthMin, 3);
    expect(Number(night1.style.flexGrow)).toBeCloseTo(hours[12]!.lengthMin, 3);
    // In summer at Athens latitude the day-hour is wider than the night-hour.
    expect(Number(day1.style.flexGrow)).toBeGreaterThan(
      Number(night1.style.flexGrow),
    );
  });

  it("marks the active cell with data-hour-active=true + shadow halo", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        activeIdx={5}
      />,
    );
    const active = container.querySelector("[data-hour-active='true']");
    expect(active).toBeInTheDocument();
    expect(active?.getAttribute("data-hour-idx")).toBe("5");
  });

  it("marks the NOW cell based on nowMin containment", () => {
    const { hours, sunrise, dayLen, nightLen } = buildAthens();
    // 14:30 → 870 min. Day-hour ~74.08m wide; cell 0 starts at 362.
    // (14:30 - 06:02) = 8h 28m = 508 min. 508 / 74.08 = ~6.86, so hour idx 6.
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        nowMin={14 * 60 + 30}
        sunriseMin={sunrise}
      />,
    );
    const now = container.querySelector("[data-hour-now='true']");
    expect(now).toBeInTheDocument();
    expect(now?.getAttribute("data-hour-idx")).toBe("6");
  });

  it("renders the NOW vertical line + dot when nowMin is provided", () => {
    const { hours, sunrise, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        nowMin={14 * 60 + 30}
        sunriseMin={sunrise}
      />,
    );
    expect(container.querySelector("[data-now-line]")).toBeInTheDocument();
    expect(container.querySelector("[data-now-dot]")).toBeInTheDocument();
  });

  it("hides the NOW marker when showNow is false", () => {
    const { hours, sunrise, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        nowMin={870}
        sunriseMin={sunrise}
        showNow={false}
      />,
    );
    expect(container.querySelector("[data-now-line]")).toBeNull();
  });

  it("calls onSelect with the clicked cell's idx", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const onSelect = vi.fn();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        onSelect={onSelect}
      />,
    );
    const cell3 = container.querySelector("[data-hour-idx='3']");
    fireEvent.click(cell3!);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("arc labels widen proportional to day vs night length", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
      />,
    );
    // Arc labels are the first row inside the root — direct children
    // of the first inner <div>.
    const root = container.firstElementChild as HTMLElement;
    const arcRow = root.firstElementChild as HTMLElement;
    const [dayLabel, nightLabel] = Array.from(
      arcRow.children,
    ) as HTMLElement[];
    expect(Number(dayLabel!.style.flexGrow)).toBeCloseTo(dayLen, 3);
    expect(Number(nightLabel!.style.flexGrow)).toBeCloseTo(nightLen, 3);
  });

  it("includes ruler + current-hour context in the cell aria-label", () => {
    const { hours, sunrise, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
        nowMin={14 * 60 + 30}
        sunriseMin={sunrise}
      />,
    );
    const cell0 = container.querySelector("[data-hour-idx='0']");
    expect(cell0?.getAttribute("aria-label")).toMatch(/Hour 1, Sun,/);
    const now = container.querySelector("[data-hour-now='true']");
    expect(now?.getAttribute("aria-label")).toMatch(/current hour/);
  });

  it("attaches the structural data-component attribute", () => {
    const { hours, dayLen, nightLen } = buildAthens();
    const { container } = render(
      <PlanetaryHourStrip
        hours={hours}
        dayLengthMin={dayLen}
        nightLengthMin={nightLen}
      />,
    );
    expect(container.firstElementChild).toHaveAttribute(
      "data-component",
      "planetary-hour-strip",
    );
  });

  it("supports polar 24×60m hours (NOW anchored to 00:00)", () => {
    // Build polar set: 24 even 60-minute hours from local midnight.
    const HSEQ = ["sun", "venus", "merc", "moon", "sat", "jup", "mars"] as const;
    const polar: PlanetaryHourCell[] = [];
    for (let i = 0; i < 24; i++) {
      polar.push({
        idx: i,
        ruler: HSEQ[i % 7]!,
        isDay: i < 12,
        startMin: i * 60,
        lengthMin: 60,
      });
    }
    const { container } = render(
      <PlanetaryHourStrip
        hours={polar}
        dayLengthMin={720}
        nightLengthMin={720}
        nowMin={14 * 60 + 30}
        // No sunriseMin → strip uses nowMin/1440 as fraction (polar branch).
      />,
    );
    // 14:30 is in hour 14 (00:00 + 14h).
    const now = container.querySelector("[data-hour-now='true']");
    expect(now?.getAttribute("data-hour-idx")).toBe("14");
  });
});
