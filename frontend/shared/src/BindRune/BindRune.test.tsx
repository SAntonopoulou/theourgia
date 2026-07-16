import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { BindRuneDesignerSurface } from "./BindRuneDesignerSurface.js";
import {
  BR_CANVAS_EMPTY_LABEL,
  BR_COMPOSITION_EMPTY,
  BR_DOWNLOAD_FILENAME,
  BR_DOWNLOAD_SVG,
  BR_METHOD_NOTE,
  BR_RUNE_FONT_STACK,
  BR_TOPBAR_TITLE,
  bindRuneCanvasLabel,
} from "./copy.js";
import type { BindRuneSetDetail, BindRuneSetSummary } from "./types.js";

// ─── Fixtures ────────────────────────────────────────────────────

const SETS: BindRuneSetSummary[] = [
  {
    set_id: "elder_futhark",
    name: "Elder Futhark",
    description: "The 24-rune Proto-Germanic alphabet.",
    size: 24,
  },
  {
    set_id: "northumbrian",
    name: "Northumbrian Futhorc",
    description: "The Futhorc row as used in 9th-10th c. Northumbria.",
    size: 33,
  },
];

const ELDER: BindRuneSetDetail = {
  ...SETS[0]!,
  runes: [
    { index: 0, name: "Fehu", transliteration: "F", glyph: "ᚠ" },
    { index: 1, name: "Uruz", transliteration: "U", glyph: "ᚢ" },
  ],
};

const NORTHUMBRIAN: BindRuneSetDetail = {
  ...SETS[1]!,
  runes: [{ index: 32, name: "Gar", transliteration: "G", glyph: "ᚸ" }],
};

function makeLoaders() {
  return {
    loadRuneSets: vi.fn(async () => SETS),
    loadRuneSet: vi.fn(async (setId: string) => (setId === "northumbrian" ? NORTHUMBRIAN : ELDER)),
  };
}

async function renderSurface() {
  const loaders = makeLoaders();
  const view = render(<BindRuneDesignerSurface {...loaders} />);
  // First set hydrates on mount.
  await screen.findByText("Fehu");
  return { ...view, ...loaders };
}

function addRune(name: string) {
  fireEvent.click(document.querySelector(`[data-rune-name='${name}']`) as Element);
}

// jsdom has no URL.createObjectURL; stub it and neuter anchor
// navigation so the download path is observable.
const createObjectURL = vi.fn((_blob: Blob) => "blob:bind-rune");
const revokeObjectURL = vi.fn();
beforeAll(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

// ─── Editorial copy ──────────────────────────────────────────────

describe("BindRune editorial constants", () => {
  it("BR_TOPBAR_TITLE is 'Bind-Rune Designer'", () => {
    expect(BR_TOPBAR_TITLE).toBe("Bind-Rune Designer");
  });

  it("bindRuneCanvasLabel describes the composition", () => {
    expect(bindRuneCanvasLabel([])).toBe(BR_CANVAS_EMPTY_LABEL);
    expect(bindRuneCanvasLabel(["Fehu"])).toBe("Bind-rune composition of 1 rune: Fehu.");
    expect(bindRuneCanvasLabel(["Fehu", "Gar"])).toBe(
      "Bind-rune composition of 2 runes: Fehu, Gar.",
    );
  });
});

// ─── Rune picker ─────────────────────────────────────────────────

describe("BindRuneDesignerSurface rune picker", () => {
  it("renders the rune-set select and first set's runes from the loaders", async () => {
    const { loadRuneSets, loadRuneSet } = await renderSurface();
    expect(loadRuneSets).toHaveBeenCalledTimes(1);
    expect(loadRuneSet).toHaveBeenCalledWith("elder_futhark");
    const options = Array.from(document.querySelectorAll("[data-set-select] option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Elder Futhark", "Northumbrian Futhorc"]);
    expect(document.querySelector("[data-rune-name='Fehu']")).toBeTruthy();
    expect(document.querySelector("[data-rune-name='Uruz']")).toBeTruthy();
  });

  it("switching the rune row fetches and shows that set's runes", async () => {
    const { loadRuneSet } = await renderSurface();
    fireEvent.change(document.querySelector("[data-set-select]") as Element, {
      target: { value: "northumbrian" },
    });
    await screen.findByText("Gar");
    expect(loadRuneSet).toHaveBeenCalledWith("northumbrian");
    expect(document.querySelector("[data-rune-name='Fehu']")).toBeFalsy();
  });
});

// ─── Composition ─────────────────────────────────────────────────

describe("BindRuneDesignerSurface composition", () => {
  it("starts empty with the empty-state copy and an honest canvas label", async () => {
    await renderSurface();
    expect(screen.getByText(BR_COMPOSITION_EMPTY)).toBeInTheDocument();
    expect(document.querySelector("[data-bindrune-canvas]")).toHaveAttribute(
      "aria-label",
      BR_CANVAS_EMPTY_LABEL,
    );
    expect(screen.getByText(BR_METHOD_NOTE)).toBeInTheDocument();
  });

  it("clicking a rune adds a layer; remove takes it away again", async () => {
    await renderSurface();
    addRune("Fehu");
    addRune("Uruz");
    expect(document.querySelectorAll("[data-layer-row]")).toHaveLength(2);
    expect(document.querySelectorAll("[data-layer-glyph]")).toHaveLength(2);
    expect(document.querySelector("[data-bindrune-canvas]")).toHaveAttribute(
      "aria-label",
      bindRuneCanvasLabel(["Fehu", "Uruz"]),
    );
    fireEvent.click(screen.getByLabelText("Remove Fehu"));
    expect(document.querySelectorAll("[data-layer-row]")).toHaveLength(1);
    expect(document.querySelector("[data-bindrune-canvas]")).toHaveAttribute(
      "aria-label",
      bindRuneCanvasLabel(["Uruz"]),
    );
  });

  it("the same rune can be layered twice", async () => {
    await renderSurface();
    addRune("Fehu");
    addRune("Fehu");
    expect(document.querySelectorAll("[data-layer-glyph]")).toHaveLength(2);
  });

  it("the rotate control cycles the layer's transform by quarter turns", async () => {
    await renderSurface();
    addRune("Fehu");
    const glyph = () => document.querySelector("[data-layer-glyph]") as Element;
    expect(glyph().getAttribute("transform")).toBeNull();
    const rotate = screen.getByLabelText("Rotate Fehu");
    fireEvent.click(rotate);
    expect(glyph().getAttribute("transform")).toContain("rotate(90 210 210)");
    fireEvent.click(rotate);
    expect(glyph().getAttribute("transform")).toContain("rotate(180 210 210)");
    fireEvent.click(rotate);
    fireEvent.click(rotate);
    expect(glyph().getAttribute("transform")).toBeNull();
  });

  it("the mirror toggle flips the layer across the central stave", async () => {
    await renderSurface();
    addRune("Fehu");
    const mirror = screen.getByLabelText("Mirror Fehu");
    fireEvent.click(mirror);
    expect(mirror).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector("[data-layer-glyph]")?.getAttribute("transform")).toContain(
      "translate(420 0) scale(-1 1)",
    );
  });

  it("the scale slider drives the glyph's font size", async () => {
    await renderSurface();
    addRune("Fehu");
    fireEvent.change(screen.getByLabelText("Scale Fehu"), {
      target: { value: "0.5" },
    });
    expect(document.querySelector("[data-layer-glyph]")?.getAttribute("font-size")).toBe("115");
  });

  it("the opacity slider drives the layer's opacity", async () => {
    await renderSurface();
    addRune("Fehu");
    fireEvent.change(screen.getByLabelText("Opacity Fehu"), {
      target: { value: "0.4" },
    });
    expect(document.querySelector("[data-layer-glyph]")?.getAttribute("opacity")).toBe("0.4");
  });

  it("the stave toggle shows and hides the central stave line", async () => {
    await renderSurface();
    expect(document.querySelector("[data-stave]")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-action='toggle-stave']") as Element);
    expect(document.querySelector("[data-stave]")).toBeFalsy();
  });

  it("stroke options are token-driven and switch the active choice", async () => {
    await renderSurface();
    const gold = document.querySelector("[data-stroke-option='gold']") as Element;
    expect(gold).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(gold);
    expect(gold).toHaveAttribute("aria-pressed", "true");
  });

  it("uses zero --danger anywhere", async () => {
    const { container } = await renderSurface();
    addRune("Fehu");
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── SVG export ──────────────────────────────────────────────────

describe("BindRuneDesignerSurface SVG export", () => {
  it("Download SVG serializes the canvas to a blob URL with resolved tokens", async () => {
    await renderSurface();
    addRune("Fehu");
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    fireEvent.click(screen.getByText(BR_DOWNLOAD_SVG));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("image/svg+xml");
    const markup = await blob.text();
    expect(markup).toContain("<svg");
    expect(markup).toContain("ᚠ");
    expect(markup).toContain("data-stave");
    // Tokens must be resolved to literals — the exported file
    // renders outside the app's token layer.
    expect(markup).toContain(BR_RUNE_FONT_STACK.replace(/"/g, "&quot;"));
    expect(markup).not.toContain("var(--");
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:bind-rune"));
  });

  it("names the download bind-rune.svg", async () => {
    await renderSurface();
    addRune("Fehu");
    const appendSpy = vi.spyOn(document.body, "appendChild");
    fireEvent.click(screen.getByText(BR_DOWNLOAD_SVG));
    const anchor = appendSpy.mock.calls
      .map((c) => c[0])
      .find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement);
    expect(anchor?.download).toBe(BR_DOWNLOAD_FILENAME);
    appendSpy.mockRestore();
  });
});
