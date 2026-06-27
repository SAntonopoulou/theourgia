/**
 * PerUserAuditLog — H10 Cluster B4 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  type AuditLogRow,
  PerUserAuditLogSurface,
} from "./PerUserAuditLogSurface.js";

const ROWS: AuditLogRow[] = [
  {
    id: "r0",
    time: "27 Jun 14:02",
    action: "You signed in",
    outcome: "success",
    raw: '{"event":"auth.login","actor_id":"8d3a-…-1f9c"}',
  },
  {
    id: "r1",
    time: "26 Jun 18:05",
    action: "A plugin requested filesystem access — declined by policy",
    outcome: "denied",
    raw: '{"event":"capability.denied","plugin":"goetic-sigil-importer"}',
  },
];

describe("PerUserAuditLogSurface", () => {
  test("renders the preamble verbatim", () => {
    render(<PerUserAuditLogSurface rows={[]} />);
    expect(
      screen.getByText(/Every action taken on your account/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never reveals sealed content/i),
    ).toBeInTheDocument();
  });

  test("renders local zone note when provided", () => {
    render(<PerUserAuditLogSurface rows={[]} localZone="Europe/Athens" />);
    expect(
      screen.getByText(/Times in your local zone \(Europe\/Athens\)/i),
    ).toBeInTheDocument();
  });

  test("renders one row per data entry with human-readable action", () => {
    render(<PerUserAuditLogSurface rows={ROWS} />);
    expect(screen.getByText("You signed in")).toBeInTheDocument();
    expect(
      screen.getByText(/A plugin requested filesystem access/i),
    ).toBeInTheDocument();
  });

  test("rule 49 — UUIDs hidden by default · view raw toggles them", () => {
    render(<PerUserAuditLogSurface rows={ROWS} />);
    // Raw payload (with UUIDs) is NOT in the DOM by default
    expect(screen.queryByText(/8d3a-/i)).toBeNull();

    const buttons = screen.getAllByText(/view raw/i);
    expect(buttons.length).toBe(ROWS.length);

    fireEvent.click(buttons[0]!);
    expect(screen.getByText(/8d3a-…-1f9c/)).toBeInTheDocument();
  });

  test("toggle button label flips to 'hide raw' once expanded", () => {
    render(<PerUserAuditLogSurface rows={ROWS} />);
    const buttons = screen.getAllByText(/view raw/i);
    fireEvent.click(buttons[0]!);
    expect(screen.getByText(/hide raw/i)).toBeInTheDocument();
  });

  test("filters fire callbacks", () => {
    const onActorChange = vi.fn();
    const onKindChange = vi.fn();
    const onTimeRangeChange = vi.fn();
    render(
      <PerUserAuditLogSurface
        rows={[]}
        onActorChange={onActorChange}
        onKindChange={onKindChange}
        onTimeRangeChange={onTimeRangeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Actor filter"), {
      target: { value: "you" },
    });
    expect(onActorChange).toHaveBeenCalledWith("you");

    fireEvent.change(screen.getByLabelText("Event kind filter"), {
      target: { value: "auth" },
    });
    expect(onKindChange).toHaveBeenCalledWith("auth");

    fireEvent.change(screen.getByLabelText("Time range filter"), {
      target: { value: "all_time" },
    });
    expect(onTimeRangeChange).toHaveBeenCalledWith("all_time");
  });

  test("outcome chip distinguishes success / denied", () => {
    render(<PerUserAuditLogSurface rows={ROWS} />);
    const chips = screen.getAllByText(/success|denied/i);
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });
});
