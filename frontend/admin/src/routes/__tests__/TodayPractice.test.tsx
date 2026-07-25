/**
 * H12 Today-dashboard practice pieces (Sprint F1).
 *
 * Covered: the lunar-day chip against a mocked /events/today-context
 * (Deipnon · ordinary day · graceful absence on error) · the
 * four-station rite row against a mocked /resh/today (server-driven
 * hellenic labels · dusk carries the minimum-viable chip and the ONLY
 * primary CTA per rule 66 · the streak framed as a record · the
 * HOME/XENOS toggle posting mode with the adoration) · the
 * awaiting-judgment due slot rendering gracefully empty.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTodayContext: vi.fn(),
  reshToday: vi.fn(),
  listReshAdorations: vi.fn(),
  createReshAdoration: vi.fn(),
}));

vi.mock("../../data/api.js", () => ({
  apiMethods: mocks,
  apiClient: { request: () => Promise.resolve([]) },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { AwaitingJudgmentCard, TodayLunarChip, TodayRiteRow } from "../TodayPractice.js";

const TODAY_CONTEXT = {
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
  observance: "deipnon" as const,
  moon: { phase_angle: 351.4, phase_name: "Waning crescent" },
  attribution: "Attic reckoning computed locally.",
};

function isoAt(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const HOUR = 3_600_000;

function reshPayload(overrides: Record<string, unknown> = {}) {
  const civil = new Date().toISOString().slice(0, 10);
  return {
    civil_date: civil,
    streak_days: 12,
    minimum_viable_station: "sunset",
    preset: "hellenic",
    mode: null,
    stations: [
      {
        transition: "sunrise",
        at: isoAt(-9 * HOUR),
        godform: "Helios",
        direction: "the East",
        short_invocation: "Hail Helios, rising",
        observed_at: isoAt(-8.8 * HOUR),
        note: null,
        mode: "home",
      },
      {
        transition: "noon",
        at: isoAt(-3 * HOUR),
        godform: "Helios",
        direction: "the height",
        short_invocation: "Hail Helios at the height",
        observed_at: null,
        note: null,
        mode: null,
      },
      {
        transition: "sunset",
        at: isoAt(2 * HOUR),
        godform: "Helios",
        direction: "the West",
        short_invocation: "Hail Helios, setting",
        observed_at: null,
        note: null,
        mode: null,
      },
      {
        transition: "midnight",
        at: isoAt(6 * HOUR),
        godform: "Helios",
        direction: "the deep",
        short_invocation: "Hail Helios, hidden",
        observed_at: null,
        note: null,
        mode: null,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getTodayContext.mockReset().mockResolvedValue(TODAY_CONTEXT);
  mocks.reshToday.mockReset().mockResolvedValue(reshPayload());
  mocks.listReshAdorations.mockReset().mockResolvedValue([]);
  mocks.createReshAdoration.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe("TodayLunarChip", () => {
  it("renders the Deipnon observance from /events/today-context", async () => {
    render(<TodayLunarChip />);
    expect(await screen.findByText("Deipnon tonight — dark moon")).toBeInTheDocument();
    expect(screen.getByText("Hekatombaion 29")).toBeInTheDocument();
    expect(mocks.getTodayContext).toHaveBeenCalled();
  });

  it("renders the phase-led chip on an ordinary day", async () => {
    mocks.getTodayContext.mockResolvedValue({
      ...TODAY_CONTEXT,
      observance: null,
      attic: { ...TODAY_CONTEXT.attic, day: 14 },
      moon: { phase_angle: 172, phase_name: "Waxing gibbous" },
    });
    render(<TodayLunarChip />);
    expect(await screen.findByText("Waxing gibbous")).toBeInTheDocument();
    expect(screen.getByText(/Day 14 of Hekatombaion/i)).toBeInTheDocument();
  });

  it("renders nothing when the endpoint fails — absent, never synthesised", async () => {
    mocks.getTodayContext.mockRejectedValue(new Error("boom"));
    const { container } = render(<TodayLunarChip />);
    await waitFor(() => {
      expect(container.querySelector('[data-component="lunar-day-chip"]')).toBeNull();
      // The loading skeleton must also be gone — not stuck.
      expect(container.textContent).toBe("");
    });
  });
});

describe("TodayRiteRow", () => {
  it("mounts the four stations with server-driven labels and states the rule in words", async () => {
    render(<TodayRiteRow lat={37.98} lng={23.72} />);
    expect(await screen.findByText("The four stations")).toBeInTheDocument();
    expect(
      screen.getByText(/Dusk is the station that must be kept — the streak holds if dusk is done/i),
    ).toBeInTheDocument();
    // Dawn/Noon/Dusk/Night relabel (prop-level rename).
    for (const label of ["Noon", "Night"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Hellenic invocation text arrives from the wire, not a local table —
    // it shows on the dusk card AND the next-adoration hero (dusk is next).
    expect(screen.getAllByText(/Hail Helios, setting/).length).toBeGreaterThanOrEqual(2);
  });

  it("gives dusk the minimum-viable chip and the only primary CTA (rule 66)", async () => {
    const { container } = render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    const cards = container.querySelectorAll('[data-component="resh-station-card"]');
    expect(cards).toHaveLength(4);
    const chips = container.querySelectorAll("[data-minimum-viable]");
    expect(chips).toHaveLength(1);
    expect(chips[0]?.closest("[data-station]")).toHaveAttribute("data-station", "sunset");
    // Only the dusk button is primary (accent fill); the other actionable
    // stations stay quiet outlines.
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-mark-observed]"),
    );
    const primary = buttons.filter((b) => b.style.background === "var(--accent)");
    expect(primary).toHaveLength(1);
    expect(primary[0]?.closest("[data-station]")).toHaveAttribute("data-station", "sunset");
  });

  it("frames the streak as a record, not a scoreboard", async () => {
    render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    expect(screen.getByText(/A record, not a scoreboard/i)).toBeInTheDocument();
    expect(screen.getByText(/dusk kept 12 days running/i)).toBeInTheDocument();
  });

  it("posts the chosen HOME/XENOS mode with the adoration", async () => {
    const { container } = render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    fireEvent.click(screen.getByRole("button", { name: "xenos" }));
    const duskButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-mark-observed]"),
    ).find((b) => b.closest("[data-station]")?.getAttribute("data-station") === "sunset");
    expect(duskButton).toBeDefined();
    fireEvent.click(duskButton as HTMLButtonElement);
    await waitFor(() => {
      expect(mocks.createReshAdoration).toHaveBeenCalledWith(
        expect.objectContaining({ transition: "sunset", mode: "xenos" }),
      );
    });
  });

  it("carries the phone-first stacking hooks for the five-breakpoint contract", async () => {
    const { container } = render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    // .td-stations stacks 4→2→1 columns and .td-two collapses to one
    // column via the H12 media block in theourgia.shared.css; the chip
    // itself wraps (flex-wrap) inside .td-lunar.
    expect(container.querySelector(".td-stations")).not.toBeNull();
    expect(container.querySelector(".td-two")).not.toBeNull();
  });

  it("degrades honestly when the endpoint fails — no fabricated stations", async () => {
    mocks.reshToday.mockRejectedValue(new Error("no ephemeris"));
    render(<TodayRiteRow lat={37.98} lng={23.72} />);
    expect(await screen.findByText(/Couldn't compute today's stations/i)).toBeInTheDocument();
  });
});

describe("AwaitingJudgmentCard", () => {
  it("renders the due slot gracefully empty until the queue endpoint exists", () => {
    render(<AwaitingJudgmentCard />);
    expect(screen.getByText("Awaiting judgment")).toBeInTheDocument();
    expect(screen.getByText(/Nothing to judge yet/i)).toBeInTheDocument();
    const link = screen.getByText(/The two gates/).closest("a");
    expect(link).toHaveAttribute("href", "/verdicts");
  });
});
