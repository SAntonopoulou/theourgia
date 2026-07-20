/**
 * Servitors route tests (v1-019).
 *
 * Covered: list from fixtures with all four ServitorStatusPill
 * variants + feed hints · detail sections (Feeding · Members · Tasks
 * with all four task-status variants · Lifespan) · empty state ·
 * "New servitor" posts to /servitors · "Record feeding" posts /feed.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  const servitor = (id: string, name: string, kind: string, status: string, members: string[]) => ({
    id,
    name,
    kind,
    purpose: "Guards the threshold of the flat.",
    sigil_upload_id: null,
    creation_entry_id: null,
    feeding_cadence: "Weekly",
    feeding_method: "attention + a lit lamp",
    last_fed_at: "2026-06-15T21:10:00",
    lifespan_limit: null,
    status,
    members,
    owner_id: null,
    created_at: "2026-02-02T00:00:00",
    updated_at: "2026-06-15T21:10:00",
  });
  const SERVITORS = [
    servitor("sv-active", "Phylax", "servitor", "active", []),
    servitor("sv-dormant", "Chalkeia", "egregore", "dormant", ["Soror E.", "Frater A."]),
    servitor("sv-retired", "Lampas", "servitor", "retired", []),
    servitor("sv-decommissioned", "Skiouros", "servitor", "decommissioned", []),
  ];
  const task = (id: string, description: string, status: string) => ({
    id,
    servitor_id: "sv-active",
    description,
    given_at: "2026-06-01T00:00:00",
    target_completion_at: null,
    completed_at: status === "completed" ? "2026-06-04T00:00:00" : null,
    status,
    outcome_notes: status === "completed" ? "Found beneath the third floorboard." : null,
    created_at: "2026-06-01T00:00:00",
    updated_at: "2026-06-01T00:00:00",
  });
  const TASKS = [
    task("task-1", "Watch the door", "pending"),
    task("task-2", "Turn away the salesman", "in-progress"),
    task("task-3", "Find the lost ring", "completed"),
    task("task-4", "Follow the neighbour's mood", "abandoned"),
  ];
  return {
    SERVITORS,
    TASKS,
    listServitors: vi.fn(() => Promise.resolve(SERVITORS)),
    listServitorTasks: vi.fn(() => Promise.resolve(TASKS)),
    createServitor: vi.fn(() => Promise.resolve(SERVITORS[0])),
    createServitorTask: vi.fn(() => Promise.resolve(TASKS[0])),
    feedServitor: vi.fn((_id: unknown, _input: unknown) => Promise.resolve(SERVITORS[0])),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listServitors: mocks.listServitors,
    listServitorTasks: mocks.listServitorTasks,
    createServitor: mocks.createServitor,
    createServitorTask: mocks.createServitorTask,
    feedServitor: mocks.feedServitor,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { ServitorsRoute } from "../ServitorsRoute.js";

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
                    <Route path="/" element={<ServitorsRoute />} />
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

describe("ServitorsRoute", () => {
  it("renders the list with all four status variants and feed hints", async () => {
    renderRoute();
    await flush();

    const items = document.querySelectorAll('[data-component="servitor-list-item"]');
    expect(items).toHaveLength(4);
    const statuses = new Set(Array.from(items).map((i) => i.getAttribute("data-servitor-status")));
    for (const s of ["active", "dormant", "retired", "decommissioned"]) {
      expect(statuses.has(s)).toBe(true);
    }
    // Weekly cadence + June-2026 last_fed_at → the elapsed hint, and
    // the egregore variant wording.
    expect(screen.getAllByText("Feeding elapsed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Group feeding elapsed")).toBeInTheDocument();
  });

  it("detail renders tasks with all four task-status variants", async () => {
    renderRoute();
    await flush();
    await flush();

    // First row (Phylax) selected by default.
    expect(screen.getByRole("heading", { name: "Phylax" })).toBeInTheDocument();
    const tasks = document.querySelectorAll('[data-component="servitor-task-card"]');
    expect(tasks).toHaveLength(4);
    const statuses = new Set(Array.from(tasks).map((t) => t.getAttribute("data-task-status")));
    for (const s of ["pending", "in-progress", "completed", "abandoned"]) {
      expect(statuses.has(s)).toBe(true);
    }
    // Outcome line renders on the completed task.
    expect(screen.getByText("Found beneath the third floorboard.")).toBeInTheDocument();
    // Lifespan copy for a being with no planned end.
    expect(screen.getByText("No planned end. It stands as long as it is fed.")).toBeInTheDocument();
  });

  it("shows the empty state when no servitors exist", async () => {
    mocks.listServitors.mockResolvedValueOnce([]);
    renderRoute();
    await flush();

    expect(screen.getByText("No servitors recorded.")).toBeInTheDocument();
  });

  it("creates a servitor via the prompt (POST /servitors)", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "New servitor" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Anemos" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await flush();

    expect(mocks.createServitor).toHaveBeenCalledWith({ name: "Anemos" });
  });

  it("records a feeding (POST /servitors/{id}/feed)", async () => {
    renderRoute();
    await flush();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Record feeding" }));
    await flush();

    expect(mocks.feedServitor).toHaveBeenCalledTimes(1);
    expect(mocks.feedServitor.mock.calls[0]?.[0]).toBe("sv-active");
  });
});
