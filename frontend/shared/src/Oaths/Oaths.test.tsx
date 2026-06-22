import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  OathCard,
  type OathRecord,
} from "./OathCard.js";
import {
  OATH_STATUS_META,
  OATH_STATUS_ORDER,
  OathStatusPill,
} from "./OathStatusPill.js";

// ─── OathStatusPill ───────────────────────────────────────────────

describe("OathStatusPill", () => {
  it.each(OATH_STATUS_ORDER)(
    "renders status=%s with its canonical label",
    (status) => {
      const { container } = render(<OathStatusPill status={status} />);
      expect(
        screen.getByText(OATH_STATUS_META[status].label),
      ).toBeInTheDocument();
      expect(
        container.firstElementChild?.getAttribute("data-oath-status"),
      ).toBe(status);
    },
  );

  it("OATH_STATUS_ORDER lists five statuses", () => {
    expect(OATH_STATUS_ORDER).toHaveLength(5);
  });

  it("broken + renounced use care palette (NOT --danger)", () => {
    expect(OATH_STATUS_META.broken.color).toBe("var(--os-broken)");
    expect(OATH_STATUS_META.renounced.color).toBe("var(--os-renounced)");
    expect(OATH_STATUS_META.broken.color).not.toContain("danger");
    expect(OATH_STATUS_META.renounced.color).not.toContain("danger");
  });

  it("never uses --danger in the rendered pill", () => {
    const { container } = render(<OathStatusPill status="broken" />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("supports a label override", () => {
    render(<OathStatusPill status="active" label="In force" />);
    expect(screen.getByText("In force")).toBeInTheDocument();
    expect(screen.queryByText("Active")).toBeNull();
  });
});

// ─── OathCard ─────────────────────────────────────────────────────

const sealed: OathRecord = {
  id: "o1",
  title: "Daily morning practice",
  meta: "To self · taken 1 Jan 2026 · monthly renewal",
  status: "active",
  sealed: true,
  text: "I rise before the sun and adore the dawn, every day, this year.",
  checkpointDue: "Due in 3 days · monthly reflection",
  checkpointOverdue: false,
};

const visible: OathRecord = {
  ...sealed,
  id: "o2",
  title: "Vow of silence on the rite",
  sealed: false,
};

describe("OathCard", () => {
  it("renders title + meta + status pill", () => {
    render(<OathCard oath={sealed} />);
    expect(screen.getByText("Daily morning practice")).toBeInTheDocument();
    expect(
      screen.getByText(/To self · taken 1 Jan 2026 · monthly renewal/),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders the sealed badge when oath.sealed=true", () => {
    const { container } = render(<OathCard oath={sealed} />);
    expect(
      container.querySelector("[data-sealed-badge]"),
    ).toBeInTheDocument();
  });

  it("renders the sealed CTA when sealed and not unlocked", () => {
    const { container } = render(<OathCard oath={sealed} />);
    expect(
      container.querySelector("[data-sealed-cta]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-vow-text]"),
    ).toBeNull();
  });

  it("reveals the vow text when unlockedForSession=true", () => {
    const { container } = render(
      <OathCard oath={sealed} unlockedForSession />,
    );
    expect(
      container.querySelector("[data-vow-text]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-sealed-cta]"),
    ).toBeNull();
  });

  it("renders the vow text when sealed=false (no badge, no CTA)", () => {
    const { container } = render(<OathCard oath={visible} />);
    expect(
      container.querySelector("[data-vow-text]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-sealed-badge]"),
    ).toBeNull();
    expect(
      container.querySelector("[data-sealed-cta]"),
    ).toBeNull();
  });

  it("fires onRequestUnlock when the sealed CTA is clicked", () => {
    const onRequestUnlock = vi.fn();
    const { container } = render(
      <OathCard oath={sealed} onRequestUnlock={onRequestUnlock} />,
    );
    fireEvent.click(
      container.querySelector("[data-sealed-cta]") as HTMLElement,
    );
    expect(onRequestUnlock).toHaveBeenCalledOnce();
  });

  it("renders the checkpoint footer with Review → button", () => {
    const onReviewCheckpoint = vi.fn();
    render(
      <OathCard
        oath={sealed}
        onReviewCheckpoint={onReviewCheckpoint}
      />,
    );
    expect(
      screen.getByText(/Due in 3 days · monthly reflection/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Review →/));
    expect(onReviewCheckpoint).toHaveBeenCalledOnce();
  });

  it("marks the checkpoint overdue with data-overdue=true", () => {
    const { container } = render(
      <OathCard
        oath={{ ...sealed, checkpointOverdue: true }}
      />,
    );
    expect(
      container
        .querySelector("[data-checkpoint]")
        ?.getAttribute("data-overdue"),
    ).toBe("true");
  });

  it("hides the checkpoint footer when no checkpoint", () => {
    const { container } = render(
      <OathCard
        oath={{ ...sealed, checkpointDue: undefined }}
      />,
    );
    expect(container.querySelector("[data-checkpoint]")).toBeNull();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <OathCard oath={sealed} unlockedForSession />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-oath-id")).toBe("o1");
    expect(root.getAttribute("data-oath-status")).toBe("active");
    expect(root.getAttribute("data-oath-sealed")).toBe("true");
    expect(root.getAttribute("data-oath-unlocked")).toBe("true");
  });

  it("does not surface --danger anywhere on the card", () => {
    const { container } = render(
      <OathCard oath={{ ...sealed, status: "broken" }} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
