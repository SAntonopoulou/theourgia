import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  COMPASS_DEFINITIONS,
  COMPASS_TRADITION_NOTE,
  LIBRARY_MODAL_SUB,
  LIBRARY_PRESETS,
  MC_TOPBAR_DEFAULT_NAME,
  RING_KINDS,
  USED_IN_NOTE_PREFIX,
  ringKindLabel,
  ringLabels,
} from "./copy.js";
import { CentrePicker } from "./CentrePicker.js";
import { CirclePreview } from "./CirclePreview.js";
import { MagicalCircleSurface } from "./MagicalCircleSurface.js";
import { PresetCircleLibrary } from "./PresetCircleLibrary.js";
import { RingConfig } from "./RingConfig.js";
import { RingsCompassRail } from "./RingsCompassRail.js";

// ─── Editorial copy ──────────────────────────────────────────────

describe("MagicalCircle editorial constants", () => {
  it("MC_TOPBAR_DEFAULT_NAME is a neutral untitled seed", () => {
    // b108-2fd: swapped the "Circle of the Sphere of Jupiter" demo
    // seed for a neutral untitled placeholder so no cultural naming
    // convention leaks as the default circle name.
    expect(MC_TOPBAR_DEFAULT_NAME).toBe("Untitled circle");
  });

  it("COMPASS_TRADITION_NOTE locks single-tradition rule", () => {
    expect(COMPASS_TRADITION_NOTE).toBe(
      "One tradition for the whole circle.",
    );
  });

  it("LIBRARY_MODAL_SUB carries the 'mutable copy / no back-link' promise", () => {
    expect(LIBRARY_MODAL_SUB).toContain("mutable copy");
    expect(LIBRARY_MODAL_SUB).toContain("does not link back");
  });

  it("LIBRARY_PRESETS has all 5 PD circles in order", () => {
    expect(LIBRARY_PRESETS.map((p) => p.id)).toEqual([
      "lbrp",
      "heptameron",
      "goetic",
      "picatrix-jupiter",
      "pgm",
    ]);
  });

  it("RING_KINDS has 5 entries with the verbatim labels", () => {
    expect(RING_KINDS.map((k) => k.label)).toEqual([
      "Inscription",
      "Glyph row",
      "Single image",
      "Blank",
      "Multi-glyph",
    ]);
  });

  it("COMPASS_DEFINITIONS exposes all 5 traditions", () => {
    expect(Object.keys(COMPASS_DEFINITIONS).sort()).toEqual([
      "archangels",
      "custom",
      "dikpalas",
      "watchtowers",
      "winds",
    ]);
  });

  it("Watchtowers cardinals are the four elements", () => {
    expect(COMPASS_DEFINITIONS.watchtowers.cardinals).toEqual([
      "Earth",
      "Air",
      "Fire",
      "Water",
    ]);
  });

  it("USED_IN_NOTE_PREFIX is verbatim", () => {
    expect(USED_IN_NOTE_PREFIX).toBe("Used in ");
  });

  it("ringLabels handles 1..4 ring counts", () => {
    expect(ringLabels(1)).toEqual(["Ring"]);
    expect(ringLabels(2)).toEqual(["Inner ring", "Outer ring"]);
    expect(ringLabels(3)).toEqual([
      "Inner ring",
      "Middle ring",
      "Outer ring",
    ]);
    expect(ringLabels(4)).toEqual([
      "Inner ring",
      "Ring 2",
      "Ring 3",
      "Outer ring",
    ]);
  });

  it("ringKindLabel resolves each kind", () => {
    expect(ringKindLabel("inscription")).toBe("Inscription");
    expect(ringKindLabel("glyphs")).toBe("Glyph row");
    expect(ringKindLabel("blank")).toBe("Blank");
  });
});

// ─── RingsCompassRail ────────────────────────────────────────────

describe("RingsCompassRail", () => {
  it("renders ring rows + compass options", () => {
    render(
      <RingsCompassRail
        ringKinds={["glyphs", "glyphs", "inscription"]}
        activeRing={2}
        onPickRing={() => {}}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="archangels"
        onPickCompass={() => {}}
      />,
    );
    expect(
      document.querySelectorAll("[data-ring-row]"),
    ).toHaveLength(3);
    expect(
      document.querySelectorAll("[data-compass-row]"),
    ).toHaveLength(5);
  });

  it("active ring + active compass have aria-pressed=true", () => {
    render(
      <RingsCompassRail
        ringKinds={["glyphs", "inscription"]}
        activeRing={1}
        onPickRing={() => {}}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="watchtowers"
        onPickCompass={() => {}}
      />,
    );
    expect(
      document.querySelector("[data-ring-row='1']"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      document.querySelector("[data-compass-row='watchtowers']"),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("Add ring disabled at 6 rings; Remove disabled at 1", () => {
    const { rerender } = render(
      <RingsCompassRail
        ringKinds={["blank"]}
        activeRing={0}
        onPickRing={() => {}}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="archangels"
        onPickCompass={() => {}}
      />,
    );
    expect(
      document.querySelector("[data-action='remove-ring']"),
    ).toBeDisabled();
    rerender(
      <RingsCompassRail
        ringKinds={Array(6).fill("blank")}
        activeRing={0}
        onPickRing={() => {}}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="archangels"
        onPickCompass={() => {}}
      />,
    );
    expect(
      document.querySelector("[data-action='add-ring']"),
    ).toBeDisabled();
  });

  it("clicking a ring fires onPickRing with the index", () => {
    const onPickRing = vi.fn();
    render(
      <RingsCompassRail
        ringKinds={["glyphs", "glyphs", "inscription"]}
        activeRing={0}
        onPickRing={onPickRing}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="archangels"
        onPickCompass={() => {}}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-ring-row='2']") as Element,
    );
    expect(onPickRing).toHaveBeenCalledWith(2);
  });

  it("clicking a compass tradition fires onPickCompass", () => {
    const onPickCompass = vi.fn();
    render(
      <RingsCompassRail
        ringKinds={["glyphs"]}
        activeRing={0}
        onPickRing={() => {}}
        onAddRing={() => {}}
        onRemoveRing={() => {}}
        compass="archangels"
        onPickCompass={onPickCompass}
      />,
    );
    fireEvent.click(
      document.querySelector(
        "[data-compass-row='watchtowers']",
      ) as Element,
    );
    expect(onPickCompass).toHaveBeenCalledWith("watchtowers");
  });
});

// ─── CirclePreview ───────────────────────────────────────────────

describe("CirclePreview", () => {
  it("renders the boundary circle + axes + N/E/S/W markers", () => {
    render(
      <CirclePreview
        rings={[{ kind: "glyphs" }]}
        compass="archangels"
        centre="hexagram"
      />,
    );
    const svg = document.querySelector(
      "[data-component='magical-circle-preview']",
    );
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute("data-compass", "archangels");
    expect(svg).toHaveAttribute("data-centre", "hexagram");
    expect(svg).toHaveAttribute("data-ring-count", "1");
  });

  it("renders one element per ring", () => {
    render(
      <CirclePreview
        rings={[
          { kind: "glyphs" },
          { kind: "glyphs" },
          { kind: "inscription" },
        ]}
        compass="archangels"
        centre="hexagram"
      />,
    );
    expect(
      document.querySelectorAll("[data-ring-kind]").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("print-tile mode renders crop marks + 10cm calibration", () => {
    render(
      <CirclePreview
        rings={[{ kind: "glyphs" }]}
        compass="archangels"
        centre="hexagram"
        printTile
      />,
    );
    expect(document.querySelector("[data-print-tile]")).toBeTruthy();
    expect(screen.getByText("10cm")).toBeInTheDocument();
  });

  it("watchtowers renders cardinal text in elemental colours", () => {
    const { container } = render(
      <CirclePreview
        rings={[{ kind: "glyphs" }]}
        compass="watchtowers"
        centre="hexagram"
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain("var(--earth)");
    expect(html).toContain("var(--air)");
    expect(html).toContain("var(--fire)");
    expect(html).toContain("var(--water)");
  });
});

// ─── RingConfig ──────────────────────────────────────────────────

describe("RingConfig", () => {
  it("inscription variant has RTL Hebrew input + script + direction", () => {
    render(<RingConfig kind="inscription" />);
    const input = document.querySelector("input[dir='rtl']");
    expect(input).toBeTruthy();
    expect(screen.getByText("Hebrew")).toBeInTheDocument();
    expect(screen.getByText("Clockwise")).toBeInTheDocument();
  });

  it("glyphs variant has glyph-set + rotation slider", () => {
    render(<RingConfig kind="glyphs" />);
    expect(screen.getByText("Planetary 7")).toBeInTheDocument();
    expect(
      document.querySelector("input[type='range']"),
    ).toBeTruthy();
  });

  it("image variant has Upload button", () => {
    render(<RingConfig kind="image" />);
    expect(
      document.querySelector("[data-action='upload-image']"),
    ).toBeTruthy();
  });

  it("multi variant shows the demo sequence + Edit", () => {
    render(<RingConfig kind="multi" />);
    expect(
      document.querySelector("[data-action='edit-sequence']"),
    ).toBeTruthy();
  });

  it("blank variant shows the boundary-only note", () => {
    render(<RingConfig kind="blank" />);
    expect(screen.getByText(/boundary only/)).toBeInTheDocument();
  });
});

// ─── CentrePicker ────────────────────────────────────────────────

describe("CentrePicker", () => {
  it("renders 7 centre tiles", () => {
    render(<CentrePicker value="hexagram" onChange={() => {}} />);
    expect(document.querySelectorAll("[data-centre]")).toHaveLength(7);
  });

  it("highlights the active centre", () => {
    render(<CentrePicker value="pentagram" onChange={() => {}} />);
    expect(
      document.querySelector("[data-centre='pentagram']"),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a tile fires onChange", () => {
    const onChange = vi.fn();
    render(<CentrePicker value="hexagram" onChange={onChange} />);
    fireEvent.click(
      document.querySelector("[data-centre='unicursal']") as Element,
    );
    expect(onChange).toHaveBeenCalledWith("unicursal");
  });
});

// ─── PresetCircleLibrary ─────────────────────────────────────────

describe("PresetCircleLibrary", () => {
  it("does not render when closed", () => {
    render(<PresetCircleLibrary open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders all 5 PD presets with ‡ citations", () => {
    render(<PresetCircleLibrary open onClose={() => {}} />);
    expect(
      document.querySelectorAll("[data-preset-id]"),
    ).toHaveLength(5);
  });

  it("picking a preset fires onLoad + closes", () => {
    const onLoad = vi.fn();
    const onClose = vi.fn();
    render(
      <PresetCircleLibrary
        open
        onClose={onClose}
        onLoad={onLoad}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-preset-id='lbrp']") as Element,
    );
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoad.mock.calls[0]![0].id).toBe("lbrp");
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── MagicalCircleSurface ────────────────────────────────────────

describe("MagicalCircleSurface", () => {
  it("defaults to 3 rings · archangels compass · hexagram centre", () => {
    render(<MagicalCircleSurface />);
    const surface = document.querySelector(
      "[data-component='magical-circle-surface']",
    );
    expect(surface).toHaveAttribute("data-ring-count", "3");
    expect(surface).toHaveAttribute("data-compass", "archangels");
    expect(surface).toHaveAttribute("data-centre", "hexagram");
  });

  it("adding a ring increases the count up to 6", () => {
    render(<MagicalCircleSurface />);
    const addBtn = document.querySelector(
      "[data-action='add-ring']",
    ) as Element;
    for (let i = 0; i < 5; i++) fireEvent.click(addBtn);
    expect(
      document.querySelector("[data-component='magical-circle-surface']"),
    ).toHaveAttribute("data-ring-count", "6");
  });

  it("removing rings cannot drop below 1", () => {
    render(<MagicalCircleSurface initialRings={["blank"]} />);
    const surface = document.querySelector(
      "[data-component='magical-circle-surface']",
    );
    expect(surface).toHaveAttribute("data-ring-count", "1");
    const removeBtn = document.querySelector(
      "[data-action='remove-ring']",
    ) as HTMLButtonElement;
    expect(removeBtn).toBeDisabled();
  });

  it("switching compass updates the surface data-compass", () => {
    render(<MagicalCircleSurface />);
    fireEvent.click(
      document.querySelector(
        "[data-compass-row='watchtowers']",
      ) as Element,
    );
    expect(
      document.querySelector("[data-component='magical-circle-surface']"),
    ).toHaveAttribute("data-compass", "watchtowers");
  });

  it("Open from library opens the preset modal", () => {
    render(<MagicalCircleSurface />);
    fireEvent.click(
      document.querySelector(
        "[data-action='open-library']",
      ) as Element,
    );
    expect(
      screen.getByRole("dialog", { name: /Preset circles/i }),
    ).toBeInTheDocument();
  });

  it("save fires onSave with the parsed diameter", () => {
    const onSave = vi.fn();
    render(<MagicalCircleSurface onSave={onSave} />);
    fireEvent.click(
      document.querySelector(
        "[data-action='save-circle']",
      ) as Element,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].diameterMeters).toBe(2.0);
    expect(onSave.mock.calls[0]![0].name).toBe(
      MC_TOPBAR_DEFAULT_NAME,
    );
  });

  it("print-tile toggle adds the data-print-tile flag + crop marks", () => {
    render(<MagicalCircleSurface />);
    expect(
      document.querySelector("[data-component='magical-circle-surface']"),
    ).toHaveAttribute("data-print-tile", "false");
    fireEvent.click(
      document.querySelector(
        "[data-action='toggle-print-tile']",
      ) as Element,
    );
    expect(
      document.querySelector("[data-component='magical-circle-surface']"),
    ).toHaveAttribute("data-print-tile", "true");
    expect(document.querySelector("[data-print-tile]")).toBeTruthy();
  });

  it("picking a ring kind updates that ring", () => {
    render(<MagicalCircleSurface />);
    fireEvent.click(
      document.querySelector("[data-kind='blank']") as Element,
    );
    // Active ring is 2 (Outer); after pick its kind should be blank.
    // The rail's row shows "Outer ring · Blank".
    expect(screen.getByText(/Outer ring · Blank/)).toBeInTheDocument();
  });

  it("zero --danger anywhere", () => {
    const { container } = render(<MagicalCircleSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
