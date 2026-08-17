/**
 * The record page — the phone's ledger read whole, and read only.
 *
 * What these check is fidelity: entries arrive as documents and are shown
 * as they are — the Greek unmangled, the mood in the phone's own words,
 * tombstones honoured — and an empty record explains how it fills rather
 * than sitting blank.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
} from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("../../lib/api.js", () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  ApiError: class extends Error {},
}));

import { RecordRoute, titleOf } from "../RecordRoute.js";

function renderRoute() {
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
                    <Route path="/" element={<RecordRoute />} />
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

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    kind: "observance",
    doc: {
      subjectKey: "moonrise",
      observedAt: "2026-08-17T06:12:00Z",
      note: "Χαῖρε Σελήνη",
      mood: 4,
      bodyFeeling: 2,
      context: { moonSignIndex: 7, planetaryHourRuler: "moon", sect: null },
    },
    updated_at_utc: "2026-08-17T06:12:01Z",
    deleted_at_utc: null,
    seq: 1,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mocks.apiGet.mockReset();
});

describe("titleOf", () => {
  it("names stations by their own key and the rest by their kind", () => {
    expect(titleOf("moonrise")).toBe("Moonrise");
    expect(titleOf("schedule:abc")).toBe("A scheduled keeping");
    expect(titleOf("ritual:r1")).toBe("A rite");
    expect(titleOf(undefined)).toBe("A keeping");
  });
});

describe("RecordRoute", () => {
  it("shows a keeping whole — the Greek, the mood, the sky", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [entry()],
      next_since: 1,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.getByText(/Χαῖρε Σελήνη/)).toBeTruthy();
    expect(screen.getByText(/Mood Glad/)).toBeTruthy();
    expect(screen.getByText(/Moon in Scorpio/)).toBeTruthy();
  });

  it("honours a tombstone — removed is not shown, and not forgotten", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [
        entry(),
        entry({
          id: "row-2",
          deleted_at_utc: "2026-08-17T09:00:00Z",
          doc: { subjectKey: "moonset", observedAt: "2026-08-17T16:00:00Z" },
        }),
      ],
      next_since: 2,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.queryByText("Moonset")).toBeNull();
  });

  it("pages until the shelf is read whole", async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        entries: [entry()],
        next_since: 1,
        more: true,
      })
      .mockResolvedValueOnce({
        entries: [
          entry({
            id: "row-3",
            doc: { subjectKey: "moonset", observedAt: "2026-08-17T16:00:00Z" },
          }),
        ],
        next_since: 3,
        more: false,
      });
    renderRoute();
    await flush();
    await flush();

    expect(mocks.apiGet).toHaveBeenCalledTimes(2);
    expect(mocks.apiGet).toHaveBeenLastCalledWith(
      "/record/entries?since=1&limit=500",
    );
    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.getByText("Moonset")).toBeTruthy();
  });

  it("an empty record says how it fills", async () => {
    mocks.apiGet.mockResolvedValue({ entries: [], next_since: 0, more: false });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    expect(screen.getByText(/Sync the record now/)).toBeTruthy();
  });
});
