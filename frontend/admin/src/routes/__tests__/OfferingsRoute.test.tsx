/**
 * Offerings route tests (v1-019).
 *
 * Covered: timeline renders from fixtures with all five reception-pill
 * variants · day grouping · designed empty states (ledger-empty vs
 * filters-exclude, with Clear filters) · active-practices rail with
 * pause/resume PATCH · the Record drawer posts to /offerings.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
  VaultTopbar,
} from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ENTITIES = [
    {
      id: "ent-hekate",
      name: "Hekate",
      kind: "deity",
      aliases: [],
      glyph: "entity",
      description: null,
      tradition: "hellenic",
      created_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    },
    {
      id: "ent-yiayia",
      name: "Yiayia (María)",
      kind: "ancestor",
      aliases: [],
      glyph: "entity",
      description: null,
      tradition: "folk",
      created_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    },
  ];
  // Local-naive datetimes so day-group labels are TZ-stable in CI.
  const offering = (
    id: string,
    entity: string,
    offeredAt: string,
    reception: string | null,
    intention: string,
  ) => ({
    id,
    entity_id: entity,
    working_id: null,
    offered_at: offeredAt,
    location: null,
    location_lat: null,
    location_lon: null,
    items: [{ kind: "wine", quantity: "1", unit: "cup" }],
    intention,
    reception_perceived: reception,
    outcome_notes: null,
    astro_snapshot: "Sun in Gemini",
    calendar_snapshot: null,
    owner_id: null,
    created_at: offeredAt,
    updated_at: offeredAt,
  });
  const OFFERINGS = [
    offering("off-1", "ent-hekate", "2026-06-21T23:30:00", "overwhelming", "Deipnon."),
    offering("off-2", "ent-hekate", "2026-06-21T19:00:00", "strong", "Gratitude."),
    offering("off-3", "ent-hekate", "2026-06-20T08:12:00", "clear", "Paean."),
    offering("off-4", "ent-hekate", "2026-06-20T06:05:00", "faint", "Libation."),
    offering("off-5", "ent-yiayia", "2026-06-18T20:00:00", "none", "Remembrance."),
  ];
  const RECURRING = [
    {
      id: "rec-1",
      entity_id: "ent-hekate",
      label: "Hekate's Deipnon",
      cadence: "Every dark moon",
      items_template: [{ kind: "food" }],
      next_due_at: "2099-06-23T21:00:00",
      is_active: true,
      owner_id: null,
      created_at: "2026-01-05T00:00:00",
      updated_at: "2026-05-26T00:00:00",
    },
    {
      id: "rec-2",
      entity_id: "ent-yiayia",
      label: "Memorial candle",
      cadence: "Every Sunday",
      items_template: [{ kind: "time" }],
      next_due_at: null,
      is_active: false,
      owner_id: null,
      created_at: "2026-03-10T00:00:00",
      updated_at: "2026-06-14T00:00:00",
    },
  ];
  return {
    ENTITIES,
    OFFERINGS,
    RECURRING,
    listOfferings: vi.fn(() => Promise.resolve(OFFERINGS)),
    listRecurringOfferings: vi.fn(() => Promise.resolve(RECURRING)),
    listEntities: vi.fn(() => Promise.resolve(ENTITIES)),
    createOffering: vi.fn((_input: unknown) => Promise.resolve({ ...OFFERINGS[0], id: "off-new" })),
    updateRecurringOffering: vi.fn((_id: unknown, _patch: unknown) =>
      Promise.resolve({ ...RECURRING[0], is_active: false }),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listOfferings: mocks.listOfferings,
    listRecurringOfferings: mocks.listRecurringOfferings,
    listEntities: mocks.listEntities,
    createOffering: mocks.createOffering,
    updateRecurringOffering: mocks.updateRecurringOffering,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { OfferingsRoute } from "../OfferingsRoute.js";

function renderRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider api={{ getSession: async () => null } as never}>
          <ActingAsProvider>
            <ToastProvider />
            <MemoryRouter>
              <TopbarProvider>
                {/* Topbar mounted so the registered primary action renders. */}
                <VaultTopbar />
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/" element={<OfferingsRoute />} />
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OfferingsRoute", () => {
  it("renders the timeline from fixtures with all five reception variants", async () => {
    renderRoute();
    await flush();

    const cards = document.querySelectorAll('[data-component="offering-timeline-card"]');
    expect(cards).toHaveLength(5);
    const receptions = new Set(Array.from(cards).map((c) => c.getAttribute("data-reception")));
    for (const level of ["none", "faint", "clear", "strong", "overwhelming"]) {
      expect(receptions.has(level)).toBe(true);
    }
    // Day-grouped: three distinct days in the fixture set.
    expect(screen.getByText(/21 June/)).toBeInTheDocument();
    expect(screen.getByText(/20 June/)).toBeInTheDocument();
    expect(screen.getByText(/18 June/)).toBeInTheDocument();
  });

  it("shows the ledger-empty state when nothing is recorded", async () => {
    mocks.listOfferings.mockResolvedValueOnce([]);
    renderRoute();
    await flush();

    expect(screen.getByText("The offerings ledger is empty")).toBeInTheDocument();
    expect(
      screen.getByText("Record what you've given so the relationship can be witnessed."),
    ).toBeInTheDocument();
  });

  it("shows the filters-exclude empty state with a working Clear filters", async () => {
    renderRoute();
    await flush();

    // Yiayia has only a "none" offering — filtering her + Clear excludes all.
    fireEvent.change(screen.getByLabelText("Being"), { target: { value: "ent-yiayia" } });
    fireEvent.click(screen.getByRole("button", { name: /Clear$/ }));
    expect(screen.getByText("Nothing matches those filters")).toBeInTheDocument();
    expect(
      screen.getByText("Loosen the being or reception filter to see more."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(document.querySelectorAll('[data-component="offering-timeline-card"]')).toHaveLength(5);
  });

  it("renders the active-practices rail and PATCHes pause/resume", async () => {
    renderRoute();
    await flush();

    expect(screen.getByText("Active practices")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    const practiceCards = document.querySelectorAll('[data-component="active-practice-card"]');
    expect(practiceCards).toHaveLength(2);
    // The paused practice reads "Paused", never a due nag.
    expect(screen.getByText("Paused")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Pause Hekate's Deipnon" }));
    await flush();
    expect(mocks.updateRecurringOffering).toHaveBeenCalledWith("rec-1", { is_active: false });
  });

  it("records an offering through the drawer (POST /offerings)", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Record offering" }));
    const drawer = screen.getByRole("dialog", { name: "Record an offering" });

    fireEvent.change(within(drawer).getByPlaceholderText("What was it for?"), {
      target: { value: "A first fruits offering." },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Record" }));
    await flush();

    expect(mocks.createOffering).toHaveBeenCalledTimes(1);
    const payload = mocks.createOffering.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.entity_id).toBe("ent-hekate");
    expect(payload.intention).toBe("A first fruits offering.");
    expect(payload.reception_perceived).toBe("none");
  });
});
