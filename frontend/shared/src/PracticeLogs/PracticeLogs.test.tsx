import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { AsanaPanel } from "./AsanaPanel.js";
import { BanishingPanel } from "./BanishingPanel.js";
import {
  ASANA_DEFAULT_LOG,
  ASANA_DEFAULT_NAME,
  ASANA_TIMER_DEFAULT_SECONDS,
  BANISH_DEFAULT_LOG,
  BANISH_RITE_OPTIONS,
  BANISH_SEAL_HELP_OFF,
  BANISH_SEAL_HELP_ON,
  DREAM_DEFAULT_LOG,
  DREAM_DEFAULT_TEXT,
  DREAM_LUCID_DEFAULT,
  PATH_DEFAULT,
  PRACTICE_LOG_TABS,
  PRACTICE_LOGS_SUBTITLE,
  PRACTICE_LOGS_TITLE,
  formatTimerSeconds,
} from "./copy.js";
import { DreamPanel } from "./DreamPanel.js";
import { LogTypeTablist } from "./LogTypeTablist.js";
import { PathworkingPanel } from "./PathworkingPanel.js";
import { PracticeLogsSurface } from "./PracticeLogsSurface.js";

// ─── copy ─────────────────────────────────────────────────────────

describe("PracticeLogs editorial constants", () => {
  it("PRACTICE_LOGS_TITLE is verbatim ('Practice log')", () => {
    expect(PRACTICE_LOGS_TITLE).toBe("Practice log");
  });

  it("PRACTICE_LOGS_SUBTITLE lists the four logs in order", () => {
    expect(PRACTICE_LOGS_SUBTITLE).toBe(
      "Dreams · pathworking · āsana & breath · banishing",
    );
  });

  it("PRACTICE_LOG_TABS has dream first (default), banish last", () => {
    expect(PRACTICE_LOG_TABS).toHaveLength(4);
    expect(PRACTICE_LOG_TABS[0]!.key).toBe("dream");
    expect(PRACTICE_LOG_TABS[3]!.key).toBe("banish");
  });

  it("BANISH_SEAL_HELP_OFF is the plain-text default copy", () => {
    expect(BANISH_SEAL_HELP_OFF).toContain("stored as plain text by default");
    expect(BANISH_SEAL_HELP_OFF).toContain("Turn on Seal");
  });

  it("BANISH_SEAL_HELP_ON makes the client-side-signing promise", () => {
    // Load-bearing: this is the cross-cutting client-side-signing UX
    // (H01-H03). It must say the server stores only ciphertext.
    expect(BANISH_SEAL_HELP_ON).toContain("encrypted on this device");
    expect(BANISH_SEAL_HELP_ON).toContain(
      "server stores only ciphertext",
    );
    expect(BANISH_SEAL_HELP_ON).toContain("cannot read");
  });

  it("DREAM_DEFAULT_TEXT is the verbatim mockup seeding", () => {
    expect(DREAM_DEFAULT_TEXT).toContain(
      "shelves run downward into water",
    );
    expect(DREAM_DEFAULT_TEXT).toContain("name her");
  });

  it("BANISH_RITE_OPTIONS includes all five mockup rites in order", () => {
    expect(BANISH_RITE_OPTIONS[0]).toBe(
      "LBRP — Lesser Banishing Ritual of the Pentagram",
    );
    expect(BANISH_RITE_OPTIONS[1]).toBe("LIRP — Lesser Invoking Ritual");
    expect(BANISH_RITE_OPTIONS[2]).toBe("Star Ruby");
    expect(BANISH_RITE_OPTIONS[3]).toBe("Qabalistic Cross");
    expect(BANISH_RITE_OPTIONS[4]).toBe(
      "Grounding — three breaths to the earth",
    );
  });

  it("PATH_DEFAULT is 25 (Samekh — Tiphareth → Yesod)", () => {
    expect(PATH_DEFAULT).toBe(25);
  });

  it("ASANA_TIMER_DEFAULT_SECONDS = 0 (b108-2fd)", () => {
    expect(ASANA_TIMER_DEFAULT_SECONDS).toBe(0);
    // Was 727s / '12:07' — now zero until the practitioner starts a
    // session, honestly reflecting a fresh vault.
  });

  it("formatTimerSeconds zero-pads minutes and seconds", () => {
    expect(formatTimerSeconds(0)).toBe("00:00");
    expect(formatTimerSeconds(5)).toBe("00:05");
    expect(formatTimerSeconds(65)).toBe("01:05");
    expect(formatTimerSeconds(600)).toBe("10:00");
    expect(formatTimerSeconds(3599)).toBe("59:59");
  });
});

// ─── LogTypeTablist ───────────────────────────────────────────────

describe("LogTypeTablist", () => {
  it("renders all 4 tabs with role=tab", () => {
    render(<LogTypeTablist value="dream" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
  });

  it("marks the active tab aria-selected=true", () => {
    render(<LogTypeTablist value="path" onChange={() => {}} />);
    const path = screen.getByRole("tab", { name: /Pathworking/ });
    expect(path).toHaveAttribute("aria-selected", "true");
    const dream = screen.getByRole("tab", { name: /^Dream/ });
    expect(dream).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the picked tab key", () => {
    const onChange = vi.fn();
    render(<LogTypeTablist value="dream" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Banishing/ }));
    expect(onChange).toHaveBeenCalledWith("banish");
  });

  it("aria-label is 'Log type'", () => {
    render(<LogTypeTablist value="dream" onChange={() => {}} />);
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-label",
      "Log type",
    );
  });
});

// ─── DreamPanel ───────────────────────────────────────────────────

describe("DreamPanel", () => {
  it("seeds the textarea with the default dream text", () => {
    render(<DreamPanel />);
    const textarea = screen.getByRole("textbox", { name: /On waking/ });
    expect(textarea).toHaveValue(DREAM_DEFAULT_TEXT);
  });

  it("renders all 5 default chips with kind attribute", () => {
    render(<DreamPanel />);
    const chips = document.querySelectorAll("[data-chip]");
    expect(chips).toHaveLength(5);
    const figures = document.querySelectorAll(
      "[data-chip-kind='figure']",
    );
    expect(figures).toHaveLength(2); // lamp-bearer + Hekate?
  });

  it("renders the lucid switch on by default", () => {
    render(<DreamPanel />);
    const sw = screen.getByRole("switch", { name: /Lucid/ });
    expect(sw).toHaveAttribute("aria-checked", String(DREAM_LUCID_DEFAULT));
  });

  it("toggling lucid flips aria-checked", () => {
    render(<DreamPanel />);
    const sw = screen.getByRole("switch", { name: /Lucid/ });
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("recent rail shows 3 entries and a lucid pill on the lucid one", () => {
    render(<DreamPanel />);
    const entries = document.querySelectorAll("[data-recent-entry]");
    expect(entries).toHaveLength(DREAM_DEFAULT_LOG.length);
    const lucidPills = document.querySelectorAll("[data-lucid-pill]");
    // Only the first recent entry is lucid in the seed.
    expect(lucidPills).toHaveLength(1);
  });

  it("save fires onSave with current state", () => {
    const onSave = vi.fn();
    render(<DreamPanel onSave={onSave} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Save dream/ }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      text: DREAM_DEFAULT_TEXT,
      lucid: true,
    });
  });
});

// ─── PathworkingPanel ────────────────────────────────────────────

describe("PathworkingPanel", () => {
  it("defaults to path 25 (Samekh / Temperance / Tiphareth → Yesod)", () => {
    render(<PathworkingPanel />);
    expect(screen.getByText(/Path 25 · Samekh/)).toBeInTheDocument();
    expect(screen.getByText("Temperance")).toBeInTheDocument();
    expect(screen.getByText("Sagittarius")).toBeInTheDocument();
    expect(screen.getByText("Tiphareth → Yesod")).toBeInTheDocument();
  });

  it("displays the Hebrew letter samekh", () => {
    render(<PathworkingPanel />);
    expect(screen.getByText("ס")).toBeInTheDocument();
  });

  it("draws 22 edges and 10 sephiroth nodes", () => {
    render(<PathworkingPanel />);
    const edges = document.querySelectorAll("[data-edge-path]");
    expect(edges).toHaveLength(22);
    const nodes = document.querySelectorAll("[data-tree-svg] circle");
    expect(nodes).toHaveLength(10);
  });

  it("clicking an edge selects a new path", () => {
    render(<PathworkingPanel />);
    // Path 11 = Aleph = The Fool
    const edge11 = document.querySelector("[data-edge-path='11']");
    expect(edge11).toBeTruthy();
    fireEvent.click(edge11!);
    expect(screen.getByText(/Path 11 · Aleph/)).toBeInTheDocument();
    expect(screen.getByText("The Fool")).toBeInTheDocument();
  });

  it("highlights only the selected path edge", () => {
    render(<PathworkingPanel />);
    const selected = document.querySelectorAll(
      "[data-edge-path][data-on='true']",
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute("data-edge-path", "25");
  });

  it("save passes the resolved path object", () => {
    const onSave = vi.fn();
    render(<PathworkingPanel onSave={onSave} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Save pathworking/ }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].path.number).toBe(25);
    expect(onSave.mock.calls[0]![0].path.letter).toBe("Samekh");
  });
});

// ─── AsanaPanel ───────────────────────────────────────────────────

describe("AsanaPanel", () => {
  it("has empty defaults for name/breath/timer (b108-2fd)", () => {
    // Previously seeded with Siddhāsana + 1:4:2 + 12:07; now every
    // deploy starts from an honest blank slate.
    render(<AsanaPanel />);
    expect(ASANA_DEFAULT_NAME).toBe("");
    const timerText = document.querySelector("[data-timer-text]");
    expect(timerText?.textContent).toBe("00:00");
  });

  it("displays the quiet stats (zero-valued until aggregation endpoint lands)", () => {
    render(<AsanaPanel />);
    expect(screen.getByText("hours, cumulative")).toBeInTheDocument();
    expect(screen.getByText("sessions kept")).toBeInTheDocument();
  });

  it("toggle button reads 'Begin' when paused, 'Pause' when running", () => {
    render(<AsanaPanel />);
    const toggle = screen.getByRole("button", { name: /Begin|Pause/ });
    expect(toggle).toHaveTextContent("Begin");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Pause");
  });

  it("ticks the timer each second while running", () => {
    vi.useFakeTimers();
    let t = 1_000_000_000;
    const now = () => t;
    render(<AsanaPanel now={now} />);
    fireEvent.click(screen.getByRole("button", { name: /Begin/ }));
    // Advance both wall-clock and the interval scheduler by 3 s.
    act(() => {
      t += 3000;
      vi.advanceTimersByTime(3000);
    });
    const timerText = document.querySelector("[data-timer-text]");
    // 0 + 3 = 3 → 00:03 (default is now zero per b108-2fd)
    expect(timerText?.textContent).toBe("00:03");
    vi.useRealTimers();
  });

  it("reset returns the timer to default and stops running", () => {
    render(<AsanaPanel />);
    const toggle = screen.getByRole("button", { name: /Begin/ });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(toggle).toHaveTextContent("Begin");
    const timerText = document.querySelector("[data-timer-text]");
    expect(timerText?.textContent).toBe("00:00");
  });

  it("recent rail shows 3 sessions", () => {
    render(<AsanaPanel />);
    const entries = document.querySelectorAll("[data-recent-entry]");
    expect(entries).toHaveLength(ASANA_DEFAULT_LOG.length);
    expect(screen.getByText("Sukhāsana")).toBeInTheDocument();
    expect(screen.getByText("Vajrāsana")).toBeInTheDocument();
  });
});

// ─── BanishingPanel ──────────────────────────────────────────────

describe("BanishingPanel", () => {
  it("defaults to LBRP, 14:23, seal OFF", () => {
    render(<BanishingPanel />);
    const rite = screen.getByLabelText("Rite") as HTMLSelectElement;
    expect(rite.value).toBe(BANISH_RITE_OPTIONS[0]);
    expect(screen.getByLabelText("Time")).toHaveValue("14:23");
    const seal = screen.getByRole("button", { name: /^Seal$/ });
    expect(seal).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the plain-text help text by default", () => {
    render(<BanishingPanel />);
    expect(
      screen.getByText(BANISH_SEAL_HELP_OFF),
    ).toBeInTheDocument();
  });

  it("toggling Seal swaps to the ciphertext promise copy", () => {
    render(<BanishingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /^Seal$/ }));
    expect(screen.getByText(BANISH_SEAL_HELP_ON)).toBeInTheDocument();
    expect(
      screen.queryByText(BANISH_SEAL_HELP_OFF),
    ).not.toBeInTheDocument();
  });

  it("after Seal is on the label reads 'Will seal' and aria-pressed=true", () => {
    render(<BanishingPanel />);
    const seal = screen.getByRole("button", { name: /^Seal$/ });
    fireEvent.click(seal);
    const sealActive = screen.getByRole("button", { name: /Will seal/ });
    expect(sealActive).toHaveAttribute("aria-pressed", "true");
  });

  it("renders 5 recent entries with sealed pills only on sealed ones", () => {
    render(<BanishingPanel />);
    const entries = document.querySelectorAll("[data-recent-entry]");
    expect(entries).toHaveLength(BANISH_DEFAULT_LOG.length);
    const sealed = document.querySelectorAll(
      "[data-recent-entry][data-sealed='true']",
    );
    expect(sealed).toHaveLength(
      BANISH_DEFAULT_LOG.filter((e) => e.sealed).length,
    );
    const pills = document.querySelectorAll("[data-sealed-pill]");
    expect(pills).toHaveLength(sealed.length);
  });

  it("save passes the current sealed flag", () => {
    const onSave = vi.fn();
    render(<BanishingPanel onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /^Seal$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Log it/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      rite: BANISH_RITE_OPTIONS[0],
      time: "14:23",
      sealed: true,
    });
  });

  it("uses --seal* care palette, never --danger", () => {
    const { container } = render(<BanishingPanel initialSealOn />);
    const html = container.innerHTML;
    expect(html).not.toContain("--danger");
    expect(html).toContain("var(--seal");
  });
});

// ─── PracticeLogsSurface ─────────────────────────────────────────

describe("PracticeLogsSurface", () => {
  it("defaults to the Dream tab", () => {
    render(<PracticeLogsSurface />);
    const surface = document.querySelector(
      "[data-component='practice-logs-surface']",
    );
    expect(surface).toHaveAttribute("data-tab", "dream");
    expect(
      document.querySelector("[data-component='dream-panel']"),
    ).toBeInTheDocument();
  });

  it("switches sub-panel when a tab is clicked", () => {
    render(<PracticeLogsSurface />);
    fireEvent.click(screen.getByRole("tab", { name: /Banishing/ }));
    const surface = document.querySelector(
      "[data-component='practice-logs-surface']",
    );
    expect(surface).toHaveAttribute("data-tab", "banish");
    expect(
      document.querySelector("[data-component='banishing-panel']"),
    ).toBeInTheDocument();
  });

  it("forwards save events with the tab key", () => {
    const onSave = vi.fn();
    render(<PracticeLogsSurface onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Save dream/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toBe("dream");
  });

  it("Pathworking tab swaps to the tree", () => {
    render(<PracticeLogsSurface initialTab="path" />);
    expect(
      document.querySelector("[data-component='pathworking-panel']"),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-edge-path]").length,
    ).toBe(22);
  });

  it("never paints --danger anywhere in any tab", () => {
    const { container, rerender } = render(<PracticeLogsSurface />);
    expect(container.innerHTML).not.toContain("--danger");
    rerender(<PracticeLogsSurface initialTab="banish" />);
    expect(container.innerHTML).not.toContain("--danger");
    rerender(<PracticeLogsSurface initialTab="asana" />);
    expect(container.innerHTML).not.toContain("--danger");
    rerender(<PracticeLogsSurface initialTab="path" />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("renders the tablist with all 4 tabs labelled 'Log type'", () => {
    render(<PracticeLogsSurface />);
    const tablist = screen.getByRole("tablist", { name: "Log type" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(4);
  });
});
