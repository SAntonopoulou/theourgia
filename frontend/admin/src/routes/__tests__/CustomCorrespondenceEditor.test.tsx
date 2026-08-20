/**
 * CustomCorrespondenceEditor — building your own correspondence tables.
 * Covers: existing tables load into editable fields; "New table" adds one and
 * enables Save; Save PUTs the whole set.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const TABLES = {
    tables: [
      {
        id: "t1",
        title: "My 777",
        columns: ["Metal"],
        rows: [{ subject: "Mars", cells: { Metal: "Iron" } }],
      },
    ],
  };
  return {
    TABLES,
    getMyCorrespondences: vi.fn(() => Promise.resolve(TABLES)),
    putMyCorrespondences: vi.fn((input: unknown) => Promise.resolve(input)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiMethods: {
    getMyCorrespondences: mocks.getMyCorrespondences,
    putMyCorrespondences: mocks.putMyCorrespondences,
  },
}));

import { CustomCorrespondenceEditor } from "../CustomCorrespondenceEditor.js";

afterEach(() => {
  cleanup();
  mocks.getMyCorrespondences.mockClear();
  mocks.putMyCorrespondences.mockClear();
});

describe("CustomCorrespondenceEditor", () => {
  it("loads a table into editable fields", async () => {
    render(<CustomCorrespondenceEditor />);
    expect(await screen.findByDisplayValue("My 777")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mars")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Iron")).toBeInTheDocument();
  });

  it("adds a table and saves the set", async () => {
    render(<CustomCorrespondenceEditor />);
    await screen.findByDisplayValue("My 777");

    const save = screen.getByRole("button", { name: /save changes/i });
    expect(save).toBeDisabled(); // clean on load

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /new table/i }));
    });
    expect(screen.getByDisplayValue("Untitled table")).toBeInTheDocument();
    expect(save).toBeEnabled();

    await act(async () => {
      fireEvent.click(save);
    });
    expect(mocks.putMyCorrespondences).toHaveBeenCalledTimes(1);
    const sent = mocks.putMyCorrespondences.mock.calls[0]?.[0] as { tables: unknown[] };
    expect(sent.tables).toHaveLength(2); // the loaded one + the new one
  });
});
