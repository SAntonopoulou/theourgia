/**
 * NetworkBrowser route tests (v1-026).
 *
 * Covered: live peer listing mapped onto the surface (wire status →
 * handshake pill, last_seen_at → heartbeat, label → tradition slot) ·
 * honest empty state (local row only, nothing invented) · the
 * add-peer drawer posts to /federation/peers · kebab → confirm →
 * DELETE · load-error renders the honest failure text instead of a
 * pretend-empty directory.
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
  const PEERS = [
    {
      id: "peer-aurora",
      base_url: "https://aurora.example",
      instance_did: "did:theourgia:aurora.example",
      label: "Hermetic",
      status: "successful",
      added_at: "2026-07-01T00:00:00Z",
      last_seen_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    },
    {
      id: "peer-newcomer",
      base_url: "https://newcomer.example",
      instance_did: "did:theourgia:newcomer.example",
      label: null,
      status: "pending",
      added_at: "2026-07-10T00:00:00Z",
      last_seen_at: null,
    },
  ];
  return {
    PEERS,
    listFederationPeers: vi.fn(() => Promise.resolve(PEERS)),
    addFederationPeer: vi.fn(() =>
      Promise.resolve({
        id: "peer-terra",
        base_url: "https://terra.example",
        instance_did: "did:theourgia:terra.example",
        label: null,
        status: "successful",
        added_at: "2026-07-20T00:00:00Z",
        last_seen_at: "2026-07-20T00:00:00Z",
        capability_token: "token-once",
      }),
    ),
    removeFederationPeer: vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listFederationPeers: mocks.listFederationPeers,
    addFederationPeer: mocks.addFederationPeer,
    removeFederationPeer: mocks.removeFederationPeer,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { NetworkBrowser } from "../NetworkBrowser.js";

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
                    <Route path="/" element={<NetworkBrowser />} />
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

describe("NetworkBrowser route", () => {
  it("lists peers from the API with wire status mapped to the pill", async () => {
    renderRoute();
    await flush();

    expect(mocks.listFederationPeers).toHaveBeenCalledTimes(1);
    const aurora = document.querySelector("[data-peer='aurora.example']");
    expect(aurora).not.toBeNull();
    expect(aurora?.getAttribute("data-status")).toBe("successful");
    // label → tradition slot; last_seen_at → relative heartbeat.
    expect(aurora?.querySelector("[data-field='meta']")?.textContent).toBe(
      "Hermetic · last heartbeat 4 minutes ago",
    );
    // Never-seen peer reports "never" — nothing invented.
    const newcomer = document.querySelector("[data-peer='newcomer.example']");
    expect(newcomer?.getAttribute("data-status")).toBe("pending");
    expect(newcomer?.querySelector("[data-field='meta']")?.textContent).toContain("never");
  });

  it("pins the local instance row above the fetched peers", async () => {
    renderRoute();
    await flush();
    const local = document.querySelector("[data-peer-local='true']");
    expect(local).not.toBeNull();
    expect(local?.textContent).toContain(window.location.host);
  });

  it("renders only the local row when the directory is empty", async () => {
    mocks.listFederationPeers.mockResolvedValueOnce([]);
    renderRoute();
    await flush();
    expect(document.querySelectorAll("[data-peer]")).toHaveLength(0);
    expect(document.querySelector("[data-peer-local='true']")).not.toBeNull();
  });

  it("adds a peer through the drawer and refreshes the list", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Add peer" }));
    fireEvent.change(screen.getByPlaceholderText("https://aurora.example"), {
      target: { value: "https://terra.example" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Hermetic"), {
      target: { value: "Folk" },
    });
    // Two "Add peer" buttons exist (topbar CTA + drawer submit); the
    // drawer submit is the last match.
    const submits = screen.getAllByRole("button", { name: "Add peer" });
    fireEvent.click(submits[submits.length - 1]!);
    await flush();

    expect(mocks.addFederationPeer).toHaveBeenCalledWith({
      base_url: "https://terra.example",
      label: "Folk",
    });
    // Successful add refreshes the listing.
    expect(mocks.listFederationPeers.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("removes a peer via the kebab with a confirm", async () => {
    renderRoute();
    await flush();

    const kebab = document.querySelector(
      "[data-peer='aurora.example'] [data-action='peer-kebab']",
    ) as HTMLElement;
    fireEvent.click(kebab);
    expect(screen.getByText("Remove this peer?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await flush();

    expect(mocks.removeFederationPeer).toHaveBeenCalledWith("peer-aurora");
    expect(mocks.listFederationPeers.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the honest error text when the directory fails to load", async () => {
    mocks.listFederationPeers.mockRejectedValueOnce(
      new Error("federation transport disabled on this instance"),
    );
    renderRoute();
    await flush();

    const error = document.querySelector("[data-error='federation-peers']");
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain("Couldn't load the peer directory");
    expect(error?.textContent).toContain("federation transport disabled");
  });
});
