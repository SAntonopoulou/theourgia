/**
 * KeyRotation route tests (v1-027 · Phase 15 B5).
 *
 * Covered: current-key card + trusted history render from the real
 * status/history endpoints · Begin rotation POSTs /keys/rotate and
 * toasts the wizard's start message · 409 maps to the already-running
 * toast · a pending rotation renders the surface busy · emergency
 * revocation stays an HONEST toast (no API call — a Mode A data key
 * has no standalone revoke semantics; rotation is the remedy).
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, ToastProvider, TopbarProvider } from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const FINGERPRINT_A = "a".repeat(64);
const FINGERPRINT_B = "0123456789abcdef".repeat(4);

const mocks = vi.hoisted(() => {
  const status = {
    current_key: {
      key_id: "vk-0002",
      fingerprint_sha256: "a".repeat(64),
      created_at: "2026-05-04T09:00:00Z",
    },
    rotation: {
      id: "rot-1",
      state: "done",
      rows_total: 34,
      rows_done: 34,
      started_at: "2026-05-04T09:00:00Z",
      finished_at: "2026-05-04T09:02:00Z",
      error: null,
    },
  };
  const history = {
    items: [
      {
        rotation_id: "rot-1",
        state: "done",
        retired_key_fingerprint_sha256: "0123456789abcdef".repeat(4),
        retired_at: "2026-05-04T09:02:00Z",
        rows_total: 34,
        rows_done: 34,
      },
    ],
  };
  return {
    status,
    history,
    getKeyRotationStatus: vi.fn(() => Promise.resolve(status)),
    listKeyRotationHistory: vi.fn(() => Promise.resolve(history)),
    startKeyRotation: vi.fn(() =>
      Promise.resolve({
        current_key: {
          key_id: "vk-0003",
          fingerprint_sha256: "b".repeat(64),
          created_at: "2026-07-20T12:00:00Z",
        },
        rotation: {
          id: "rot-2",
          state: "pending",
          rows_total: 0,
          rows_done: 0,
          started_at: null,
          finished_at: null,
          error: null,
        },
      }),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    getKeyRotationStatus: mocks.getKeyRotationStatus,
    listKeyRotationHistory: mocks.listKeyRotationHistory,
    startKeyRotation: mocks.startKeyRotation,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { ApiError } from "@theourgia/shared";

import { KeyRotationRoute } from "../KeyRotationRoute.js";

function renderRoute() {
  return render(
    <I18nProvider>
      <ToastProvider />
      <MemoryRouter>
        <TopbarProvider>
          <Suspense fallback={<div>loading</div>}>
            <Routes>
              <Route path="/" element={<KeyRotationRoute />} />
            </Routes>
          </Suspense>
        </TopbarProvider>
      </MemoryRouter>
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
});

describe("KeyRotationRoute", () => {
  it("renders the current key fingerprint and trusted history from the endpoints", async () => {
    renderRoute();
    await flush();

    expect(mocks.getKeyRotationStatus).toHaveBeenCalledTimes(1);
    expect(mocks.listKeyRotationHistory).toHaveBeenCalledTimes(1);
    // Display format: "SHA256:aaaa aaaa aaaa aaaa · aaaa aaaa aaaa aaaa"
    const chunks = (hex: string) => {
      const c = hex.match(/.{1,4}/g)!;
      return `SHA256:${c.slice(0, 4).join(" ")} · ${c.slice(4, 8).join(" ")}`;
    };
    expect(screen.getByText(chunks(FINGERPRINT_A))).toBeInTheDocument();
    expect(screen.getByText(chunks(FINGERPRINT_B))).toBeInTheDocument();
    // Locale-agnostic: "retired 4 May 2026" or "retired May 4, 2026".
    expect(screen.getByText(/retired .*May.*2026/)).toBeInTheDocument();
  });

  it("Begin rotation POSTs to /keys/rotate and toasts the start message", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Begin rotation" }));
    await flush();

    expect(mocks.startKeyRotation).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Rotation started")).toBeInTheDocument();
    expect(screen.getByText(/background sweep re-encrypts/)).toBeInTheDocument();
  });

  it("maps 409 to the already-running toast", async () => {
    mocks.startKeyRotation.mockRejectedValueOnce(
      new ApiError(409, {
        type: "about:blank",
        title: "Conflict",
        status: 409,
        detail: "a key rotation is already in progress for this vault",
      }),
    );
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Begin rotation" }));
    await flush();

    expect(screen.getByText("A rotation is already running")).toBeInTheDocument();
  });

  it("renders busy while a rotation is pending", async () => {
    mocks.getKeyRotationStatus.mockResolvedValueOnce({
      ...mocks.status,
      rotation: { ...mocks.status.rotation, state: "running", rows_done: 4 },
    });
    renderRoute();
    await flush();

    expect(screen.getByRole("button", { name: "Begin rotation" })).toBeDisabled();
  });

  it("emergency revocation stays an honest toast and never calls the API", async () => {
    renderRoute();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Revoke this key" }));
    await flush();

    expect(screen.getByText("Revocation is rotation here")).toBeInTheDocument();
    expect(screen.getByText(/cannot be revoked on its own/)).toBeInTheDocument();
    expect(mocks.startKeyRotation).not.toHaveBeenCalled();
  });
});
