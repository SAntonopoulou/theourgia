/**
 * Initiations route tests (v1-019 · unlock wiring v1-033).
 *
 * Covered: sparse list from fixtures with all four
 * InitiationStatusPill variants · SealedContentsBlock renders in the
 * detail (never any sealed field value) · empty state · the record
 * drawer encrypts client-side and posts to /initiations · "Unlock to
 * view" fetches the selected row's ciphertext and decrypts in memory
 * (crypto mocked) · the per-read reveal clears on selection change.
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
  const initiation = (id: string, tradition: string, status: string, disclosed: string | null) => ({
    id,
    tradition,
    status,
    sealed: true,
    publicly_disclosed_at: disclosed,
    owner_id: null,
    created_at: "2026-05-01T00:00:00",
    updated_at: "2026-05-01T00:00:00",
  });
  const INITIATIONS = [
    initiation("init-active", "Hellenic mystery", "active", null),
    initiation("init-suspended", "Rosicrucian order", "suspended", null),
    initiation("init-lapsed", "Druidic grove", "lapsed", "2026-04-12T00:00:00"),
    initiation("init-resigned", "Ceremonial lodge", "resigned", null),
  ];
  return {
    INITIATIONS,
    listInitiations: vi.fn(() => Promise.resolve(INITIATIONS)),
    createInitiation: vi.fn((_input: unknown) => Promise.resolve(INITIATIONS[0])),
    getInitiationSealedPayload: vi.fn(() =>
      Promise.resolve({ encrypted_payload_b64: "c2VhbGVkLWVudmVsb3Bl" }),
    ),
    decryptSealedPayloadB64: vi.fn(() =>
      Promise.resolve({
        grade_or_degree: "First torch of the mysteries",
        received_at: "2026-03-20",
        location: "The grove",
        experience_notes: null,
      }),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    listInitiations: mocks.listInitiations,
    createInitiation: mocks.createInitiation,
    getInitiationSealedPayload: mocks.getInitiationSealedPayload,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

// The decrypt helper is mocked (600k-iteration PBKDF2 is not the
// subject under test); the record drawer's ENCRYPT path deliberately
// keeps the real sealToEnvelope.
vi.mock("@theourgia/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@theourgia/shared")>();
  return {
    ...actual,
    decryptSealedPayloadB64: mocks.decryptSealedPayloadB64,
  };
});

import { InitiationsRoute } from "../InitiationsRoute.js";

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
                    <Route path="/" element={<InitiationsRoute />} />
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

describe("InitiationsRoute", () => {
  it("renders the sparse list with all four status variants", async () => {
    renderRoute();
    await flush();

    expect(screen.getByText("4 recorded")).toBeInTheDocument();
    const items = document.querySelectorAll('[data-component="initiation-list-item"]');
    expect(items).toHaveLength(4);
    const statuses = new Set(
      Array.from(items).map((i) => i.getAttribute("data-initiation-status")),
    );
    for (const s of ["active", "suspended", "lapsed", "resigned"]) {
      expect(statuses.has(s)).toBe(true);
    }
    // Disclosure strip renders only for the attested row.
    expect(screen.getByText(/Disclosed 12 Apr 2026/)).toBeInTheDocument();
  });

  it("detail renders the SealedContentsBlock — sealed rows never show plaintext", async () => {
    renderRoute();
    await flush();

    const block = document.querySelector('[data-component="sealed-contents-block"]');
    expect(block).not.toBeNull();
    expect(screen.getByText("Sealed contents")).toBeInTheDocument();
    // The canonical zero-knowledge copy from the primitive.
    expect(
      screen.getByText(
        "The grade, the date received, the place, who gave and witnessed it, and your notes are encrypted with a key only your client holds. The server cannot read or recover them.",
      ),
    ).toBeInTheDocument();
    // Plain-note + always-personal notice.
    expect(
      screen.getByText("Tradition and status are the only fields stored in plaintext."),
    ).toBeInTheDocument();
  });

  it("shows the empty state when nothing is recorded", async () => {
    mocks.listInitiations.mockResolvedValueOnce([]);
    renderRoute();
    await flush();

    expect(screen.getByText("No initiations recorded.")).toBeInTheDocument();
  });

  it("seals client-side and posts to /initiations", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Record initiation" }));
    const drawer = screen.getByRole("dialog", { name: "Record an initiation" });

    fireEvent.change(within(drawer).getByPlaceholderText("e.g. Hellenic mystery"), {
      target: { value: "Orphic line" },
    });
    // First "(sealed)" input is the grade-or-degree field.
    fireEvent.change(within(drawer).getAllByPlaceholderText("(sealed)")[0]!, {
      target: { value: "First torch" },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Seal & record" }));

    // The passphrase prompt collects the key for the client-side seal.
    const unlock = screen.getByPlaceholderText("Passphrase");
    fireEvent.change(unlock, { target: { value: "correct horse battery staple" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    // PBKDF2 + AES-GCM run async — poll until the POST lands.
    for (let i = 0; i < 40 && mocks.createInitiation.mock.calls.length === 0; i++) {
      await flush();
      await new Promise((r) => setTimeout(r, 25));
    }

    expect(mocks.createInitiation).toHaveBeenCalledTimes(1);
    const payload = mocks.createInitiation.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.tradition).toBe("Orphic line");
    expect(payload.encryption_mode).toBe("sealed");
    const envelope = JSON.parse(String(payload.encrypted_payload)) as Record<string, string>;
    expect(envelope.ct?.length).toBeGreaterThan(0);
    expect(envelope.iv?.length).toBeGreaterThan(0);
    // The sealed grade never appears in the ciphertext envelope.
    expect(String(payload.encrypted_payload)).not.toContain("First torch");
  });

  it("Unlock to view fetches + decrypts the selected row's sealed fields", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Unlock to view" }));
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && mocks.decryptSealedPayloadB64.mock.calls.length === 0; i++) {
      await flush();
    }

    // Ciphertext fetched for the SELECTED row, decrypted in memory.
    expect(mocks.getInitiationSealedPayload).toHaveBeenCalledWith("init-active");
    expect(mocks.decryptSealedPayloadB64).toHaveBeenCalledWith(
      "c2VhbGVkLWVudmVsb3Bl",
      "correct horse battery staple",
    );
    // The revealed panel shows the decrypted fields with the drawer's
    // field labels; absent fields render an honest em dash.
    expect(screen.getByText("First torch of the mysteries")).toBeInTheDocument();
    expect(screen.getByText("Grade or degree")).toBeInTheDocument();
    expect(screen.getByText("The grove")).toBeInTheDocument();

    // Per-read: selecting another row re-seals the detail.
    fireEvent.click(screen.getByText("Rosicrucian order"));
    expect(screen.queryByText("First torch of the mysteries")).not.toBeInTheDocument();
    expect(document.querySelector('[data-component="sealed-contents-block"]')).not.toBeNull();
  });
});
