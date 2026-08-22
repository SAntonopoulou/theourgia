/**
 * DivinationMiscRoute wiring tests (v1-014).
 *
 * The pendulum / horary / scrying panels used to toast "panel — no
 * data collected" on save. These tests pin the real wiring:
 *   - pendulum Ask → POST /api/v1/pendulum/readings payload
 *   - scrying save → POST /api/v1/scrying/sessions + …/{id}/end
 *   - error paths toast the bibliomancy-shaped error titles
 *   - horary casts the TYPED question through POST /api/v1/horary/cast
 *     (the panel captures it now) and never fabricates one unasked
 *   - the scrying "Past sessions" rail hydrates from the list endpoint
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
} from "@theourgia/shared";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPendulumReading: vi.fn(),
  listPendulumReadings: vi.fn(),
  castHorary: vi.fn(),
  listHoraryReadings: vi.fn(),
  startScryingSession: vi.fn(),
  endScryingSession: vi.fn(),
  listScryingSessions: vi.fn(),
  request: vi.fn(),
}));

vi.mock("../../data/api.js", () => ({
  apiClient: { request: mocks.request },
  apiMethods: {
    createPendulumReading: mocks.createPendulumReading,
    listPendulumReadings: mocks.listPendulumReadings,
    castHorary: mocks.castHorary,
    listHoraryReadings: mocks.listHoraryReadings,
    startScryingSession: mocks.startScryingSession,
    endScryingSession: mocks.endScryingSession,
    listScryingSessions: mocks.listScryingSessions,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { DivinationMiscRoute } from "../DivinationMiscRoute.js";

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
              <TopbarProvider>{inner}</TopbarProvider>
            </MemoryRouter>
          </ActingAsProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listScryingSessions.mockResolvedValue([]);
});

afterEach(cleanup);

async function openScrying() {
  render(withProviders(<DivinationMiscRoute />));
  fireEvent.click(screen.getByText("Scrying"));
  return screen.findByPlaceholderText(/Set down what comes/);
}

describe("DivinationMiscRoute — scrying wiring", () => {
  it("save posts start + end with the captured medium and vision", async () => {
    mocks.startScryingSession.mockResolvedValue({ id: "s1" });
    mocks.endScryingSession.mockResolvedValue({ id: "s1" });
    const textarea = await openScrying();
    fireEvent.click(screen.getByText("Crystal"));
    fireEvent.change(textarea, { target: { value: "A door of pale stone." } });
    fireEvent.click(screen.getByText("Save scrying session"));

    await waitFor(() =>
      expect(mocks.startScryingSession).toHaveBeenCalledWith({ mode: "crystal" }),
    );
    await waitFor(() =>
      expect(mocks.endScryingSession).toHaveBeenCalledWith("s1", {
        vision_notes: "A door of pale stone.",
      }),
    );
    expect(await screen.findByText("Scrying session logged")).toBeInTheDocument();
  });

  it("save without vision text shows the guard and posts nothing", async () => {
    await openScrying();
    fireEvent.click(screen.getByText("Save scrying session"));
    expect(await screen.findByText("Nothing to log")).toBeInTheDocument();
    expect(mocks.startScryingSession).not.toHaveBeenCalled();
    expect(mocks.endScryingSession).not.toHaveBeenCalled();
  });

  it("error path toasts 'Couldn't save session'", async () => {
    mocks.startScryingSession.mockRejectedValue(new Error("boom"));
    const textarea = await openScrying();
    fireEvent.change(textarea, { target: { value: "Still water." } });
    fireEvent.click(screen.getByText("Save scrying session"));
    expect(await screen.findByText("Couldn't save session")).toBeInTheDocument();
  });

  it("the Past sessions rail hydrates from GET /scrying/sessions", async () => {
    mocks.listScryingSessions.mockResolvedValue([
      {
        id: "s9",
        mode: "water_bowl",
        started_at: "2026-07-01T20:00:00.000Z",
        ended_at: "2026-07-01T20:12:00.000Z",
        duration_seconds: 720,
        intention: null,
        preparation_notes: null,
        entity_id: null,
        vision_notes: "A ring of salt.",
        symbols: [],
        sketch_upload_id: null,
        voice_memo_upload_id: null,
        planetary_hour: null,
        entry_id: null,
        owner_id: null,
        created_at: "2026-07-01T20:00:00.000Z",
        updated_at: "2026-07-01T20:12:00.000Z",
      },
    ]);
    await openScrying();
    expect(await screen.findByText("A ring of salt.")).toBeInTheDocument();
  });
});

describe("DivinationMiscRoute — pendulum wiring", () => {
  it("Ask posts the reading with question + wire outcome", async () => {
    mocks.createPendulumReading.mockResolvedValue({ id: "p1" });
    render(withProviders(<DivinationMiscRoute />));
    fireEvent.change(screen.getByPlaceholderText(/Ask a yes/), {
      target: { value: "Will it rain?" },
    });
    fireEvent.click(screen.getByText("Ask"));

    await waitFor(() => expect(mocks.createPendulumReading).toHaveBeenCalledTimes(1));
    const payload = mocks.createPendulumReading.mock.calls[0]?.[0] as {
      question: string;
      outcome: string;
      asked_at?: string;
    };
    expect(payload.question).toBe("Will it rain?");
    expect(["yes", "no", "maybe", "no_response"]).toContain(payload.outcome);
    expect(payload.asked_at).toBeTruthy();
    expect(await screen.findByText("Pendulum reading logged")).toBeInTheDocument();
  });

  it("error path toasts 'Couldn't save reading'", async () => {
    mocks.createPendulumReading.mockRejectedValue(new Error("boom"));
    render(withProviders(<DivinationMiscRoute />));
    fireEvent.click(screen.getByText("Ask"));
    expect(await screen.findByText("Couldn't save reading")).toBeInTheDocument();
  });
});

describe("DivinationMiscRoute — horary", () => {
  it("save is disabled until a question is asked — never a fabricated cast", async () => {
    render(withProviders(<DivinationMiscRoute />));
    fireEvent.click(screen.getByText("Horary"));
    const save = await screen.findByText("Save chart & reading");
    fireEvent.click(save);
    expect(mocks.castHorary).not.toHaveBeenCalled();
  });

  it("a typed question casts and keeps through POST /horary/cast", async () => {
    mocks.castHorary.mockResolvedValue({
      id: "h1",
      question: "Will the letter arrive?",
      asked_at: "2026-08-23T10:00:00Z",
    });
    render(withProviders(<DivinationMiscRoute />));
    fireEvent.click(screen.getByText("Horary"));
    const input = await screen.findByPlaceholderText(/moment of true asking/);
    fireEvent.change(input, { target: { value: "Will the letter arrive?" } });
    fireEvent.click(screen.getByText("Save chart & reading"));
    await waitFor(() =>
      expect(mocks.castHorary).toHaveBeenCalledWith(
        expect.objectContaining({ question: "Will the letter arrive?" }),
      ),
    );
    expect(await screen.findByText("The chart is cast and kept")).toBeInTheDocument();
  });

  it("past questions hydrate from GET /horary/readings", async () => {
    mocks.listHoraryReadings.mockResolvedValue([
      {
        id: "h2",
        question: "Is the ship safe?",
        asked_at: "2026-08-20T09:00:00Z",
      },
    ]);
    render(withProviders(<DivinationMiscRoute />));
    fireEvent.click(screen.getByText("Horary"));
    expect(await screen.findByText("Is the ship safe?")).toBeInTheDocument();
  });
});
