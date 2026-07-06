import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiClient, UnauthorizedError, api, defaultFixtures } from "../api/index.js";

import { AuthProvider, useAuth } from "./AuthContext.js";

function buildMockApi() {
  return api(new ApiClient({ baseUrl: "", mock: true, fixtureFor: defaultFixtures }));
}

function StatusReadout() {
  const { status, session, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="name">{session?.display_name ?? "no-session"}</span>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  it("starts in 'checking' status and resolves to 'authenticated' against the mock fixture", async () => {
    render(
      <AuthProvider api={buildMockApi()}>
        <StatusReadout />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("checking");
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("name").textContent).toBe("Practitioner");
  });

  it("resolves to 'unauthenticated' when getCurrentSession returns null", async () => {
    const a: ReturnType<typeof api> = {
      ...buildMockApi(),
      getCurrentSession: async () => null,
    };
    render(
      <AuthProvider api={a}>
        <StatusReadout />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("name").textContent).toBe("no-session");
  });

  it("resolves to 'unauthenticated' on UnauthorizedError without surfacing it as an error", async () => {
    const a: ReturnType<typeof api> = {
      ...buildMockApi(),
      getCurrentSession: async () => {
        throw new UnauthorizedError({ type: "about:blank", title: "x", status: 401 });
      },
    };
    render(
      <AuthProvider api={a}>
        <StatusReadout />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
  });

  it("skipInitialRefresh keeps status at 'idle'", async () => {
    render(
      <AuthProvider api={buildMockApi()} skipInitialRefresh>
        <StatusReadout />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("signOut clears the session and flips status", async () => {
    render(
      <AuthProvider api={buildMockApi()}>
        <StatusReadout />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("name").textContent).toBe("no-session");
  });

  it("useAuth outside Provider throws a helpful error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StatusReadout />)).toThrow(/AuthProvider/);
    consoleError.mockRestore();
  });

  it("refresh() re-checks the backend", async () => {
    let count = 0;
    const a: ReturnType<typeof api> = {
      ...buildMockApi(),
      getCurrentSession: async () => {
        count += 1;
        return count === 1
          ? null
          : {
              user_id: "x",
              display_name: "After Refresh",
              magickal_name: null,
              vault_id: null,
              expires_at: new Date().toISOString(),
            };
      },
    };
    function Probe() {
      const { status, session, refresh } = useAuth();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="name">{session?.display_name ?? "no-session"}</span>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      );
    }
    render(
      <AuthProvider api={a}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    await act(async () => {
      await userEvent.setup().click(screen.getByRole("button", { name: "Refresh" }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("name").textContent).toBe("After Refresh");
    });
  });

  it("signInDemo flips status to authenticated and stores the returned session", async () => {
    function Probe() {
      const { status, session, signInDemo } = useAuth();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="name">{session?.display_name ?? "no-session"}</span>
          <button type="button" onClick={() => void signInDemo({ magickal_name: "Soror New" })}>
            Sign in
          </button>
        </div>
      );
    }
    const a: ReturnType<typeof api> = {
      ...buildMockApi(),
      getCurrentSession: async () => null,
    };
    render(
      <AuthProvider api={a}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    await act(async () => {
      await userEvent.setup().click(screen.getByRole("button", { name: "Sign in" }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("name").textContent).toBe("Soror New");
  });
});
