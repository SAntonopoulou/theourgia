/**
 * AgentMemoryReader — H10 Cluster C9 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  AgentMemoryReaderSurface,
  type MemoryFileMeta,
} from "./AgentMemoryReaderSurface.js";

const FILES = [
  { name: "recurring-symbols.md", meta: "2.1 KB · 2 hours ago" },
  { name: "practitioner-prefs.md", meta: "0.8 KB · 3 days ago" },
  { name: "open-questions.md", meta: "1.2 KB · 1 week ago" },
] satisfies MemoryFileMeta[];

const CONTENT = `# Recurring symbols

Across Aspasia's readings, two motifs return:

- The Moon — appears in 4 of 5 Hekate readings
- The key / the act of locking — 3 readings`;

describe("AgentMemoryReaderSurface", () => {
  test("rule 59 — file list renders every file with its meta line", () => {
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    // recurring-symbols.md appears in the file list AND the viewer header.
    expect(
      screen.getAllByText("recurring-symbols.md").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("practitioner-prefs.md")).toBeInTheDocument();
    expect(screen.getByText("2.1 KB · 2 hours ago")).toBeInTheDocument();
  });

  test("active file name renders verbatim in the viewer header", () => {
    const { container } = render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    const header = container.querySelector('[data-active-file]');
    expect(header?.textContent).toBe("recurring-symbols.md");
  });

  test("reading mode renders the markdown content verbatim", () => {
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    expect(screen.getByText(/# Recurring symbols/)).toBeInTheDocument();
  });

  test("Edit toggles to editing mode + reveals the textarea + hint", () => {
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    fireEvent.click(screen.getByText("Edit"));
    expect(
      screen.getByLabelText("Edit recurring-symbols.md"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The agent reads this on its next wake/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("Save fires onSave with file name + edited body", () => {
    const onSave = vi.fn();
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Edit"));
    const textarea = screen.getByLabelText(
      "Edit recurring-symbols.md",
    );
    fireEvent.change(textarea, {
      target: { value: "# new content" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      "recurring-symbols.md",
      "# new content",
    );
  });

  test("Cancel reverts edits + flips back to reading mode", () => {
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(
      screen.getByLabelText("Edit recurring-symbols.md"),
      { target: { value: "modified" } },
    );
    fireEvent.click(screen.getByText("Cancel"));
    // Editor closes, reading mode shows.
    expect(
      screen.queryByLabelText("Edit recurring-symbols.md"),
    ).toBeNull();
    expect(screen.getByText(/# Recurring symbols/)).toBeInTheDocument();
  });

  test("Archive fires onArchive with the active file name", () => {
    const onArchive = vi.fn();
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
        onArchive={onArchive}
      />,
    );
    fireEvent.click(screen.getByText("Archive"));
    expect(onArchive).toHaveBeenCalledWith("recurring-symbols.md");
  });

  test("selecting a different file fires onSelectFile", () => {
    const onSelectFile = vi.fn();
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
        onSelectFile={onSelectFile}
      />,
    );
    fireEvent.click(screen.getByText("practitioner-prefs.md"));
    expect(onSelectFile).toHaveBeenCalledWith("practitioner-prefs.md");
  });

  test("Add fires onAdd", () => {
    const onAdd = vi.fn();
    render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
        onAdd={onAdd}
      />,
    );
    fireEvent.click(screen.getByText("+ Add"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test("empty file list shows the calm placeholder", () => {
    render(
      <AgentMemoryReaderSurface
        files={[]}
        activeFile=""
        content=""
      />,
    );
    expect(
      screen.getByText(/The agent hasn't written any memory yet/i),
    ).toBeInTheDocument();
  });

  test("rule 59 — there is NO delete affordance anywhere (only Archive)", () => {
    const { container } = render(
      <AgentMemoryReaderSurface
        files={FILES}
        activeFile="recurring-symbols.md"
        content={CONTENT}
      />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain(">delete<");
    expect(html).not.toContain("delete file");
    expect(html).not.toContain("delete memory");
  });
});
