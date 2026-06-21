import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type CalendarEntry,
  MultiCalendarCard,
} from "./MultiCalendarCard.js";

const greg: CalendarEntry = {
  id: "gregorian",
  name: "Gregorian",
  family: "solar",
  longForm: "Sunday, 21 June 2026",
  extras: [
    { k: "ISO", v: "2026-06-21" },
    { k: "Short", v: "21/06/2026" },
  ],
};

const julian: CalendarEntry = {
  id: "julian",
  name: "Julian",
  family: "solar",
  longForm: "Sunday, 8 June 2026 (O.S.)",
  sourceNote: "Julian reckoning, drift since the 1582 reform.",
};

const hebrew: CalendarEntry = {
  id: "hebrew",
  name: "Hebrew",
  family: "lunisolar",
  isHebrew: true,
  longForm: "יום ראשון, ז׳ בְּתַמּוּז תשפ״ו",
};

const thelemic: CalendarEntry = {
  id: "thelemic",
  name: "Thelemic",
  family: "ritual",
  primary: "Anno V∶xiii",
  secondary: "· EV 2026",
  extras: [{ k: "Year began", v: "Vernal equinox 2026" }],
};

describe("MultiCalendarCard", () => {
  it("renders all calendars, family-grouped solar → lunisolar → ritual", () => {
    const { container } = render(
      <MultiCalendarCard calendars={[thelemic, julian, hebrew, greg]} />,
    );
    const rows = Array.from(
      container.querySelectorAll("[data-calendar-id]"),
    );
    const ids = rows.map((r) => r.getAttribute("data-calendar-id"));
    // solar first (Gregorian + Julian in input order), then lunisolar, then ritual.
    expect(ids.indexOf("gregorian")).toBeLessThan(ids.indexOf("hebrew"));
    expect(ids.indexOf("julian")).toBeLessThan(ids.indexOf("hebrew"));
    expect(ids.indexOf("hebrew")).toBeLessThan(ids.indexOf("thelemic"));
  });

  it("renders the Hebrew row with dir=rtl and the Hebrew font", () => {
    const { container } = render(<MultiCalendarCard calendars={[hebrew]} />);
    const rtl = container.querySelector('[dir="rtl"]');
    expect(rtl).toBeInTheDocument();
  });

  it("renders the Thelemic row with split primary + secondary spans", () => {
    render(<MultiCalendarCard calendars={[thelemic]} />);
    expect(screen.getByText("Anno V∶xiii")).toBeInTheDocument();
    expect(screen.getByText("· EV 2026")).toBeInTheDocument();
  });

  it("expands and collapses a row on click", () => {
    render(<MultiCalendarCard calendars={[greg]} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("ISO")).toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("ISO")).toBeNull();
  });

  it("supports controlled `expanded` + onExpandedChange", () => {
    const onExpandedChange = vi.fn();
    render(
      <MultiCalendarCard
        calendars={[greg]}
        expanded={["gregorian"]}
        onExpandedChange={onExpandedChange}
      />,
    );
    expect(screen.getByText("ISO")).toBeInTheDocument(); // pre-expanded
    fireEvent.click(screen.getByRole("button"));
    expect(onExpandedChange).toHaveBeenCalledWith([]);
  });

  it("renders the sourceNote at the bottom of an expanded row", () => {
    render(
      <MultiCalendarCard
        calendars={[julian]}
        defaultExpanded={["julian"]}
      />,
    );
    expect(screen.getByText(/Julian reckoning/i)).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(<MultiCalendarCard calendars={[greg]} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("multi-calendar-card");
    expect(root.getAttribute("data-state")).toBe("normal");
    const row = container.querySelector("[data-calendar-id='gregorian']");
    expect(row?.getAttribute("data-calendar-family")).toBe("solar");
  });

  it("renders loading skeleton when state=loading", () => {
    const { container } = render(
      <MultiCalendarCard calendars={[greg]} state="loading" />,
    );
    expect(container.querySelectorAll(".skel").length).toBeGreaterThan(0);
    // Skeleton mode hides the actual rows.
    expect(container.querySelector("[data-calendar-id]")).toBeNull();
  });

  it("renders the empty state when state=empty", () => {
    render(<MultiCalendarCard calendars={[]} state="empty" />);
    expect(screen.getByText("No calendars enabled")).toBeInTheDocument();
  });

  it("renders the error banner when state=error", () => {
    render(<MultiCalendarCard calendars={[]} state="error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/Calendar service unreachable/i),
    ).toBeInTheDocument();
  });

  it("renders the optional footer slot", () => {
    render(
      <MultiCalendarCard
        calendars={[greg]}
        footer={<span>Enable more in Settings</span>}
      />,
    );
    expect(screen.getByText("Enable more in Settings")).toBeInTheDocument();
  });

  it("does NOT render --danger for the row family dots (care palette intact)", () => {
    const { container } = render(<MultiCalendarCard calendars={[greg]} />);
    // The error banner uses --danger; rows use --fam-*. With state=normal the
    // error banner isn't rendered, so no --danger.
    expect(container.innerHTML).not.toContain("--danger");
  });
});
