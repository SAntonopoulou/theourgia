/**
 * AgentCostDashboard route wiring tests (v1-031).
 *
 * Covered: the route calls the /agents/costs/summary proxy (month
 * window) and maps the response onto the C10 surface — vault totals,
 * per-install rows with real cost/token figures, the rule-58
 * fresh/resume split, and the rule-56 cap percentage. Unknown kinds
 * fall back to the archivist glyph and a capless install shows no cap
 * figure.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
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
  const installRow = (overrides: Record<string, unknown>) => ({
    install_id: "install-1",
    display_name: "Study tutor",
    kind: "study-tutor",
    cost_usd: "1.80",
    tokens_in: 300_000,
    tokens_out: 80_000,
    tokens_cache: 120_000,
    tokens_fresh: 180_000,
    tokens_resume: 640_000,
    run_count: 7,
    monthly_cap_usd: "10.00",
    month_cost_usd: "1.80",
    cap_used_pct: 18,
    ...overrides,
  });
  const SUMMARY = {
    vault_id: "vault-1",
    window: "month",
    window_start: "2026-07-01T00:00:00+00:00",
    totals: {
      cost_usd: "3.10",
      tokens_in: 512_000,
      tokens_out: 128_000,
      tokens_cache: 180_000,
      tokens_fresh: 260_000,
      tokens_resume: 880_000,
      run_count: 12,
    },
    per_install: [
      installRow({}),
      installRow({
        install_id: "install-2",
        display_name: "My bespoke helper",
        kind: "my-bespoke-helper",
        cost_usd: "1.30",
        tokens_fresh: 80_000,
        tokens_resume: 240_000,
        monthly_cap_usd: "0",
        month_cost_usd: "1.30",
        cap_used_pct: 0,
      }),
    ],
  };
  return {
    SUMMARY,
    getAgentCostSummary: vi.fn(() => Promise.resolve(SUMMARY)),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    getAgentCostSummary: mocks.getAgentCostSummary,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { AgentCostDashboardRoute } from "../AgentCostDashboardRoute.js";

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
                    <Route path="/" element={<AgentCostDashboardRoute />} />
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

describe("AgentCostDashboardRoute", () => {
  it("requests the month window from the summary proxy", async () => {
    renderRoute();
    await flush();
    expect(mocks.getAgentCostSummary).toHaveBeenCalledWith("month");
  });

  it("renders vault totals from the summary", async () => {
    renderRoute();
    expect(await screen.findByText("$3.10")).toBeTruthy();
    // in + out + cache = 820K.
    expect(screen.getByText("820K")).toBeTruthy();
    expect(screen.getByText(/in 512K · out 128K · cache 180K/)).toBeTruthy();
  });

  it("renders per-install rows with the fresh/resume split and cap pct", async () => {
    renderRoute();
    expect(await screen.findByText("Study tutor")).toBeTruthy();
    expect(screen.getByText("$1.80")).toBeTruthy();
    expect(screen.getByText("180K / 640K")).toBeTruthy();
    expect(screen.getByText("$10.00")).toBeTruthy();
    const row = document.querySelector('[data-agent="install-1"]');
    expect(row?.getAttribute("data-cap-pct")).toBe("18");
  });

  it("capless custom-kind install shows a dash for the cap", async () => {
    renderRoute();
    expect(await screen.findByText("My bespoke helper")).toBeTruthy();
    const row = document.querySelector('[data-agent="install-2"]');
    expect(row?.textContent).toContain("—");
    expect(row?.getAttribute("data-cap-pct")).toBe("0");
  });
});
