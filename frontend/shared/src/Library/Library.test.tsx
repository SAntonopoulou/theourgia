import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BookRow } from "./BookRow.js";
import { BookStatusBadge } from "./BookStatusBadge.js";
import { QuoteCard } from "./QuoteCard.js";
import {
  BOOK_STATUS_META,
  BOOK_STATUS_ORDER,
  type LibraryBook,
  type LibraryQuote,
  type ReadingListSummary,
  readingListProgress,
  traditionSpineColor,
} from "./library.js";
import { ReadingListCard } from "./ReadingListCard.js";

// ─── library helpers ──────────────────────────────────────────────

describe("Library helpers", () => {
  it("BOOK_STATUS_ORDER lists six statuses", () => {
    expect(BOOK_STATUS_ORDER).toEqual([
      "owned",
      "reading",
      "read",
      "want",
      "lent_out",
      "unlisted",
    ]);
  });

  it("each status color resolves through a --st-* token", () => {
    Object.values(BOOK_STATUS_META).forEach((meta) => {
      expect(meta.color).toMatch(/^var\(--st-/);
    });
  });

  it("traditionSpineColor maps each tradition to a --c-* / --accent token", () => {
    expect(traditionSpineColor("primary")).toBe("var(--c-entity)");
    expect(traditionSpineColor("grimoire")).toBe("var(--c-working)");
    expect(traditionSpineColor("scholarship")).toBe("var(--c-divination)");
    expect(traditionSpineColor("periodical")).toBe("var(--c-synchronicity)");
    expect(traditionSpineColor("thelemic")).toBe("var(--accent)");
  });

  it("readingListProgress clamps and ratios correctly", () => {
    const base = (read: number, total: number): ReadingListSummary => ({
      id: "x",
      name: "x",
      published: false,
      total,
      read,
      reading: 0,
    });
    expect(readingListProgress(base(0, 4))).toBe(0);
    expect(readingListProgress(base(2, 4))).toBe(0.5);
    expect(readingListProgress(base(4, 4))).toBe(1);
    expect(readingListProgress(base(0, 0))).toBe(0);
  });
});

// ─── BookStatusBadge ──────────────────────────────────────────────

describe("BookStatusBadge", () => {
  it.each(BOOK_STATUS_ORDER)("renders status=%s with its label", (status) => {
    const { container } = render(<BookStatusBadge status={status} />);
    expect(screen.getByText(BOOK_STATUS_META[status].label)).toBeInTheDocument();
    expect(
      container.firstElementChild?.getAttribute("data-status"),
    ).toBe(status);
  });

  it("accepts a label override", () => {
    render(<BookStatusBadge status="reading" label="In progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText("Reading")).toBeNull();
  });

  it("uses --st-lent for lent_out — NOT --danger (care palette)", () => {
    expect(BOOK_STATUS_META.lent_out.color).toBe("var(--st-lent)");
    expect(BOOK_STATUS_META.lent_out.color).not.toContain("danger");
  });
});

// ─── BookRow ──────────────────────────────────────────────────────

const oracles: LibraryBook = {
  id: "b1",
  title: "The Chaldean Oracles",
  author: "ed. & trans. Ruth Majercik",
  year: 1989,
  publisher: "Brill",
  isbn: "9789004092433",
  tradition: "primary",
  traditionLabel: "Neoplatonism",
  languages: ["grc", "en"],
  status: "read",
  holding: "physical",
  shelf: "II·3",
  citations: 47,
  glyph: "☉",
};

const liber: LibraryBook = {
  ...oracles,
  id: "b3",
  title: "Liber AL vel Legis",
  author: "Aleister Crowley",
  year: 1904,
  tradition: "thelemic",
  traditionLabel: "Thelema",
  languages: ["en"],
  status: "owned",
  holding: "digital",
  shelf: "—",
  citations: 88,
  glyph: "★",
};

describe("BookRow", () => {
  it("renders title (italic), byline, status, language chips, citation count", () => {
    render(<BookRow book={oracles} />);
    expect(screen.getByText(oracles.title)).toBeInTheDocument();
    expect(
      screen.getByText(/Ruth Majercik · 1989/),
    ).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("cited")).toBeInTheDocument();
  });

  it("renders one language chip per language code", () => {
    const { container } = render(
      <BookRow
        book={oracles}
        languageLabel={(c) => ({ grc: "Greek", en: "English" })[c] ?? c}
      />,
    );
    expect(container.querySelectorAll("[data-language]")).toHaveLength(2);
    expect(screen.getByText("Greek")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders the shelf label for physical holdings", () => {
    render(<BookRow book={oracles} />);
    expect(screen.getByText("II·3")).toBeInTheDocument();
  });

  it("renders 'Digital' for digital holdings", () => {
    render(<BookRow book={liber} />);
    expect(screen.getByText("Digital")).toBeInTheDocument();
  });

  it("shows the select checkbox only when onToggleSelect is provided", () => {
    const onToggleSelect = vi.fn();
    const { rerender, container } = render(<BookRow book={oracles} />);
    expect(container.querySelector("[data-book-checkbox]")).toBeNull();
    rerender(
      <BookRow book={oracles} onToggleSelect={onToggleSelect} />,
    );
    expect(container.querySelector("[data-book-checkbox]")).toBeInTheDocument();
  });

  it("calls onToggleSelect with the negated state", () => {
    const onToggleSelect = vi.fn();
    render(
      <BookRow book={oracles} onToggleSelect={onToggleSelect} selected />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith(false);
  });

  it("calls onOpen when the title region is clicked", () => {
    const onOpen = vi.fn();
    const { container } = render(<BookRow book={oracles} onOpen={onOpen} />);
    fireEvent.click(
      container.querySelector("[data-book-open]") as HTMLElement,
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(<BookRow book={liber} selected />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-book-id")).toBe("b3");
    expect(root.getAttribute("data-book-tradition")).toBe("thelemic");
    expect(root.getAttribute("data-book-status")).toBe("owned");
    expect(root.getAttribute("data-selected")).toBe("true");
  });
});

// ─── QuoteCard ────────────────────────────────────────────────────

const quote: LibraryQuote = {
  id: "q1",
  bookId: "b1",
  text: "Ἔστιν γὰρ δή τι νοητόν, ὃ χρή σε νοεῖν νόου ἄνθει.",
  cite: "The Chaldean Oracles, fr. 1",
  page: "p. 47",
  lang: "grc",
  langLabel: "Greek",
  citationKey: "[[cite:chaldean-fr1]]",
};

describe("QuoteCard", () => {
  it("renders the quote text with its language attribute", () => {
    const { container } = render(<QuoteCard quote={quote} />);
    const block = container.querySelector("blockquote") as HTMLElement;
    expect(block.getAttribute("lang")).toBe("grc");
    expect(block.textContent).toBe(quote.text);
  });

  it("composes the citation + page in the citation line", () => {
    render(<QuoteCard quote={quote} />);
    expect(
      screen.getByText(/The Chaldean Oracles, fr\. 1 · p\. 47/),
    ).toBeInTheDocument();
  });

  it("omits the page when it is '—'", () => {
    render(
      <QuoteCard quote={{ ...quote, page: "—" }} />,
    );
    expect(
      screen.getByText("The Chaldean Oracles, fr. 1"),
    ).toBeInTheDocument();
  });

  it("renders the language pill", () => {
    render(<QuoteCard quote={quote} />);
    expect(screen.getByText("Greek")).toBeInTheDocument();
  });

  it("calls onUseAsCitation with the citation key", () => {
    const onUseAsCitation = vi.fn();
    render(
      <QuoteCard quote={quote} onUseAsCitation={onUseAsCitation} />,
    );
    fireEvent.click(screen.getByText(/Use as citation/));
    expect(onUseAsCitation).toHaveBeenCalledWith("[[cite:chaldean-fr1]]");
  });

  it("hides the citation button when no handler is provided", () => {
    render(<QuoteCard quote={quote} />);
    expect(screen.queryByText(/Use as citation/)).toBeNull();
  });
});

// ─── ReadingListCard ──────────────────────────────────────────────

const list: ReadingListSummary = {
  id: "l1",
  name: "Hellenistic foundations",
  published: true,
  total: 5,
  read: 3,
  reading: 1,
};

describe("ReadingListCard", () => {
  it("renders name + 'Public' badge when published", () => {
    render(<ReadingListCard list={list} />);
    expect(screen.getByText("Hellenistic foundations")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("hides the Public badge when unpublished", () => {
    render(<ReadingListCard list={{ ...list, published: false }} />);
    expect(screen.queryByText("Public")).toBeNull();
  });

  it("computes a sensible default progress label", () => {
    render(<ReadingListCard list={list} />);
    expect(
      screen.getByText("3 of 5 read · 1 reading"),
    ).toBeInTheDocument();
  });

  it("accepts a caller-provided progress label", () => {
    render(<ReadingListCard list={list} progressLabel="Halfway home" />);
    expect(screen.getByText("Halfway home")).toBeInTheDocument();
  });

  it("renders a progressbar with the correct aria-valuenow", () => {
    render(<ReadingListCard list={list} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("60");
  });

  it("renders the empty-list label when total is 0", () => {
    render(
      <ReadingListCard
        list={{ id: "l9", name: "Empty", published: false, total: 0, read: 0, reading: 0 }}
      />,
    );
    expect(screen.getByText("Empty list")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<ReadingListCard list={list} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks active state with aria-current + data-active", () => {
    const { container } = render(<ReadingListCard list={list} active />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-active")).toBe("true");
    expect(root.getAttribute("aria-current")).toBe("true");
  });
});
