import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  DEMO_VOCES,
  TRADITION_FILTERS,
  VM_CITATION_REQUIRED_NOTE,
  VM_EMPTY_RECORDINGS_NOTE,
  VM_TOPBAR_SUBTITLE,
  VM_TOPBAR_TITLE,
  vmRecordingCountLabel,
} from "./copy.js";
import { NewVoceModal } from "./NewVoceModal.js";
import { VoceDetailDrawer } from "./VoceDetailDrawer.js";
import { VoceRow } from "./VoceRow.js";
import { VocesMagicaeSurface } from "./VocesMagicaeSurface.js";
import { Waveform } from "./Waveform.js";

// ─── Copy ────────────────────────────────────────────────────────

describe("VocesMagicae editorial constants", () => {
  it("topbar title is verbatim", () => {
    expect(VM_TOPBAR_TITLE).toBe("Voces Magicae");
  });

  it("subtitle is verbatim", () => {
    expect(VM_TOPBAR_SUBTITLE).toBe(
      "The names of power — written, sounded, and sourced",
    );
  });

  it("empty-recordings note is verbatim wellbeing copy", () => {
    expect(VM_EMPTY_RECORDINGS_NOTE).toBe(
      "No recording yet — sound it when you are ready, in your own voice.",
    );
  });

  it("citation-required note is verbatim", () => {
    expect(VM_CITATION_REQUIRED_NOTE).toBe(
      "A voce cannot be saved without its source citation.",
    );
  });

  it("TRADITION_FILTERS has 8 entries starting with All", () => {
    expect(TRADITION_FILTERS).toHaveLength(8);
    expect(TRADITION_FILTERS[0]!.key).toBe("all");
  });

  it("vmRecordingCountLabel pluralises correctly", () => {
    expect(vmRecordingCountLabel(0)).toBe("no recording yet");
    expect(vmRecordingCountLabel(1)).toBe("1 recording");
    expect(vmRecordingCountLabel(3)).toBe("3 recordings");
  });

  it("DEMO_VOCES has at least one built-in and one user-authored", () => {
    const builtIn = DEMO_VOCES.filter((v) => v.builtin);
    const custom = DEMO_VOCES.filter((v) => !v.builtin);
    expect(builtIn.length).toBeGreaterThan(0);
    expect(custom.length).toBeGreaterThan(0);
  });
});

// ─── Waveform ────────────────────────────────────────────────────

describe("Waveform", () => {
  it("renders the same bar pattern for the same seed", () => {
    const a = render(<Waveform seed={42} />);
    const b = render(<Waveform seed={42} />);
    const heightsA = Array.from(
      a.container.querySelectorAll("span > span"),
    ).map((s) => (s as HTMLElement).style.height);
    const heightsB = Array.from(
      b.container.querySelectorAll("span > span"),
    ).map((s) => (s as HTMLElement).style.height);
    expect(heightsA).toEqual(heightsB);
  });

  it("respects bar count prop", () => {
    const { container } = render(<Waveform seed={1} bars={20} />);
    // The bars are inner span children of the outer waveform span.
    expect(container.querySelectorAll("span > span")).toHaveLength(20);
  });
});

// ─── VoceRow ────────────────────────────────────────────────────

describe("VoceRow", () => {
  const builtIn = DEMO_VOCES.find((v) => v.builtin)!;
  const noRec = DEMO_VOCES.find((v) => v.recs.length === 0)!;

  it("built-in voce shows the ‡ marker", () => {
    render(<VoceRow voce={builtIn} />);
    expect(
      document.querySelector("[data-builtin-marker]"),
    ).toBeTruthy();
  });

  it("voce with zero recordings shows 'no recording yet'", () => {
    render(<VoceRow voce={noRec} />);
    const rc = document.querySelector("[data-recording-count='0']");
    expect(rc?.textContent).toContain("no recording yet");
  });

  it("clicking the row fires onOpen with the id", () => {
    const onOpen = vi.fn();
    render(<VoceRow voce={builtIn} onOpen={onOpen} />);
    fireEvent.click(
      document.querySelector(
        `[data-voce-row='${builtIn.id}']`,
      ) as Element,
    );
    expect(onOpen).toHaveBeenCalledWith(builtIn.id);
  });
});

// ─── VoceDetailDrawer ───────────────────────────────────────────

describe("VoceDetailDrawer", () => {
  const withRecs = DEMO_VOCES.find((v) => v.recs.length > 0)!;
  const noRecs = DEMO_VOCES.find((v) => v.recs.length === 0)!;

  it("does not render when closed", () => {
    render(
      <VoceDetailDrawer
        open={false}
        voce={withRecs}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the hero text + transliteration + IPA + citation", () => {
    render(
      <VoceDetailDrawer open voce={withRecs} onClose={() => {}} />,
    );
    expect(
      document.querySelector("[data-voce-text]")?.textContent,
    ).toBe(withRecs.text);
    expect(
      document.querySelector("[data-voce-translit]")?.textContent,
    ).toBe(withRecs.translit);
    expect(
      document.querySelector("[data-voce-ipa]")?.textContent,
    ).toBe(withRecs.ipa);
    expect(
      document.querySelector("[data-voce-citation]")?.textContent,
    ).toBe(withRecs.citation);
  });

  it("with-recordings renders one recording row per rec", () => {
    render(
      <VoceDetailDrawer open voce={withRecs} onClose={() => {}} />,
    );
    expect(
      document.querySelectorAll("[data-recording-row]"),
    ).toHaveLength(withRecs.recs.length);
  });

  it("no-recordings renders the empty-state verbatim copy", () => {
    render(
      <VoceDetailDrawer open voce={noRecs} onClose={() => {}} />,
    );
    expect(
      screen.getByText(VM_EMPTY_RECORDINGS_NOTE),
    ).toBeInTheDocument();
  });

  it("Record new fires onRecordNew with the voce id", () => {
    const onRecordNew = vi.fn();
    render(
      <VoceDetailDrawer
        open
        voce={withRecs}
        onClose={() => {}}
        onRecordNew={onRecordNew}
      />,
    );
    fireEvent.click(
      document.querySelector(
        "[data-action='record-new']",
      ) as Element,
    );
    expect(onRecordNew).toHaveBeenCalledWith(withRecs.id);
  });

  it("zero --danger anywhere in the drawer", () => {
    const { container } = render(
      <VoceDetailDrawer open voce={withRecs} onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── NewVoceModal ───────────────────────────────────────────────

describe("NewVoceModal", () => {
  it("Save is disabled when citation is empty", () => {
    render(<NewVoceModal open onClose={() => {}} />);
    const save = document.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save).toBeDisabled();
    expect(
      screen.getByText(VM_CITATION_REQUIRED_NOTE),
    ).toBeInTheDocument();
  });

  it("Save becomes enabled once citation has content", () => {
    render(<NewVoceModal open onClose={() => {}} />);
    const citation = document.querySelector(
      "[data-voce-citation]",
    ) as HTMLInputElement;
    fireEvent.change(citation, { target: { value: "PGM IV. 1265" } });
    const save = document.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save).not.toBeDisabled();
    expect(
      screen.queryByText(VM_CITATION_REQUIRED_NOTE),
    ).not.toBeInTheDocument();
  });

  it("empty-citation chrome paints --accent border, not --danger", () => {
    render(<NewVoceModal open onClose={() => {}} />);
    const citation = document.querySelector(
      "[data-voce-citation]",
    ) as HTMLInputElement;
    const style = citation.getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
    expect(style).not.toContain("--danger");
  });

  it("hebrew script flips the voce-text dir to rtl", () => {
    render(<NewVoceModal open onClose={() => {}} />);
    fireEvent.click(
      document.querySelector("[data-script='hebrew']") as Element,
    );
    const text = document.querySelector(
      "[data-voce-text]",
    ) as HTMLInputElement;
    expect(text.getAttribute("dir")).toBe("rtl");
  });

  it("Save fires onSave with the captured payload", () => {
    const onSave = vi.fn();
    render(<NewVoceModal open onSave={onSave} onClose={() => {}} />);
    fireEvent.change(
      document.querySelector("[data-voce-citation]") as Element,
      { target: { value: "PGM IV. 1265" } },
    );
    fireEvent.click(
      document.querySelector("[data-action='save']") as Element,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].citation).toBe("PGM IV. 1265");
  });

  it("IPA keyboard helper appends to the IPA field", () => {
    render(<NewVoceModal open onClose={() => {}} />);
    fireEvent.click(
      document.querySelector("[data-ipa-key='θ']") as Element,
    );
    const ipa = document.querySelector(
      "[data-voce-ipa]",
    ) as HTMLInputElement;
    expect(ipa.value).toBe("θ");
  });

  it("zero --danger anywhere in the modal", () => {
    const { container } = render(
      <NewVoceModal open onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── VocesMagicaeSurface ────────────────────────────────────────

describe("VocesMagicaeSurface", () => {
  it("defaults to All tradition + renders 6 voce rows", () => {
    render(<VocesMagicaeSurface />);
    const surface = document.querySelector(
      "[data-component='voces-magicae-surface']",
    );
    expect(surface).toHaveAttribute("data-tradition", "all");
    expect(
      document.querySelectorAll("[data-voce-row]"),
    ).toHaveLength(6);
  });

  it("Hekate-tradition filter narrows to the 2 Hekate voces", () => {
    render(<VocesMagicaeSurface />);
    fireEvent.click(
      document.querySelector(
        "[data-tradition-filter='hekate']",
      ) as Element,
    );
    expect(
      document.querySelectorAll("[data-voce-row]"),
    ).toHaveLength(2);
  });

  it("search input narrows by translit / citation / text", () => {
    render(<VocesMagicaeSurface />);
    const search = document.querySelector(
      "[data-search-input]",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "Ablanathanalba" } });
    expect(
      document.querySelectorAll("[data-voce-row]"),
    ).toHaveLength(1);
  });

  it("clicking a voce row opens the detail drawer", () => {
    render(<VocesMagicaeSurface />);
    fireEvent.click(
      document.querySelector("[data-voce-row='iao']") as Element,
    );
    expect(
      screen.getByRole("dialog", { name: /Voce detail/i }),
    ).toBeInTheDocument();
  });

  it("New voce button opens the new-voce modal", () => {
    render(<VocesMagicaeSurface />);
    fireEvent.click(
      document.querySelector("[data-action='open-new']") as Element,
    );
    expect(
      screen.getByRole("dialog", { name: /New voce/i }),
    ).toBeInTheDocument();
  });

  it("zero --danger anywhere", () => {
    const { container } = render(<VocesMagicaeSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
