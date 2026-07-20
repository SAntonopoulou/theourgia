/**
 * Bundle library + detail route tests (v1-020 · remove wiring v1-033).
 *
 * Covered: installed cards render from the live-shaped
 * ``bundlesInstalled`` response (name · version · author · citation
 * chip · data summary) · empty state · fetch-error banner · detail
 * about/data-shape sections from the matched record · detail
 * not-found state · Remove confirms through the house ConfirmDialog
 * and calls ``bundleUninstall`` (record only — imported content
 * stays; the toast repeats the backend's retention statement).
 * Update stays an honest toast — no backend endpoint exists for it.
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
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const INSTALLED = {
    bundles: [
      {
        id: "ib-1",
        slug: "hellenic-pantheon",
        version: "1.0.0",
        name: "Hellenic Pantheon",
        type: "pantheon",
        signature_verdict: "unsigned",
        imported_item_count: 13,
        closed_tradition: false,
        attribution: "Hellenic Pantheon v1.0.0 by Theourgia Project — CC0-1.0 (public-domain)",
        provenance: [],
        installed_at: "2026-07-16T00:00:00Z",
        author_name: "Theourgia Project",
        description: "The twelve Olympians and Hekate.",
        license_spdx: "CC0-1.0",
        source_citation: "Hesiod, Theogony; the Homeric Hymns (PD)",
        item_counts: { entities: 13 },
      },
      {
        id: "ib-2",
        slug: "traditional-incense-recipes",
        version: "1.0.0",
        name: "Traditional Incense Recipes",
        type: "recipe-book",
        signature_verdict: "unsigned",
        imported_item_count: 6,
        closed_tradition: false,
        attribution:
          "Traditional Incense Recipes v1.0.0 by Theourgia Project — CC0-1.0 (public-domain)",
        provenance: [],
        installed_at: "2026-07-17T00:00:00Z",
        author_name: "Theourgia Project",
        description: "Six documented historical incense formulas.",
        license_spdx: "CC0-1.0",
        source_citation: "Plutarch, De Iside et Osiride §80 (PD)",
        item_counts: { recipes: 6 },
      },
    ],
  };
  return {
    INSTALLED,
    bundlesInstalled: vi.fn(() => Promise.resolve(INSTALLED)),
    bundleUninstall: vi.fn(() =>
      Promise.resolve({
        removed_id: "ib-1",
        slug: "hellenic-pantheon",
        version: "1.0.0",
        imported_content_retained: true,
        detail:
          "Install record removed. Content imported from this bundle " +
          "(entities, templates, recipes, …) stays in your vault — bundle " +
          "removal is a tombstone, not an erasure.",
      }),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    bundlesInstalled: mocks.bundlesInstalled,
    bundleUninstall: mocks.bundleUninstall,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { BundleDetail } from "../BundleDetail.js";
import { BundleLibrary } from "../BundleLibrary.js";

function renderAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider api={{ getSession: async () => null } as never}>
          <ActingAsProvider>
            <ToastProvider />
            <MemoryRouter initialEntries={[initialPath]}>
              <TopbarProvider>
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/bundles" element={<BundleLibrary />} />
                    <Route path="/bundles/:id" element={<BundleDetail />} />
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

describe("BundleLibrary", () => {
  it("renders installed bundles with citation chips and data summaries", async () => {
    renderAt("/bundles");
    await flush();

    expect(mocks.bundlesInstalled).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Hellenic Pantheon")).toBeInTheDocument();
    expect(screen.getByText("Traditional Incense Recipes")).toBeInTheDocument();
    // Version chip is v-prefixed per the design.
    expect(screen.getAllByText("v1.0.0")).toHaveLength(2);
    // Citation chip carries the record's source citation.
    expect(screen.getByText("Hesiod, Theogony; the Homeric Hymns (PD)")).toBeInTheDocument();
    // Data summary comes from per-kind counts, never invented.
    expect(screen.getByText("13 entities")).toBeInTheDocument();
    expect(screen.getByText("6 recipes")).toBeInTheDocument();
    // Count label with the verbatim no-code tail.
    expect(screen.getByText(/2 bundles\. Bundles are installed datasets/)).toBeInTheDocument();
  });

  it("shows the designed empty state when nothing is installed", async () => {
    mocks.bundlesInstalled.mockResolvedValueOnce({ bundles: [] });
    renderAt("/bundles");
    await flush();

    expect(screen.getByText("No bundles installed.")).toBeInTheDocument();
    expect(screen.getByText("Browse the registry to install one.")).toBeInTheDocument();
  });

  it("shows the inline error banner when the fetch fails", async () => {
    mocks.bundlesInstalled.mockRejectedValueOnce(new Error("boom"));
    renderAt("/bundles");
    await flush();

    expect(screen.getByText("Couldn't load your installed bundles.")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("Remove confirms through the house dialog, deletes, and repeats the retention rule", async () => {
    renderAt("/bundles");
    await flush();

    // Kebab → Remove opens the ConfirmDialog; nothing deleted yet.
    fireEvent.click(screen.getAllByRole("button", { name: "Bundle actions" })[0]!);
    fireEvent.click(screen.getByText("Remove"));
    expect(mocks.bundleUninstall).not.toHaveBeenCalled();
    const confirm = await screen.findByText("Remove Hellenic Pantheon?");
    expect(confirm).toBeInTheDocument();
    expect(screen.getByText(/removal is a tombstone, not an erasure/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove bundle" }));
    await flush();

    expect(mocks.bundleUninstall).toHaveBeenCalledWith("ib-1");
    // Toast repeats the backend's own retention statement.
    expect(screen.getByText("Bundle removed")).toBeInTheDocument();
    expect(screen.getAllByText(/tombstone, not an erasure/).length).toBeGreaterThanOrEqual(1);
    // The list refreshed after the delete (initial load + refresh).
    expect(mocks.bundlesInstalled).toHaveBeenCalledTimes(2);
  });

  it("cancelling the Remove dialog never calls the endpoint", async () => {
    renderAt("/bundles");
    await flush();

    fireEvent.click(screen.getAllByRole("button", { name: "Bundle actions" })[0]!);
    fireEvent.click(screen.getByText("Remove"));
    const dialog = await screen.findByText("Remove Hellenic Pantheon?");
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();

    expect(mocks.bundleUninstall).not.toHaveBeenCalled();
    // The record is still listed.
    expect(screen.getByText("Hellenic Pantheon")).toBeInTheDocument();
  });
});

describe("BundleDetail", () => {
  it("renders about + data shape from the matched install record", async () => {
    renderAt("/bundles/ib-1");
    await flush();

    expect(screen.getByText("Theourgia Project")).toBeInTheDocument();
    expect(screen.getByText("CC0-1.0")).toBeInTheDocument();
    expect(screen.getByText("Hesiod, Theogony; the Homeric Hymns (PD)")).toBeInTheDocument();
    expect(screen.getByText("16 Jul 2026")).toBeInTheDocument();
    // Data-shape row: kind + count; sample is an honest em dash.
    expect(screen.getByText("entities")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    // Honest references line — counting has no backend yet.
    expect(screen.getByText(/not tracked yet/)).toBeInTheDocument();
  });

  it("shows the not-found state for an unknown install id", async () => {
    renderAt("/bundles/ib-does-not-exist");
    await flush();

    expect(screen.getByText("That bundle isn't in your vault.")).toBeInTheDocument();
  });
});
