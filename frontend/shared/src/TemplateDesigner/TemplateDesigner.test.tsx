import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  BLOCK_CATALOG,
  BLOCK_CATEGORIES,
  BLOCK_CATEGORY_ORDER,
  TEMPLATE_TOKENS,
  blockKindsByCategory,
} from "./catalog.js";
import { BlockGlyph } from "./BlockGlyph.js";
import { TemplateBlockCard } from "./TemplateBlockCard.js";
import { TemplateBlockPalette } from "./TemplateBlockPalette.js";
import { TemplateTokenChip } from "./TemplateTokenChip.js";

// ─── Catalog ───────────────────────────────────────────────────────

describe("Template Designer catalog", () => {
  it("exposes exactly 20 block kinds across 3 categories", () => {
    expect(Object.keys(BLOCK_CATALOG)).toHaveLength(20);
    const categories = new Set(
      Object.values(BLOCK_CATALOG).map((b) => b.category),
    );
    expect([...categories].sort()).toEqual(["format", "magick", "mark"]);
  });

  it("BLOCK_CATEGORY_ORDER is magick → format → mark", () => {
    expect(BLOCK_CATEGORY_ORDER).toEqual(["magick", "format", "mark"]);
  });

  it("blockKindsByCategory partitions the catalog", () => {
    const m = blockKindsByCategory("magick");
    const f = blockKindsByCategory("format");
    const x = blockKindsByCategory("mark");
    expect(m.length + f.length + x.length).toBe(20);
    // No overlaps
    const all = [...m, ...f, ...x].map((b) => b.kind);
    expect(new Set(all).size).toBe(all.length);
  });

  it("each block carries non-empty glyph paths", () => {
    for (const kind of Object.keys(BLOCK_CATALOG)) {
      const meta = BLOCK_CATALOG[kind as keyof typeof BLOCK_CATALOG];
      expect(meta.glyphPaths.length).toBeGreaterThan(0);
      meta.glyphPaths.forEach((d) => expect(d.length).toBeGreaterThan(2));
    }
  });

  it("TEMPLATE_TOKENS exposes the five canonical tokens", () => {
    expect(TEMPLATE_TOKENS.map((t) => t.token)).toEqual([
      "{date}",
      "{transition}",
      "{entity}",
      "{moon}",
      "{planetary-hour}",
    ]);
  });

  it("each category meta resolves a color token (no raw hex)", () => {
    BLOCK_CATEGORY_ORDER.forEach((c) => {
      expect(BLOCK_CATEGORIES[c].color).toMatch(/^var\(--/);
    });
  });
});

// ─── BlockGlyph ────────────────────────────────────────────────────

describe("BlockGlyph", () => {
  it("renders one <path> per glyphPaths entry", () => {
    const { container } = render(<BlockGlyph kind="ritual-step" />);
    const expected = BLOCK_CATALOG["ritual-step"].glyphPaths.length;
    expect(container.querySelectorAll("path")).toHaveLength(expected);
  });

  it("attaches the data-block-glyph attribute", () => {
    const { container } = render(<BlockGlyph kind="sensation" />);
    expect(
      (container.firstElementChild as SVGElement).getAttribute(
        "data-block-glyph",
      ),
    ).toBe("sensation");
  });

  it("respects the size prop", () => {
    const { container } = render(<BlockGlyph kind="heading" size={32} />);
    expect(
      (container.firstElementChild as SVGElement).getAttribute("width"),
    ).toBe("32");
  });
});

// ─── TemplateTokenChip ─────────────────────────────────────────────

describe("TemplateTokenChip", () => {
  it("renders the literal token text", () => {
    render(<TemplateTokenChip token="{date}" />);
    expect(screen.getByText("{date}")).toBeInTheDocument();
  });

  it("uses the canonical description as the title", () => {
    const { container } = render(<TemplateTokenChip token="{moon}" />);
    expect(container.firstElementChild?.getAttribute("title")).toBe(
      "Current moon phase",
    );
  });

  it("accepts a description override", () => {
    const { container } = render(
      <TemplateTokenChip token="{custom}" description="Custom value" />,
    );
    expect(container.firstElementChild?.getAttribute("title")).toBe(
      "Custom value",
    );
  });

  it("calls onInsert when clicked", () => {
    const onInsert = vi.fn();
    render(
      <TemplateTokenChip token="{entity}" onInsert={onInsert} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onInsert).toHaveBeenCalledOnce();
  });
});

// ─── TemplateBlockCard ─────────────────────────────────────────────

describe("TemplateBlockCard", () => {
  it("renders the kind label + visible label + ghost", () => {
    render(
      <TemplateBlockCard
        id="b5"
        kind="ritual-step"
        label="Main working"
        ghost="The core of the rite, step by step"
      />,
    );
    expect(screen.getByText("Ritual step")).toBeInTheDocument();
    expect(screen.getByText("Main working")).toBeInTheDocument();
    expect(
      screen.getByText(/The core of the rite/),
    ).toBeInTheDocument();
  });

  it("falls back to catalog label when label prop omitted", () => {
    render(<TemplateBlockCard id="b1" kind="heading" />);
    // Both kind-label and the visible label fall back to "Heading"
    expect(screen.getAllByText("Heading").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Required pill when required=true", () => {
    render(
      <TemplateBlockCard id="b1" kind="paragraph" required />,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("hides the Required pill when required is false", () => {
    render(<TemplateBlockCard id="b1" kind="paragraph" />);
    expect(screen.queryByText("Required")).toBeNull();
  });

  it("renders the option summary line", () => {
    render(
      <TemplateBlockCard
        id="b1"
        kind="ritual-step"
        optionSummary="with timer"
      />,
    );
    expect(screen.getByText("with timer")).toBeInTheDocument();
  });

  it("calls onSelect when the row body is clicked", () => {
    const onSelect = vi.fn();
    render(
      <TemplateBlockCard id="b1" kind="heading" onSelect={onSelect} />,
    );
    fireEvent.click(screen.getAllByRole("button")[0]!);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("fires onMoveUp / onMoveDown / onRemove", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onRemove = vi.fn();
    render(
      <TemplateBlockCard
        id="b1"
        kind="heading"
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText("Move up"));
    fireEvent.click(screen.getByLabelText("Move down"));
    fireEvent.click(screen.getByLabelText("Remove block"));
    expect(onMoveUp).toHaveBeenCalledOnce();
    expect(onMoveDown).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("disables Move up when isFirst, Move down when isLast", () => {
    render(
      <TemplateBlockCard id="b1" kind="heading" isFirst isLast />,
    );
    expect(screen.getByLabelText("Move up")).toBeDisabled();
    expect(screen.getByLabelText("Move down")).toBeDisabled();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <TemplateBlockCard
        id="b7"
        kind="divination-result"
        selected
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-block-id")).toBe("b7");
    expect(root.getAttribute("data-block-kind")).toBe("divination-result");
    expect(root.getAttribute("data-block-category")).toBe("magick");
    expect(root.getAttribute("data-selected")).toBe("true");
  });
});

// ─── TemplateBlockPalette ──────────────────────────────────────────

describe("TemplateBlockPalette", () => {
  it("renders all three category sections in canonical order", () => {
    const { container } = render(<TemplateBlockPalette />);
    const sections = container.querySelectorAll("[data-palette-category]");
    expect([...sections].map((s) => s.getAttribute("data-palette-category"))).toEqual([
      "magick",
      "format",
      "mark",
    ]);
  });

  it("renders every block as a button keyed by data-palette-kind", () => {
    const { container } = render(<TemplateBlockPalette />);
    expect(container.querySelectorAll("[data-palette-kind]")).toHaveLength(20);
  });

  it("supports a categories prop to subset the sections", () => {
    const { container } = render(
      <TemplateBlockPalette categories={["magick"]} />,
    );
    expect(container.querySelectorAll("[data-palette-category]")).toHaveLength(1);
    // Magick has 11 blocks
    expect(container.querySelectorAll("[data-palette-kind]")).toHaveLength(11);
  });

  it("calls onAdd with the kind when a block button is clicked", () => {
    const onAdd = vi.fn();
    const { container } = render(<TemplateBlockPalette onAdd={onAdd} />);
    const sigilBtn = container.querySelector("[data-palette-kind='sigil']");
    fireEvent.click(sigilBtn!);
    expect(onAdd).toHaveBeenCalledWith("sigil");
  });
});
