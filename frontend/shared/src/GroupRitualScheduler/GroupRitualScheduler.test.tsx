/**
 * GroupRitualSchedulerSurface — unit tests.
 *
 * The defining honesty rules:
 *
 *   * The three-pin time trio is rendered as a unit (rule 23).
 *   * "Schedule + invite" CTA uses --warn-soft (NEVER --danger).
 *   * Required-correspondences helper renders verbatim
 *     ("A prep checklist for each participant — not a lock-in.").
 *   * Location radio defaults to "dispersed" with the verbatim
 *     hint copy.
 *   * Participants accept a DID input (free-form) — not gated by
 *     hub membership.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  GroupRitualSchedulerSurface,
  type GroupRitualSchedulerSurfaceProps,
} from "./GroupRitualSchedulerSurface.js";
import {
  GRS_ADD_CORRESPONDENCE,
  GRS_CORRESPONDENCES_HELPER,
  GRS_LOCATION_DISPERSED_HINT,
  GRS_LOCATION_LABELS,
  GRS_PARTICIPANTS_HELPER,
  GRS_SAVE_DRAFT,
  GRS_SCHEDULE_INVITE,
  GRS_SECTION_BASICS,
  GRS_SECTION_CORRESPONDENCES,
  GRS_SECTION_LOCATION,
  GRS_SECTION_PARTICIPANTS,
  GRS_SECTION_SCRIPT,
  GRS_SECTION_TIME,
  GRS_SUBTITLE,
  GRS_TIME_HELPER,
  GRS_TITLE,
} from "./copy.js";

const TRIO: GroupRitualSchedulerSurfaceProps["trio"] = {
  localPrimary: "20 Mar 2026 · 06:12",
  localSecondary: "Europe/Athens (EET)",
  utcPrimary: "04:12 UTC",
  utcSecondary: "20 Mar 2026",
  planetaryRuler: "Sun",
  planetarySecondary: "1st hour of day",
  isCurrent: true,
};

function renderGRS(
  overrides: Partial<
    Parameters<typeof GroupRitualSchedulerSurface>[0]
  > = {},
) {
  return render(
    <GroupRitualSchedulerSurface
      title="Spring equinox — shared dawn adoration"
      description="Each of us greets the rising sun."
      localDatetime="2026-03-20T06:12"
      trio={TRIO}
      locationKind="dispersed"
      participants={["Soror Aurora", "Diotima"]}
      correspondences={["A clear vessel of water", "Frankincense or copal"]}
      script="Hail to thee who art Ra in thy rising…"
      {...overrides}
    />,
  );
}

// ─── Chrome + sections ────────────────────────────────────────────

describe("GroupRitualSchedulerSurface — chrome", () => {
  it("renders title + subtitle verbatim", () => {
    renderGRS();
    expect(screen.getByText(GRS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(GRS_SUBTITLE)).toBeInTheDocument();
  });

  it("renders all six section headings in order", () => {
    renderGRS();
    const sections = document.querySelectorAll("[data-section]");
    const keys = Array.from(sections).map((s) =>
      s.getAttribute("data-section"),
    );
    expect(keys).toEqual([
      "basics",
      "time",
      "location",
      "participants",
      "correspondences",
      "script",
    ]);
  });

  it("renders the six section labels verbatim", () => {
    renderGRS();
    expect(screen.getByText(GRS_SECTION_BASICS)).toBeInTheDocument();
    expect(screen.getByText(GRS_SECTION_TIME)).toBeInTheDocument();
    expect(screen.getByText(GRS_SECTION_LOCATION)).toBeInTheDocument();
    expect(screen.getByText(GRS_SECTION_PARTICIPANTS)).toBeInTheDocument();
    expect(
      screen.getByText(GRS_SECTION_CORRESPONDENCES),
    ).toBeInTheDocument();
    expect(screen.getByText(GRS_SECTION_SCRIPT)).toBeInTheDocument();
  });
});

// ─── Basics section ───────────────────────────────────────────────

describe("GroupRitualSchedulerSurface — Basics", () => {
  it("renders the title input with caller value", () => {
    renderGRS();
    const input = document.querySelector(
      "[data-field='title']",
    ) as HTMLInputElement;
    expect(input.value).toBe("Spring equinox — shared dawn adoration");
  });

  it("fires onTitleChange when the input changes", () => {
    const onTitleChange = vi.fn();
    renderGRS({ onTitleChange });
    const input = document.querySelector(
      "[data-field='title']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "A new title" } });
    expect(onTitleChange).toHaveBeenCalledWith("A new title");
  });

  it("renders the description textarea with caller value", () => {
    renderGRS();
    const ta = document.querySelector(
      "[data-field='description']",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("Each of us greets the rising sun.");
  });
});

// ─── Time section (the worked-example trio) ───────────────────────

describe("GroupRitualSchedulerSurface — Time (the trio)", () => {
  it("renders the time helper verbatim", () => {
    renderGRS();
    expect(screen.getByText(GRS_TIME_HELPER)).toBeInTheDocument();
  });

  it("renders the local datetime input with caller value", () => {
    renderGRS();
    const input = document.querySelector(
      "[data-field='local-datetime']",
    ) as HTMLInputElement;
    expect(input.value).toBe("2026-03-20T06:12");
  });

  it("renders the GroupRitualTimeTrio with three cards", () => {
    renderGRS();
    expect(
      document.querySelectorAll("[data-card]"),
    ).toHaveLength(3);
  });

  it("planetary card uses --planetary-hour-now chrome when isCurrent=true", () => {
    renderGRS();
    const card = document.querySelector(
      "[data-card='planetary']",
    ) as HTMLElement;
    expect(card.style.background).toContain(
      "--planetary-hour-now-soft",
    );
  });
});

// ─── Location section ─────────────────────────────────────────────

describe("GroupRitualSchedulerSurface — Location", () => {
  it("renders the three location radio buttons", () => {
    renderGRS();
    expect(
      document.querySelectorAll("[data-location-kind]"),
    ).toHaveLength(3);
  });

  it("default location is dispersed → shows the verbatim hint", () => {
    renderGRS();
    expect(
      screen.getByText(GRS_LOCATION_DISPERSED_HINT),
    ).toBeInTheDocument();
  });

  it("switching to physical reveals the address input", () => {
    const onLocationKindChange = vi.fn();
    renderGRS({ onLocationKindChange });
    fireEvent.click(
      document.querySelector(
        "[data-location-kind='physical']",
      ) as HTMLElement,
    );
    expect(onLocationKindChange).toHaveBeenCalledWith("physical");
  });

  it("physical location renders the address field", () => {
    renderGRS({ locationKind: "physical" });
    expect(
      document.querySelector("[data-field='address']"),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-field='url']"),
    ).toBeNull();
  });

  it("virtual location renders the URL field in --font-mono", () => {
    renderGRS({ locationKind: "virtual" });
    const url = document.querySelector(
      "[data-field='url']",
    ) as HTMLInputElement;
    expect(url).not.toBeNull();
    expect(url.style.fontFamily).toContain("font-mono");
  });

  it("location labels are verbatim", () => {
    renderGRS();
    expect(screen.getByText(GRS_LOCATION_LABELS.physical)).toBeInTheDocument();
    expect(screen.getByText(GRS_LOCATION_LABELS.virtual)).toBeInTheDocument();
    expect(
      screen.getByText(GRS_LOCATION_LABELS.dispersed),
    ).toBeInTheDocument();
  });
});

// ─── Participants section ─────────────────────────────────────────

describe("GroupRitualSchedulerSurface — Participants", () => {
  it("renders one chip per participant", () => {
    renderGRS();
    expect(
      document.querySelectorAll("[data-participant]"),
    ).toHaveLength(2);
  });

  it("renders the verbatim free-form-DID helper", () => {
    renderGRS();
    expect(
      screen.getByText(GRS_PARTICIPANTS_HELPER),
    ).toBeInTheDocument();
  });

  it("Enter on the participant input fires onAddParticipant with trimmed value", () => {
    const onAddParticipant = vi.fn();
    renderGRS({ onAddParticipant });
    const input = document.querySelector(
      "[data-field='participant-input']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  did:theourgia:far.example:peregrina  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddParticipant).toHaveBeenCalledWith(
      "did:theourgia:far.example:peregrina",
    );
  });

  it("removing a participant fires onRemoveParticipant with the index", () => {
    const onRemoveParticipant = vi.fn();
    renderGRS({ onRemoveParticipant });
    const removeBtn = document
      .querySelector("[data-participant='Diotima']")!
      .querySelector(
        "[data-action='remove-participant']",
      ) as HTMLElement;
    fireEvent.click(removeBtn);
    expect(onRemoveParticipant).toHaveBeenCalledWith(1);
  });
});

// ─── Correspondences section ─────────────────────────────────────

describe("GroupRitualSchedulerSurface — Correspondences", () => {
  it("renders the verbatim prep-not-lock-in helper", () => {
    renderGRS();
    const helper = document.querySelector(
      "[data-field='correspondences-helper']",
    ) as HTMLElement;
    expect(helper.textContent).toBe(GRS_CORRESPONDENCES_HELPER);
  });

  it("renders one row per correspondence + an Add item button", () => {
    renderGRS();
    expect(
      document.querySelectorAll("[data-correspondence]"),
    ).toHaveLength(2);
    expect(screen.getByText(GRS_ADD_CORRESPONDENCE)).toBeInTheDocument();
  });

  it("Add item fires onAddCorrespondence", () => {
    const onAddCorrespondence = vi.fn();
    renderGRS({ onAddCorrespondence });
    fireEvent.click(screen.getByText(GRS_ADD_CORRESPONDENCE));
    expect(onAddCorrespondence).toHaveBeenCalledTimes(1);
  });
});

// ─── Script section ──────────────────────────────────────────────

describe("GroupRitualSchedulerSurface — Script", () => {
  it("renders the script textarea with caller value", () => {
    renderGRS();
    const ta = document.querySelector(
      "[data-field='script']",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("Hail to thee who art Ra in thy rising…");
  });

  it("Link a sigil / Link a voce fire their handlers", () => {
    const onLinkSigil = vi.fn();
    const onLinkVoce = vi.fn();
    renderGRS({ onLinkSigil, onLinkVoce });
    fireEvent.click(
      document.querySelector("[data-action='link-sigil']") as HTMLElement,
    );
    fireEvent.click(
      document.querySelector("[data-action='link-voce']") as HTMLElement,
    );
    expect(onLinkSigil).toHaveBeenCalledTimes(1);
    expect(onLinkVoce).toHaveBeenCalledTimes(1);
  });
});

// ─── Footer ──────────────────────────────────────────────────────

describe("GroupRitualSchedulerSurface — Footer", () => {
  it("'Save draft' fires onSaveDraft", () => {
    const onSaveDraft = vi.fn();
    renderGRS({ onSaveDraft });
    fireEvent.click(screen.getByText(GRS_SAVE_DRAFT));
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });

  it("'Schedule + invite' uses --warn-soft chrome (NEVER --danger)", () => {
    renderGRS();
    const cta = document.querySelector(
      "[data-action='schedule-invite']",
    ) as HTMLElement;
    expect(cta.textContent).toContain(GRS_SCHEDULE_INVITE);
    expect(cta.style.background).toContain("--warn-soft");
    expect(cta.style.borderColor).toContain("--warn-border");
    expect(cta.style.background).not.toContain("--danger");
  });

  it("'Schedule + invite' fires onScheduleInvite", () => {
    const onScheduleInvite = vi.fn();
    renderGRS({ onScheduleInvite });
    fireEvent.click(
      document.querySelector(
        "[data-action='schedule-invite']",
      ) as HTMLElement,
    );
    expect(onScheduleInvite).toHaveBeenCalledTimes(1);
  });
});
