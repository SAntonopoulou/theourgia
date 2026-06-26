/**
 * StudiesIndexSurface tests (H06 §S7.5).
 *
 * Honesty + H06 rule coverage:
 *   - small_sample chip is informational (--ink-mute), never --warn
 *   - stale chip is warm-accent invitation, never --danger
 *   - Bundled chip surfaces a `‡` glyph in --accent (matching the
 *     Nominatim/OSM `‡` convention reused for provenance)
 *   - "Mine" filter excludes bundled; "Bundled examples" filter
 *     shows only bundled
 *   - Empty state copy is verbatim
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type StudyCard,
  StudiesIndexSurface,
} from "./index.js";

const STUDIES: StudyCard[] = [
  {
    id: "s1",
    name: "Lunar phase efficacy",
    kind: "gematria_search",
    description: "Mean outcome rating by moon phase.",
    last_run_label: "run 2h ago",
    sample_size: 76,
    small_sample: false,
    stale: false,
    bundled: false,
    thumb_hint: "heat",
  },
  {
    id: "s2",
    name: "Dawn adorations & mood",
    kind: "gematria_calculation",
    description: "Liber Resh dawn station against the day's mood.",
    last_run_label: "run 34 days ago",
    sample_size: 7,
    small_sample: true,
    stale: true,
    bundled: false,
    thumb_hint: "bars",
  },
  {
    id: "s3",
    name: "Solar/Lunar correspondence",
    kind: "gematria_search",
    description: "Bundled study: gematria with solar/lunar correspondence.",
    last_run_label: null,
    sample_size: 0,
    small_sample: false,
    stale: false,
    bundled: true,
    thumb_hint: "line",
  },
];

describe("StudiesIndexSurface", () => {
  it("renders the header + search + New study CTA", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    expect(container.textContent).toContain("Saved Studies");
    expect(container.querySelector("[data-studies-search]")).toBeTruthy();
    expect(container.querySelector("[data-new-study]")).toBeTruthy();
  });

  it("'Mine' filter excludes bundled studies", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    // "Mine" is the default.
    const cards = container.querySelectorAll("[data-study-card]");
    expect(cards).toHaveLength(2);
    const ids = Array.from(cards).map((c) =>
      c.getAttribute("data-study-card"),
    );
    expect(ids).toEqual(expect.arrayContaining(["s1", "s2"]));
    expect(ids).not.toContain("s3");
  });

  it("'Bundled examples' filter shows only bundled", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='bundled']") as HTMLButtonElement,
    );
    const cards = container.querySelectorAll("[data-study-card]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-study-card")).toBe("s3");
  });

  it("Bundled chip uses `‡` glyph + --accent colour", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='bundled']") as HTMLButtonElement,
    );
    const chip = container.querySelector(
      "[data-bundled-chip]",
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain("‡");
    expect(chip.style.color).toBe("var(--accent)");
    expect(chip.style.background).toBe("var(--accent-soft)");
  });

  it("small-sample chip uses --ink-mute, never --warn / --danger", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    const card = container.querySelector(
      "[data-study-card='s2']",
    ) as HTMLElement;
    const chip = card.querySelector(
      "[data-small-sample-chip]",
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.style.color).toBe("var(--ink-mute)");
    expect(chip.outerHTML).not.toContain("--warn");
    expect(chip.outerHTML).not.toContain("--danger");
  });

  it("stale chip uses --accent invitation, never --danger", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    const card = container.querySelector(
      "[data-study-card='s2']",
    ) as HTMLElement;
    const chip = card.querySelector("[data-stale-chip]") as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.style.color).toBe("var(--accent)");
    expect(chip.textContent).toContain("stale — re-run?");
    expect(chip.outerHTML).not.toContain("--danger");
  });

  it("search filters by name and description", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    fireEvent.change(
      container.querySelector("[data-studies-search]") as HTMLInputElement,
      { target: { value: "lunar" } },
    );
    const cards = container.querySelectorAll("[data-study-card]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-study-card")).toBe("s1");
  });

  it("onOpen fires with study id on card click", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} onOpen={onOpen} />,
    );
    fireEvent.click(
      container.querySelector("[data-study-card='s1']") as HTMLElement,
    );
    expect(onOpen).toHaveBeenCalledWith("s1");
  });

  it("onNew fires from New study CTA", () => {
    const onNew = vi.fn();
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} onNew={onNew} />,
    );
    fireEvent.click(
      container.querySelector("[data-new-study]") as HTMLButtonElement,
    );
    expect(onNew).toHaveBeenCalled();
  });

  it("empty state when 'Mine' filter has no results", () => {
    const { container } = render(
      <StudiesIndexSurface studies={[]} />,
    );
    const empty = container.querySelector(
      "[data-studies-empty]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain(
      "No studies yet — save a search from the Search surface to start one.",
    );
  });

  it("empty state on 'Shared' filter explains it's not available yet", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='shared']") as HTMLButtonElement,
    );
    const empty = container.querySelector(
      "[data-studies-empty]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain(
      "Shared studies aren't available yet on this instance.",
    );
  });

  it("renders 'never run' for studies without a last_run_label", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='bundled']") as HTMLButtonElement,
    );
    const card = container.querySelector(
      "[data-study-card='s3']",
    ) as HTMLElement;
    expect(card.textContent).toContain("never run");
  });

  it("loading state renders", () => {
    const { container } = render(
      <StudiesIndexSurface studies={[]} loading />,
    );
    expect(container.querySelector("[data-studies-loading]")).toBeTruthy();
  });

  it("thumbnails render an svg per card", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    const cards = container.querySelectorAll("[data-study-card]");
    cards.forEach((c) => {
      expect(c.querySelector("svg")).toBeTruthy();
    });
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <StudiesIndexSurface studies={STUDIES} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
