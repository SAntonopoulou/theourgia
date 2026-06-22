import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ActivePracticeCard,
  type ActivePractice,
} from "./ActivePracticeCard.js";
import {
  OfferingTimelineCard,
  type OfferingRecord,
} from "./OfferingTimelineCard.js";
import {
  OFFERING_ITEM_META,
  OFFERING_ITEM_ORDER,
  RECEPTION_META,
  RECEPTION_ORDER,
  offeringCategoryColor,
} from "./offerings.js";

// ─── editorial constants ──────────────────────────────────────────

describe("Offerings constants", () => {
  it("exposes 14 item kinds in canonical order across 4 categories", () => {
    expect(OFFERING_ITEM_ORDER).toHaveLength(14);
    const categories = new Set(
      OFFERING_ITEM_ORDER.map((k) => OFFERING_ITEM_META[k].category),
    );
    expect([...categories].sort()).toEqual([
      "body",
      "liquid",
      "solid",
      "time",
    ]);
  });

  it("RECEPTION_ORDER goes none → overwhelming", () => {
    expect(RECEPTION_ORDER).toEqual([
      "none",
      "faint",
      "clear",
      "strong",
      "overwhelming",
    ]);
  });

  it("reception 'none' uses care palette (not red)", () => {
    expect(RECEPTION_META.none.color).toBe("var(--rc-none)");
    expect(RECEPTION_META.none.color).not.toContain("danger");
  });

  it("each category resolves to its --cat-* token", () => {
    expect(offeringCategoryColor("liquid")).toBe("var(--cat-liquid)");
    expect(offeringCategoryColor("solid")).toBe("var(--cat-solid)");
    expect(offeringCategoryColor("body")).toBe("var(--cat-body)");
    expect(offeringCategoryColor("time")).toBe("var(--cat-time)");
  });
});

// ─── OfferingTimelineCard ─────────────────────────────────────────

const offering: OfferingRecord = {
  id: "o1",
  time: "21:40",
  entityName: "Hekate",
  reception: "clear",
  items: [
    { kind: "wine", label: "Wine" },
    { kind: "honey", label: "Honey" },
    { kind: "incense", label: "Incense" },
  ],
  intention: "For safe passage through the month's threshold.",
  stamp: "Sun ☉ Gemini · dark moon · 24 Sivan 5786",
};

describe("OfferingTimelineCard", () => {
  it("renders time + entity name + intention + stamp", () => {
    render(<OfferingTimelineCard offering={offering} />);
    expect(screen.getByText("21:40")).toBeInTheDocument();
    expect(screen.getByText("Hekate")).toBeInTheDocument();
    expect(
      screen.getByText(/safe passage through the month/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sun ☉ Gemini · dark moon/),
    ).toBeInTheDocument();
  });

  it("renders one chip per item", () => {
    const { container } = render(
      <OfferingTimelineCard offering={offering} />,
    );
    expect(container.querySelectorAll("[data-item-chip]")).toHaveLength(3);
    expect(screen.getByText("Wine")).toBeInTheDocument();
    expect(screen.getByText("Honey")).toBeInTheDocument();
    expect(screen.getByText("Incense")).toBeInTheDocument();
  });

  it("renders the reception pill with the canonical label", () => {
    const { container } = render(
      <OfferingTimelineCard offering={offering} />,
    );
    const pill = container.querySelector("[data-reception-pill]");
    expect(pill?.getAttribute("data-reception")).toBe("clear");
    expect(pill?.textContent).toContain("Clear");
  });

  it.each(RECEPTION_ORDER)(
    "supports reception=%s without surfacing --danger",
    (level) => {
      const { container } = render(
        <OfferingTimelineCard
          offering={{ ...offering, reception: level }}
        />,
      );
      expect(container.innerHTML).not.toContain("--danger");
    },
  );

  it("becomes interactive when onOpen is provided", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <OfferingTimelineCard offering={offering} onOpen={onOpen} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("role")).toBe("button");
    fireEvent.click(root);
    expect(onOpen).toHaveBeenCalledOnce();
    fireEvent.keyDown(root, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("renders a custom item with caller-supplied label + color", () => {
    render(
      <OfferingTimelineCard
        offering={{
          ...offering,
          items: [
            { kind: null, label: "Beach pebble", color: "var(--ink-soft)" },
          ],
        }}
      />,
    );
    expect(screen.getByText("Beach pebble")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <OfferingTimelineCard
        offering={{ ...offering, reception: "overwhelming" }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe(
      "offering-timeline-card",
    );
    expect(root.getAttribute("data-offering-id")).toBe("o1");
    expect(root.getAttribute("data-reception")).toBe("overwhelming");
  });
});

// ─── ActivePracticeCard ───────────────────────────────────────────

const deipnon: ActivePractice = {
  id: "p1",
  label: "Hekate's Deipnon",
  entityName: "Hekate",
  cadence: "Every dark moon",
  due: "Due in 2 days",
  soon: true,
  active: true,
};

describe("ActivePracticeCard", () => {
  it("renders label + entity · cadence + due chip", () => {
    render(<ActivePracticeCard practice={deipnon} />);
    expect(screen.getByText("Hekate's Deipnon")).toBeInTheDocument();
    expect(
      screen.getByText("Hekate · Every dark moon"),
    ).toBeInTheDocument();
    expect(screen.getByText("Due in 2 days")).toBeInTheDocument();
  });

  it("renders the pause switch when onTogglePause provided", () => {
    const onTogglePause = vi.fn();
    render(
      <ActivePracticeCard
        practice={deipnon}
        onTogglePause={onTogglePause}
      />,
    );
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(onTogglePause).toHaveBeenCalledWith(false);
  });

  it("dims to opacity 0.62 when paused", () => {
    const { container } = render(
      <ActivePracticeCard
        practice={{ ...deipnon, active: false }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.opacity).toBe("0.62");
    expect(root.getAttribute("data-active")).toBe("false");
  });

  it("uses accent palette for the 'soon' due chip", () => {
    const { container } = render(
      <ActivePracticeCard practice={deipnon} />,
    );
    const chip = container.querySelector("[data-due-chip]") as HTMLElement;
    expect(chip.style.color).toBe("var(--accent)");
    expect(chip.style.background).toBe("var(--accent-soft)");
  });

  it("uses neutral palette when due is not soon", () => {
    const { container } = render(
      <ActivePracticeCard
        practice={{ ...deipnon, soon: false, due: "In 4 days" }}
      />,
    );
    const chip = container.querySelector("[data-due-chip]") as HTMLElement;
    expect(chip.style.color).toBe("var(--ink-mute)");
  });

  it("fires onRecord when Record is clicked", () => {
    const onRecord = vi.fn();
    render(
      <ActivePracticeCard practice={deipnon} onRecord={onRecord} />,
    );
    fireEvent.click(screen.getByText("Record"));
    expect(onRecord).toHaveBeenCalledOnce();
  });

  it("hides Record when no handler is provided", () => {
    render(<ActivePracticeCard practice={deipnon} />);
    expect(screen.queryByText("Record")).toBeNull();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <ActivePracticeCard practice={deipnon} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe(
      "active-practice-card",
    );
    expect(root.getAttribute("data-practice-id")).toBe("p1");
  });

  it("never includes --danger in its palette", () => {
    const { container } = render(
      <ActivePracticeCard
        practice={{ ...deipnon, active: false }}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
