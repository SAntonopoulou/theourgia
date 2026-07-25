/**
 * Astragaloi surface (H12 Sprint F2, Surface 3).
 *
 * Covered: transcription-first entry offering only the four legal
 * faces (rule 68 — never a 2 or a 5); recording a throw posts the
 * faces (no client-side sum, no client-side reading); the simulate
 * control sits apart and posts simulate:true; the result renders BOTH
 * channels; the interpretation PATCH carries the operator's own words;
 * history marks simulated casts and filters hit the wire.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAstragaloiCasts: vi.fn(),
  createAstragaloiCast: vi.fn(),
  updateAstragaloiCast: vi.fn(),
  getAstragaloiCorpusMeta: vi.fn(),
  listAwaitingJudgment: vi.fn(),
}));

vi.mock("../../data/api.js", () => ({
  apiMethods: mocks,
  apiClient: { request: () => Promise.resolve([]) },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { AstragaloiRoute } from "../AstragaloiRoute.js";

const CAST = {
  id: "cast-1",
  faces: [1, 3, 4, 4, 6],
  sum: 18,
  simulated: false,
  cast_at: "2026-07-24T18:40:00+03:00",
  question: "Whether to take the house",
  entry_id: null,
  declared_intent: null,
  oracle: {
    number: "XXX",
    god_greek: "Ἑρμῆς Ἐνόδιος",
    god_english: "Hermes of the Road",
    verse_greek: null,
    verse_english: "Go, and do not turn back.",
    valence: "favourable" as const,
  },
  ladder: { sphere: 8, octave: "embodied" as const, ground_element: "Earth" },
  interpretation: null,
  owner_id: "op",
  created_at: "2026-07-24T18:40:00+03:00",
  updated_at: "2026-07-24T18:40:00+03:00",
};

function withProviders(inner: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{inner}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.listAstragaloiCasts.mockReset().mockResolvedValue([CAST]);
  mocks.createAstragaloiCast.mockReset().mockResolvedValue(CAST);
  mocks.updateAstragaloiCast
    .mockReset()
    .mockResolvedValue({ ...CAST, interpretation: "The road opens." });
  mocks.getAstragaloiCorpusMeta.mockReset().mockResolvedValue({ caveats: [] });
  mocks.listAwaitingJudgment.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

/** Enter a full legal throw: 1 3 4 4 6. */
function enterThrow(): void {
  fireEvent.click(screen.getByRole("button", { name: "Bone 1, face 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Bone 2, face 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Bone 3, face 4" }));
  fireEvent.click(screen.getByRole("button", { name: "Bone 4, face 4" }));
  fireEvent.click(screen.getByRole("button", { name: "Bone 5, face 6" }));
}

describe("AstragaloiRoute — entry (rule 68)", () => {
  it("offers 1/3/4/6 per bone and never a 2 or a 5", async () => {
    const { container } = render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    const faceButtons = container.querySelectorAll("button[data-face]");
    expect(faceButtons).toHaveLength(20); // 5 bones × 4 faces
    expect(container.querySelector('button[data-face="2"]')).toBeNull();
    expect(container.querySelector('button[data-face="5"]')).toBeNull();
  });

  it("disables Read the cast until all five faces are recorded, then posts the faces", async () => {
    render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    const read = screen.getByRole("button", { name: "Read the cast" });
    expect(read).toBeDisabled();
    enterThrow();
    expect(screen.getByRole("button", { name: "Read the cast" })).not.toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("What is being asked…"), {
      target: { value: "Whether to take the house" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Read the cast" }));
    await waitFor(() => {
      expect(mocks.createAstragaloiCast).toHaveBeenCalledWith({
        faces: [1, 3, 4, 4, 6],
        question: "Whether to take the house",
      });
    });
  });

  it("renders BOTH channels once a cast resolves", async () => {
    const { container } = render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    enterThrow();
    fireEvent.click(screen.getByRole("button", { name: "Read the cast" }));
    await screen.findByText("Ἑρμῆς Ἐνόδιος");
    expect(container.querySelector('[data-component="oracle-channel-card"]')).not.toBeNull();
    expect(container.querySelector('[data-component="ladder-channel-card"]')).not.toBeNull();
    expect(screen.getByText(/two channels, side by side/i)).toBeInTheDocument();
    // The operator's field frames meaning as hers alone.
    expect(screen.getByText("What it means is yours.", { exact: false })).toBeInTheDocument();
  });
});

describe("AstragaloiRoute — the RNG apart (rule 67)", () => {
  it("posts simulate:true from the dashed bar — no client-side faces", async () => {
    mocks.createAstragaloiCast.mockResolvedValue({ ...CAST, simulated: true });
    const { container } = render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    const bar = container.querySelector('[data-component="simulated-throw-bar"]') as HTMLElement;
    expect(bar.style.borderStyle).toBe("dashed");
    fireEvent.click(screen.getByRole("button", { name: "Simulate a throw" }));
    await waitFor(() => {
      expect(mocks.createAstragaloiCast).toHaveBeenCalledWith({ simulate: true });
    });
    // The result card carries the forever-mark.
    await waitFor(() => {
      const reading = container.querySelector("[data-reading]");
      expect(reading).not.toBeNull();
    });
    const chips = container.querySelectorAll("[data-simulated-chip]");
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it("marks simulated casts in history", async () => {
    mocks.listAstragaloiCasts.mockResolvedValue([{ ...CAST, id: "sim-1", simulated: true }]);
    const { container } = render(withProviders(<AstragaloiRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-cast-id="sim-1"]')).not.toBeNull();
    });
    const row = container.querySelector('[data-cast-id="sim-1"]') as HTMLElement;
    expect(row.getAttribute("data-simulated")).toBe("true");
    expect(row.querySelector("[data-simulated-chip]")).not.toBeNull();
  });
});

describe("AstragaloiRoute — interpretation + history", () => {
  it("PATCHes the operator's own interpretation", async () => {
    render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    enterThrow();
    fireEvent.click(screen.getByRole("button", { name: "Read the cast" }));
    await screen.findByLabelText("Your reading");
    fireEvent.change(screen.getByLabelText("Your reading"), {
      target: { value: "The road opens." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save your reading" }));
    await waitFor(() => {
      expect(mocks.updateAstragaloiCast).toHaveBeenCalledWith("cast-1", {
        interpretation: "The road opens.",
      });
    });
  });

  it("selecting a history row shows its reading", async () => {
    const { container } = render(withProviders(<AstragaloiRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-cast-id="cast-1"]')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('[data-cast-id="cast-1"]') as HTMLElement);
    expect(await screen.findByText("Ἑρμῆς Ἐνόδιος")).toBeInTheDocument();
    expect(screen.getByText("Ogdoad")).toBeInTheDocument();
  });

  it("filters refetch through the wire (valence · simulated)", async () => {
    render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Earlier casts");
    fireEvent.click(screen.getByRole("button", { name: "Favourable" }));
    await waitFor(() => {
      expect(mocks.listAstragaloiCasts).toHaveBeenCalledWith(
        expect.objectContaining({ valence: "favourable" }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Simulated" }));
    await waitFor(() => {
      expect(mocks.listAstragaloiCasts).toHaveBeenCalledWith(
        expect.objectContaining({ simulated: true }),
      );
    });
  });

  it("opens the corpus-meta drawer with the caveats verbatim", async () => {
    mocks.getAstragaloiCorpusMeta.mockResolvedValue({
      title: "Astragaloi Data Corpus",
      caveats: ["Nollé decides."],
      gaps: { verse_greek_missing: ["VIII"] },
    });
    render(withProviders(<AstragaloiRoute />));
    await screen.findByText("Record the throw you made");
    fireEvent.click(screen.getByRole("button", { name: "About this corpus" }));
    expect(await screen.findByText("Nollé decides.")).toBeInTheDocument();
    expect(screen.getByText("verse_greek_missing")).toBeInTheDocument();
  });
});
