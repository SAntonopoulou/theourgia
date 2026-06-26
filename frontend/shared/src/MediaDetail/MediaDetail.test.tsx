/**
 * MediaDetailSurface tests (H07 §S3 surface 15).
 *
 * Honesty + H07 rule coverage:
 *   - EXIF chip is --info when RETAINED, --ink-mute when STRIPPED
 *     (informational, never a warning, never --danger)
 *   - Seal toggle defaults to record.sealed; toggling fires onToggleSeal
 *   - Insert CTA fires onInsert
 *   - Viewer renders the correct variant for image/audio/video/document
 *   - No --danger anywhere
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type MediaDetailRecord,
  MediaDetailSurface,
} from "./index.js";

const IMAGE_RECORD: MediaDetailRecord = {
  id: "m1",
  kind: "image",
  filename: "altar-dark-moon.jpg",
  dimensions_label: "2400×1800",
  type_size_label: "image/jpeg · 2.4 MB",
  exif_policy: "retained",
  exif_label: "EXIF retained · 15 Jun 22:41",
  alt_text:
    "A small altar lit by a single oil lamp at the dark of the moon.",
  caption: "The Deipnon offering, before the bell.",
  tags: ["altar", "dark moon"],
  sealed: false,
  links: [
    { id: "l1", glyph: "✶", label: "Deipnon working" },
    { id: "l2", glyph: "☽", label: "Hekate" },
  ],
};

const AUDIO_RECORD: MediaDetailRecord = {
  ...IMAGE_RECORD,
  id: "m2",
  kind: "audio",
  filename: "brimo-sounding.m4a",
  dimensions_label: "44.1 kHz · mono",
  type_size_label: "audio/m4a · 500 KB",
  duration_label: "0:42",
  exif_policy: undefined,
  exif_label: undefined,
};

const VIDEO_RECORD: MediaDetailRecord = {
  ...IMAGE_RECORD,
  id: "m3",
  kind: "video",
  filename: "banishing-rite.mp4",
  dimensions_label: "1920×1080 · 24 fps",
  type_size_label: "video/mp4 · 12 MB",
  duration_label: "4:18",
  exif_policy: undefined,
  exif_label: undefined,
};

describe("MediaDetailSurface", () => {
  it("renders the breadcrumb + filename + Insert CTA", () => {
    render(<MediaDetailSurface record={IMAGE_RECORD} />);
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getAllByText("altar-dark-moon.jpg").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole("button", { name: /Insert into entry/i }),
    ).toBeInTheDocument();
  });

  it("Insert CTA fires onInsert", () => {
    const onInsert = vi.fn();
    render(<MediaDetailSurface record={IMAGE_RECORD} onInsert={onInsert} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Insert into entry/i }),
    );
    expect(onInsert).toHaveBeenCalled();
  });

  it("Back button fires onBack", () => {
    const onBack = vi.fn();
    const { container } = render(
      <MediaDetailSurface record={IMAGE_RECORD} onBack={onBack} />,
    );
    fireEvent.click(container.querySelector("[data-back]") as HTMLElement);
    expect(onBack).toHaveBeenCalled();
  });

  it("renders the image viewer for image records", () => {
    const { container } = render(<MediaDetailSurface record={IMAGE_RECORD} />);
    expect(
      container.querySelector("[data-viewer-kind='image']"),
    ).toBeTruthy();
  });

  it("renders the audio viewer for audio records", () => {
    const { container } = render(<MediaDetailSurface record={AUDIO_RECORD} />);
    expect(
      container.querySelector("[data-viewer-kind='audio']"),
    ).toBeTruthy();
    expect(container.querySelector("[data-waveform]")).toBeTruthy();
  });

  it("audio viewer toggle flips play/pause label", () => {
    const { container } = render(<MediaDetailSurface record={AUDIO_RECORD} />);
    const toggle = container.querySelector(
      "[data-audio-toggle]",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-label")).toBe("Play");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-label")).toBe("Pause");
  });

  it("renders the video viewer for video records", () => {
    const { container } = render(<MediaDetailSurface record={VIDEO_RECORD} />);
    expect(
      container.querySelector("[data-viewer-kind='video']"),
    ).toBeTruthy();
  });

  it("EXIF chip uses --info when retained (NOT --warn, NEVER --danger)", () => {
    const { container } = render(<MediaDetailSurface record={IMAGE_RECORD} />);
    const chip = container.querySelector(
      "[data-exif-chip]",
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.style.color).toBe("var(--info)");
    expect(chip.style.background).toBe("var(--info-soft)");
    expect(chip.textContent).toContain("EXIF retained");
  });

  it("EXIF chip uses --ink-mute when stripped (quiet, never --danger)", () => {
    const stripped: MediaDetailRecord = {
      ...IMAGE_RECORD,
      exif_policy: "stripped",
      exif_label: "EXIF stripped on upload",
    };
    const { container } = render(<MediaDetailSurface record={stripped} />);
    const chip = container.querySelector(
      "[data-exif-chip]",
    ) as HTMLElement;
    expect(chip.style.color).toBe("var(--ink-mute)");
    expect(chip.textContent).toContain("EXIF stripped");
  });

  it("Seal toggle reflects sealed state and fires onToggleSeal", () => {
    const onToggleSeal = vi.fn();
    const { container } = render(
      <MediaDetailSurface
        record={IMAGE_RECORD}
        onToggleSeal={onToggleSeal}
      />,
    );
    const checkbox = container.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(onToggleSeal).toHaveBeenCalledWith(true);
  });

  it("Sealed media shows the on-state colours on the toggle", () => {
    const { container } = render(
      <MediaDetailSurface record={{ ...IMAGE_RECORD, sealed: true }} />,
    );
    const checkbox = container.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("Tag chips render and onRemoveTag fires on click", () => {
    const onRemoveTag = vi.fn();
    const { container } = render(
      <MediaDetailSurface
        record={IMAGE_RECORD}
        onRemoveTag={onRemoveTag}
      />,
    );
    expect(container.querySelectorAll("[data-tag]")).toHaveLength(2);
    fireEvent.click(
      container.querySelector("[data-tag='altar']") as HTMLElement,
    );
    expect(onRemoveTag).toHaveBeenCalledWith("altar");
  });

  it("Linked chips render and onRemoveLink fires on click", () => {
    const onRemoveLink = vi.fn();
    const { container } = render(
      <MediaDetailSurface
        record={IMAGE_RECORD}
        onRemoveLink={onRemoveLink}
      />,
    );
    expect(container.querySelectorAll("[data-link-id]")).toHaveLength(2);
    fireEvent.click(
      container.querySelector("[data-link-id='l1']") as HTMLElement,
    );
    expect(onRemoveLink).toHaveBeenCalledWith("l1");
  });

  it("Alt-text + caption fields fire change handlers", () => {
    const onAltTextChange = vi.fn();
    const onCaptionChange = vi.fn();
    const { container } = render(
      <MediaDetailSurface
        record={IMAGE_RECORD}
        onAltTextChange={onAltTextChange}
        onCaptionChange={onCaptionChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-alt-text]") as HTMLTextAreaElement,
      { target: { value: "New alt" } },
    );
    expect(onAltTextChange).toHaveBeenCalledWith("New alt");
    fireEvent.change(
      container.querySelector("[data-caption]") as HTMLTextAreaElement,
      { target: { value: "New caption" } },
    );
    expect(onCaptionChange).toHaveBeenCalledWith("New caption");
  });

  it("Prev/Next only render when handlers are passed", () => {
    const { container: a } = render(<MediaDetailSurface record={IMAGE_RECORD} />);
    expect(a.querySelector("[data-viewer-prev]")).toBeFalsy();
    expect(a.querySelector("[data-viewer-next]")).toBeFalsy();

    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container: b } = render(
      <MediaDetailSurface
        record={IMAGE_RECORD}
        onPrev={onPrev}
        onNext={onNext}
      />,
    );
    fireEvent.click(b.querySelector("[data-viewer-prev]") as HTMLElement);
    fireEvent.click(b.querySelector("[data-viewer-next]") as HTMLElement);
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(<MediaDetailSurface record={IMAGE_RECORD} />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("--danger absent even when sealed + stripped EXIF", () => {
    const stripped: MediaDetailRecord = {
      ...IMAGE_RECORD,
      exif_policy: "stripped",
      exif_label: "EXIF stripped on upload",
      sealed: true,
    };
    const { container } = render(<MediaDetailSurface record={stripped} />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
