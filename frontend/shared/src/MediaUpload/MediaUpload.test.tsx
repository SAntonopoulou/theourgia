/**
 * MediaUploadModal tests (H07 §S3 surface 16).
 *
 * Honesty + H07 rule coverage:
 *   - EXIF strip defaults ON for image drafts
 *   - Missing alt-text shows --warn (not --danger), upload still proceeds
 *   - Seal defaults OFF
 *   - Location precision defaults to "drop" (most private), only
 *     visible when has_location_exif === true
 *   - Cancel never uses --danger
 *   - Upload CTA never gates on alt-text
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type UploadFileDraft,
  MediaUploadModal,
} from "./index.js";

const IMG_WITH_LOC: UploadFileDraft = {
  id: "f1",
  filename: "altar-dark-moon.jpg",
  size_bytes: 2_400_000,
  kind: "image",
  alt_text: "",
  exif_strip: true,
  has_location_exif: true,
  location_precision: "drop",
  seal: false,
};

const AUDIO_NO_LOC: UploadFileDraft = {
  id: "f2",
  filename: "brimo-sounding.m4a",
  size_bytes: 500_000,
  kind: "audio",
  alt_text: "",
  exif_strip: true,
  has_location_exif: false,
  location_precision: "drop",
  seal: false,
};

describe("MediaUploadModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <MediaUploadModal open={false} onClose={() => {}} onUpload={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Pick phase when no initial files", () => {
    const { container } = render(
      <MediaUploadModal open onClose={() => {}} onUpload={() => {}} />,
    );
    expect(container.querySelector("[data-upload-dropzone]")).toBeTruthy();
    expect(container.querySelector("[data-upload-configure]")).toBeFalsy();
  });

  it("jumps to Configure phase when initial files are passed", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(container.querySelector("[data-upload-configure]")).toBeTruthy();
  });

  it("Steps indicator marks the active phase", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const configureStep = container.querySelector(
      "[data-step='configure']",
    ) as HTMLElement;
    expect(configureStep.getAttribute("data-step-on")).toBe("true");
  });

  it("EXIF strip defaults to ON for images", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const exif = container.querySelector(
      "[data-exif-toggle] input[type='checkbox']",
    ) as HTMLInputElement;
    expect(exif.checked).toBe(true);
  });

  it("Seal defaults to OFF", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const seal = container.querySelector(
      "[data-seal-toggle] input[type='checkbox']",
    ) as HTMLInputElement;
    expect(seal.checked).toBe(false);
  });

  it("Location precision picker visible only when has_location_exif is true", () => {
    const { container: a } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(a.querySelector("[data-location-precision]")).toBeTruthy();

    const { container: b } = render(
      <MediaUploadModal
        open
        initialFiles={[AUDIO_NO_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(b.querySelector("[data-location-precision]")).toBeFalsy();
  });

  it("Missing alt-text shows --warn copy (never --danger)", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const warn = container.querySelector(
      "[data-missing-alt-warn]",
    ) as HTMLElement;
    expect(warn).toBeTruthy();
    expect(warn.style.color).toBe("var(--warn)");
    expect(warn.textContent).toContain("Missing alt-text");
    expect(warn.textContent).toContain("upload can proceed");
  });

  it("Missing-alt-text warning disappears once text is entered", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(container.querySelector("[data-missing-alt-warn]")).toBeTruthy();
    fireEvent.change(
      container.querySelector("[data-alt-input]") as HTMLInputElement,
      { target: { value: "An altar at the dark of the moon." } },
    );
    expect(container.querySelector("[data-missing-alt-warn]")).toBeFalsy();
  });

  it("Upload CTA fires onUpload — NOT gated on missing alt-text", () => {
    const onUpload = vi.fn();
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={onUpload}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-upload-submit]") as HTMLButtonElement,
    );
    expect(onUpload).toHaveBeenCalled();
    expect(onUpload.mock.calls[0]?.[0]?.[0]?.alt_text).toBe("");
  });

  it("Footer totals show file count + size + missing alt count in --warn", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC, AUDIO_NO_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const totals = container.querySelector(
      "[data-upload-totals]",
    ) as HTMLElement;
    expect(totals.textContent).toContain("2 files");
    const warn = container.querySelector(
      "[data-upload-missing-alt-total]",
    ) as HTMLElement;
    expect(warn).toBeTruthy();
    expect(warn.style.color).toBe("var(--warn)");
    expect(warn.textContent).toContain("1 missing alt-text");
  });

  it("EXIF default note uses --info colour, not --warn or --danger", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    const note = container.querySelector(
      "[data-exif-default-note]",
    ) as HTMLElement;
    expect(note).toBeTruthy();
    expect(note.textContent).toContain("EXIF stripping is on by default");
    const infoSpan = note.querySelector("span") as HTMLElement;
    expect(infoSpan.style.color).toBe("var(--info)");
  });

  it("Cancel fires onClose without --danger styling", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={onClose}
        onUpload={() => {}}
      />,
    );
    const cancel = container.querySelector(
      "[data-upload-cancel]",
    ) as HTMLButtonElement;
    expect(cancel.style.color).not.toContain("danger");
    expect(cancel.style.borderColor).not.toContain("danger");
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalled();
  });

  it("Removing a file from the list updates totals", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC, AUDIO_NO_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(container.querySelectorAll("[data-upload-file]")).toHaveLength(2);
    fireEvent.click(
      container.querySelectorAll("[data-remove-file]")[1] as HTMLElement,
    );
    expect(container.querySelectorAll("[data-upload-file]")).toHaveLength(1);
  });

  it("Submit phase swaps the body to a progress region", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-upload-submit]") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-upload-progress]")).toBeTruthy();
    expect(container.querySelector("[role='progressbar']")).toBeTruthy();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <MediaUploadModal
        open
        initialFiles={[IMG_WITH_LOC, AUDIO_NO_LOC]}
        onClose={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
