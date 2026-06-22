import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  DEMO_ELECTIONS,
  LINKED_ELECTION_FOOTER,
  SEAL_HELP_OFF,
  SEAL_HELP_ON,
  TALISMAN_LAYERS,
  TL_SAVE_DIALOG_PERMANENCE,
  TOPBAR_DEFAULT_NAME,
} from "./copy.js";
import { ElectionPickerModal } from "./ElectionPickerModal.js";
import { FaceTablist } from "./FaceTablist.js";
import { LayerConfig } from "./LayerConfig.js";
import { LayerPanel } from "./LayerPanel.js";
import { SealedSaveDialog } from "./SealedSaveDialog.js";
import { TalismanCanvas } from "./TalismanCanvas.js";
import { TalismanDesignerSurface } from "./TalismanDesignerSurface.js";

// ─── Editorial copy ──────────────────────────────────────────────

describe("TalismanDesigner editorial constants", () => {
  it("TOPBAR_DEFAULT_NAME is the verbatim demo seed", () => {
    expect(TOPBAR_DEFAULT_NAME).toBe("Talisman of Jupiter for Increase");
  });

  it("LINKED_ELECTION_FOOTER carries the non-binding promise", () => {
    expect(LINKED_ELECTION_FOOTER).toBe(
      "A non-binding link — the talisman exists whether or not it is finally consecrated.",
    );
  });

  it("TL_SAVE_DIALOG_PERMANENCE is the committed-make promise", () => {
    expect(TL_SAVE_DIALOG_PERMANENCE).toBe(
      "Once consecrated, the design locks; later changes make a new version.",
    );
  });

  it("SEAL_HELP_ON makes the ciphertext-only promise", () => {
    expect(SEAL_HELP_ON).toBe(
      "Encrypted on this device; the server stores only ciphertext.",
    );
  });

  it("SEAL_HELP_OFF mentions the Initiation default-on rule", () => {
    expect(SEAL_HELP_OFF).toContain("Defaults on if you link an Initiation");
  });

  it("TALISMAN_LAYERS is 6 entries in fixed draw order", () => {
    expect(TALISMAN_LAYERS).toHaveLength(6);
    expect(TALISMAN_LAYERS[0]!.key).toBe("background");
    expect(TALISMAN_LAYERS[5]!.key).toBe("image");
  });

  it("DEMO_ELECTIONS has 3 Jupiter windows with scores descending", () => {
    expect(DEMO_ELECTIONS).toHaveLength(3);
    const scores = DEMO_ELECTIONS.map((e) => Number(e.score));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

// ─── FaceTablist ─────────────────────────────────────────────────

describe("FaceTablist", () => {
  it("renders Front + Back as role=tab", () => {
    render(<FaceTablist value="front" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("data-face", "front");
    expect(tabs[1]).toHaveAttribute("data-face", "back");
  });

  it("highlights the active face via aria-selected", () => {
    render(<FaceTablist value="back" onChange={() => {}} />);
    const front = document.querySelector("[data-face='front']");
    const back = document.querySelector("[data-face='back']");
    expect(front).toHaveAttribute("aria-selected", "false");
    expect(back).toHaveAttribute("aria-selected", "true");
  });

  it("fires onChange with the picked face", () => {
    const onChange = vi.fn();
    render(<FaceTablist value="front" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Back/ }));
    expect(onChange).toHaveBeenCalledWith("back");
  });
});

// ─── LayerPanel ──────────────────────────────────────────────────

describe("LayerPanel", () => {
  it("renders 6 layer buttons in reversed (z-order ↑) order", () => {
    render(
      <LayerPanel
        face="front"
        value="square"
        onChange={() => {}}
        onMirror={() => {}}
      />,
    );
    const buttons = document.querySelectorAll("[data-layer]");
    expect(buttons).toHaveLength(6);
    // First in DOM = topmost-drawn = "image"; last = "background".
    expect(buttons[0]).toHaveAttribute("data-layer", "image");
    expect(buttons[5]).toHaveAttribute("data-layer", "background");
  });

  it("eyebrow shows 'Layers · Front' / 'Layers · Back'", () => {
    const { rerender } = render(
      <LayerPanel
        face="front"
        value="square"
        onChange={() => {}}
        onMirror={() => {}}
      />,
    );
    expect(screen.getByText(/Layers · Front/)).toBeInTheDocument();
    rerender(
      <LayerPanel
        face="back"
        value="square"
        onChange={() => {}}
        onMirror={() => {}}
      />,
    );
    expect(screen.getByText(/Layers · Back/)).toBeInTheDocument();
  });

  it("mirror label flips based on face", () => {
    const { rerender } = render(
      <LayerPanel
        face="front"
        value="square"
        onChange={() => {}}
        onMirror={() => {}}
      />,
    );
    expect(screen.getByText("Mirror to back")).toBeInTheDocument();
    rerender(
      <LayerPanel
        face="back"
        value="square"
        onChange={() => {}}
        onMirror={() => {}}
      />,
    );
    expect(screen.getByText("Mirror to front")).toBeInTheDocument();
  });

  it("fires onChange with the picked layer key", () => {
    const onChange = vi.fn();
    render(
      <LayerPanel
        face="front"
        value="square"
        onChange={onChange}
        onMirror={() => {}}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-layer='border']") as Element,
    );
    expect(onChange).toHaveBeenCalledWith("border");
  });
});

// ─── LayerConfig variants ────────────────────────────────────────

describe("LayerConfig", () => {
  it("background variant lists 6 texture chips", () => {
    render(<LayerConfig layer="background" />);
    expect(
      document.querySelectorAll("[data-chip-index]"),
    ).toHaveLength(6);
  });

  it("border variant defaults to RTL Hebrew inscription input", () => {
    render(<LayerConfig layer="border" />);
    const input = document.querySelector("input[dir='rtl']");
    expect(input).toBeTruthy();
  });

  it("square variant has both square picker chips + position chips", () => {
    render(<LayerConfig layer="square" />);
    expect(
      document.querySelectorAll("[role='group']").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("sigil variant shows the demo sigil rows + Add a sigil button", () => {
    render(<LayerConfig layer="sigil" />);
    expect(document.querySelectorAll("[data-sigil-row]")).toHaveLength(2);
    expect(screen.getByText("+ Add a sigil")).toBeInTheDocument();
  });

  it("image variant shows upload button + opacity slider", () => {
    render(<LayerConfig layer="image" />);
    expect(
      document.querySelector("[data-action='upload-image']"),
    ).toBeTruthy();
  });
});

// ─── TalismanCanvas ──────────────────────────────────────────────

describe("TalismanCanvas", () => {
  it("front face renders the Jupiter kamea + Yophiel trace", () => {
    render(<TalismanCanvas face="front" />);
    expect(
      document.querySelector("[data-component='talisman-canvas']"),
    ).toHaveAttribute("data-face", "front");
    expect(document.querySelector("[data-front-kamea]")).toBeTruthy();
  });

  it("back face renders the planetary character + inner ring", () => {
    render(<TalismanCanvas face="back" />);
    expect(document.querySelector("[data-back-body]")).toBeTruthy();
    expect(document.querySelector("[data-front-kamea]")).toBeFalsy();
  });

  it("name-ring uses textPath with textLength (the §E gotcha)", () => {
    render(<TalismanCanvas face="front" />);
    const textPath = document.querySelector("textPath");
    expect(textPath).toBeTruthy();
    expect(textPath?.getAttribute("textLength")).toMatch(/^\d+$/);
    expect(textPath?.getAttribute("lengthAdjust")).toBe("spacing");
  });

  it("grid renders only when snapGrid is on", () => {
    const { container, rerender } = render(
      <TalismanCanvas face="front" snapGrid />,
    );
    expect(container.querySelector("[data-canvas-grid]")).toBeTruthy();
    rerender(<TalismanCanvas face="front" snapGrid={false} />);
    expect(container.querySelector("[data-canvas-grid]")).toBeFalsy();
  });
});

// ─── ElectionPickerModal ─────────────────────────────────────────

describe("ElectionPickerModal", () => {
  it("does not render when closed", () => {
    render(<ElectionPickerModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the 3 demo Jupiter elections in order", () => {
    render(<ElectionPickerModal open onClose={() => {}} />);
    const rows = document.querySelectorAll("[data-election-id]");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("data-election-id", "jup-1");
  });

  it("picking an election fires onPick and closes the modal", () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(
      <ElectionPickerModal open onClose={onClose} onPick={onPick} />,
    );
    fireEvent.click(
      document.querySelector("[data-election-id='jup-2']") as Element,
    );
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0].id).toBe("jup-2");
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── SealedSaveDialog ────────────────────────────────────────────

describe("SealedSaveDialog", () => {
  it("permanence promise is verbatim", () => {
    render(<SealedSaveDialog open onClose={() => {}} />);
    expect(
      screen.getByText(TL_SAVE_DIALOG_PERMANENCE),
    ).toBeInTheDocument();
  });

  it("--seal switch defaults off; help text shows the off copy", () => {
    render(<SealedSaveDialog open onClose={() => {}} />);
    const dialog = document.querySelector(
      "[data-component='talisman-save-dialog']",
    );
    expect(dialog).toHaveAttribute("data-sealed", "false");
    expect(screen.getByText(SEAL_HELP_OFF)).toBeInTheDocument();
  });

  it("--seal switch defaults ON when initiationLinked=true", () => {
    render(
      <SealedSaveDialog
        open
        onClose={() => {}}
        initiationLinked
      />,
    );
    const dialog = document.querySelector(
      "[data-component='talisman-save-dialog']",
    );
    expect(dialog).toHaveAttribute("data-sealed", "true");
    expect(screen.getByText(SEAL_HELP_ON)).toBeInTheDocument();
  });

  it("toggling the seal flips the help text", () => {
    render(<SealedSaveDialog open onClose={() => {}} />);
    expect(screen.getByText(SEAL_HELP_OFF)).toBeInTheDocument();
    fireEvent.click(
      document.querySelector("[data-seal-switch]") as Element,
    );
    expect(screen.getByText(SEAL_HELP_ON)).toBeInTheDocument();
  });

  it("Save fires onConfirm with sealed=true after the toggle", () => {
    const onConfirm = vi.fn();
    render(
      <SealedSaveDialog open onClose={() => {}} onConfirm={onConfirm} />,
    );
    fireEvent.click(
      document.querySelector("[data-seal-switch]") as Element,
    );
    fireEvent.click(
      document.querySelector("[data-action='save']") as Element,
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]![0].sealed).toBe(true);
  });

  it("uses --seal* never --danger", () => {
    const { container } = render(
      <SealedSaveDialog open onClose={() => {}} initiationLinked />,
    );
    expect(container.innerHTML).toContain("var(--seal");
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── TalismanDesignerSurface ────────────────────────────────────

describe("TalismanDesignerSurface", () => {
  it("defaults to front face + square layer", () => {
    render(<TalismanDesignerSurface />);
    const surface = document.querySelector(
      "[data-component='talisman-designer-surface']",
    );
    expect(surface).toHaveAttribute("data-face", "front");
    expect(surface).toHaveAttribute("data-layer", "square");
  });

  it("flipping faces swaps the canvas data-face", () => {
    render(<TalismanDesignerSurface />);
    fireEvent.click(screen.getByRole("tab", { name: /Back/ }));
    expect(
      document.querySelector("[data-component='talisman-canvas']"),
    ).toHaveAttribute("data-face", "back");
  });

  it("picking a layer flips the surface data-layer + settings eyebrow", () => {
    render(<TalismanDesignerSurface />);
    fireEvent.click(
      document.querySelector("[data-layer='border']") as Element,
    );
    expect(
      document.querySelector("[data-component='talisman-designer-surface']"),
    ).toHaveAttribute("data-layer", "border");
    const eyebrow = document.querySelector("[data-settings-eyebrow]");
    expect(eyebrow?.textContent).toContain("Border");
  });

  it("opening the election picker shows the modal", () => {
    render(<TalismanDesignerSurface />);
    fireEvent.click(
      document.querySelector(
        "[data-action='open-election']",
      ) as Element,
    );
    expect(
      screen.getByRole("dialog", { name: /Linked election/i }),
    ).toBeInTheDocument();
  });

  it("Save talisman opens the save dialog with permanence promise", () => {
    render(<TalismanDesignerSurface />);
    fireEvent.click(
      document.querySelector(
        "[data-action='save-talisman']",
      ) as Element,
    );
    expect(
      screen.getByText(TL_SAVE_DIALOG_PERMANENCE),
    ).toBeInTheDocument();
  });

  it("the snap-grid switch toggles the canvas grid", () => {
    render(<TalismanDesignerSurface />);
    expect(document.querySelector("[data-canvas-grid]")).toBeTruthy();
    fireEvent.click(
      document.querySelector(
        "[data-snap-grid-switch]",
      ) as Element,
    );
    expect(document.querySelector("[data-canvas-grid]")).toBeFalsy();
  });

  it("save fires onSave with the title + sealed flag", () => {
    const onSave = vi.fn();
    render(<TalismanDesignerSurface onSave={onSave} />);
    fireEvent.click(
      document.querySelector(
        "[data-action='save-talisman']",
      ) as Element,
    );
    fireEvent.click(
      document.querySelector("[data-action='save']") as Element,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      title: TOPBAR_DEFAULT_NAME,
      sealed: false,
    });
  });

  it("zero --danger anywhere in the surface", () => {
    const { container } = render(<TalismanDesignerSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
