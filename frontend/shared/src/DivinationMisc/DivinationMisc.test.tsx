import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BibliomancyPanel } from "./BibliomancyPanel.js";
import {
  HORARY_DEFAULT_STEPS,
  HORARY_PROVISIONAL_DEFAULT,
  HORARY_SYSTEM_CAPTION,
  PEND_CALIBRATE_NOTE,
  SCRY_AUDIO_HINT,
  SCRY_TEXT_PLACEHOLDER,
  SCRY_TRANCE_LABEL,
} from "./copy.js";
import { DivinationMiscSurface } from "./DivinationMiscSurface.js";
import { HoraryPanel } from "./HoraryPanel.js";
import { HoraryWheel } from "./HoraryWheel.js";
import { MethodTablist } from "./MethodTablist.js";
import { PendulumDial } from "./PendulumDial.js";
import { PendulumPanel } from "./PendulumPanel.js";
import { ScryingPanel } from "./ScryingPanel.js";
import { Speculum } from "./Speculum.js";

// ─── copy ─────────────────────────────────────────────────────────

describe("DivMisc editorial constants", () => {
  it("PEND_CALIBRATE_NOTE is verbatim from the mockup", () => {
    expect(PEND_CALIBRATE_NOTE).toBe(
      "A pendulum's answers can shift day to day. Set which swing means what before you ask.",
    );
  });

  it("HORARY_PROVISIONAL_DEFAULT names the pending ephemeris engine honestly", () => {
    // Previously carried fabricated Hellenistic prose ("mutual
    // reception", "qualified yes"). The panel now shows a
    // placeholder until a real cast produces text.
    expect(HORARY_PROVISIONAL_DEFAULT).toContain("ephemeris");
    expect(HORARY_PROVISIONAL_DEFAULT).toContain("real moment");
  });

  it("HORARY_SYSTEM_CAPTION says 'Hellenistic horary · whole-sign houses'", () => {
    expect(HORARY_SYSTEM_CAPTION).toBe(
      "Hellenistic horary · whole-sign houses",
    );
  });

  it("SCRY_TEXT_PLACEHOLDER is verbatim (don't interpret yet)", () => {
    expect(SCRY_TEXT_PLACEHOLDER).toBe(
      "Set down what comes — images, figures, words, the felt sense. Don't interpret yet.",
    );
  });

  it("SCRY_AUDIO_HINT mentions library quote recordings", () => {
    expect(SCRY_AUDIO_HINT).toBe(
      "Audio attaches through the same upload as your library quote recordings.",
    );
  });

  it("SCRY_TRANCE_LABEL says 'Enter trance mode'", () => {
    expect(SCRY_TRANCE_LABEL).toBe("Enter trance mode");
  });

  it("HORARY_DEFAULT_STEPS is empty until an ephemeris cast populates it", () => {
    // The ephemeris engine hasn't shipped yet; the panel renders a
    // "Cast a chart to fill this reading" placeholder when steps is empty.
    expect(HORARY_DEFAULT_STEPS).toHaveLength(0);
  });
});

// ─── MethodTablist ────────────────────────────────────────────────

describe("MethodTablist", () => {
  it("renders four tabs with the canonical labels", () => {
    render(<MethodTablist value="pendulum" onChange={() => {}} />);
    expect(screen.getByText("Pendulum")).toBeInTheDocument();
    expect(screen.getByText("Bibliomancy")).toBeInTheDocument();
    expect(screen.getByText("Horary")).toBeInTheDocument();
    expect(screen.getByText("Scrying")).toBeInTheDocument();
  });

  it("active tab has aria-selected=true + accent border", () => {
    const { container } = render(
      <MethodTablist value="horary" onChange={() => {}} />,
    );
    const horary = container.querySelector(
      '[data-method="horary"]',
    ) as HTMLElement;
    expect(horary.getAttribute("aria-selected")).toBe("true");
    expect(horary.style.borderColor).toBe("var(--accent)");
  });

  it("fires onChange with the picked method", () => {
    const onChange = vi.fn();
    render(<MethodTablist value="pendulum" onChange={onChange} />);
    fireEvent.click(screen.getByText("Scrying"));
    expect(onChange).toHaveBeenCalledWith("scrying");
  });
});

// ─── PendulumDial ─────────────────────────────────────────────────

describe("PendulumDial", () => {
  it("Yes → 22° rotation", () => {
    const { container } = render(<PendulumDial answer="Yes" />);
    expect(
      container.querySelector("g")?.getAttribute("transform"),
    ).toBe("rotate(22 60 10)");
  });

  it("No → -22° rotation", () => {
    const { container } = render(<PendulumDial answer="No" />);
    expect(
      container.querySelector("g")?.getAttribute("transform"),
    ).toBe("rotate(-22 60 10)");
  });

  it("Maybe → 6°", () => {
    const { container } = render(<PendulumDial answer="Maybe" />);
    expect(
      container.querySelector("g")?.getAttribute("transform"),
    ).toBe("rotate(6 60 10)");
  });

  it("Unclear → 0°", () => {
    const { container } = render(<PendulumDial answer="Unclear" />);
    expect(
      container.querySelector("g")?.getAttribute("transform"),
    ).toBe("rotate(0 60 10)");
  });

  it("aria-label embeds the answer", () => {
    const { container } = render(<PendulumDial answer="Yes" />);
    expect(
      container.firstElementChild?.getAttribute("aria-label"),
    ).toBe("Pendulum answering Yes");
  });
});

// ─── HoraryWheel ──────────────────────────────────────────────────

describe("HoraryWheel", () => {
  it("renders 12 spokes + 12 numerals + 7 planets + Asc marker", () => {
    const { container } = render(<HoraryWheel />);
    expect(container.querySelectorAll("line")).toHaveLength(12);
    // numerals + planet glyphs + Asc = 12 + 7 + 1 = 20
    expect(container.querySelectorAll("text").length).toBeGreaterThanOrEqual(
      20,
    );
  });

  it("never uses --danger", () => {
    const { container } = render(<HoraryWheel />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── Speculum ─────────────────────────────────────────────────────

describe("Speculum", () => {
  it.each(["mirror", "crystal", "water", "fire"] as const)(
    "renders medium=%s",
    (m) => {
      const { container } = render(<Speculum medium={m} />);
      expect(
        container.firstElementChild?.getAttribute("data-medium"),
      ).toBe(m);
    },
  );

  it("aria-label embeds the medium", () => {
    const { container } = render(<Speculum medium="mirror" />);
    expect(
      container.firstElementChild?.getAttribute("aria-label"),
    ).toBe("Scrying mirror");
  });
});

// ─── PendulumPanel ────────────────────────────────────────────────

describe("PendulumPanel", () => {
  it("renders the verbatim calibration note", () => {
    render(<PendulumPanel />);
    expect(screen.getByText(PEND_CALIBRATE_NOTE)).toBeInTheDocument();
  });

  it("Ask appends an entry to the session log", () => {
    const { container } = render(<PendulumPanel random={() => 0} />);
    const initialEntries = container.querySelectorAll("[data-log-entry]");
    fireEvent.change(
      container.querySelector(
        "[data-pendulum-question]",
      ) as HTMLInputElement,
      { target: { value: "Will it rain?" } },
    );
    fireEvent.click(screen.getByText("Ask"));
    const after = container.querySelectorAll("[data-log-entry]");
    expect(after.length).toBe(initialEntries.length + 1);
  });

  it("Ask with random()=0 picks 'Yes' (first answer)", () => {
    const { container } = render(<PendulumPanel random={() => 0} />);
    fireEvent.click(screen.getByText("Ask"));
    // Multiple "Yes" elements may now exist (dial answer + log entry).
    const yesElements = container.querySelectorAll(
      "[data-pendulum-answer]",
    );
    expect(yesElements[0]?.textContent).toBe("Yes");
  });

  it("never uses --danger", () => {
    const { container } = render(<PendulumPanel />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── BibliomancyPanel ────────────────────────────────────────────

describe("BibliomancyPanel", () => {
  it("renders source select + method chips + passage figure", () => {
    const { container } = render(<BibliomancyPanel />);
    expect(
      container.querySelector("[data-source-select]"),
    ).not.toBeNull();
    expect(screen.getByText("Page & finger")).toBeInTheDocument();
    expect(screen.getByText("Random line")).toBeInTheDocument();
    expect(screen.getByText("By verse number")).toBeInTheDocument();
    expect(
      container.querySelector("[data-passage-figure]"),
    ).not.toBeNull();
  });

  it("changing method updates the figcaption note", () => {
    const { container } = render(<BibliomancyPanel />);
    expect(
      container.querySelector("figcaption")?.textContent,
    ).toContain("opened at random, finger laid on the page");
    fireEvent.click(screen.getByText("Random line"));
    expect(
      container.querySelector("figcaption")?.textContent,
    ).toContain("a single line chosen by lot");
  });

  it("onLog fires with the current draft", () => {
    const onLog = vi.fn();
    render(<BibliomancyPanel onLog={onLog} />);
    fireEvent.click(screen.getByText("Log question & passage"));
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "page-finger",
      }),
    );
  });
});

// ─── HoraryPanel ──────────────────────────────────────────────────

describe("HoraryPanel", () => {
  it("renders the verbatim moment label + system caption + provisional", () => {
    render(<HoraryPanel />);
    expect(
      screen.getByText(/Pass a moment to cast/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(HORARY_SYSTEM_CAPTION),
    ).toBeInTheDocument();
    expect(
      screen.getByText(HORARY_PROVISIONAL_DEFAULT),
    ).toBeInTheDocument();
  });

  it("renders each supplied step as a data-step row", () => {
    // The default step list is empty (ephemeris cast pending); the
    // panel accepts a steps prop for tests + future wiring.
    const { container } = render(
      <HoraryPanel
        steps={[
          { n: "1", title: "Sect", value: "Day chart", note: "The Sun above the horizon." },
          { n: "2", title: "Querent", value: "Mercury", note: "Ruler of the ascendant." },
        ]}
      />,
    );
    const steps = container.querySelectorAll("[data-step]");
    expect(steps).toHaveLength(2);
  });

  it("Save fires onSave", () => {
    const onSave = vi.fn();
    render(<HoraryPanel onSave={onSave} />);
    fireEvent.click(screen.getByText("Save chart & reading"));
    expect(onSave).toHaveBeenCalled();
  });

  it("never uses --danger", () => {
    const { container } = render(<HoraryPanel />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── ScryingPanel ────────────────────────────────────────────────

describe("ScryingPanel", () => {
  it("renders medium picker with all four options", () => {
    render(<ScryingPanel />);
    expect(screen.getByText("Black mirror")).toBeInTheDocument();
    expect(screen.getByText("Crystal")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("changing medium updates the speculum's data-medium attribute", () => {
    const { container } = render(<ScryingPanel />);
    expect(
      container
        .querySelector('[data-component="speculum"]')
        ?.getAttribute("data-medium"),
    ).toBe("mirror");
    fireEvent.click(screen.getByText("Crystal"));
    expect(
      container
        .querySelector('[data-component="speculum"]')
        ?.getAttribute("data-medium"),
    ).toBe("crystal");
  });

  it("Trance link uses --trance color (NEVER red)", () => {
    const { container } = render(<ScryingPanel />);
    const trance = container.querySelector(
      "[data-trance-link]",
    ) as HTMLElement;
    expect(trance.style.color).toBe("var(--trance)");
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("textarea uses the verbatim placeholder", () => {
    render(<ScryingPanel />);
    expect(
      screen.getByPlaceholderText(SCRY_TEXT_PLACEHOLDER),
    ).toBeInTheDocument();
  });

  it("Record fires onRecord; Save fires onSave", () => {
    const onRecord = vi.fn();
    const onSave = vi.fn();
    render(<ScryingPanel onRecord={onRecord} onSave={onSave} />);
    fireEvent.click(screen.getByText("Record audio"));
    expect(onRecord).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Save scrying session"));
    expect(onSave).toHaveBeenCalled();
  });
});

// ─── DivinationMiscSurface ──────────────────────────────────────

describe("DivinationMiscSurface", () => {
  it("default = pendulum panel rendered", () => {
    const { container } = render(<DivinationMiscSurface />);
    expect(
      container.firstElementChild?.getAttribute("data-method"),
    ).toBe("pendulum");
    expect(
      container.querySelector("[data-component='pendulum-panel']"),
    ).not.toBeNull();
  });

  it("switching to bibliomancy renders the bibliomancy panel", () => {
    const { container } = render(<DivinationMiscSurface />);
    fireEvent.click(screen.getByText("Bibliomancy"));
    expect(
      container.querySelector(
        "[data-component='bibliomancy-panel']",
      ),
    ).not.toBeNull();
    expect(
      container.firstElementChild?.getAttribute("data-method"),
    ).toBe("biblio");
  });

  it("switching to horary renders the horary panel", () => {
    const { container } = render(<DivinationMiscSurface />);
    fireEvent.click(screen.getByText("Horary"));
    expect(
      container.querySelector("[data-component='horary-panel']"),
    ).not.toBeNull();
  });

  it("switching to scrying renders the scrying panel", () => {
    const { container } = render(<DivinationMiscSurface />);
    fireEvent.click(screen.getByText("Scrying"));
    expect(
      container.querySelector("[data-component='scrying-panel']"),
    ).not.toBeNull();
  });

  it("initialMethod=scrying mounts scrying directly", () => {
    const { container } = render(
      <DivinationMiscSurface initialMethod="scrying" />,
    );
    expect(
      container.firstElementChild?.getAttribute("data-method"),
    ).toBe("scrying");
  });

  it("never uses --danger across any sub-method", () => {
    for (const method of ["pendulum", "biblio", "horary", "scrying"] as const) {
      const { container } = render(
        <DivinationMiscSurface initialMethod={method} />,
      );
      expect(container.innerHTML).not.toContain("--danger");
    }
  });
});
