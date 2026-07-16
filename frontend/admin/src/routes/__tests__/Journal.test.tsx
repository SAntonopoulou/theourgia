/**
 * Journal route — backend FTS wiring tests (v1-015).
 *
 * The search box's behavior splits at SEARCH_MIN_CHARS (2):
 *   - under 2 chars: client-side filter over the loaded list
 *     (pre-existing behavior, unchanged);
 *   - 2+ chars: debounced (300ms) call to GET /api/v1/search,
 *     rendering SearchHitCard rows (with hit highlighting) plus the
 *     SealedExcludedCallout when sealed_excluded_count > 0.
 *
 * Covered here: the debounce collapses rapid keystrokes into one
 * call · hits render with <mark data-hit> highlights · the sealed
 * callout carries the honest count · clearing the query restores the
 * grouped timeline · the error path offers Retry · kind chips pass
 * through as `kind` filters.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
} from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const NOW_ISO = new Date().toISOString();
  const ENTRIES = [
    {
      id: "1",
      title: "Candle held its flame",
      type: "observation",
      excerpt: "The taper burned clean through the invocation.",
      glyph: "candle",
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    },
    {
      id: "2",
      title: "Mercury station",
      type: "synchronicity",
      excerpt: "Three lost packages in one morning.",
      glyph: "star",
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    },
  ];
  const SEARCH_RESPONSE = {
    hits: [{ ...ENTRIES[0], visibility: "personal" }],
    total: 1,
    limit: 20,
    offset: 0,
    sealed_excluded_count: 2,
  };
  return {
    ENTRIES,
    SEARCH_RESPONSE,
    listEntries: vi.fn(() => Promise.resolve(ENTRIES)),
    searchEntries: vi.fn(() => Promise.resolve(SEARCH_RESPONSE)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listEntries: mocks.listEntries,
    searchEntries: mocks.searchEntries,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { Journal } from "../Journal.js";

function renderJournal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider api={{ getSession: async () => null } as never}>
          <ActingAsProvider>
            <ToastProvider />
            <MemoryRouter>
              <TopbarProvider>
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/" element={<Journal />} />
                  </Routes>
                </Suspense>
              </TopbarProvider>
            </MemoryRouter>
          </ActingAsProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

/** Flush pending microtasks (resolved API promises) inside act. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Advance the debounce window and flush the resulting API promise. */
async function settleDebounce(ms = 300): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

function searchInput(): HTMLInputElement {
  return screen.getByLabelText("Search entries") as HTMLInputElement;
}

function type(value: string): void {
  fireEvent.change(searchInput(), { target: { value } });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // globals:false means RTL can't auto-register its cleanup hook.
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Journal — backend FTS search", () => {
  it("debounces rapid keystrokes into exactly one search call", async () => {
    renderJournal();
    await flush();

    type("ca");
    type("can");
    type("cand");
    expect(mocks.searchEntries).not.toHaveBeenCalled();

    // One ms shy of the window: still nothing.
    await settleDebounce(299);
    expect(mocks.searchEntries).not.toHaveBeenCalled();

    await settleDebounce(1);
    expect(mocks.searchEntries).toHaveBeenCalledTimes(1);
    expect(mocks.searchEntries).toHaveBeenCalledWith(
      { q: "cand", kind: undefined },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("renders hits as SearchHitCards with hit highlighting", async () => {
    renderJournal();
    await flush();

    type("candle");
    await settleDebounce();

    const card = document.querySelector('[data-component="search-hit-card"]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-hit-id", "1");

    const marks = card?.querySelectorAll("mark[data-hit]") ?? [];
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks[0]?.textContent?.toLowerCase()).toBe("candle");

    // The grouped timeline is replaced while a search is active — the
    // non-matching entry from the loaded list is gone.
    expect(screen.queryByText("Mercury station")).not.toBeInTheDocument();
  });

  it("shows the sealed-excluded callout with the honest count", async () => {
    renderJournal();
    await flush();

    type("candle");
    await settleDebounce();

    const callout = document.querySelector('[data-component="sealed-excluded-callout"]');
    expect(callout).not.toBeNull();
    expect(callout).toHaveAttribute("data-sealed-count", "2");
    expect(screen.getByText("2 sealed entries may also match.")).toBeInTheDocument();
  });

  it("clearing the query restores the grouped timeline without a new call", async () => {
    renderJournal();
    await flush();

    type("candle");
    await settleDebounce();
    expect(mocks.searchEntries).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-component="search-hit-card"]')).not.toBeNull();

    type("");
    await flush();

    // Both entries are back in the timeline; search artifacts are gone.
    expect(screen.getByText("Candle held its flame")).toBeInTheDocument();
    expect(screen.getByText("Mercury station")).toBeInTheDocument();
    expect(document.querySelector('[data-component="search-hit-card"]')).toBeNull();
    expect(document.querySelector('[data-component="sealed-excluded-callout"]')).toBeNull();

    await settleDebounce();
    expect(mocks.searchEntries).toHaveBeenCalledTimes(1);
  });

  it("queries under 2 chars stay client-side (no backend call)", async () => {
    renderJournal();
    await flush();

    type("x");
    await settleDebounce();

    expect(mocks.searchEntries).not.toHaveBeenCalled();
    // "x" matches neither loaded entry → the pre-existing empty state.
    expect(screen.getByText("No entries match the current filters.")).toBeInTheDocument();
  });

  it("renders the error state with a working Retry", async () => {
    mocks.searchEntries.mockRejectedValueOnce(new Error("boom"));
    renderJournal();
    await flush();

    type("candle");
    await settleDebounce();

    expect(screen.getByText(/Couldn't search entries: boom/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settleDebounce();

    expect(mocks.searchEntries).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-component="search-hit-card"]')).not.toBeNull();
  });

  it("passes active kind chips through as `kind` filters", async () => {
    renderJournal();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Working" }));
    type("candle");
    await settleDebounce();

    expect(mocks.searchEntries).toHaveBeenCalledTimes(1);
    expect(mocks.searchEntries).toHaveBeenCalledWith(
      { q: "candle", kind: ["ritual"] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
