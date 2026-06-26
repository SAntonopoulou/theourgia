/**
 * MediaLibrarySurface tests (H07 §S3 surface 14).
 *
 * Honesty + H07 rule coverage:
 *   - Sealed media is count-only (no thumbnails, no filename, no metadata)
 *   - Link counts render in --ink-mute (quiet)
 *   - Filter chips cover all kinds + Sealed
 *   - No --danger anywhere
 *   - "+ Upload" CTA hands off to onUpload
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type MediaAsset,
  MediaLibrarySurface,
} from "./index.js";

const ASSETS: MediaAsset[] = [
  {
    id: "m1",
    kind: "image",
    filename: "altar-dark-moon.jpg",
    meta_label: "15 Jun · 2.4 MB",
    link_count_label: "linked to 2 workings",
    size_bytes: 2_400_000,
    uploaded_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "m2",
    kind: "audio",
    filename: "brimo-sounding.m4a",
    meta_label: "15 Jun · 0:42",
    duration_label: "0:42",
    link_count_label: "linked voce",
    size_bytes: 500_000,
    uploaded_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "m3",
    kind: "video",
    filename: "banishing-rite.mp4",
    meta_label: "01 May · 4:18",
    duration_label: "4:18",
    link_count_label: "linked to 1 working",
    size_bytes: 12_000_000,
    uploaded_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "m4",
    kind: "document",
    filename: "oracle-transcript.pdf",
    meta_label: "12 Apr · 220 KB",
    link_count_label: null,
    size_bytes: 220_000,
    uploaded_at: "2026-04-12T00:00:00Z",
  },
];

describe("MediaLibrarySurface", () => {
  it("renders the grid + header + Upload CTA", () => {
    render(
      <MediaLibrarySurface
        assets={ASSETS}
        sealed_count={0}
      />,
    );
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(
      screen.getByText(/images, audio, video, documents/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload/i })).toBeInTheDocument();
  });

  it("renders one card per asset", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    expect(container.querySelectorAll("[data-media-id]")).toHaveLength(4);
  });

  it("filter chips narrow the grid by kind", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='images']") as HTMLButtonElement,
    );
    const cards = container.querySelectorAll("[data-media-id]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-media-kind")).toBe("image");
  });

  it("filter chips include Sealed", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={3} />,
    );
    expect(container.querySelector("[data-filter='sealed']")).toBeTruthy();
  });

  it("sealed card is COUNT-ONLY: no thumbnails, no filenames, no metadata of sealed items", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={3} />,
    );
    const sealedCard = container.querySelector("[data-sealed-card]");
    expect(sealedCard).toBeTruthy();
    expect(sealedCard?.textContent).toContain("Sealed media");
    expect(sealedCard?.textContent).toContain("3 files");
    expect(sealedCard?.textContent).toContain("count only");
    // No filenames of sealed items should appear
    expect(sealedCard?.querySelector("img")).toBeFalsy();
  });

  it("sealed card hidden when sealed_count is 0", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    expect(container.querySelector("[data-sealed-card]")).toBeFalsy();
  });

  it("Sealed filter shows ONLY sealed card (no plaintext)", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={3} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='sealed']") as HTMLButtonElement,
    );
    expect(container.querySelectorAll("[data-media-id]")).toHaveLength(0);
    expect(container.querySelector("[data-sealed-card]")).toBeTruthy();
  });

  it("link counts render in --ink-mute (quiet stat)", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    const linkCounts = container.querySelectorAll("[data-link-count]");
    expect(linkCounts.length).toBeGreaterThan(0);
    linkCounts.forEach((el) => {
      expect((el as HTMLElement).style.color).toBe("var(--ink-mute)");
    });
  });

  it("search filters by filename", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    fireEvent.change(
      container.querySelector("[data-ml-search]") as HTMLInputElement,
      { target: { value: "brimo" } },
    );
    const cards = container.querySelectorAll("[data-media-id]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-media-id")).toBe("m2");
  });

  it("sort respects user choice", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    fireEvent.change(
      container.querySelector("[data-ml-sort]") as HTMLSelectElement,
      { target: { value: "largest" } },
    );
    const cards = container.querySelectorAll("[data-media-id]");
    expect(cards[0]?.getAttribute("data-media-id")).toBe("m3");
  });

  it("onSelect fires with id on card click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <MediaLibrarySurface
        assets={ASSETS}
        sealed_count={0}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-media-id='m1']") as HTMLElement,
    );
    expect(onSelect).toHaveBeenCalledWith("m1");
  });

  it("onUpload fires from header CTA", () => {
    const onUpload = vi.fn();
    render(
      <MediaLibrarySurface
        assets={ASSETS}
        sealed_count={0}
        onUpload={onUpload}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Upload/i }));
    expect(onUpload).toHaveBeenCalled();
  });

  it("onOpenSealed fires from sealed card click", () => {
    const onOpenSealed = vi.fn();
    const { container } = render(
      <MediaLibrarySurface
        assets={ASSETS}
        sealed_count={2}
        onOpenSealed={onOpenSealed}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-sealed-card]") as HTMLElement,
    );
    expect(onOpenSealed).toHaveBeenCalled();
  });

  it("duration badge appears on audio/video", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={0} />,
    );
    expect(container.textContent).toContain("0:42");
    expect(container.textContent).toContain("4:18");
  });

  it("empty state when no assets and no sealed", () => {
    const { container } = render(
      <MediaLibrarySurface assets={[]} sealed_count={0} />,
    );
    expect(container.querySelector("[data-ml-empty]")).toBeTruthy();
    expect(container.textContent).toContain("No media here yet");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <MediaLibrarySurface assets={ASSETS} sealed_count={3} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
