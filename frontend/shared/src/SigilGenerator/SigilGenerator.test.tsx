import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { CarriesPanel } from "./CarriesPanel.js";
import { ChargeSaveDialog } from "./ChargeSaveDialog.js";
import { ConfigPanel } from "./ConfigPanel.js";
import {
  FORMULA_DEFAULT,
  FORMULA_HELP,
  INTENTION_DEFAULT,
  OWNED_DECK_WARN,
  RECOLOR_SWATCHES,
  SAVE_DIALOG_PERMANENCE,
  SIGIL_EXPORT_FORMATS,
  SIGIL_MODES,
  TOPBAR_SUBTITLE_TAIL,
  TOPBAR_TITLE,
  modeCitation,
  modeLabel,
} from "./copy.js";
import { ExportMenu } from "./ExportMenu.js";
import { ModeRail } from "./ModeRail.js";
import { OperationsToolbar } from "./OperationsToolbar.js";
import { OwnedDeckOverlay } from "./OwnedDeckOverlay.js";
import { SigilGeneratorSurface } from "./SigilGeneratorSurface.js";
import { SigilLibraryPanel } from "./SigilLibraryPanel.js";
import { SigilPreview } from "./SigilPreview.js";

// ─── Editorial copy ──────────────────────────────────────────────

describe("SigilGenerator editorial constants", () => {
  it("TOPBAR_TITLE is exactly 'Sigil Generator'", () => {
    expect(TOPBAR_TITLE).toBe("Sigil Generator");
  });

  it("TOPBAR_SUBTITLE_TAIL is verbatim from the mockup", () => {
    expect(TOPBAR_SUBTITLE_TAIL).toBe(
      " · the preview is the work; charge it when it is ready",
    );
  });

  it("SAVE_DIALOG_PERMANENCE carries the committed-make promise", () => {
    expect(SAVE_DIALOG_PERMANENCE).toBe(
      "A saved sigil is permanent. To change it later you make a new version.",
    );
  });

  it("OWNED_DECK_WARN is verbatim and never-shareable / never-exportable", () => {
    expect(OWNED_DECK_WARN).toContain("personal study only");
    expect(OWNED_DECK_WARN).toContain("never shareable");
    expect(OWNED_DECK_WARN).toContain("never exportable");
    expect(OWNED_DECK_WARN).toContain("cleared when you reload");
  });

  it("FORMULA_HELP names the exact whitelist", () => {
    expect(FORMULA_HELP).toBe(
      "Whitelisted: sin cos sqrt pow log abs π e g θ t. Anything else is refused.",
    );
  });

  it("SIGIL_MODES is exactly 11 entries in fixed order", () => {
    expect(SIGIL_MODES).toHaveLength(11);
    expect(SIGIL_MODES[0]!.key).toBe("spare");
    expect(SIGIL_MODES[10]!.key).toBe("image");
  });

  it("SIGIL_EXPORT_FORMATS lists SVG (with ✦ + 'vector') first", () => {
    expect(SIGIL_EXPORT_FORMATS[0]!.key).toBe("svg");
    expect(SIGIL_EXPORT_FORMATS[0]!.glyph).toBe("✦");
    expect(SIGIL_EXPORT_FORMATS[0]!.hint).toBe("vector");
  });

  it("RECOLOR_SWATCHES has exactly 7 entries", () => {
    expect(RECOLOR_SWATCHES).toHaveLength(7);
  });

  it("modeCitation returns the verbatim Agrippa for kamea", () => {
    expect(modeCitation("kamea")).toContain("Agrippa");
    expect(modeCitation("kamea")).toContain("1531");
  });

  it("modeCitation returns null for non-PD modes (hashed/freeform/etc.)", () => {
    expect(modeCitation("hashed")).toBeNull();
    expect(modeCitation("freeform")).toBeNull();
    expect(modeCitation("harmonograph")).toBeNull();
    expect(modeCitation("formula")).toBeNull();
    expect(modeCitation("image")).toBeNull();
    expect(modeCitation("rosette")).toBeNull();
  });

  it("modeLabel returns the verbatim label for each mode", () => {
    expect(modeLabel("spare")).toBe("Letter elimination");
    expect(modeLabel("kamea")).toBe("Kamea pathing");
    expect(modeLabel("formula")).toBe("Parametric formula");
  });
});

// ─── ModeRail ─────────────────────────────────────────────────────

describe("ModeRail", () => {
  it("renders all 11 modes in fixed order", () => {
    render(<ModeRail value="spare" onChange={() => {}} />);
    const buttons = screen.getAllByRole("tab");
    expect(buttons).toHaveLength(11);
    expect(buttons[0]!.textContent).toContain("Letter elimination");
    expect(buttons[10]!.textContent).toContain("Image + vectorize");
  });

  it("highlights the active mode (aria-selected=true + accent border)", () => {
    render(<ModeRail value="kamea" onChange={() => {}} />);
    const kamea = screen.getByText("Kamea pathing").closest("button");
    expect(kamea).toHaveAttribute("aria-selected", "true");
    const spare = screen.getByText("Letter elimination").closest("button");
    expect(spare).toHaveAttribute("aria-selected", "false");
  });

  it("fires onChange with the picked mode key", () => {
    const onChange = vi.fn();
    render(<ModeRail value="spare" onChange={onChange} />);
    fireEvent.click(screen.getByText("Kamea pathing"));
    expect(onChange).toHaveBeenCalledWith("kamea");
  });

  it("each rail entry shows its numeric position 1..11", () => {
    render(<ModeRail value="spare" onChange={() => {}} />);
    for (let i = 1; i <= 11; i++) {
      const tabs = screen.getAllByRole("tab");
      const tab = tabs[i - 1]!;
      expect(tab.textContent).toContain(String(i));
    }
  });
});

// ─── SigilPreview ────────────────────────────────────────────────

describe("SigilPreview", () => {
  it("renders an SVG with role=img + the mode as a data attribute", () => {
    render(<SigilPreview mode="spare" intention="walk unseen" />);
    const svg = document.querySelector("[data-component='sigil-preview']");
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute("data-mode", "spare");
  });

  it("kamea mode renders a grid + traced polyline", () => {
    render(<SigilPreview mode="kamea" intention="x" square="saturn" />);
    const svg = document.querySelector("[data-component='sigil-preview']");
    // 3×3 Saturn → 2 inner vertical + 2 inner horizontal grid lines + the
    // bounding rect.
    const lines = svg!.querySelectorAll("line");
    expect(lines.length).toBe(4);
  });

  it("kamea custom-square cells override the planet lookup", () => {
    // A 4×4 custom square — should produce 3+3=6 inner grid lines.
    const customCells = [
      [16, 3, 2, 13],
      [5, 10, 11, 8],
      [9, 6, 7, 12],
      [4, 15, 14, 1],
    ];
    render(
      <SigilPreview
        mode="kamea"
        intention="x"
        square="saturn"
        customSquareCells={customCells}
      />,
    );
    const svg = document.querySelector("[data-component='sigil-preview']");
    const lines = svg!.querySelectorAll("line");
    expect(lines.length).toBe(6);
  });

  it("kamea empty custom-cells array falls back to planet lookup", () => {
    render(
      <SigilPreview
        mode="kamea"
        intention="x"
        square="saturn"
        customSquareCells={[]}
      />,
    );
    const svg = document.querySelector("[data-component='sigil-preview']");
    // Empty custom array → fall back to Saturn 3×3 → 4 inner lines.
    const lines = svg!.querySelectorAll("line");
    expect(lines.length).toBe(4);
  });

  it("kamea custom-cells with mismatched rows falls back to planet", () => {
    // 3 rows of length 4 ≠ 3 → invalid shape → planet fallback.
    const ragged = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
    ];
    render(
      <SigilPreview
        mode="kamea"
        intention="x"
        square="saturn"
        customSquareCells={ragged}
      />,
    );
    const svg = document.querySelector("[data-component='sigil-preview']");
    // 3×3 Saturn fallback → 4 inner lines.
    const lines = svg!.querySelectorAll("line");
    expect(lines.length).toBe(4);
  });

  it("kamea custom-cells produce a different sigil than the same planet seed", () => {
    // Render with Saturn alone, then with Saturn but custom cells —
    // the trace polyline `d` must differ.
    const { container: before } = render(
      <SigilPreview mode="kamea" intention="seed" square="saturn" />,
    );
    const beforePath =
      before
        .querySelector("[data-component='sigil-preview']")!
        .querySelector("path[stroke-width='2.6']")!
        .getAttribute("d") ?? "";
    const customCells = [
      [16, 3, 2, 13],
      [5, 10, 11, 8],
      [9, 6, 7, 12],
      [4, 15, 14, 1],
    ];
    const { container: after } = render(
      <SigilPreview
        mode="kamea"
        intention="seed"
        square="saturn"
        customSquareCells={customCells}
      />,
    );
    const afterPath =
      after
        .querySelector("[data-component='sigil-preview']")!
        .querySelector("path[stroke-width='2.6']")!
        .getAttribute("d") ?? "";
    expect(afterPath).not.toBe(beforePath);
    expect(afterPath.length).toBeGreaterThan(0);
  });

  it("operations transform the inner group without changing mode", () => {
    const { container } = render(
      <SigilPreview
        mode="spare"
        intention="x"
        operations={{ mirror: true, rotateDeg: 45, scalePercent: 400 }}
      />,
    );
    const inner = container.querySelector("svg > g");
    expect(inner?.getAttribute("transform")).toContain("rotate(45)");
    // Mirror flips X scale to negative.
    expect(inner?.getAttribute("transform")).toMatch(/scale\(-/);
  });

  it("changing intention produces a different path (deterministic seed)", () => {
    const { container, rerender } = render(
      <SigilPreview mode="spare" intention="A" />,
    );
    const before = container.innerHTML;
    rerender(<SigilPreview mode="spare" intention="B" />);
    expect(container.innerHTML).not.toBe(before);
  });
});

// ─── ConfigPanel ─────────────────────────────────────────────────

describe("ConfigPanel", () => {
  it("kamea config shows all 7 planetary tiles + gematria cipher pills", () => {
    render(
      <ConfigPanel
        mode="kamea"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    expect(
      document.querySelectorAll("[data-square]"),
    ).toHaveLength(7);
    expect(screen.getByText("Hebrew · Mispar")).toBeInTheDocument();
  });

  it("hashed config exposes 4 curve-family chips including Bézier", () => {
    render(
      <ConfigPanel
        mode="hashed"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    expect(
      document.querySelectorAll("[data-curve-family]"),
    ).toHaveLength(4);
    expect(screen.getByText("Bézier")).toBeInTheDocument();
  });

  it("formula config shows the verbatim whitelist help + default formula", () => {
    render(
      <ConfigPanel
        mode="formula"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    expect(
      document.querySelector("[data-formula-input]"),
    ).toHaveAttribute("value", FORMULA_DEFAULT);
    expect(screen.getByText(FORMULA_HELP)).toBeInTheDocument();
  });

  it("formula config surfaces a --warn error inline (never --danger)", () => {
    render(
      <ConfigPanel
        mode="formula"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
        formulaError="Unknown identifier: window"
      />,
    );
    const err = document.querySelector("[data-formula-error]");
    expect(err).toBeTruthy();
    const html = err!.outerHTML;
    expect(html).toContain("var(--warn");
    expect(html).not.toContain("--danger");
  });

  it("freeform config shows the canvas help text, no controls", () => {
    render(
      <ConfigPanel
        mode="freeform"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    expect(screen.getByText(/preview area is your canvas/i)).toBeInTheDocument();
  });

  it("hebrew/greek configs render the transliteration input with the right script default", () => {
    const { container, rerender } = render(
      <ConfigPanel
        mode="hebrew"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    const hInput = container.querySelector("input[type='text']");
    expect(hInput).toHaveAttribute("dir", "rtl");
    rerender(
      <ConfigPanel
        mode="greek"
        square="saturn"
        onSquareChange={() => {}}
        family="rose"
        onFamilyChange={() => {}}
      />,
    );
    const gInput = container.querySelector("input[type='text']");
    expect(gInput).toHaveAttribute("dir", "ltr");
  });
});

// ─── OperationsToolbar ───────────────────────────────────────────

describe("OperationsToolbar", () => {
  it("renders 7 recolor swatches", () => {
    render(
      <OperationsToolbar
        scale={320}
        rotate={0}
        color="var(--accent)"
        onScale={() => {}}
        onRotate={() => {}}
        onColor={() => {}}
        onMirror={() => {}}
      />,
    );
    expect(
      document.querySelectorAll("[data-swatch-index]"),
    ).toHaveLength(7);
  });

  it("mirror button fires onMirror", () => {
    const onMirror = vi.fn();
    render(
      <OperationsToolbar
        scale={320}
        rotate={0}
        color="var(--accent)"
        onScale={() => {}}
        onRotate={() => {}}
        onColor={() => {}}
        onMirror={onMirror}
      />,
    );
    fireEvent.click(screen.getByText(/Mirror/));
    expect(onMirror).toHaveBeenCalled();
  });
});

// ─── ExportMenu ──────────────────────────────────────────────────

describe("ExportMenu", () => {
  it("trigger toggles the menu open/closed", () => {
    const onToggle = vi.fn();
    render(<ExportMenu open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("when open, lists all 4 export formats in order", () => {
    render(<ExportMenu open onToggle={() => {}} />);
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("data-export-format"))).toEqual([
      "svg",
      "png",
      "pdf",
      "dxf",
    ]);
  });
});

// ─── CarriesPanel ────────────────────────────────────────────────

describe("CarriesPanel", () => {
  it("renders intention textarea with the supplied value", () => {
    render(
      <CarriesPanel
        intention={INTENTION_DEFAULT}
        onIntentionChange={() => {}}
        onSave={() => {}}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: /Intention/ }),
    ).toHaveValue(INTENTION_DEFAULT);
  });

  it("citation block appears only when citation prop is provided", () => {
    const { container, rerender } = render(
      <CarriesPanel
        intention="x"
        onIntentionChange={() => {}}
        onSave={() => {}}
      />,
    );
    expect(container.querySelector("[data-citation]")).toBeNull();
    rerender(
      <CarriesPanel
        intention="x"
        onIntentionChange={() => {}}
        onSave={() => {}}
        citation="Spare 1913"
      />,
    );
    expect(container.querySelector("[data-citation]")).toBeTruthy();
  });

  it("Charge & save button fires onSave", () => {
    const onSave = vi.fn();
    render(
      <CarriesPanel
        intention="x"
        onIntentionChange={() => {}}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText(/Charge & save/));
    expect(onSave).toHaveBeenCalled();
  });
});

// ─── ChargeSaveDialog ───────────────────────────────────────────

describe("ChargeSaveDialog", () => {
  it("does not render when closed", () => {
    render(<ChargeSaveDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the verbatim permanence promise", () => {
    render(<ChargeSaveDialog open onClose={() => {}} />);
    expect(screen.getByText(SAVE_DIALOG_PERMANENCE)).toBeInTheDocument();
  });

  it("commits with the picked purpose chip", () => {
    const onCommit = vi.fn();
    render(<ChargeSaveDialog open onCommit={onCommit} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Gift"));
    fireEvent.click(screen.getByRole("button", { name: /Charge & commit/ }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]![0].purpose).toBe("gift");
  });

  it("Cancel closes without committing", () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    render(
      <ChargeSaveDialog open onCommit={onCommit} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── SigilLibraryPanel ──────────────────────────────────────────

describe("SigilLibraryPanel", () => {
  it("renders 12 demo entries when no sigils prop is supplied", () => {
    render(<SigilLibraryPanel open onClose={() => {}} />);
    expect(
      document.querySelectorAll("[data-library-entry]"),
    ).toHaveLength(12);
  });

  it("renders the count + 'read-only' help text", () => {
    render(<SigilLibraryPanel open onClose={() => {}} />);
    expect(screen.getByText(/read-only/)).toBeInTheDocument();
    expect(screen.getByText(/Edit a new version/)).toBeInTheDocument();
  });

  it("clicking an entry fires onOpen", () => {
    const onOpen = vi.fn();
    render(
      <SigilLibraryPanel
        open
        onClose={() => {}}
        onOpen={onOpen}
        sigils={[{ id: "abc", title: "Unseen Walk" }]}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-library-entry='abc']") as Element,
    );
    expect(onOpen).toHaveBeenCalledWith("abc");
  });
});

// ─── OwnedDeckOverlay ───────────────────────────────────────────

describe("OwnedDeckOverlay", () => {
  it("renders the verbatim --warn copy in a --warn box", () => {
    render(<OwnedDeckOverlay open onClose={() => {}} />);
    expect(screen.getByText(OWNED_DECK_WARN)).toBeInTheDocument();
    const box = document.querySelector("[data-warn]");
    const html = box!.outerHTML;
    expect(html).toContain("var(--warn");
    expect(html).not.toContain("--danger");
  });

  it("ownership checkbox is checkable", () => {
    render(<OwnedDeckOverlay open onClose={() => {}} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toHaveAttribute("aria-checked", "true");
    fireEvent.click(cb);
    expect(cb).toHaveAttribute("aria-checked", "false");
  });

  it("Cancel closes without invoking onConfirm", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <OwnedDeckOverlay open onClose={onClose} onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ─── SigilGeneratorSurface ──────────────────────────────────────

describe("SigilGeneratorSurface", () => {
  it("defaults to the spare mode with the default intention", () => {
    render(<SigilGeneratorSurface />);
    const surface = document.querySelector(
      "[data-component='sigil-generator-surface']",
    );
    expect(surface).toHaveAttribute("data-mode", "spare");
  });

  it("switching modes via the rail flips the surface data-mode", () => {
    render(<SigilGeneratorSurface />);
    fireEvent.click(screen.getByText("Kamea pathing"));
    expect(
      document.querySelector("[data-component='sigil-generator-surface']"),
    ).toHaveAttribute("data-mode", "kamea");
  });

  it("kamea citation surfaces in the right rail", () => {
    render(<SigilGeneratorSurface initialMode="kamea" />);
    expect(
      document.querySelector("[data-citation]"),
    ).toBeTruthy();
    expect(screen.getByText(/Agrippa/)).toBeInTheDocument();
  });

  it("freeform mode has no citation block (custom artefact)", () => {
    render(<SigilGeneratorSurface initialMode="freeform" />);
    expect(document.querySelector("[data-citation]")).toBeNull();
  });

  it("Charge & save opens the dialog with permanence promise", () => {
    render(<SigilGeneratorSurface />);
    fireEvent.click(screen.getByText(/Charge & save/));
    expect(screen.getByText(SAVE_DIALOG_PERMANENCE)).toBeInTheDocument();
  });

  it("save fires onSave with the picked mode + intention", () => {
    const onSave = vi.fn();
    render(<SigilGeneratorSurface initialMode="kamea" onSave={onSave} />);
    fireEvent.click(screen.getByText(/Charge & save/));
    fireEvent.click(screen.getByRole("button", { name: /Charge & commit/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].mode).toBe("kamea");
    expect(onSave.mock.calls[0]![0].intention).toBe(INTENTION_DEFAULT);
  });

  it("topbar Library button opens the library panel", () => {
    render(<SigilGeneratorSurface />);
    fireEvent.click(screen.getByLabelText("Sigil library"));
    expect(screen.getByRole("dialog", { name: /Sigil library/i })).toBeInTheDocument();
  });

  it("Owned-deck button opens the deck overlay", () => {
    render(<SigilGeneratorSurface />);
    fireEvent.click(screen.getByLabelText("Owned-deck overlay"));
    expect(
      screen.getByRole("dialog", { name: /Owned-deck overlay/i }),
    ).toBeInTheDocument();
  });

  it("uses zero --danger in the rendered surface", () => {
    const { container } = render(<SigilGeneratorSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
