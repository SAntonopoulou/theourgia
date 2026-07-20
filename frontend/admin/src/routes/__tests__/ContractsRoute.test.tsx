/**
 * Contracts route tests (v1-019).
 *
 * Covered: status-sectioned list from fixtures with all six
 * ContractStatusPill variants (collapsed sections expand on click) ·
 * empty state · detail with ObligationTable · the compose drawer
 * posts to /contracts.
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
      id: "ent-brigid",
      name: "Brigid",
      kind: "deity",
      aliases: [],
      glyph: "entity",
      description: null,
      tradition: "celtic",
      created_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    },
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
  ];
  const contract = (id: string, title: string, status: string, binding: string) => ({
    id,
    entity_id: "ent-brigid",
    title,
    terms: status === "active" ? "A candle kept at the hearth each evening." : null,
    our_obligations:
      status === "active"
        ? [
            {
              id: "ob-1",
              description: "Daily candle at the hearth shrine",
              status: "pending",
              due_at: "2099-06-24T20:00:00",
            },
          ]
        : [],
    their_obligations:
      status === "active"
        ? [
            {
              id: "ob-2",
              description: "Steady hand for the forge work",
              status: "in-progress",
            },
          ]
        : [],
    status,
    effective_at: "2026-05-01T00:00:00",
    expires_at: null,
    renewable: false,
    binding_kind: binding,
    witness_entity_ids: status === "active" ? ["ent-hekate"] : [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-06-01T00:00:00",
    updated_at: "2026-06-01T00:00:00",
  });
  const CONTRACTS = [
    contract("ct-active", "Midsummer accord", "active", "written"),
    contract("ct-draft", "Threshold ward", "draft", "verbal"),
    contract("ct-fulfilled", "Healing accord", "fulfilled", "breath"),
    contract("ct-dissolved", "Crossroads bargain", "dissolved", "blood"),
    contract("ct-expired", "Winter watch", "expired", "item-bound"),
    contract("ct-breached", "Silence pact", "breached", "name-bound"),
  ];
  return {
    CONTRACTS,
    ENTITIES,
    listContracts: vi.fn(() => Promise.resolve(CONTRACTS)),
    listEntities: vi.fn(() => Promise.resolve(ENTITIES)),
    createContract: vi.fn((_input: unknown) => Promise.resolve(CONTRACTS[1])),
    updateContract: vi.fn((_id: unknown, _patch: unknown) => Promise.resolve(CONTRACTS[0])),
    fulfillObligation: vi.fn(() => Promise.resolve(CONTRACTS[0])),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listContracts: mocks.listContracts,
    listEntities: mocks.listEntities,
    createContract: mocks.createContract,
    updateContract: mocks.updateContract,
    fulfillObligation: mocks.fulfillObligation,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { ContractsRoute } from "../ContractsRoute.js";

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
                <VaultTopbar />
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/" element={<ContractsRoute />} />
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

describe("ContractsRoute", () => {
  it("groups the list by status with the design's default collapse", async () => {
    renderRoute();
    await flush();

    // Active + Drafts open by default; the four closed states collapsed.
    let items = document.querySelectorAll('[data-component="contract-list-item"]');
    expect(items).toHaveLength(2);

    for (const section of ["Fulfilled", "Dissolved", "Expired", "Breached"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`${section}\\s*\\d`) }));
    }
    items = document.querySelectorAll('[data-component="contract-list-item"]');
    expect(items).toHaveLength(6);

    // All six status variants reach the DOM.
    const statuses = new Set(Array.from(items).map((i) => i.getAttribute("data-contract-status")));
    for (const s of ["draft", "active", "fulfilled", "expired", "dissolved", "breached"]) {
      expect(statuses.has(s)).toBe(true);
    }
  });

  it("selects the active contract by default and renders its detail", async () => {
    renderRoute();
    await flush();

    // Detail header pill.
    const pill = document.querySelector('[data-component="contract-status-pill"]');
    expect(pill).toHaveAttribute("data-contract-status", "active");
    expect(screen.getByRole("heading", { name: "Midsummer accord" })).toBeInTheDocument();
    // Terms + both obligation columns.
    expect(screen.getByText("A candle kept at the hearth each evening.")).toBeInTheDocument();
    expect(screen.getByText("Daily candle at the hearth shrine")).toBeInTheDocument();
    expect(screen.getByText("Steady hand for the forge work")).toBeInTheDocument();
    // Witness chip resolves the entity name.
    expect(screen.getByText("Hekate")).toBeInTheDocument();
  });

  it("shows the empty state when no contracts exist", async () => {
    mocks.listContracts.mockResolvedValueOnce([]);
    renderRoute();
    await flush();

    expect(screen.getByText("No contracts recorded.")).toBeInTheDocument();
  });

  it("composes a pact through the drawer (POST /contracts)", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Compose a pact" }));
    const drawer = screen.getByRole("dialog", { name: "Compose a pact" });

    fireEvent.change(within(drawer).getByPlaceholderText("e.g. Midsummer accord"), {
      target: { value: "Autumn accord" },
    });
    fireEvent.change(within(drawer).getByPlaceholderText("An obligation…"), {
      target: { value: "A cup of wine at the equinox" },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save as draft" }));
    await flush();

    expect(mocks.createContract).toHaveBeenCalledTimes(1);
    const payload = mocks.createContract.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.title).toBe("Autumn accord");
    expect(payload.status).toBe("draft");
    expect(payload.entity_id).toBe("ent-brigid");
    expect(payload.our_obligations).toEqual([
      { id: "ob-1", description: "A cup of wine at the equinox", status: "pending" },
    ]);
  });

  it("status transition asks the designed confirm and PATCHes", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Mark breached" }));
    expect(screen.getByText("Mark this pact breached?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Breaches are part of the record. Document what happened — the obligations and their history are preserved.",
      ),
    ).toBeInTheDocument();
    const dialogButtons = screen.getAllByRole("button", { name: "Mark breached" });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]!);
    await flush();

    expect(mocks.updateContract).toHaveBeenCalledWith("ct-active", { status: "breached" });
  });
});
