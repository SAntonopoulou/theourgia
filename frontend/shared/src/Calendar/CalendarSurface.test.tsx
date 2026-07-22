import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  CalendarSurface,
  type CalendarAstroEvent,
  type CalendarFestivalInstance,
} from "./CalendarSurface.js";

// The design's June-2026 demo month, as instance data.
const vestalia: CalendarFestivalInstance = {
  id: "vestalia:2026-06-07",
  festivalId: "vestalia",
  name: "Vestalia",
  tradition: "roman",
  glyph: "⚶",
  label: "7–15 June",
  startDate: "2026-06-07",
  endDate: "2026-06-15",
  description:
    "The festival of Vesta, when the penus Vestae — the inner store of the goddess's temple — was opened to the matrons of Rome.",
  practice: "Mola salsa offered and the hearth honoured through the week.",
  sources: [
    {
      kind: "primary",
      title: "Fasti VI.249–348",
      author: "Ovid",
      year: "8 CE",
      loc: "VI.249",
      note: "The fullest surviving account of the rites.",
    },
  ],
};

const litha: CalendarFestivalInstance = {
  id: "litha:2026-06-21",
  festivalId: "litha",
  name: "Litha · Midsummer",
  tradition: "woty",
  glyph: "☀",
  label: "summer solstice",
  startDate: "2026-06-21",
  endDate: "2026-06-21",
  description: "The Wheel's midsummer station — the longest day.",
  practice: "Bonfires kept through the short night.",
  sources: [
    {
      kind: "community",
      title: "A Witches' Bible",
      author: "J. & S. Farrar",
      year: "1984",
      loc: "Litha",
    },
  ],
};

const solstice: CalendarAstroEvent = {
  id: "a-solstice",
  date: "2026-06-21",
  glyph: "☀",
  label: "Summer solstice",
  name: "Summer solstice",
  sub: "Sun enters Cancer",
  description:
    "The Sun reaches its greatest northern declination and ingresses Cancer — the cardinal turn of the solar year.",
  kindGroup: "solar",
};

const fullMoon: CalendarAstroEvent = {
  id: "a-full",
  date: "2026-06-29",
  glyph: "○",
  label: "Full moon",
  name: "Full moon",
  sub: "Moon in Sagittarius",
  description: "The Moon fully lit, opposite the Sun.",
  kindGroup: "lunation",
};

function renderJune(
  overrides: Partial<Parameters<typeof CalendarSurface>[0]> = {},
) {
  return render(
    <CalendarSurface
      festivals={[vestalia, litha]}
      astro={[solstice, fullMoon]}
      initialYear={2026}
      initialMonth={6}
      today="2026-06-21"
      {...overrides}
    />,
  );
}

describe("CalendarSurface — month view", () => {
  it("renders the focused month title and the grid", () => {
    renderJune();
    expect(screen.getByText("June")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(
      document.querySelector('[data-component="month-grid"]'),
    ).toBeInTheDocument();
  });

  it("marks today's cell", () => {
    renderJune();
    const todayCell = document.querySelector('[data-is-today="true"]');
    expect(todayCell).toBeInTheDocument();
    expect(within(todayCell as HTMLElement).getByText("21")).toBeInTheDocument();
  });

  it("renders the multi-day festival as a bar and the single-day as a chip", () => {
    renderJune();
    expect(
      document.querySelector('[data-bar-id="vestalia:2026-06-07"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-festival-id="litha:2026-06-21"]'),
    ).toBeInTheDocument();
  });

  it("steps months and reports the change", () => {
    const onMonthChange = vi.fn();
    renderJune({ onMonthChange });
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(onMonthChange).toHaveBeenCalledWith(2026, 7);
    expect(screen.getByText("July")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(onMonthChange).toHaveBeenCalledWith(2026, 6);
  });

  it("year rolls over stepping back from January", () => {
    const onMonthChange = vi.fn();
    render(
      <CalendarSurface
        initialYear={2026}
        initialMonth={1}
        today="2026-01-10"
        onMonthChange={onMonthChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(onMonthChange).toHaveBeenCalledWith(2025, 12);
    expect(screen.getByText("December")).toBeInTheDocument();
  });

  it("the Today button returns to today's month", () => {
    const onMonthChange = vi.fn();
    renderJune({ onMonthChange });
    fireEvent.click(screen.getByLabelText("Next month"));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("June")).toBeInTheDocument();
    expect(onMonthChange).toHaveBeenLastCalledWith(2026, 6);
  });
});

describe("CalendarSurface — filters", () => {
  it("toggling a tradition chip hides its festivals", () => {
    renderJune();
    const roman = screen.getByRole("button", { name: /Roman/ });
    expect(roman).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(roman);
    expect(
      document.querySelector('[data-bar-id="vestalia:2026-06-07"]'),
    ).not.toBeInTheDocument();
    // Litha (woty) is untouched.
    expect(
      document.querySelector('[data-festival-id="litha:2026-06-21"]'),
    ).toBeInTheDocument();
  });

  it("soon traditions render disabled with the consultation note", () => {
    renderJune();
    const hindu = screen.getByRole("button", { name: /Hindu/ });
    expect(hindu).toBeDisabled();
    expect(hindu).toHaveAttribute(
      "title",
      "Hindu festivals — awaiting practitioner consultation",
    );
    expect(within(hindu).getByText("soon")).toBeInTheDocument();
  });

  it("toggling an event-kind chip hides those astro events", () => {
    renderJune();
    fireEvent.click(screen.getByRole("button", { name: /Lunations/ }));
    expect(
      document.querySelector('[data-astro-id="a-full"]'),
    ).not.toBeInTheDocument();
    // Solar solstice still visible.
    expect(
      document.querySelector('[data-astro-id="a-solstice"]'),
    ).toBeInTheDocument();
  });
});

describe("CalendarSurface — week list view", () => {
  it("switches to the agenda with the verbatim header", () => {
    renderJune();
    fireEvent.click(screen.getByRole("button", { name: "Week list" }));
    expect(
      screen.getByText(
        "Week of 21–27 June · agenda (also the screen-reader list view)",
      ),
    ).toBeInTheDocument();
  });

  it("shows day items and the empty-day copy", () => {
    renderJune();
    fireEvent.click(screen.getByRole("button", { name: "Week list" }));
    const agenda = document.querySelector("[data-agenda]") as HTMLElement;
    // 21 June: solstice + Litha; empty days say so.
    expect(
      within(agenda).getAllByText("No marked events.").length,
    ).toBeGreaterThan(0);
    expect(within(agenda).getByText("Litha · Midsummer")).toBeInTheDocument();
    expect(within(agenda).getByText("Summer solstice")).toBeInTheDocument();
  });
});

describe("CalendarSurface — right rail", () => {
  it("defaults to the Today card with today's events", () => {
    renderJune();
    const card = document.querySelector('[data-today-card]');
    expect(card).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText("Sunday, 21 June"),
    ).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText("Litha · Midsummer"),
    ).toBeInTheDocument();
  });

  it("selecting a festival shows FestivalDetail; dismiss returns to Today", () => {
    renderJune();
    fireEvent.click(
      document.querySelector(
        '[data-bar-id="vestalia:2026-06-07"]',
      ) as HTMLElement,
    );
    expect(
      document.querySelector('[data-component="festival-detail"]'),
    ).toBeInTheDocument();
    expect(screen.getByText(/penus Vestae/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Back to today"));
    expect(document.querySelector('[data-today-card]')).toBeInTheDocument();
  });

  it("selecting an astro event shows its card with the ephemeris note", () => {
    renderJune();
    fireEvent.click(
      document.querySelector('[data-astro-id="a-full"]') as HTMLElement,
    );
    const card = document.querySelector('[data-astro-detail]');
    expect(card).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText("Moon in Sagittarius"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Computed via Swiss Ephemeris · times shown in your timezone.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the citation legend verbatim", () => {
    renderJune();
    expect(screen.getByText("How a festival is attested")).toBeInTheDocument();
    expect(screen.getByText("Primary source")).toBeInTheDocument();
    expect(screen.getByText("Living practice")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A festival can be ancient in name yet modern in observance. The record shows you which, and lets you decide.",
      ),
    ).toBeInTheDocument();
  });
});
