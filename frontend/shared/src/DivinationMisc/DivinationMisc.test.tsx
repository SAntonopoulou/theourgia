import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

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
import { formatTranceElapsed } from "./TranceOverlay.js";

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

  it("Ask fires onAsk with question + answer + ISO askedAt (v1-014)", () => {
    const onAsk = vi.fn();
    const { container } = render(
      <PendulumPanel random={() => 0} onAsk={onAsk} />,
    );
    fireEvent.change(
      container.querySelector(
        "[data-pendulum-question]",
      ) as HTMLInputElement,
      { target: { value: "Will it rain?" } },
    );
    fireEvent.click(screen.getByText("Ask"));
    expect(onAsk).toHaveBeenCalledTimes(1);
    const entry = onAsk.mock.calls[0]?.[0] as {
      question: string;
      answer: string;
      askedAt: string;
    };
    expect(entry.question).toBe("Will it rain?");
    expect(entry.answer).toBe("Yes");
    expect(new Date(entry.askedAt).toISOString()).toBe(entry.askedAt);
  });

  it("Ask with a blank question passes the em-dash the log shows", () => {
    const onAsk = vi.fn();
    render(<PendulumPanel random={() => 0} onAsk={onAsk} />);
    fireEvent.click(screen.getByText("Ask"));
    expect(onAsk).toHaveBeenCalledWith(
      expect.objectContaining({ question: "—" }),
    );
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

  it("Save fires onSave with the selected medium + vision text", () => {
    const onSave = vi.fn();
    render(<ScryingPanel onSave={onSave} />);
    fireEvent.click(screen.getByText("Crystal"));
    fireEvent.change(screen.getByPlaceholderText(SCRY_TEXT_PLACEHOLDER), {
      target: { value: "A door of pale stone." },
    });
    fireEvent.click(screen.getByText("Save scrying session"));
    expect(onSave).toHaveBeenCalledWith({
      medium: "crystal",
      vision: "A door of pale stone.",
      trance: null,
    });
  });

  it("renders hydrated past sessions with label + date + snippet", () => {
    render(
      <ScryingPanel
        pastSessions={[
          { medium: "mirror", date: "12 Jun 2026", snippet: "A ring of salt." },
        ]}
      />,
    );
    expect(
      screen.getByText(/Black mirror · 12 Jun 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText("A ring of salt.")).toBeInTheDocument();
  });

  it("a raw backend mode string renders honestly with no icon", () => {
    render(
      <ScryingPanel
        pastSessions={[
          { medium: "candle_flame", date: "12 Jun 2026", snippet: "Flicker." },
        ]}
      />,
    );
    expect(screen.getByText(/candle_flame · 12 Jun 2026/)).toBeInTheDocument();
  });
});

// ─── ScryingPanel trance mode (v1-014) ───────────────────────────

describe("ScryingPanel trance mode", () => {
  it("the trance affordance is a button that opens the overlay dialog", () => {
    const { container } = render(<ScryingPanel />);
    const trigger = container.querySelector(
      "[data-trance-link]",
    ) as HTMLElement;
    expect(trigger.tagName).toBe("BUTTON");
    expect(container.querySelector("[data-trance-overlay]")).toBeNull();
    fireEvent.click(trigger);
    const overlay = container.querySelector(
      "[data-trance-overlay]",
    ) as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute("role")).toBe("dialog");
    expect(overlay.getAttribute("aria-modal")).toBe("true");
  });

  it("End closes the overlay", () => {
    const { container } = render(<ScryingPanel />);
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    fireEvent.click(screen.getByLabelText("End session"));
    expect(container.querySelector("[data-trance-overlay]")).toBeNull();
  });

  it("Escape closes the overlay (a11y-sweep modal contract)", () => {
    const { container } = render(<ScryingPanel />);
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    expect(container.querySelector("[data-trance-overlay]")).not.toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector("[data-trance-overlay]")).toBeNull();
  });

  it("elapsed timer starts at 0:00 and ticks (fake timers)", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<ScryingPanel />);
      fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
      const elapsed = () =>
        container.querySelector("[data-trance-elapsed]")?.textContent;
      expect(elapsed()).toBe("0:00");
      act(() => {
        vi.advanceTimersByTime(65_000);
      });
      expect(elapsed()).toBe("1:05");
    } finally {
      vi.useRealTimers();
    }
  });

  it("mirrors the live vision text — never seeds specimen prose", () => {
    const { container } = render(<ScryingPanel />);
    fireEvent.change(screen.getByPlaceholderText(SCRY_TEXT_PLACEHOLDER), {
      target: { value: "A figure that will not turn." },
    });
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    expect(
      container.querySelector("[data-trance-vision]")?.textContent,
    ).toContain("A figure that will not turn.");
  });

  it("empty vision → no vision element; session line is the medium label", () => {
    const { container } = render(<ScryingPanel />);
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    expect(container.querySelector("[data-trance-vision]")).toBeNull();
    expect(
      container.querySelector("[data-trance-session]")?.textContent,
    ).toBe("Black mirror");
  });

  it("appends the planetary hour only when the route supplies it", () => {
    const { container } = render(
      <ScryingPanel planetaryHour="Hour of the Moon" />,
    );
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    expect(
      container.querySelector("[data-trance-session]")?.textContent,
    ).toBe("Black mirror · Hour of the Moon");
  });

  it("a completed trance window rides the next save exactly once", () => {
    const onSave = vi.fn();
    render(<ScryingPanel onSave={onSave} />);
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    fireEvent.click(screen.getByLabelText("End session"));
    fireEvent.change(screen.getByPlaceholderText(SCRY_TEXT_PLACEHOLDER), {
      target: { value: "Water moving without sound." },
    });
    fireEvent.click(screen.getByText("Save scrying session"));
    const first = onSave.mock.calls[0]?.[0] as {
      trance: { startedAt: string; endedAt: string } | null;
    };
    expect(first.trance).not.toBeNull();
    expect(Date.parse(first.trance?.endedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(first.trance?.startedAt ?? ""),
    );
    fireEvent.click(screen.getByText("Save scrying session"));
    const second = onSave.mock.calls[1]?.[0] as { trance: unknown };
    expect(second.trance).toBeNull();
  });

  it("the low-blue-light overlay never uses --danger or --trance", () => {
    const { container } = render(<ScryingPanel />);
    fireEvent.click(screen.getByText(SCRY_TRANCE_LABEL));
    const overlay = container.querySelector(
      "[data-trance-overlay]",
    ) as HTMLElement;
    expect(overlay.innerHTML).not.toContain("--danger");
    expect(overlay.innerHTML).not.toContain("--trance");
  });
});

// ─── formatTranceElapsed ─────────────────────────────────────────

describe("formatTranceElapsed", () => {
  it("matches the design's m:ss timer format", () => {
    expect(formatTranceElapsed(0)).toBe("0:00");
    expect(formatTranceElapsed(65)).toBe("1:05");
    expect(formatTranceElapsed(768)).toBe("12:48");
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

  it("onSavePendulum receives the Ask entry (pendulum's save moment)", () => {
    const onSavePendulum = vi.fn();
    render(<DivinationMiscSurface onSavePendulum={onSavePendulum} />);
    fireEvent.click(screen.getByText("Ask"));
    expect(onSavePendulum).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: expect.any(String),
        askedAt: expect.any(String),
      }),
    );
  });

  it("scryPastSessions hydrate the scrying rail", () => {
    render(
      <DivinationMiscSurface
        initialMethod="scrying"
        scryPastSessions={[
          { medium: "water", date: "01 Jul 2026", snippet: "Still water." },
        ]}
      />,
    );
    expect(screen.getByText("Still water.")).toBeInTheDocument();
  });
});
