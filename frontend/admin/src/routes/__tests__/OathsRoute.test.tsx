/**
 * Oaths route tests (v1-019 · unlock wiring v1-033).
 *
 * Covered: card grid from fixtures with all five OathStatusPill
 * variants · sealed rows render the sealed CTA and never plaintext ·
 * kind segments filter · designed empty state · the take-oath drawer
 * posts to /oaths (unsealed path exercises the make-public confirm) ·
 * the SealUnlock passphrase fetches each sealed oath's ciphertext and
 * decrypts it in memory (crypto mocked) · a passphrase that does not
 * decrypt shows the inline error and reveals nothing.
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
  const oath = (
    id: string,
    kind: string,
    status: string,
    sealed: boolean,
    text: string | null,
    recipient: string | null,
  ) => ({
    id,
    kind,
    recipient_entity_id: null,
    recipient_text: recipient,
    text: sealed ? null : text,
    encryption_mode: sealed ? "sealed" : "none",
    sealed,
    taken_at: "2026-01-01T00:00:00",
    expires_at: null,
    renewal_cadence: kind === "self" ? "Renews each lunar month" : null,
    status,
    accountability_checkpoints: kind === "self" ? [{ due_at: "2099-06-24T00:00:00" }] : [],
    owner_id: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
  });
  const OATHS = [
    oath("oath-active", "self", "active", true, "THE SEALED VOW", null),
    oath("oath-fulfilled", "deity", "fulfilled", false, "To keep the shrine lit.", "Hekate"),
    oath("oath-broken", "partner", "broken", true, null, "A partner in the work"),
    oath("oath-renounced", "order", "renounced", true, null, "The old order"),
    oath("oath-lapsed", "community", "lapsed", false, "To tend the shared garden.", "The grove"),
  ];
  return {
    OATHS,
    listOaths: vi.fn(() => Promise.resolve(OATHS)),
    listEntities: vi.fn(() => Promise.resolve([])),
    createOath: vi.fn((_input: unknown) => Promise.resolve(OATHS[1])),
    getOathSealedPayload: vi.fn(() =>
      Promise.resolve({ encrypted_payload_b64: "c2VhbGVkLWVudmVsb3Bl" }),
    ),
    decryptSealedPayloadB64: vi.fn(() => Promise.resolve({ text: "THE REVEALED VOW" })),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listOaths: mocks.listOaths,
    listEntities: mocks.listEntities,
    createOath: mocks.createOath,
    getOathSealedPayload: mocks.getOathSealedPayload,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

// The 600k-iteration PBKDF2 is not the subject under test — the
// decrypt helper is mocked; the fetch + reveal wiring is real.
vi.mock("@theourgia/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@theourgia/shared")>();
  return {
    ...actual,
    decryptSealedPayloadB64: mocks.decryptSealedPayloadB64,
  };
});

import { OathsRoute } from "../OathsRoute.js";

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
                    <Route path="/" element={<OathsRoute />} />
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

describe("OathsRoute", () => {
  it("renders the grid from fixtures with all five status variants", async () => {
    renderRoute();
    await flush();

    const cards = document.querySelectorAll('[data-component="oath-card"]');
    expect(cards).toHaveLength(5);
    const statuses = new Set(Array.from(cards).map((c) => c.getAttribute("data-oath-status")));
    for (const s of ["active", "fulfilled", "broken", "renounced", "lapsed"]) {
      expect(statuses.has(s)).toBe(true);
    }
  });

  it("sealed rows render the sealed CTA — never plaintext", async () => {
    renderRoute();
    await flush();

    const sealedCards = document.querySelectorAll('[data-oath-sealed="true"]');
    expect(sealedCards).toHaveLength(3);
    for (const card of Array.from(sealedCards)) {
      expect(card.querySelector("[data-sealed-cta]")).not.toBeNull();
      expect(card.querySelector("[data-vow-text]")).toBeNull();
    }
    // The fixture's sealed marker text never reaches the DOM.
    expect(screen.queryByText("THE SEALED VOW")).not.toBeInTheDocument();
    // Unsealed vow text does render.
    expect(screen.getByText("To keep the shrine lit.")).toBeInTheDocument();
    // Sealed CTA copy from the design.
    expect(screen.getAllByText("Sealed — tap to read").length).toBe(3);
  });

  it("kind segments filter the grid", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Deity/ }));
    const cards = document.querySelectorAll('[data-component="oath-card"]');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute("data-oath-status", "fulfilled");
  });

  it("shows the designed empty state", async () => {
    mocks.listOaths.mockResolvedValueOnce([]);
    renderRoute();
    await flush();

    expect(screen.getByText("No oaths recorded")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An oath is a vow with edges — to self, tradition, deity, partner, community. Most are sealed by default; the record is yours alone.",
      ),
    ).toBeInTheDocument();
  });

  it("records an unsealed oath after the conscious make-public step", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Take an oath" }));
    const drawer = screen.getByRole("dialog", { name: "Take an oath" });

    fireEvent.change(within(drawer).getByPlaceholderText("The words of the oath."), {
      target: { value: "To rise with the sun for one lunar month." },
    });

    // Turning the seal off raises the designed confirm.
    fireEvent.click(within(drawer).getByRole("switch", { name: "Sealed" }));
    expect(screen.getByText("Leave this oath unsealed?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave unsealed" }));

    fireEvent.click(within(drawer).getByRole("button", { name: "Record oath (unsealed)" }));
    await flush();

    expect(mocks.createOath).toHaveBeenCalledTimes(1);
    const payload = mocks.createOath.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.encryption_mode).toBe("none");
    expect(payload.text).toBe("To rise with the sun for one lunar month.");
    expect(payload.kind).toBe("self");
  });

  it("unlock fetches each sealed oath's ciphertext and decrypts it in memory", async () => {
    renderRoute();
    await flush();

    // The sealed CTA opens the SealUnlock prompt.
    fireEvent.click(screen.getAllByText("Sealed — tap to read")[0]!.closest("button")!);
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && mocks.decryptSealedPayloadB64.mock.calls.length < 3; i++) {
      await flush();
    }

    // One ciphertext fetch + one in-memory decrypt per sealed row.
    expect(mocks.getOathSealedPayload).toHaveBeenCalledTimes(3);
    expect(mocks.decryptSealedPayloadB64).toHaveBeenCalledWith(
      "c2VhbGVkLWVudmVsb3Bl",
      "correct horse battery staple",
    );
    // The decrypted vows render on the previously sealed cards.
    expect(screen.getAllByText("THE REVEALED VOW")).toHaveLength(3);
    // Locking drops the decrypted texts again.
    fireEvent.click(screen.getByRole("button", { name: "Vault unlocked — lock the vault" }));
    expect(screen.queryByText("THE REVEALED VOW")).not.toBeInTheDocument();
  });

  it("a passphrase that does not decrypt shows the inline error and reveals nothing", async () => {
    mocks.decryptSealedPayloadB64.mockRejectedValueOnce(new Error("OperationError"));
    renderRoute();
    await flush();

    fireEvent.click(screen.getAllByText("Sealed — tap to read")[0]!.closest("button")!);
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "not the right one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && screen.queryByRole("alert") === null; i++) {
      await flush();
    }

    expect(screen.getByText("Passphrase didn't decrypt — try again.")).toBeInTheDocument();
    expect(screen.queryByText("THE REVEALED VOW")).not.toBeInTheDocument();
  });
});
