/**
 * Linked applications route — the surface that mints a companion app's code.
 *
 * The mechanism is in `theourgia/models/link_code.py`; what these check is
 * that the SCREEN does not undo it — the code is shown once and asked for
 * deliberately, no password is ever requested here, and an instance with no
 * companion configured says so instead of failing silently.
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

// ⚠ The error class lives inside vi.hoisted too. vi.mock's factory is
// hoisted above every top-level declaration, so a class declared beside it is
// still in its temporal dead zone when the factory runs.
const mocks = vi.hoisted(() => {
  class FakeApiError extends Error {
    constructor(public readonly status: number) {
      super("nope");
    }
  }
  return { apiPost: vi.fn(), FakeApiError };
});

vi.mock("../../lib/api.js", () => ({
  apiPost: mocks.apiPost,
  apiGet: vi.fn(),
  ApiError: mocks.FakeApiError,
}));

import { LinkedApplicationsRoute } from "../LinkedApplicationsRoute.js";

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
                    <Route path="/" element={<LinkedApplicationsRoute />} />
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
  mocks.apiPost.mockReset();
});

describe("LinkedApplicationsRoute", () => {
  it("shows no code until one is asked for — for either companion", async () => {
    renderRoute();
    await flush();

    // A code is a credential with a ten-minute life. Minting one on page load
    // would burn a live credential onto the screen of anyone who wandered in.
    expect(mocks.apiPost).not.toHaveBeenCalled();
    // Two companions now: the Theourgia app (a device) and astropractise (a
    // relying party). Each mints its own code from its own card.
    expect(screen.getAllByText("Show me a code").length).toBe(2);
  });

  it("the app's card mints for the device audience", async () => {
    mocks.apiPost.mockResolvedValue({
      code: "ABCD2345",
      audience: "theourgia-app",
      expires_at_utc: "2026-08-14T12:10:00+00:00",
    });
    renderRoute();
    await flush();

    await act(async () => {
      screen.getAllByText("Show me a code")[0].click();
    });
    await flush();

    expect(mocks.apiPost).toHaveBeenCalledWith("/link-codes", {
      audience: "theourgia-app",
    });
    // Four and four. Eight unbroken characters is harder to read back to
    // somebody holding a phone.
    expect(screen.getByText("ABCD-2345")).toBeTruthy();
  });

  it("astropractise's card mints for its own audience", async () => {
    mocks.apiPost.mockResolvedValue({
      code: "WXYZ6789",
      audience: "astropractise",
      expires_at_utc: "2026-08-14T12:10:00+00:00",
    });
    renderRoute();
    await flush();

    await act(async () => {
      screen.getAllByText("Show me a code")[1].click();
    });
    await flush();

    expect(mocks.apiPost).toHaveBeenCalledWith("/link-codes", {
      audience: "astropractise",
    });
    expect(screen.getByText("WXYZ-6789")).toBeTruthy();
  });

  it("says plainly when the instance has no companion configured", async () => {
    mocks.apiPost.mockRejectedValue(new mocks.FakeApiError(503));
    renderRoute();
    await flush();

    await act(async () => {
      screen.getAllByText("Show me a code")[0].click();
    });
    await flush();

    // A 503 is a deployment fact, not the user's mistake, and a raw error
    // string would read as though they had done something wrong.
    expect(
      screen.getByText(/No companion applications are configured/),
    ).toBeTruthy();
  });

  it("never asks for a password", async () => {
    const { container } = renderRoute();
    await flush();

    // The whole point of a code is that no credential of this instance's is
    // typed anywhere else. A password field here would defeat it entirely.
    expect(container.querySelectorAll("input[type=password]").length).toBe(0);
    expect(container.querySelectorAll("input").length).toBe(0);
  });
});
