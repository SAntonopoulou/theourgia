/**
 * OwnChartsEditor — authoring correspondence charts, the phone's §10 model.
 * Covers: a loaded chart opens into the grid with the canon's rows; a new
 * canonical chart is begun from the scale menu; Save PUTs the whole set with
 * blank cells stripped; a custom-scale chart offers no lookup mapping.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const CHARTS = {
    charts: [
      {
        id: "ch1",
        name: "Planetary table",
        scaleFamily: "planet",
        rows: [],
        columns: [
          {
            id: "c1",
            caption: "Metals",
            source: { title: "Occult Philosophy", author: "Agrippa", year: 1533 },
            categoryKey: "metal",
          },
        ],
        cells: { c1: { "planet.mars": { value: "Iron" } } },
      },
    ],
  };
  return {
    CHARTS,
    getMyCorrespondenceCharts: vi.fn(() => Promise.resolve(CHARTS)),
    putMyCorrespondenceCharts: vi.fn((input: unknown) => Promise.resolve(input)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiMethods: {
    getMyCorrespondenceCharts: mocks.getMyCorrespondenceCharts,
    putMyCorrespondenceCharts: mocks.putMyCorrespondenceCharts,
  },
}));

import { OwnChartsEditor } from "../OwnChartsEditor.js";

afterEach(() => {
  cleanup();
  mocks.getMyCorrespondenceCharts.mockClear();
  mocks.putMyCorrespondenceCharts.mockClear();
});

describe("OwnChartsEditor", () => {
  it("opens a canonical chart onto the canon's rows, its column credited", async () => {
    render(<OwnChartsEditor />);
    const card = await screen.findByRole("button", { name: /planetary table/i }, { timeout: 5000 });
    await act(async () => {
      fireEvent.click(card);
    });
    // The canon's rows, not stored ones — Mars among them, with the value held.
    expect(screen.getByText("Mars")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Iron")).toBeInTheDocument();
    // The column stands under its own source.
    expect(screen.getByText(/Agrippa, 1533/)).toBeInTheDocument();
  });

  it("begins a chart on a chosen scale and saves the set", async () => {
    render(<OwnChartsEditor />);
    await screen.findByRole("button", { name: /planetary table/i }, { timeout: 5000 });

    const save = screen.getByRole("button", { name: /save changes/i });
    expect(save).toBeDisabled(); // clean on load

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /new chart/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /a scale of your own/i }));
    });
    expect(screen.getByDisplayValue("Untitled chart")).toBeInTheDocument();
    expect(save).toBeEnabled();

    await act(async () => {
      fireEvent.click(save);
    });
    expect(mocks.putMyCorrespondenceCharts).toHaveBeenCalledTimes(1);
    const sent = mocks.putMyCorrespondenceCharts.mock.calls[0]?.[0] as {
      charts: { scaleFamily: string | null }[];
    };
    expect(sent.charts).toHaveLength(2);
    expect(sent.charts[1]?.scaleFamily).toBeNull();
  });

  it("strips blank cells on save — a blank cell is absent, never stored", async () => {
    render(<OwnChartsEditor />);
    const card = await screen.findByRole("button", { name: /planetary table/i }, { timeout: 5000 });
    await act(async () => {
      fireEvent.click(card);
    });

    const iron = screen.getByDisplayValue("Iron");
    await act(async () => {
      fireEvent.change(iron, { target: { value: "   " } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    });
    const sent = mocks.putMyCorrespondenceCharts.mock.calls[0]?.[0] as {
      charts: { cells: Record<string, Record<string, unknown>> }[];
    };
    expect(sent.charts[0]?.cells.c1).toEqual({});
  });

  it("offers no lookup mapping on a custom scale", async () => {
    render(<OwnChartsEditor />);
    await screen.findByRole("button", { name: /planetary table/i }, { timeout: 5000 });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /new chart/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /a scale of your own/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /\+ column/i }));
    });
    // Open the new column's apparatus…
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /yours/i }));
    });
    // …source fields are there, the mapping select is not.
    expect(screen.getByLabelText("Source title")).toBeInTheDocument();
    expect(screen.queryByText(/stands in the lookup as/i)).not.toBeInTheDocument();
  });
});
