/**
 * PrintPreviewSurface tests (H07 §S3 surface 13).
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PrintPreviewRecord,
  PrintPreviewSurface,
  type PrintSpreadPage,
} from "./index.js";

function makeRecord(
  over: Partial<PrintPreviewRecord> = {},
): PrintPreviewRecord {
  return {
    page_size: "us-trade-6x9",
    show_trim_and_bleed: true,
    show_page_numbers: true,
    body_font: "Cardo",
    heading_scale: "standard",
    drop_caps: true,
    footnote_style: "margin",
    substitution_warnings: [],
    total_pages: 188,
    est_export_mb: 12.4,
    ...over,
  };
}

const SPREAD: { verso: PrintSpreadPage | null; recto: PrintSpreadPage | null } = {
  verso: {
    page_number: 24,
    body_html: "<p>A page of body text.</p>",
  },
  recto: {
    page_number: 25,
    chapter_eyebrow: "Chapter Four",
    chapter_title: "On Constancy",
    body_html: "<p>It took me a full year…</p>",
    drop_cap: true,
  },
};

describe("PrintPreviewSurface", () => {
  it("renders the spread with two pages", () => {
    const { container } = render(
      <PrintPreviewSurface
        publication_title="Walking the Crossroads"
        publication={makeRecord()}
        spread={SPREAD}
        spread_label="Pages 24–25 of 188 · US Trade 6×9"
      />,
    );
    expect(
      container.querySelectorAll("[data-page-number]"),
    ).toHaveLength(2);
  });

  it("page-size picker fires onChange with new size", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord()}
        spread={SPREAD}
        spread_label=""
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-page-size='a5']") as HTMLButtonElement,
    );
    expect(onChange).toHaveBeenCalledWith({ page_size: "a5" });
  });

  it("body font select fires onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord()}
        spread={SPREAD}
        spread_label=""
        onChange={onChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-body-font]") as HTMLSelectElement,
      { target: { value: "GFS Didot" } },
    );
    expect(onChange).toHaveBeenCalledWith({ body_font: "GFS Didot" });
  });

  it("drop caps toggle reflects + flips state", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({ drop_caps: false })}
        spread={SPREAD}
        spread_label=""
        onChange={onChange}
      />,
    );
    const toggle = container.querySelector(
      "[data-drop-caps]",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ drop_caps: true });
    rerender(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({ drop_caps: true })}
        spread={SPREAD}
        spread_label=""
        onChange={onChange}
      />,
    );
    expect(
      (container.querySelector("[data-drop-caps]") as HTMLButtonElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("substitution warning surfaces in --warn-soft when non-empty", () => {
    const { container, getByText } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({
          substitution_warnings: ["ϙ", "🜂", "⛧"],
        })}
        spread={SPREAD}
        spread_label=""
      />,
    );
    const warn = container.querySelector(
      "[data-substitution-warning]",
    ) as HTMLElement;
    expect(warn).toBeTruthy();
    expect(warn.style.background).toContain("var(--warn-soft)");
    expect(getByText(/3 glyphs/)).toBeInTheDocument();
    expect(getByText(/export still succeeds/)).toBeInTheDocument();
  });

  it("single-glyph substitution warning uses singular copy", () => {
    const { container, getByText } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({ substitution_warnings: ["ϙ"] })}
        spread={SPREAD}
        spread_label=""
      />,
    );
    expect(getByText(/One glyph/)).toBeInTheDocument();
  });

  it("substitution warning is HIDDEN when no warnings", () => {
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({ substitution_warnings: [] })}
        spread={SPREAD}
        spread_label=""
      />,
    );
    expect(
      container.querySelector("[data-substitution-warning]"),
    ).toBeFalsy();
  });

  it("footer renders total pages + est MB as quiet stat", () => {
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord()}
        spread={SPREAD}
        spread_label=""
      />,
    );
    const stat = container.querySelector("[data-pp-stat]") as HTMLElement;
    expect(stat.textContent).toContain("188 pages");
    expect(stat.textContent).toContain("12.4 MB");
  });

  it("Export PDF CTA fires onExport", () => {
    const onExport = vi.fn();
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord()}
        spread={SPREAD}
        spread_label=""
        onExport={onExport}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='export-pdf']",
      ) as HTMLButtonElement,
    );
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <PrintPreviewSurface
        publication_title="W"
        publication={makeRecord({
          substitution_warnings: ["ϙ"],
        })}
        spread={SPREAD}
        spread_label=""
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
