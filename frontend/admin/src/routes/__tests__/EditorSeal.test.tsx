/**
 * Editor seal-flow tests (v1-033).
 *
 * Covered: the visibility chip's "Seal this entry" routes through the
 * SealEntryDialog type-to-confirm and a passphrase prompt, encrypts
 * client-side (crypto mocked), and POSTs to the dedicated seal
 * endpoint — never a {sealed:true} PATCH · the sealed state offers NO
 * unseal affordance ("Sealed — tap to read" replaces it) · reading a
 * sealed entry fetches the ciphertext and decrypts in memory,
 * rendering a read-only preview while the row stays sealed · a
 * passphrase that does not decrypt shows the inline error · the
 * Publish CTA disables for sealed entries.
 *
 * TiptapEditor is stubbed — mounting ProseMirror in jsdom is out of
 * scope here (the shared Editor suite covers it headlessly).
 */

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
  const tiptapDoc = (...texts: string[]) => ({
    type: "doc",
    content: texts.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  });
  const DETAIL = {
    id: "1",
    title: "Candle held its flame",
    type: "observation",
    excerpt: "",
    glyph: "candle",
    created_at: "2026-07-19T10:00:00Z",
    updated_at: "2026-07-19T10:00:00Z",
    body: JSON.stringify(tiptapDoc("The working, in plaintext.")),
    visibility: "personal",
    sealed: false,
    published_at: null,
    astro_snapshot: null,
    calendar_snapshot: null,
    tags: [],
    tradition_tags: [],
    publish_on_death: false,
  };
  const SEALED_DETAIL = { ...DETAIL, body: "", sealed: true };
  const ENVELOPE = JSON.stringify({ v: 1, iv: "aXY=", ct: "Y3Q=" });
  // Mutable so tests can swap the served detail without ...Once
  // fragility (the detail hook may fetch more than once).
  const state = { detail: DETAIL as typeof DETAIL };
  return {
    DETAIL,
    SEALED_DETAIL,
    ENVELOPE,
    state,
    getEntryDetail: vi.fn(() => Promise.resolve(state.detail)),
    listEntities: vi.fn(() => Promise.resolve([])),
    listBooks: vi.fn(() => Promise.resolve([])),
    listEntryRevisions: vi.fn(() => Promise.resolve([])),
    updateEntry: vi.fn(() => Promise.resolve(DETAIL)),
    publishEntry: vi.fn(() => Promise.resolve(DETAIL)),
    createEntry: vi.fn(() => Promise.resolve(DETAIL)),
    updateEntryBody: vi.fn(() => Promise.resolve(DETAIL)),
    sealEntry: vi.fn(() => Promise.resolve(SEALED_DETAIL)),
    getEntrySealedPayload: vi.fn(() =>
      Promise.resolve({ encrypted_payload_b64: "c2VhbGVkLWVudmVsb3Bl" }),
    ),
    getChart: vi.fn(() => Promise.resolve({})),
    transcribeAudio: vi.fn(() => Promise.resolve({})),
    sealToEnvelope: vi.fn(() => Promise.resolve(ENVELOPE)),
    decryptSealedPayloadB64: vi.fn(() =>
      Promise.resolve(tiptapDoc("The hidden text of the working.")),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    getEntryDetail: mocks.getEntryDetail,
    listEntities: mocks.listEntities,
    listBooks: mocks.listBooks,
    listEntryRevisions: mocks.listEntryRevisions,
    updateEntry: mocks.updateEntry,
    publishEntry: mocks.publishEntry,
    createEntry: mocks.createEntry,
    updateEntryBody: mocks.updateEntryBody,
    sealEntry: mocks.sealEntry,
    getEntrySealedPayload: mocks.getEntrySealedPayload,
    getChart: mocks.getChart,
    transcribeAudio: mocks.transcribeAudio,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

// ProseMirror-in-jsdom and 600k-iteration PBKDF2 are not the subject
// under test; the seal/read WIRING is real.
vi.mock("@theourgia/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@theourgia/shared")>();
  return {
    ...actual,
    TiptapEditor: () => <div data-testid="tiptap-editor-stub" />,
    sealToEnvelope: mocks.sealToEnvelope,
    decryptSealedPayloadB64: mocks.decryptSealedPayloadB64,
  };
});

import { Editor } from "../Editor.js";

function renderEditor() {
  return render(
    <I18nProvider>
      <AuthProvider api={{ getSession: async () => null } as never}>
        <ActingAsProvider>
          <ToastProvider />
          <MemoryRouter initialEntries={["/editor/1"]}>
            <TopbarProvider>
              <VaultTopbar />
              <Suspense fallback={<div>loading</div>}>
                <Routes>
                  <Route path="/editor/:id" element={<Editor />} />
                </Routes>
              </Suspense>
            </TopbarProvider>
          </MemoryRouter>
        </ActingAsProvider>
      </AuthProvider>
    </I18nProvider>,
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
  mocks.state.detail = mocks.DETAIL;
});

describe("Editor — seal flow (v1-033)", () => {
  it("seals through type-to-confirm + passphrase, POSTing the envelope", async () => {
    renderEditor();
    await screen.findByLabelText("Entry title");

    // Open the chip menu → "Seal this entry" → SealEntryDialog.
    fireEvent.click(screen.getByRole("button", { name: "Visibility · Personal" }));
    fireEvent.click(screen.getByText("Seal this entry"));
    expect(screen.getByText("Seal this entry?")).toBeInTheDocument();
    // The designer copy stays accurate: the seal is one-way.
    expect(screen.getByText(/This cannot be undone\./)).toBeInTheDocument();

    // Type-to-confirm with the entry title, then confirm.
    fireEvent.change(screen.getByLabelText("Confirmation text"), {
      target: { value: "Candle held its flame" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Seal entry" }));

    // Passphrase prompt (client-side encrypt) — no PATCH, no POST yet.
    expect(mocks.sealEntry).not.toHaveBeenCalled();
    expect(screen.getByText("Seal these contents")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && mocks.sealEntry.mock.calls.length === 0; i++) {
      await flush();
    }

    // The dedicated seal endpoint gets the envelope — never a
    // {sealed:true} PATCH (which the API rejects).
    expect(mocks.sealEntry).toHaveBeenCalledWith("1", {
      encrypted_payload: mocks.ENVELOPE,
    });
    expect(mocks.updateEntry).not.toHaveBeenCalled();
    // The editor swaps to the sealed surface.
    expect(await screen.findByText("Sealed contents")).toBeInTheDocument();
    expect(screen.queryByTestId("tiptap-editor-stub")).not.toBeInTheDocument();
  });

  it("sealed entries offer read, never unseal; Publish disables", async () => {
    mocks.state.detail = mocks.SEALED_DETAIL;
    renderEditor();
    await screen.findByText("Sealed contents");

    // No unseal affordance anywhere — the seal is one-way. (findBy:
    // the topbar chip re-renders one effect-flush after the body.)
    fireEvent.click(await screen.findByRole("button", { name: "Visibility · Personal · Sealed" }));
    expect(screen.queryByText(/click to unseal/)).not.toBeInTheDocument();
    expect(screen.getByText("Sealed — tap to read")).toBeInTheDocument();
    // Publish is gated (the backend refuses sealed publishes too).
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("reads a sealed entry by fetching + decrypting in memory", async () => {
    mocks.state.detail = mocks.SEALED_DETAIL;
    renderEditor();
    await screen.findByText("Sealed contents");

    fireEvent.click(screen.getByRole("button", { name: "Unlock to view" }));
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && mocks.decryptSealedPayloadB64.mock.calls.length === 0; i++) {
      await flush();
    }

    expect(mocks.getEntrySealedPayload).toHaveBeenCalledWith("1");
    expect(mocks.decryptSealedPayloadB64).toHaveBeenCalledWith(
      "c2VhbGVkLWVudmVsb3Bl",
      "correct horse battery staple",
    );
    // Read-only preview; the row stays sealed (no PATCH, no editor).
    expect(await screen.findByText("The hidden text of the working.")).toBeInTheDocument();
    expect(screen.queryByTestId("tiptap-editor-stub")).not.toBeInTheDocument();
    expect(mocks.updateEntry).not.toHaveBeenCalled();
  });

  it("a passphrase that does not decrypt shows the inline error", async () => {
    mocks.state.detail = mocks.SEALED_DETAIL;
    mocks.decryptSealedPayloadB64.mockRejectedValueOnce(new Error("OperationError"));
    renderEditor();
    await screen.findByText("Sealed contents");

    fireEvent.click(screen.getByRole("button", { name: "Unlock to view" }));
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
      target: { value: "not the right one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    for (let i = 0; i < 40 && screen.queryByRole("alert") === null; i++) {
      await flush();
    }

    expect(screen.getByText("Passphrase didn't decrypt — try again.")).toBeInTheDocument();
    expect(screen.queryByText("The hidden text of the working.")).not.toBeInTheDocument();
  });
});
