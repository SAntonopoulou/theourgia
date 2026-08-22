import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReshNextAdoration } from "./ReshNextAdoration.js";
import { ReshStationCard } from "./ReshStationCard.js";
import { type ReshStreakDay, ReshStreakGrid } from "./ReshStreakGrid.js";
import { SunArcDiagram } from "./SunArcDiagram.js";
import { RESH_STATION_ORDER, RESH_THELEMIC, RESH_TRADITIONS, formatMinute } from "./resh.js";

// ─── resh.ts constants + helpers ───────────────────────────────────

describe("Liber Resh constants", () => {
  it("exposes exactly four stations in canonical order", () => {
    expect(RESH_STATION_ORDER).toEqual(["sunrise", "noon", "sunset", "midnight"]);
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
    expect(screen.getByText(/Hail unto Thee who art Ra in Thy rising/)).toBeInTheDocument();
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
      <ReshStationCard {...props} observation={{ atMin: 6 * 60 + 9, note: "Sea very still." }} />,
    );
    expect(screen.queryByText("Mark observed")).toBeNull();
    expect(screen.getByText("Observed at 06:09")).toBeInTheDocument();
    expect(screen.getByText("Sea very still.")).toBeInTheDocument();
  });

  it("keeps time + position chips in normal document flow — never absolutely positioned (v1-068)", () => {
    const { container } = render(<ReshStationCard {...props} isMinimum />);
    const chips = container.querySelector("[data-station-chips]");
    expect(chips).not.toBeNull();
    // Time, position and minimum-viable all live inside the wrapping chip row.
    expect(chips?.querySelector("[data-chip-time]")?.textContent).toContain("06:02");
    expect(chips?.querySelector("[data-chip-time]")?.textContent).toContain("03:02Z");
    expect(chips?.querySelector("[data-chip-direction]")?.textContent).toBe("the East");
    expect(chips?.querySelector("[data-minimum-viable]")).not.toBeNull();
    expect(container.innerHTML).not.toContain("position: absolute");
  });

  // The operator's real dusk liturgy (HOME form) — byte-real Greek length,
  // from backend/theourgia/data/hellenic_rite_liturgy.json. The 960px crush
  // shipped because fixtures only ever carried one-line invocations.
  const LONG_INVOCATION =
    "Χαῖρε, Εκάτη Ενοδία, Κλειδούχε. Φύλακα του σταυροδρομιού, που κρατάς τα κλειδιά· καθώς πέφτει το φως, κράτα την πύλη. Ας μην περάσει τίποτα ανίερο το κατώφλι μου απόψε. Και εσείς, φύλακες που η Εκάτη αγαπά και ορίζει, σταθείτε μαζί μου. ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ — μακριά, κάθε κακός δαίμονας.";

  it("clamps a long invocation to ~3 lines behind a per-card expand affordance", () => {
    const { container } = render(
      <ReshStationCard
        {...props}
        station="sunset"
        adoration={{
          godform: "Hekate Enodia, Kleidouchos — the Descent",
          direction: "west",
          invocation: LONG_INVOCATION,
        }}
      />,
    );
    const invocation = container.querySelector("[data-invocation]");
    expect(invocation?.getAttribute("data-clamped")).toBe("true");
    // The verbatim text stays in the DOM even while visually clamped.
    expect(screen.getByText(/ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ/)).toBeInTheDocument();

    const toggle = container.querySelector("[data-invocation-toggle]") as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toContain("Show invocation");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(invocation?.getAttribute("data-clamped")).toBe("false");
    expect(toggle.textContent).toContain("Hide invocation");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggle);
    expect(invocation?.getAttribute("data-clamped")).toBe("true");
  });

  it("renders short (Liber CC) invocations whole — no clamp, no toggle", () => {
    const { container } = render(<ReshStationCard {...props} />);
    expect(container.querySelector("[data-invocation]")?.getAttribute("data-clamped")).toBe(
      "false",
    );
    expect(container.querySelector("[data-invocation-toggle]")).toBeNull();
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
      <ReshStationCard {...props} observation={{ atMin: 6 * 60 + 9 }} />,
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
    const { container } = render(<ReshStreakGrid days={buildDays([4, 4, 3, 4, 0, 4])} />);
    expect(container.querySelectorAll("[data-day]")).toHaveLength(6);
  });

  it("marks today (last entry) with data-is-today=true", () => {
    const { container } = render(<ReshStreakGrid days={buildDays([4, 4, 3])} />);
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
    render(<ReshStreakGrid days={buildDays([4, 4])} streakOverride={42} />);
    expect(document.querySelector("[data-streak-count]")?.textContent).toBe("42");
  });

  it("renders the legend with five swatches (0..4)", () => {
    const { container } = render(<ReshStreakGrid days={buildDays([1])} />);
    const legend = container.querySelector("[data-legend]");
    expect(legend?.querySelectorAll("[data-legend-count]")).toHaveLength(5);
  });

  it("never uses --danger in the streak palette", () => {
    const { container } = render(<ReshStreakGrid days={buildDays([0, 0, 0])} />);
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
    expect(container.firstElementChild?.getAttribute("data-station")).toBe("midnight");
  });

  it("serves a non-solar caller: label + emblem, no station required", () => {
    render(
      <ReshNextAdoration
        label="Upper culmination"
        emblem={<span>☽</span>}
        emblemColor="var(--moon-light)"
        adoration={{ godform: "", direction: "", invocation: "Χαῖρε Ἑκάτη" }}
        stationMin={21 * 60 + 24}
        stationMinUtc={19 * 60 + 24}
        countdown="47m"
      />,
    );
    expect(screen.getByText("Upper culmination")).toBeInTheDocument();
    expect(screen.getByText("☽")).toBeInTheDocument();
    expect(screen.getByText(/Χαῖρε Ἑκάτη/)).toBeInTheDocument();
  });

  it("clamps a long invocation behind Show adoration, and opens it in place", () => {
    // Long lunar scripts must not make one hero twice the other's height:
    // past ~six lines the words clamp, and the toggle opens the whole text
    // for the performance — the same affordance the station cards use.
    const long = "Χαῖρε Ἑκάτη Εἰνοδία, Τριοδῖτι, Νυκτερία, Χθονία. ".repeat(10).trim();
    render(
      <ReshNextAdoration
        label="Moonrise"
        emblem={<span>☽</span>}
        adoration={{ godform: "", direction: "", invocation: long }}
        stationMin={0}
        stationMinUtc={0}
        countdown="1h"
      />,
    );
    const toggle = screen.getByRole("button", { name: "Show adoration" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("keeps a short invocation whole — no toggle", () => {
    render(
      <ReshNextAdoration
        label="Moonset"
        emblem={<span>☽</span>}
        adoration={{ godform: "", direction: "", invocation: "Short words." }}
        stationMin={0}
        stationMinUtc={0}
        countdown="1h"
      />,
    );
    expect(screen.queryByRole("button", { name: "Show adoration" })).toBeNull();
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
    expect(screen.getByText(/Ra-Hoor-Khuit at the East/)).toBeInTheDocument();
  });
});
