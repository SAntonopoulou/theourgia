import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { HighlightedText } from "./HighlightedText.js";
import { highlightSegments } from "./highlight.js";
import { SealedExcludedCallout } from "./SealedExcludedCallout.js";
import {
  type SearchHit,
  SearchHitCard,
} from "./SearchHitCard.js";

// ─── highlightSegments ────────────────────────────────────────────

describe("highlightSegments", () => {
  it("returns a single non-hit segment for empty query", () => {
    expect(highlightSegments("Saturn rules limit", "")).toEqual([
      { text: "Saturn rules limit", hit: false },
    ]);
    expect(highlightSegments("Saturn rules limit", undefined)).toEqual([
      { text: "Saturn rules limit", hit: false },
    ]);
  });

  it("highlights case-insensitive matches", () => {
    const segs = highlightSegments("Saturn meets saturn at SATURN", "saturn");
    const hits = segs.filter((s) => s.hit);
    expect(hits).toHaveLength(3);
    // Original casing preserved
    expect(hits[0]!.text).toBe("Saturn");
    expect(hits[1]!.text).toBe("saturn");
    expect(hits[2]!.text).toBe("SATURN");
  });

  it("returns the original text when there is no match", () => {
    expect(highlightSegments("Hekate", "saturn")).toEqual([
      { text: "Hekate", hit: false },
    ]);
  });

  it("preserves non-hit segments between hits", () => {
    const segs = highlightSegments("the saturn was the saturn", "saturn");
    expect(segs.map((s) => s.text).join("")).toBe(
      "the saturn was the saturn",
    );
    expect(segs.filter((s) => s.hit)).toHaveLength(2);
  });
});

// ─── HighlightedText ──────────────────────────────────────────────

describe("HighlightedText", () => {
  it("wraps hit segments in <mark data-hit>", () => {
    const { container } = render(
      <HighlightedText text="working with Saturn" query="Saturn" />,
    );
    const hits = container.querySelectorAll("mark[data-hit]");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.textContent).toBe("Saturn");
  });

  it("renders no marks when query is empty", () => {
    const { container } = render(
      <HighlightedText text="working with Saturn" query="" />,
    );
    expect(container.querySelectorAll("mark").length).toBe(0);
  });
});

// ─── SearchHitCard ────────────────────────────────────────────────

const sampleHit: SearchHit = {
  id: "h1",
  title: "Notes on Saturn and binding rites",
  excerpt:
    "Saturn governs limit and duration; this hour suited the rite well.",
  kindLabel: "Note",
  when: "Mon 16 Jun · waxing crescent",
  visibility: "personal",
};

describe("SearchHitCard", () => {
  it("renders title + excerpt + kind + when + visibility label", () => {
    render(<SearchHitCard hit={sampleHit} />);
    expect(
      screen.getByText(/Notes on Saturn and binding rites/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Saturn governs limit/)).toBeInTheDocument();
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(
      screen.getByText("Mon 16 Jun · waxing crescent"),
    ).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("highlights hits in both the title and the excerpt", () => {
    const { container } = render(
      <SearchHitCard hit={sampleHit} query="Saturn" />,
    );
    // Two occurrences ("Saturn" in title + "Saturn" in excerpt)
    expect(container.querySelectorAll("mark[data-hit]")).toHaveLength(2);
  });

  it("calls onSelect when the row is clicked", () => {
    const onSelect = vi.fn();
    render(<SearchHitCard hit={sampleHit} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("attaches structural + visibility data attributes", () => {
    const { container } = render(
      <SearchHitCard hit={{ ...sampleHit, visibility: "hub" }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-hit-id")).toBe("h1");
    expect(root.getAttribute("data-visibility")).toBe("hub");
  });

  it("renders a caller-provided glyph slot", () => {
    render(
      <SearchHitCard
        hit={sampleHit}
        glyph={<span data-testid="kind-glyph">♄</span>}
      />,
    );
    expect(screen.getByTestId("kind-glyph")).toBeInTheDocument();
  });
});

// ─── SealedExcludedCallout ────────────────────────────────────────

describe("SealedExcludedCallout", () => {
  it("singularises 'entry' for count 1", () => {
    render(<SealedExcludedCallout sealedCount={1} />);
    expect(
      screen.getByText("1 sealed entry may also match."),
    ).toBeInTheDocument();
  });

  it("pluralises 'entries' for count > 1", () => {
    render(<SealedExcludedCallout sealedCount={3} />);
    expect(
      screen.getByText("3 sealed entries may also match."),
    ).toBeInTheDocument();
  });

  it("renders the verbatim explanation copy", () => {
    render(<SealedExcludedCallout sealedCount={2} />);
    expect(
      screen.getByText(
        /Sealed entries are encrypted with a key only your device holds/,
      ),
    ).toBeInTheDocument();
  });

  it("renders the unlock action when count > 0", () => {
    render(
      <SealedExcludedCallout
        sealedCount={2}
        unlockAction={<button>Unlock vault</button>}
      />,
    );
    expect(screen.getByText("Unlock vault")).toBeInTheDocument();
  });

  it("hides the unlock action when count is 0", () => {
    render(
      <SealedExcludedCallout
        sealedCount={0}
        unlockAction={<button>Unlock vault</button>}
      />,
    );
    expect(screen.queryByText("Unlock vault")).toBeNull();
    expect(
      screen.getByText("No sealed entries were excluded."),
    ).toBeInTheDocument();
  });

  it("renders the inline layout when layout=inline", () => {
    const { container } = render(
      <SealedExcludedCallout sealedCount={2} layout="inline" />,
    );
    expect(container.firstElementChild?.getAttribute("data-layout")).toBe(
      "inline",
    );
    expect(
      screen.getByText(/2 sealed entries weren't searched/),
    ).toBeInTheDocument();
  });

  it("inline layout with count=0 still reads honestly", () => {
    render(<SealedExcludedCallout sealedCount={0} layout="inline" />);
    expect(
      screen.getByText(/every searchable entry is in the results/),
    ).toBeInTheDocument();
  });

  it("attaches sealed-count data attribute", () => {
    const { container } = render(<SealedExcludedCallout sealedCount={5} />);
    expect(
      container.firstElementChild?.getAttribute("data-sealed-count"),
    ).toBe("5");
  });
});
