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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The practice pieces render router <Link>s (v1-067 raw-link fix), so
// every mount needs a Router context.
function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const mocks = vi.hoisted(() => ({
  getTodayContext: vi.fn(),
  reshToday: vi.fn(),
  listReshAdorations: vi.fn(),
  createReshAdoration: vi.fn(),
  listAwaitingJudgment: vi.fn(),
  lunarToday: vi.fn(),
  getMyAdorations: vi.fn(() => Promise.resolve({ sets: [] })),
}));

vi.mock("../../data/api.js", () => ({
  apiMethods: mocks,
  apiClient: { request: () => Promise.resolve([]) },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

// The adoration rows read the synced record store for the active set; with no
// entries there is no active set (and so no words) — which is the point.
vi.mock("../../lib/api.js", () => ({
  apiGet: vi.fn(() => Promise.resolve({ entries: [], next_since: 0, more: false })),
  apiPut: vi.fn(() => Promise.resolve({})),
}));

import {
  AwaitingJudgmentCard,
  TodayLunarChip,
  TodayLunarRow,
  TodayRiteRow,
} from "../TodayPractice.js";

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
  mocks.listAwaitingJudgment.mockReset().mockResolvedValue([]);
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

describe("TodayLunarRow", () => {
  it("renders the four lunar stations with their times", async () => {
    mocks.lunarToday.mockResolvedValue({
      civil_date: "2026-08-20",
      stations: [
        { key: "lowerCulmination", label: "Lower culmination", at: "2026-08-20T04:07:00Z" },
        { key: "moonrise", label: "Moonrise", at: "2026-08-20T11:57:00Z" },
        { key: "upperCulmination", label: "Upper culmination", at: "2026-08-20T16:32:00Z" },
        { key: "moonset", label: "Moonset", at: "2026-08-20T21:04:00Z" },
      ],
      attribution: "Moon stations computed locally.",
    });
    render(<TodayLunarRow lat={37.98} lng={23.72} />);
    expect(await screen.findByText("Moonrise")).toBeInTheDocument();
    for (const label of ["Upper culmination", "Moonset", "Lower culmination"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(mocks.lunarToday).toHaveBeenCalled();
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
    // No default: the words come from the active adoration set (record store),
    // and with none chosen nothing is said — the server's preset invocation
    // must NOT appear. The stations and their times still show.
    expect(screen.queryByText(/Hail Helios, setting/)).toBeNull();
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

  it("carries the container-driven stacking hooks for the five-breakpoint contract", async () => {
    const { container } = render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    // v1-068: .td-rite is the container-query root; .td-stations stacks
    // 4→2→1 columns and .td-two collapses to one column against the REAL
    // content-column width (theourgia.shared.css @container block).
    expect(container.querySelector("section.td-rite")).not.toBeNull();
    expect(container.querySelector(".td-stations")).not.toBeNull();
    expect(container.querySelector(".td-two")).not.toBeNull();
  });

  it("states the penalty rule once under the header — never per card (v1-068)", async () => {
    render(<TodayRiteRow lat={37.98} lng={23.72} />);
    await screen.findByText("The four stations");
    // One caption in the section header; the three non-minimum cards no
    // longer repeat it in their footers (where it collided with the
    // Mark-observed buttons at narrow card widths).
    expect(screen.getAllByText(/kept or not, without penalty/i)).toHaveLength(1);
  });

  it("degrades honestly when the endpoint fails — no fabricated stations", async () => {
    mocks.reshToday.mockRejectedValue(new Error("no ephemeris"));
    render(<TodayRiteRow lat={37.98} lng={23.72} />);
    expect(await screen.findByText(/Couldn't compute today's stations/i)).toBeInTheDocument();
  });
});

describe("AwaitingJudgmentCard", () => {
  it("renders the due slot gracefully empty when nothing awaits", async () => {
    render(<AwaitingJudgmentCard />);
    expect(screen.getByText("Awaiting judgment")).toBeInTheDocument();
    expect(await screen.findByText(/Nothing awaits judgment/i)).toBeInTheDocument();
    const link = screen.getByText(/The two gates/).closest("a");
    expect(link).toHaveAttribute("href", "/verdicts");
  });

  it("lists undischarged workings from the queue with their ages (H12 F2)", async () => {
    mocks.listAwaitingJudgment.mockResolvedValue([
      {
        entry_id: "w-1",
        title: "The petition left at the crossroads stone",
        declared_at: "2026-06-19T21:00:00+03:00",
        gate1: "open",
        gate2: "open",
        age_days: 36,
      },
      {
        entry_id: "w-2",
        title: "Saturn talisman — first consecration",
        declared_at: "2026-07-02T20:00:00+03:00",
        gate1: "pass",
        gate2: "open",
        age_days: 23,
      },
    ]);
    const { container } = render(<AwaitingJudgmentCard />);
    expect(
      await screen.findByText("The petition left at the crossroads stone"),
    ).toBeInTheDocument();
    expect(screen.getByText("36 days")).toBeInTheDocument();
    expect(screen.getByText("23 days")).toBeInTheDocument();
    // Rows route to the two-gate surface — the record does not forget.
    const row = container.querySelector('[data-awaiting-row="w-1"]') as HTMLAnchorElement;
    expect(row.getAttribute("href")).toBe("/verdicts");
  });
});
