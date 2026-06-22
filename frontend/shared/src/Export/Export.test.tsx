import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  EXPORT_BOUND_FORMATS,
  EXPORT_FORMAT_META,
  EXPORT_FORMAT_ORDER,
  ExportFormatPicker,
} from "./ExportFormatPicker.js";
import { SealedExportNotice } from "./SealedExportNotice.js";

// ─── ExportFormatPicker ───────────────────────────────────────────

describe("ExportFormatPicker", () => {
  it("renders all four formats by default", () => {
    const { container } = render(
      <ExportFormatPicker value="pdf" />,
    );
    expect(
      container.querySelectorAll("[data-export-format]"),
    ).toHaveLength(4);
  });

  it("marks the active format with aria-checked + data-active", () => {
    const { container } = render(
      <ExportFormatPicker value="epub" />,
    );
    const active = container.querySelector('[data-active="true"]');
    expect(active?.getAttribute("data-export-format")).toBe("epub");
    expect(active?.getAttribute("aria-checked")).toBe("true");
  });

  it("fires onChange with the picked format", () => {
    const onChange = vi.fn();
    render(<ExportFormatPicker value="pdf" onChange={onChange} />);
    fireEvent.click(screen.getByText("Markdown"));
    expect(onChange).toHaveBeenCalledWith("markdown");
  });

  it("renders the canonical caption for each format", () => {
    render(<ExportFormatPicker value="pdf" />);
    expect(screen.getByText("Print-ready")).toBeInTheDocument();
    expect(screen.getByText("Plain + portable")).toBeInTheDocument();
    expect(screen.getByText("Self-contained")).toBeInTheDocument();
    expect(screen.getByText("E-reader")).toBeInTheDocument();
  });

  it("supports the bound-volume subset (PDF + EPUB only)", () => {
    const { container } = render(
      <ExportFormatPicker
        value="pdf"
        formats={EXPORT_BOUND_FORMATS}
      />,
    );
    const tiles = container.querySelectorAll("[data-export-format]");
    expect(tiles).toHaveLength(2);
    const ids = Array.from(tiles).map((t) =>
      t.getAttribute("data-export-format"),
    );
    expect(ids).toEqual(["pdf", "epub"]);
  });

  it("accepts per-format meta overrides (e.g. bound-mode notes)", () => {
    render(
      <ExportFormatPicker
        value="pdf"
        formats={EXPORT_BOUND_FORMATS}
        metaOverrides={{
          pdf: { note: "Bound volume" },
          epub: { note: "Each entry a chapter" },
        }}
      />,
    );
    expect(screen.getByText("Bound volume")).toBeInTheDocument();
    expect(screen.getByText("Each entry a chapter")).toBeInTheDocument();
  });

  it("attaches role=radiogroup + aria-label", () => {
    const { container } = render(<ExportFormatPicker value="pdf" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("role")).toBe("radiogroup");
    expect(root.getAttribute("aria-label")).toBe("Export format");
  });

  it("EXPORT_FORMAT_ORDER lists all four in canonical order", () => {
    expect(EXPORT_FORMAT_ORDER).toEqual([
      "pdf",
      "markdown",
      "html",
      "epub",
    ]);
    EXPORT_FORMAT_ORDER.forEach((f) => {
      expect(EXPORT_FORMAT_META[f]).toBeDefined();
    });
  });
});

// ─── SealedExportNotice ───────────────────────────────────────────

describe("SealedExportNotice", () => {
  it("renders the canonical heading verbatim", () => {
    render(<SealedExportNotice sealedCount={3} />);
    expect(
      screen.getByText("Sealed entries are never exported"),
    ).toBeInTheDocument();
  });

  it("renders the 'set aside' body for count > 1", () => {
    render(<SealedExportNotice sealedCount={3} />);
    expect(
      screen.getByText(
        /3 sealed entries are set aside; unlock the vault to include them on this device\./,
      ),
    ).toBeInTheDocument();
  });

  it("singularises 'entry is' for count 1", () => {
    render(<SealedExportNotice sealedCount={1} />);
    expect(
      screen.getByText(
        /1 sealed entry is set aside; unlock the vault to include them on this device\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders the honest empty form when count is 0", () => {
    render(<SealedExportNotice sealedCount={0} />);
    expect(
      screen.getByText("No sealed entries in this selection."),
    ).toBeInTheDocument();
  });

  it("attaches the sealed-count data attribute", () => {
    const { container } = render(<SealedExportNotice sealedCount={5} />);
    expect(
      container.firstElementChild?.getAttribute("data-sealed-count"),
    ).toBe("5");
  });

  it("does not include --danger in its palette", () => {
    const { container } = render(<SealedExportNotice sealedCount={2} />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
