/**
 * AudioLibrarySurface tests (H07 §S3 surface 17).
 *
 * Honesty + H07 rule coverage:
 *   - NO play counts in meta line
 *   - Sealed glyph uses --seal (never --warn / --danger)
 *   - Active play button uses --accent + --accent-ink, inactive
 *     uses hollow --accent ring (no --danger)
 *   - Filter chips narrow by category; "Lectures" maps to "lecture"
 *   - Mini-player reflects active track; play/pause toggle wires
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type AudioTrack,
  AudioLibrarySurface,
} from "./index.js";

const TRACKS: AudioTrack[] = [
  {
    id: "brimo",
    title: "ΒΡΙΜΩ — sounding",
    meta_label: "voce · linked to Hekate · 15 Jun",
    category: "voce",
    duration_label: "0:42",
    duration_seconds: 42,
    sealed: false,
  },
  {
    id: "deipnon",
    title: "Deipnon — full rite",
    meta_label: "working · 15 Jun",
    category: "working",
    duration_label: "12:04",
    duration_seconds: 724,
    sealed: false,
  },
  {
    id: "oath",
    title: "The sealed oath — spoken",
    meta_label: "working · sealed",
    category: "working",
    duration_label: "3:18",
    duration_seconds: 198,
    sealed: true,
  },
  {
    id: "lecture",
    title: "On the planetary hours",
    meta_label: "lecture · 19 Apr",
    category: "lecture",
    duration_label: "31:50",
    duration_seconds: 1910,
    sealed: false,
  },
];

describe("AudioLibrarySurface", () => {
  it("renders all rows by default", () => {
    const { container } = render(
      <AudioLibrarySurface tracks={TRACKS} />,
    );
    expect(container.querySelectorAll("[data-audio-row]")).toHaveLength(4);
  });

  it("meta lines NEVER reference play counts", () => {
    const { container } = render(
      <AudioLibrarySurface tracks={TRACKS} />,
    );
    container.querySelectorAll("[data-row-meta]").forEach((el) => {
      const txt = (el.textContent ?? "").toLowerCase();
      expect(txt).not.toMatch(/play/);
      expect(txt).not.toMatch(/\d+\s*plays/);
      expect(txt).not.toMatch(/listens/);
    });
  });

  it("filter narrows to a single category", () => {
    const { container } = render(
      <AudioLibrarySurface tracks={TRACKS} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='lecture']") as HTMLButtonElement,
    );
    const rows = container.querySelectorAll("[data-audio-row]");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute("data-audio-row")).toBe("lecture");
  });

  it("sealed glyph uses --seal (never --warn / --danger)", () => {
    const { container } = render(
      <AudioLibrarySurface tracks={TRACKS} />,
    );
    const seal = container.querySelector("[data-row-seal]") as HTMLElement;
    expect(seal).toBeTruthy();
    expect(seal.style.color).toBe("var(--seal)");
  });

  it("active row uses --accent-soft background", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
      />,
    );
    const row = container.querySelector(
      "[data-audio-row='brimo']",
    ) as HTMLElement;
    expect(row.getAttribute("data-active")).toBe("true");
    expect(row.style.background).toBe("var(--accent-soft)");
  });

  it("active play button uses --accent fill + --accent-ink colour", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
      />,
    );
    const btn = container.querySelector(
      "[data-row-play='brimo']",
    ) as HTMLElement;
    expect(btn.style.background).toBe("var(--accent)");
    expect(btn.style.color).toBe("var(--accent-ink)");
  });

  it("onTogglePlay fires from row + mini-player", () => {
    const onTogglePlay = vi.fn();
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing={false}
        onTogglePlay={onTogglePlay}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-row-play='deipnon']") as HTMLElement,
    );
    expect(onTogglePlay).toHaveBeenLastCalledWith("deipnon");
    fireEvent.click(
      container.querySelector("[data-mini-toggle]") as HTMLButtonElement,
    );
    expect(onTogglePlay).toHaveBeenLastCalledWith("brimo");
  });

  it("mini-player shows track title + meta of active track", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
        position_seconds={18}
      />,
    );
    const player = container.querySelector(
      "[data-mini-player]",
    ) as HTMLElement;
    expect(player.textContent).toContain("ΒΡΙΜΩ");
    expect(player.textContent).toContain("Hekate");
  });

  it("mini-player progress reflects position / duration", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
        position_seconds={21}
      />,
    );
    const fill = container.querySelector(
      "[data-mini-progress]",
    ) as HTMLElement;
    // 21 / 42 = 50%
    expect(fill.style.width).toBe("50%");
  });

  it("scrub fires onScrub with seconds", () => {
    const onScrub = vi.fn();
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
        position_seconds={0}
        onScrub={onScrub}
      />,
    );
    const scrub = container.querySelector(
      "[data-mini-scrub]",
    ) as HTMLElement;
    // Stub getBoundingClientRect for jsdom
    vi.spyOn(scrub, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      right: 100,
      top: 0,
      bottom: 0,
      width: 100,
      height: 4,
      toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(scrub, { clientX: 50 });
    expect(onScrub).toHaveBeenCalledWith(21);
  });

  it("mini-player toggle disabled when no active track", () => {
    const { container } = render(<AudioLibrarySurface tracks={TRACKS} />);
    const btn = container.querySelector(
      "[data-mini-toggle]",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("empty-state shows when filter yields no rows", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS.filter((t) => t.category === "voce")}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='lecture']") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-audio-empty]")).toBeTruthy();
  });

  it("animated waveform stand-in renders for the playing row", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
      />,
    );
    expect(container.querySelector("[data-mini-waveform]")).toBeTruthy();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <AudioLibrarySurface
        tracks={TRACKS}
        active_id="brimo"
        is_playing
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
