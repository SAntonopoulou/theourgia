/**
 * GroupRitualCoordinationSurface — unit tests.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type GroupRitualFragment,
  type GroupRitualParticipant,
  GroupRitualCoordinationSurface,
  type GroupRitualCoordinationSurfaceProps,
} from "./GroupRitualCoordinationSurface.js";
import {
  GRC_FRAGMENT_PLACEHOLDER,
  GRC_MARK_COMPLETED,
  GRC_PRESENCE_LABELS,
  GRC_STATUS_LABELS,
} from "./copy.js";

const TRIO: GroupRitualCoordinationSurfaceProps["trio"] = {
  localPrimary: "06:12",
  utcPrimary: "04:12",
  planetaryRuler: "Sun",
  isCurrent: true,
};

const PARTICIPANTS: GroupRitualParticipant[] = [
  { id: "you", initial: "Σ", name: "You", presence: "in-ritual" },
  { id: "aurora", initial: "A", name: "Soror Aurora", presence: "in-ritual" },
  { id: "diotima", initial: "Δ", name: "Diotima", presence: "joined" },
  {
    id: "peregrina",
    initial: "P",
    name: "Peregrina",
    presence: "not-present",
  },
];

const FRAGMENTS: GroupRitualFragment[] = [
  { id: "f-3", did: "aurora.example", time: "06:14", body: "The light just cleared the ridge." },
  { id: "f-2", did: "hearth.sophia.example", time: "06:13", body: "Vessel filled, incense lit. Beginning." },
  { id: "f-1", did: "terra.example", time: "06:12", body: "Present at the eastern door." },
];

const SCRIPT = [
  "Hail to thee who art Ra in thy rising.",
  "Tahuti standeth in his splendour at the prow.",
];

function renderGRC(
  overrides: Partial<
    Parameters<typeof GroupRitualCoordinationSurface>[0]
  > = {},
) {
  return render(
    <GroupRitualCoordinationSurface
      ritualTitle="Spring equinox — shared dawn adoration"
      status="in-progress"
      trio={TRIO}
      participants={PARTICIPANTS}
      scriptParagraphs={SCRIPT}
      fragments={FRAGMENTS}
      {...overrides}
    />,
  );
}

describe("GroupRitualCoordinationSurface — header", () => {
  it("renders the ritual title as h1", () => {
    renderGRC();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Spring equinox — shared dawn adoration",
      }),
    ).toBeInTheDocument();
  });

  it("renders the in-progress status badge with --peer-ok chrome", () => {
    renderGRC();
    const badge = document.querySelector(
      "[data-block='status-badge']",
    ) as HTMLElement;
    expect(badge.textContent).toContain(GRC_STATUS_LABELS["in-progress"]);
    expect(badge.style.background).toContain("--peer-ok-soft");
    expect(badge.style.color).toContain("--peer-ok");
    expect(badge.style.background).not.toContain("--danger");
  });

  it("countdown badge uses --warn-soft", () => {
    renderGRC({ status: "countdown" });
    const badge = document.querySelector(
      "[data-block='status-badge']",
    ) as HTMLElement;
    expect(badge.style.background).toContain("--warn-soft");
    expect(badge.style.background).not.toContain("--danger");
  });

  it("completed badge uses neutral --ink-mute (no --peer-ok celebration)", () => {
    renderGRC({ status: "completed" });
    const badge = document.querySelector(
      "[data-block='status-badge']",
    ) as HTMLElement;
    expect(badge.style.color).toContain("--ink-mute");
  });
});

describe("GroupRitualCoordinationSurface — time trio", () => {
  it("renders the trio in compact mode (data-compact='true')", () => {
    renderGRC();
    const trio = document.querySelector(
      "[data-block='time-trio']",
    ) as HTMLElement;
    expect(trio.getAttribute("data-compact")).toBe("true");
    expect(
      document.querySelectorAll("[data-card]"),
    ).toHaveLength(3);
  });
});

describe("GroupRitualCoordinationSurface — participant rail", () => {
  it("renders one row per participant", () => {
    renderGRC();
    expect(
      document.querySelectorAll("[data-participant-id]"),
    ).toHaveLength(4);
  });

  it("renders verbatim presence labels", () => {
    renderGRC();
    expect(
      screen.getAllByText(GRC_PRESENCE_LABELS["in-ritual"]),
    ).toHaveLength(2);
    expect(
      screen.getByText(GRC_PRESENCE_LABELS["joined"]),
    ).toBeInTheDocument();
    expect(
      screen.getByText(GRC_PRESENCE_LABELS["not-present"]),
    ).toBeInTheDocument();
  });

  it("in-ritual presence pill uses --peer-ok", () => {
    renderGRC();
    const row = document.querySelector(
      "[data-participant-id='you']",
    ) as HTMLElement;
    const pill = row.querySelector("[data-pill='presence']") as HTMLElement;
    expect(pill.style.color).toContain("--peer-ok");
    expect(pill.style.color).not.toContain("--danger");
  });

  it("joined presence pill uses --network", () => {
    renderGRC();
    const row = document.querySelector(
      "[data-participant-id='diotima']",
    ) as HTMLElement;
    const pill = row.querySelector("[data-pill='presence']") as HTMLElement;
    expect(pill.style.color).toContain("--network");
  });

  it("not-present + completed presence use --ink-mute (neutral)", () => {
    renderGRC();
    const row = document.querySelector(
      "[data-participant-id='peregrina']",
    ) as HTMLElement;
    const pill = row.querySelector("[data-pill='presence']") as HTMLElement;
    expect(pill.style.color).toContain("--ink-mute");
  });
});

describe("GroupRitualCoordinationSurface — script", () => {
  it("renders one paragraph per script line in caller order", () => {
    renderGRC();
    const lines = document.querySelectorAll("[data-script-line]");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.textContent).toBe(
      "Hail to thee who art Ra in thy rising.",
    );
  });
});

describe("GroupRitualCoordinationSurface — fragments", () => {
  it("renders one block per fragment in caller order", () => {
    renderGRC();
    const blocks = document.querySelectorAll("[data-fragment-id]");
    expect(blocks).toHaveLength(3);
    expect(blocks[0]?.getAttribute("data-fragment-id")).toBe("f-3");
  });

  it("renders DID + time in --font-mono", () => {
    renderGRC();
    const block = document.querySelector(
      "[data-fragment-id='f-3']",
    ) as HTMLElement;
    const did = block.querySelector("[data-field='did']") as HTMLElement;
    const time = block.querySelector("[data-field='time']") as HTMLElement;
    expect(did.textContent).toBe("aurora.example");
    expect(time.textContent).toBe("06:14");
    expect(did.style.fontFamily).toContain("font-mono");
    expect(time.style.fontFamily).toContain("font-mono");
  });

  it("renders the fragment body verbatim", () => {
    renderGRC();
    const block = document.querySelector(
      "[data-fragment-id='f-2']",
    ) as HTMLElement;
    expect(block.querySelector("[data-field='body']")?.textContent).toBe(
      "Vessel filled, incense lit. Beginning.",
    );
  });

  it("does NOT render any edit affordance per fragment", () => {
    renderGRC();
    // The 60-second edit window is the consumer's responsibility;
    // the surface renders fragments as read-only.
    const block = document.querySelector(
      "[data-fragment-id='f-3']",
    ) as HTMLElement;
    expect(block.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("GroupRitualCoordinationSurface — sticky footer", () => {
  it("renders the input + Mark me as completed CTA when in progress", () => {
    renderGRC();
    expect(
      document.querySelector("[data-field='fragment-input']"),
    ).not.toBeNull();
    expect(screen.getByText(GRC_MARK_COMPLETED)).toBeInTheDocument();
  });

  it("the input placeholder is the verbatim 'Post a fragment…'", () => {
    renderGRC();
    const input = document.querySelector(
      "[data-field='fragment-input']",
    ) as HTMLInputElement;
    expect(input.placeholder).toBe(GRC_FRAGMENT_PLACEHOLDER);
  });

  it("Enter on the input fires onPostFragment with the trimmed body", () => {
    const onPostFragment = vi.fn();
    renderGRC({ onPostFragment });
    const input = document.querySelector(
      "[data-field='fragment-input']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  The east is open.  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPostFragment).toHaveBeenCalledWith("The east is open.");
  });

  it("empty submission does NOT fire onPostFragment", () => {
    const onPostFragment = vi.fn();
    renderGRC({ onPostFragment });
    const input = document.querySelector(
      "[data-field='fragment-input']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPostFragment).not.toHaveBeenCalled();
  });

  it("Mark me as completed fires onMarkCompleted", () => {
    const onMarkCompleted = vi.fn();
    renderGRC({ onMarkCompleted });
    fireEvent.click(screen.getByText(GRC_MARK_COMPLETED));
    expect(onMarkCompleted).toHaveBeenCalledTimes(1);
  });

  it("footer is hidden when canPost=false", () => {
    renderGRC({ status: "completed", canPost: false });
    expect(document.querySelector("[data-block='footer']")).toBeNull();
  });

  it("Mark-completed CTA hidden when canMarkCompleted=false even if posting is allowed", () => {
    renderGRC({ canMarkCompleted: false });
    expect(screen.queryByText(GRC_MARK_COMPLETED)).toBeNull();
    // Posting still works.
    expect(
      document.querySelector("[data-field='fragment-input']"),
    ).not.toBeNull();
  });
});
