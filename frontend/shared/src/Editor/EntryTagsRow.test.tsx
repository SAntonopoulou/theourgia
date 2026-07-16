/**
 * EntryTagsRow tests — v1-001.
 *
 * The harness mirrors the admin Editor wiring: `onChange` updates
 * local state and PATCHes via an `updateEntry`-shaped callback, so
 * the tests cover both the chip interactions and the PATCH call.
 */

import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EntryTagsRow } from "./EntryTagsRow.js";

type UpdateEntryFn = (
  id: string,
  patch: { tags?: string[]; tradition_tags?: string[] },
) => Promise<unknown>;

function Harness({
  updateEntry,
  initial = [],
}: {
  updateEntry: UpdateEntryFn;
  initial?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <EntryTagsRow
      label="Tags"
      values={tags}
      onChange={(next) => {
        setTags(next);
        void updateEntry("entry-1", { tags: next });
      }}
    />
  );
}

describe("EntryTagsRow", () => {
  it("renders one removable chip per value", () => {
    render(
      <EntryTagsRow
        label="Tags"
        values={["moon", "rite"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove moon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove rite" })).toBeInTheDocument();
  });

  it("has an accessible, labelled input", () => {
    render(<EntryTagsRow label="Tradition tags" values={[]} onChange={vi.fn()} />);
    expect(
      screen.getByRole("textbox", {
        name: "Tradition tags — type and press Enter to add",
      }),
    ).toBeInTheDocument();
  });

  it("typing a tag and pressing Enter appends a chip and PATCHes", async () => {
    const updateEntry = vi.fn().mockResolvedValue({});
    render(<Harness updateEntry={updateEntry} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "moon{Enter}");
    expect(screen.getByRole("button", { name: "Remove moon" })).toBeInTheDocument();
    expect(updateEntry).toHaveBeenCalledWith("entry-1", { tags: ["moon"] });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("removing a chip via its remove button PATCHes the shrunk list", async () => {
    const updateEntry = vi.fn().mockResolvedValue({});
    render(<Harness updateEntry={updateEntry} initial={["moon", "rite"]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove moon" }));
    expect(screen.queryByRole("button", { name: "Remove moon" })).not.toBeInTheDocument();
    expect(updateEntry).toHaveBeenCalledWith("entry-1", { tags: ["rite"] });
  });

  it("Backspace in the empty input removes the last chip", async () => {
    const updateEntry = vi.fn().mockResolvedValue({});
    render(<Harness updateEntry={updateEntry} initial={["moon", "rite"]} />);
    const user = userEvent.setup();
    screen.getByRole("textbox").focus();
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remove rite" })).not.toBeInTheDocument();
    expect(updateEntry).toHaveBeenCalledWith("entry-1", { tags: ["moon"] });
  });

  it("Backspace with a draft in progress edits the draft, not the chips", async () => {
    const onChange = vi.fn();
    render(<EntryTagsRow label="Tags" values={["moon"]} onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "ri{Backspace}");
    expect(screen.getByRole("textbox")).toHaveValue("r");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Enter with a duplicate clears the draft without firing onChange", async () => {
    const onChange = vi.fn();
    render(<EntryTagsRow label="Tags" values={["moon"]} onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "moon{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("Enter with only whitespace does nothing", async () => {
    const onChange = vi.fn();
    render(<EntryTagsRow label="Tags" values={[]} onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "   {Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });
});
