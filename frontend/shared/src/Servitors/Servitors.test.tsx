import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ServitorListItem } from "./ServitorListItem.js";
import {
  SERVITOR_STATUS_META,
  SERVITOR_STATUS_ORDER,
  ServitorStatusPill,
} from "./ServitorStatusPill.js";
import {
  ServitorTaskCard,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
} from "./ServitorTaskCard.js";

// ─── ServitorStatusPill ───────────────────────────────────────────

describe("ServitorStatusPill", () => {
  it.each(SERVITOR_STATUS_ORDER)("renders status=%s", (status) => {
    const { container } = render(
      <ServitorStatusPill status={status} />,
    );
    expect(
      screen.getByText(SERVITOR_STATUS_META[status].label),
    ).toBeInTheDocument();
    expect(
      container.firstElementChild?.getAttribute("data-servitor-status"),
    ).toBe(status);
  });

  it("SERVITOR_STATUS_ORDER lists four statuses", () => {
    expect(SERVITOR_STATUS_ORDER).toHaveLength(4);
  });

  it("decommissioned uses --ss-decommissioned (NOT --danger)", () => {
    expect(SERVITOR_STATUS_META.decommissioned.color).toBe(
      "var(--ss-decommissioned)",
    );
  });

  it("never includes --danger", () => {
    const { container } = render(
      <ServitorStatusPill status="decommissioned" />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── ServitorListItem ─────────────────────────────────────────────

describe("ServitorListItem", () => {
  it("renders the name + kind label + status chip", () => {
    render(
      <ServitorListItem
        id="s1"
        name="The Threshold Guardian"
        kindLabel="Servitor"
        status="active"
      />,
    );
    expect(
      screen.getByText("The Threshold Guardian"),
    ).toBeInTheDocument();
    expect(screen.getByText("Servitor")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders the sigil slot when provided", () => {
    render(
      <ServitorListItem
        id="s1"
        name="X"
        kindLabel="Servitor"
        status="active"
        sigil={<span data-testid="sigil-slot">⚛</span>}
      />,
    );
    expect(screen.getByTestId("sigil-slot")).toBeInTheDocument();
  });

  it("renders the feed hint when provided", () => {
    render(
      <ServitorListItem
        id="s1"
        name="X"
        kindLabel="Servitor"
        status="active"
        feedHint="Fed 6 days ago"
      />,
    );
    expect(screen.getByText("Fed 6 days ago")).toBeInTheDocument();
  });

  it("marks the feed hint overdue with data attribute", () => {
    const { container } = render(
      <ServitorListItem
        id="s1"
        name="X"
        kindLabel="Servitor"
        status="active"
        feedHint="Feeding elapsed"
        feedOverdue
      />,
    );
    expect(
      container
        .querySelector("[data-feed-hint]")
        ?.getAttribute("data-feed-overdue"),
    ).toBe("true");
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <ServitorListItem
        id="s1"
        name="X"
        kindLabel="Servitor"
        status="active"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks selected with aria-pressed + data-selected", () => {
    const { container } = render(
      <ServitorListItem
        id="s1"
        name="X"
        kindLabel="Servitor"
        status="active"
        selected
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-selected")).toBe("true");
  });
});

// ─── ServitorTaskCard ─────────────────────────────────────────────

describe("ServitorTaskCard", () => {
  it.each(TASK_STATUS_ORDER)(
    "renders task with status=%s",
    (status) => {
      render(
        <ServitorTaskCard
          id="t1"
          description="Hold the threshold."
          status={status}
        />,
      );
      expect(
        screen.getByText(TASK_STATUS_META[status].label),
      ).toBeInTheDocument();
    },
  );

  it("renders meta + outcome when provided", () => {
    render(
      <ServitorTaskCard
        id="t1"
        description="Hold the threshold."
        status="completed"
        meta="Standing charge · since 2 Feb"
        outcome="It held. The visitor passed without entering."
      />,
    );
    expect(
      screen.getByText("Standing charge · since 2 Feb"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It held. The visitor passed without entering.",
      ),
    ).toBeInTheDocument();
  });

  it("hides outcome when absent", () => {
    const { container } = render(
      <ServitorTaskCard
        id="t1"
        description="Hold the threshold."
        status="pending"
      />,
    );
    expect(container.querySelector("[data-task-outcome]")).toBeNull();
  });

  it("abandoned task uses --ts-abandoned (NOT --danger)", () => {
    expect(TASK_STATUS_META.abandoned.color).toBe("var(--ts-abandoned)");
  });

  it("never uses --danger anywhere", () => {
    const { container } = render(
      <ServitorTaskCard
        id="t1"
        description="X."
        status="abandoned"
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <ServitorTaskCard
        id="t99"
        description="X."
        status="in-progress"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-task-id")).toBe("t99");
    expect(root.getAttribute("data-task-status")).toBe("in-progress");
  });
});
