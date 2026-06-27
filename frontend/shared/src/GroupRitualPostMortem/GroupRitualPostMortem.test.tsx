/**
 * GroupRitualPostMortemSurface — unit tests.
 *
 * The defining honesty rules:
 *
 *   * Script + fragments are frozen (rendered as --ink-soft,
 *     no interactive affordances).
 *   * Reflection is write-once — when viewerCanReflect=false the
 *     form is hidden entirely.
 *   * Reflection char counter hard-locks at 4000 and the Submit
 *     CTA disables when over-limit.
 *   * Egregore chip renders ONLY when declared.
 *   * "Closed" badge is neutral chrome — no celebration.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type GroupRitualEgregoreDeclaration,
  type GroupRitualFrozenFragment,
  type GroupRitualReflection,
  GroupRitualPostMortemSurface,
  type GroupRitualPostMortemSurfaceProps,
} from "./GroupRitualPostMortemSurface.js";
import {
  GRPM_CLOSED_BADGE,
  GRPM_COMPLETED_PREFIX,
  GRPM_FRAGMENTS_FROZEN,
  GRPM_OPEN_AS_ENTRY,
  GRPM_REFLECTION_LIMIT,
  GRPM_REFLECTION_PLACEHOLDER,
  GRPM_REFLECTION_SUBMIT,
  GRPM_REFLECTIONS_HEADING,
  GRPM_SCRIPT_FROZEN,
  GRPM_YOUR_REFLECTION,
} from "./copy.js";

const TRIO: GroupRitualPostMortemSurfaceProps["trio"] = {
  localPrimary: "06:12",
  utcPrimary: "04:12",
  planetaryRuler: "Sun",
  isCurrent: false,
};

const FRAGMENTS: GroupRitualFrozenFragment[] = [
  { id: "f-1", did: "aurora.example", time: "06:14", body: "The light cleared the ridge." },
  { id: "f-2", did: "hearth.sophia.example", time: "06:13", body: "Vessel filled, incense lit." },
];

const REFLECTIONS: GroupRitualReflection[] = [
  {
    participantId: "aurora",
    initial: "A",
    name: "Soror Aurora",
    body: "The sense of the others holding the same words at the same instant was unmistakable.",
  },
];

const SCRIPT = [
  "Hail to thee who art Ra in thy rising.",
  "Tahuti standeth in his splendour.",
];

function renderGRPM(
  overrides: Partial<
    Parameters<typeof GroupRitualPostMortemSurface>[0]
  > = {},
) {
  return render(
    <GroupRitualPostMortemSurface
      ritualTitle="Spring equinox — shared dawn adoration"
      completedAtLabel="20 Mar 2026"
      trio={TRIO}
      scriptParagraphs={SCRIPT}
      fragments={FRAGMENTS}
      existingReflections={REFLECTIONS}
      viewerCanReflect={true}
      {...overrides}
    />,
  );
}

// ─── Header ─────────────────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — header", () => {
  it("renders the ritual title as h1", () => {
    renderGRPM();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Spring equinox — shared dawn adoration",
      }),
    ).toBeInTheDocument();
  });

  it("renders the verbatim 'Closed' badge with neutral chrome", () => {
    renderGRPM();
    const badge = document.querySelector(
      "[data-block='closed-badge']",
    ) as HTMLElement;
    expect(badge.textContent).toContain(GRPM_CLOSED_BADGE);
    expect(badge.style.color).toContain("--ink-mute");
    // Not --peer-ok (would read as celebratory) — neutral.
    expect(badge.style.color).not.toContain("--peer-ok");
    expect(badge.style.color).not.toContain("--danger");
  });

  it("renders 'Completed {date}' verbatim", () => {
    renderGRPM();
    const c = document.querySelector(
      "[data-field='completed-at']",
    ) as HTMLElement;
    expect(c.textContent).toBe(`${GRPM_COMPLETED_PREFIX}20 Mar 2026`);
  });
});

// ─── Time trio ────────────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — time trio", () => {
  it("renders the trio in compact mode", () => {
    renderGRPM();
    const trio = document.querySelector(
      "[data-block='time-trio']",
    ) as HTMLElement;
    expect(trio.getAttribute("data-compact")).toBe("true");
  });

  it("planetary card is NOT --planetary-hour-now (not current)", () => {
    renderGRPM();
    const card = document.querySelector(
      "[data-card='planetary']",
    ) as HTMLElement;
    expect(card.getAttribute("data-current")).toBe("false");
    expect(card.style.background).not.toContain("--planetary-hour-now");
  });
});

// ─── Egregore chip ────────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — egregore chip", () => {
  it("does NOT render when no egregore is declared", () => {
    renderGRPM();
    expect(
      document.querySelector("[data-block='egregore-chip']"),
    ).toBeNull();
  });

  it("renders with the verbatim prefix when declared", () => {
    const egregore: GroupRitualEgregoreDeclaration = {
      entityName: "The Dawn Companion",
      entityHref: "/entities/dawn-companion",
    };
    renderGRPM({ egregore });
    expect(
      document.querySelector("[data-block='egregore-chip']"),
    ).not.toBeNull();
    const prefix = document.querySelector(
      "[data-field='egregore-prefix']",
    ) as HTMLElement;
    expect(prefix.textContent).toBe(
      "This ritual declared an egregore creation. ",
    );
    const link = document.querySelector(
      "[data-field='egregore-link']",
    ) as HTMLAnchorElement;
    expect(link.textContent).toBe("The Dawn Companion → in your beings");
    expect(link.getAttribute("href")).toBe("/entities/dawn-companion");
  });
});

// ─── Frozen sections ──────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — frozen sections", () => {
  it("renders 'Shared script · frozen' eyebrow verbatim", () => {
    renderGRPM();
    expect(screen.getByText(GRPM_SCRIPT_FROZEN)).toBeInTheDocument();
  });

  it("renders 'Fragments from the ritual · frozen' eyebrow", () => {
    renderGRPM();
    expect(screen.getByText(GRPM_FRAGMENTS_FROZEN)).toBeInTheDocument();
  });

  it("script paragraphs render in --ink-soft (frozen)", () => {
    renderGRPM();
    const block = document.querySelector(
      "[data-block='script-frozen']",
    ) as HTMLElement;
    const body = block.querySelector("[data-script-line='0']") as HTMLElement;
    expect(body.textContent).toBe("Hail to thee who art Ra in thy rising.");
    // The container's color carries down.
    expect(
      (block.firstElementChild as HTMLElement | null)?.nextElementSibling?.getAttribute("style"),
    ).toContain("--ink-soft");
  });

  it("fragments render with --line-2 border-left (frozen tone)", () => {
    renderGRPM();
    const block = document.querySelector(
      "[data-fragment-id='f-1']",
    ) as HTMLElement;
    expect(block.style.borderLeft).toContain("--line-2");
    // No --network-line accent (in-progress tone).
    expect(block.style.borderLeft).not.toContain("--network-line");
  });

  it("fragments expose no edit/delete affordances", () => {
    renderGRPM();
    const block = document.querySelector(
      "[data-fragment-id='f-1']",
    ) as HTMLElement;
    expect(block.querySelectorAll("button")).toHaveLength(0);
  });
});

// ─── Reflections ──────────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — existing reflections", () => {
  it("renders one read-mode card per existing reflection", () => {
    renderGRPM();
    expect(
      document.querySelectorAll("[data-reflection-participant]"),
    ).toHaveLength(1);
  });

  it("the author name + body render verbatim", () => {
    renderGRPM();
    const card = document.querySelector(
      "[data-reflection-participant='aurora']",
    ) as HTMLElement;
    expect(
      card.querySelector("[data-field='reflection-author']")?.textContent,
    ).toBe("Soror Aurora");
    expect(
      card.querySelector("[data-field='reflection-body']")?.textContent,
    ).toContain("unmistakable");
  });

  it("existing reflections expose no edit/delete affordances", () => {
    renderGRPM();
    const card = document.querySelector(
      "[data-reflection-participant='aurora']",
    ) as HTMLElement;
    expect(card.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("GroupRitualPostMortemSurface — reflection write-once form", () => {
  it("renders the form when viewerCanReflect=true", () => {
    renderGRPM({ viewerCanReflect: true });
    expect(
      document.querySelector("[data-block='reflection-form']"),
    ).not.toBeNull();
    expect(screen.getByText(GRPM_YOUR_REFLECTION)).toBeInTheDocument();
  });

  it("hides the form when viewerCanReflect=false", () => {
    renderGRPM({ viewerCanReflect: false });
    expect(
      document.querySelector("[data-block='reflection-form']"),
    ).toBeNull();
  });

  it("placeholder is verbatim 'Write once — your reflection is frozen…'", () => {
    renderGRPM();
    const input = document.querySelector(
      "[data-field='reflection-input']",
    ) as HTMLTextAreaElement;
    expect(input.placeholder).toBe(GRPM_REFLECTION_PLACEHOLDER);
  });

  it("counter starts at '0 / 4000'", () => {
    renderGRPM();
    const counter = document.querySelector(
      "[data-field='reflection-counter']",
    ) as HTMLElement;
    expect(counter.textContent).toBe(`0 / ${GRPM_REFLECTION_LIMIT}`);
  });

  it("counter updates as the input changes", () => {
    renderGRPM();
    const input = document.querySelector(
      "[data-field='reflection-input']",
    ) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "abc" } });
    const counter = document.querySelector(
      "[data-field='reflection-counter']",
    ) as HTMLElement;
    expect(counter.textContent).toBe(`3 / ${GRPM_REFLECTION_LIMIT}`);
  });

  it("counter flips to --warn ink when over the limit", () => {
    renderGRPM();
    const input = document.querySelector(
      "[data-field='reflection-input']",
    ) as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: "x".repeat(GRPM_REFLECTION_LIMIT + 1) },
    });
    const counter = document.querySelector(
      "[data-field='reflection-counter']",
    ) as HTMLElement;
    expect(counter.getAttribute("data-over")).toBe("true");
    expect(counter.style.color).toContain("--warn");
  });

  it("Submit is disabled when over the limit", () => {
    renderGRPM();
    const input = document.querySelector(
      "[data-field='reflection-input']",
    ) as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: "x".repeat(GRPM_REFLECTION_LIMIT + 1) },
    });
    const submit = document.querySelector(
      "[data-action='submit-reflection']",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("Submit is disabled when the input is empty", () => {
    renderGRPM();
    const submit = document.querySelector(
      "[data-action='submit-reflection']",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("Submit fires onSubmitReflection with the trimmed body", () => {
    const onSubmitReflection = vi.fn();
    renderGRPM({ onSubmitReflection });
    const input = document.querySelector(
      "[data-field='reflection-input']",
    ) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "  my reflection  " } });
    fireEvent.click(screen.getByText(GRPM_REFLECTION_SUBMIT));
    expect(onSubmitReflection).toHaveBeenCalledWith("my reflection");
  });
});

// ─── Open as entry ───────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — Open as entry", () => {
  it("renders the verbatim CTA", () => {
    renderGRPM();
    expect(screen.getByText(GRPM_OPEN_AS_ENTRY)).toBeInTheDocument();
  });

  it("fires onOpenAsEntry when clicked", () => {
    const onOpenAsEntry = vi.fn();
    renderGRPM({ onOpenAsEntry });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-as-entry']",
      ) as HTMLElement,
    );
    expect(onOpenAsEntry).toHaveBeenCalledTimes(1);
  });
});

// ─── Defensive ────────────────────────────────────────────────────

describe("GroupRitualPostMortemSurface — Reflections heading", () => {
  it("renders the section heading verbatim", () => {
    renderGRPM();
    expect(
      screen.getByText(GRPM_REFLECTIONS_HEADING),
    ).toBeInTheDocument();
  });
});
