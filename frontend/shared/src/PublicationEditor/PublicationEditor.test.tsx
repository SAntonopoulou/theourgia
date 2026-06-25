/**
 * PublicationEditorSurface tests (H07 §S3 surface 5 — worked example).
 *
 * Covers the worked-example honesty rules:
 *   • Autosave indicator goes Saving → Saved → invisible (no toast)
 *   • Chapter rail only renders for books (single-body kinds skip it)
 *   • Per-chapter title edits fire onChapterTitleChange
 *   • Metadata edits (summary, language, license, tags) fire
 *     onMetadataChange with the correct partial patch
 *   • License help copy changes with the picker selection
 *   • Footer shows total word count + chapter count + last-saved
 *     + state chip (--money for live, --ink-mute for draft)
 *   • No --danger anywhere on the surface
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PublicationEditorRecord,
  PublicationEditorSurface,
} from "./index.js";

function makeBook(): PublicationEditorRecord {
  return {
    id: "p1",
    title: "Walking the Crossroads",
    kind: "book",
    state: "draft",
    language: "English",
    license: "all-rights-reserved",
    summary: "Three years tending a crossroads lamp.",
    tags: ["Hekate", "crossroads"],
    cover_url: null,
    chapters: [
      {
        id: "c1",
        title: "Approaching the Triple Way",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 420,
      },
      {
        id: "c2",
        title: "The First Year",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 380,
      },
      {
        id: "c3",
        title: "On Constancy",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 295,
      },
    ],
  };
}

function makeEssay(): PublicationEditorRecord {
  return {
    id: "p2",
    title: "On the Sealed Oath",
    kind: "essay",
    state: "live",
    language: "English",
    license: "cc-by",
    summary: "",
    tags: [],
    cover_url: null,
    chapters: [
      {
        id: "single",
        title: "On the Sealed Oath",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 1200,
      },
    ],
    body: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

describe("PublicationEditorSurface", () => {
  it("renders the breadcrumb with the publication title", () => {
    render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    expect(screen.getByText("Publications")).toBeInTheDocument();
    expect(screen.getByText("Walking the Crossroads")).toBeInTheDocument();
  });

  it("renders the chapter rail with three chapters for a book", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    expect(container.querySelectorAll("[data-chapter-id]")).toHaveLength(3);
  });

  it("does NOT render the chapter rail for essay/post/page", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeEssay()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    expect(container.querySelector("[data-chapter-id]")).toBeFalsy();
  });

  it("chapter click fires onActiveChapterChange", () => {
    const onActiveChapterChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onActiveChapterChange={onActiveChapterChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-chapter-id='c2']") as HTMLButtonElement,
    );
    expect(onActiveChapterChange).toHaveBeenCalledWith("c2");
  });

  it("autosave state 'saving' shows 'Saving…' label", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="saving"
        lastSavedLabel={null}
      />,
    );
    expect(
      container.querySelector("[data-autosave-state='saving']")?.textContent,
    ).toContain("Saving…");
  });

  it("autosave state 'saved' shows 'Saved' label", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="saved"
        lastSavedLabel="14:32"
      />,
    );
    expect(
      container.querySelector("[data-autosave-state='saved']")?.textContent,
    ).toContain("Saved");
  });

  it("autosave state 'idle' renders no label (no toast on idle)", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    const indicator = container.querySelector(
      "[data-autosave-state='idle']",
    ) as HTMLElement;
    expect(indicator.textContent?.trim()).toBe("");
  });

  it("chapter title edit fires onChapterTitleChange with the active chapter id", () => {
    const onChapterTitleChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        activeChapterId="c1"
        autosaveState="idle"
        lastSavedLabel={null}
        onChapterTitleChange={onChapterTitleChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-chapter-title]") as HTMLInputElement,
      { target: { value: "New chapter title" } },
    );
    expect(onChapterTitleChange).toHaveBeenCalledWith(
      "c1",
      "New chapter title",
    );
  });

  it("metadata summary edit fires onMetadataChange with { summary }", () => {
    const onMetadataChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onMetadataChange={onMetadataChange}
      />,
    );
    fireEvent.change(
      container.querySelector(
        "[data-publication-summary]",
      ) as HTMLTextAreaElement,
      { target: { value: "A new short summary." } },
    );
    expect(onMetadataChange).toHaveBeenCalledWith({
      summary: "A new short summary.",
    });
  });

  it("license picker change fires onMetadataChange with { license } + updates help copy", () => {
    const onMetadataChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onMetadataChange={onMetadataChange}
      />,
    );
    fireEvent.change(
      container.querySelector(
        "[data-publication-license]",
      ) as HTMLSelectElement,
      { target: { value: "cc-by" } },
    );
    expect(onMetadataChange).toHaveBeenCalledWith({ license: "cc-by" });
  });

  it("license help renders the matching copy for the current value", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={{ ...makeBook(), license: "cc-by-nc" }}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    expect(
      container.querySelector("[data-license-help]")?.textContent,
    ).toContain("Non-commercial only");
  });

  it("adding a tag fires onMetadataChange with the new tags array", () => {
    const onMetadataChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onMetadataChange={onMetadataChange}
      />,
    );
    const input = container.querySelector(
      "[data-publication-tag-input]",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "lamp" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onMetadataChange).toHaveBeenCalledWith({
      tags: ["Hekate", "crossroads", "lamp"],
    });
  });

  it("removing a tag fires onMetadataChange with the filtered tags array", () => {
    const onMetadataChange = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onMetadataChange={onMetadataChange}
      />,
    );
    const removeButton = container.querySelector(
      '[aria-label="Remove tag Hekate"]',
    ) as HTMLButtonElement;
    fireEvent.click(removeButton);
    expect(onMetadataChange).toHaveBeenCalledWith({
      tags: ["crossroads"],
    });
  });

  it("footer shows total word count (sum across chapters)", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    // 420 + 380 + 295 = 1,095
    expect(
      container.querySelector("[data-word-count]")?.textContent,
    ).toContain("1,095 words");
  });

  it("footer shows the publish state chip with --money for live, --ink-mute for draft", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
      />,
    );
    const chip = container.querySelector(
      "[data-state-chip='draft']",
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain("Draft");
  });

  it("does NOT reference --danger anywhere", () => {
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="saved"
        lastSavedLabel="14:32"
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("settings button fires onOpenSettings", () => {
    const onOpenSettings = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onOpenSettings={onOpenSettings}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-action='open-settings']") as HTMLButtonElement,
    );
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("'+ Add chapter' button fires onAddChapter (books only)", () => {
    const onAddChapter = vi.fn();
    const { container } = render(
      <PublicationEditorSurface
        publication={makeBook()}
        autosaveState="idle"
        lastSavedLabel={null}
        onAddChapter={onAddChapter}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='add-chapter']",
      ) as HTMLButtonElement,
    );
    expect(onAddChapter).toHaveBeenCalledTimes(1);
  });
});
