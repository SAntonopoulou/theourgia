/**
 * Route-mount smoke tests (b108-2gm · task #232).
 *
 * Each 🚧 admin route is proven at three layers:
 *   1. Endpoints — curl-verified in COMPLETION_MANIFEST curl table.
 *   2. Wiring — b108-2fv audit confirmed all routes make real API
 *      calls (apiMethods / apiClient / lib hooks).
 *   3. Build — `pnpm exec vite build` succeeds (b108-2ge), so every
 *      route module resolves + type-checks + tree-shakes.
 *
 * What browser E2E catches beyond those three: runtime mount errors
 * (invalid hook order, missing context providers, undefined destructures
 * on the first render). This suite mounts every route inside the same
 * provider stack the real app uses, with the API client stubbed to
 * a resolved-promise fixture. If a route throws during mount, it fails
 * here. If it renders, the wiring in layers 1-3 does the rest.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Suspense, type ReactElement } from "react";
import {
  AuthProvider,
  ToastProvider,
  TopbarProvider,
  ActingAsProvider,
  I18nProvider,
} from "@theourgia/shared";

// Stub the shared API client to always resolve with an empty array.
// Enough for the initial query in every list/detail route to settle.
vi.mock("../../data/api.js", async () => {
  const stub = new Proxy(
    {},
    {
      get() {
        return () => Promise.resolve([]);
      },
    },
  );
  return {
    apiClient: {
      request: () => Promise.resolve([]),
    },
    apiMethods: stub,
    API_MODE: "mock" as const,
    API_BASE_URL: "",
  };
});

// Stub react-router hooks that some routes use directly.
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ hubId: "test-hub", id: "test-id", slug: "test" }),
  };
});

function withProviders(inner: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider api={{ getSession: async () => null } as never}>
          <ActingAsProvider>
            <ToastProvider />
            <MemoryRouter>
              <TopbarProvider>
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/" element={inner} />
                  </Routes>
                </Suspense>
              </TopbarProvider>
            </MemoryRouter>
          </ActingAsProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

/**
 * Each entry: [displayName, dynamic import that resolves to the named
 * export]. The dynamic import lets a mount failure of one route not
 * take down the whole suite import.
 */
const ROUTES: ReadonlyArray<[string, () => Promise<{ Component: React.ComponentType }>]> = [
  ["TarotRoute", () => import("../TarotRoute.js").then((m) => ({ Component: m.TarotRoute }))],
  ["IChingRoute", () => import("../IChingRoute.js").then((m) => ({ Component: m.IChingRoute }))],
  ["GeomancyRoute", () => import("../GeomancyRoute.js").then((m) => ({ Component: m.GeomancyRoute }))],
  ["RunesRoute", () => import("../RunesRoute.js").then((m) => ({ Component: m.RunesRoute }))],
  ["DivinationMiscRoute", () => import("../DivinationMiscRoute.js").then((m) => ({ Component: m.DivinationMiscRoute }))],
  ["MagicalCircleRoute", () => import("../MagicalCircleRoute.js").then((m) => ({ Component: m.MagicalCircleRoute }))],
  ["MagicSquaresRoute", () => import("../MagicSquaresRoute.js").then((m) => ({ Component: m.MagicSquaresRoute }))],
  ["TalismanDesignerRoute", () => import("../TalismanDesignerRoute.js").then((m) => ({ Component: m.TalismanDesignerRoute }))],
  ["ToolRegistryRoute", () => import("../ToolRegistryRoute.js").then((m) => ({ Component: m.ToolRegistryRoute }))],
  ["SigilGeneratorRoute", () => import("../SigilGeneratorRoute.js").then((m) => ({ Component: m.SigilGeneratorRoute }))],
  ["VocesMagicaeRoute", () => import("../VocesMagicaeRoute.js").then((m) => ({ Component: m.VocesMagicaeRoute }))],
  ["VocesLibraryRoute", () => import("../VocesLibraryRoute.js").then((m) => ({ Component: m.VocesLibraryRoute }))],
  ["GematriaCalculatorRoute", () => import("../GematriaCalculatorRoute.js").then((m) => ({ Component: m.GematriaCalculatorRoute }))],
  ["AnalyticsDashboardRoute", () => import("../AnalyticsDashboardRoute.js").then((m) => ({ Component: m.AnalyticsDashboardRoute }))],
  ["SynchronicityLogRoute", () => import("../SynchronicityLogRoute.js").then((m) => ({ Component: m.SynchronicityLogRoute }))],
  ["QueryBuilderRoute", () => import("../QueryBuilderRoute.js").then((m) => ({ Component: m.QueryBuilderRoute }))],
  ["StudiesIndexRoute", () => import("../StudiesIndexRoute.js").then((m) => ({ Component: m.StudiesIndexRoute }))],
  ["PublicationsRoute", () => import("../PublicationsRoute.js").then((m) => ({ Component: m.PublicationsRoute }))],
  ["SubscribersRoute", () => import("../SubscribersRoute.js").then((m) => ({ Component: m.SubscribersRoute }))],
  ["MediaLibraryRoute", () => import("../MediaLibraryRoute.js").then((m) => ({ Component: m.MediaLibraryRoute }))],
  ["AudioLibraryRoute", () => import("../AudioLibraryRoute.js").then((m) => ({ Component: m.AudioLibraryRoute }))],
  ["PilgrimageMapRoute", () => import("../PilgrimageMapRoute.js").then((m) => ({ Component: m.PilgrimageMapRoute }))],
  ["ICalFeedRoute", () => import("../ICalFeedRoute.js").then((m) => ({ Component: m.ICalFeedRoute }))],
  ["MyNetworks", () => import("../MyNetworks.js").then((m) => ({ Component: m.MyNetworks }))],
  ["NetworkBrowser", () => import("../NetworkBrowser.js").then((m) => ({ Component: m.NetworkBrowser }))],
  ["HubDiscovery", () => import("../HubDiscovery.js").then((m) => ({ Component: m.HubDiscovery }))],
  ["Followers", () => import("../Followers.js").then((m) => ({ Component: m.Followers }))],
  ["PrivateViewers", () => import("../PrivateViewers.js").then((m) => ({ Component: m.PrivateViewers }))],
  ["Journal", () => import("../Journal.js").then((m) => ({ Component: m.Journal }))],
  ["FamilyTreeRoute", () => import("../FamilyTreeRoute.js").then((m) => ({ Component: m.FamilyTreeRoute }))],
  ["DeckDesignerRoute", () => import("../DeckDesignerRoute.js").then((m) => ({ Component: m.DeckDesignerRoute }))],
  ["RecipesRoute", () => import("../RecipesRoute.js").then((m) => ({ Component: m.RecipesRoute }))],
  ["PilgrimageRoutesRoute", () => import("../PilgrimageRoutesRoute.js").then((m) => ({ Component: m.PilgrimageRoutesRoute }))],
  ["SetupWizardRoute", () => import("../SetupWizardRoute.js").then((m) => ({ Component: m.SetupWizardRoute }))],
  ["MemorialModeRoute", () => import("../MemorialModeRoute.js").then((m) => ({ Component: m.MemorialModeRoute }))],
  ["AccountPasswordRoute", () => import("../AccountPasswordRoute.js").then((m) => ({ Component: m.AccountPasswordRoute }))],
  ["Library", () => import("../Library.js").then((m) => ({ Component: m.Library }))],
  ["LineageAdmin", () => import("../LineageAdmin.js").then((m) => ({ Component: m.LineageAdmin }))],
  ["Health", () => import("../Health.js").then((m) => ({ Component: m.Health }))],
];

describe("route mount smoke suite", () => {
  for (const [name, loader] of ROUTES) {
    it(`${name} mounts without throwing`, async () => {
      const { Component } = await loader();
      const { unmount } = render(withProviders(<Component />));
      // If we got here, the component didn't throw on initial render.
      expect(document.body).toBeDefined();
      unmount();
    });
  }
});
