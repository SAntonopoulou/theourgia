/**
 * The two gates — /verdicts (H12 Sprint F2, Surface 4, rule 69).
 *
 * Covered: the queue renders in server order (oldest first) with ages;
 * opening a working shows its covenant panel; an undeclared working
 * offers the declare flow and POSTs the intent once; a sealed working
 * shows the covenant rail (fingerprint + hour, no edit affordance) and
 * the two gates; finalizing requires both gates non-open and goes
 * through a confirm; a judged working is immutable in the UI.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAwaitingJudgment: vi.fn(),
  listEntries: vi.fn(),
  getWorkingVerdict: vi.fn(),
  declareWorkingIntent: vi.fn(),
  putWorkingVerdict: vi.fn(),
}));

vi.mock("../../data/api.js", () => ({
  apiMethods: mocks,
  apiClient: { request: () => Promise.resolve([]) },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { VerdictsRoute } from "../VerdictsRoute.js";

const QUEUE = [
  {
    entry_id: "w-old",
    title: "The petition left at the crossroads stone",
    declared_at: "2026-06-19T21:00:00+03:00",
    gate1: "open" as const,
    gate2: "open" as const,
    age_days: 36,
  },
  {
    entry_id: "w-new",
    title: "Nine nights of the Lesser Banishing, at dusk",
    declared_at: "2026-07-09T20:44:00+03:00",
    gate1: "open" as const,
    gate2: "open" as const,
    age_days: 16,
  },
];

const SEALED_VERDICT = {
  entry_id: "w-new",
  title: "Nine nights of the Lesser Banishing, at dusk",
  intent: {
    text: "That the room be quiet enough to work in.",
    declared_at: "2026-07-09T20:44:00+03:00",
    fingerprint: "7a3f9c21aa55bb66cc77dd88ee99ff00112233445566778899aabbccddeeff00",
    immutable: true as const,
  },
  gate1: { result: "open" as const, notes: null },
  gate2: { result: "open" as const, notes: null },
  judged_at: null,
  finalized_at: null,
};

function withProviders(inner: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{inner}</QueryClientProvider>;
}

beforeEach(() => {
  mocks.listAwaitingJudgment.mockReset().mockResolvedValue(QUEUE);
  mocks.listEntries.mockReset().mockResolvedValue([]);
  mocks.getWorkingVerdict.mockReset().mockResolvedValue(SEALED_VERDICT);
  mocks.declareWorkingIntent.mockReset().mockResolvedValue(SEALED_VERDICT.intent);
  mocks.putWorkingVerdict.mockReset().mockResolvedValue(SEALED_VERDICT);
});

afterEach(() => {
  cleanup();
});

async function openSealedWorking(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    expect(container.querySelector('[data-queue-row="w-new"]')).not.toBeNull();
  });
  fireEvent.click(container.querySelector('[data-queue-row="w-new"]') as HTMLElement);
  await screen.findByText("Sealed · cannot be rewritten");
}

describe("VerdictsRoute — the queue", () => {
  it("renders the queue in server order (oldest first) with ages", async () => {
    const { container } = render(withProviders(<VerdictsRoute />));
    await waitFor(() => {
      expect(container.querySelectorAll("[data-queue-row]")).toHaveLength(2);
    });
    const rows = container.querySelectorAll("[data-queue-row]");
    expect(rows[0]?.getAttribute("data-queue-row")).toBe("w-old");
    expect(screen.getByText("36 days")).toBeInTheDocument();
    expect(screen.getByText("2 workings · oldest first")).toBeInTheDocument();
  });
});

describe("VerdictsRoute — declare-intent flow", () => {
  it("an undeclared working shows the covenant terms and POSTs the intent once", async () => {
    mocks.listEntries.mockImplementation((opts?: { type?: string }) =>
      Promise.resolve(
        opts?.type === "working"
          ? [
              {
                id: "w-undeclared",
                title: "A first scrying of the well",
                type: "working",
                excerpt: "",
                glyph: "ritual",
                created_at: "2026-07-20T10:00:00+03:00",
                updated_at: "2026-07-20T10:00:00+03:00",
              },
            ]
          : [],
      ),
    );
    mocks.getWorkingVerdict.mockResolvedValue({
      ...SEALED_VERDICT,
      entry_id: "w-undeclared",
      title: "A first scrying of the well",
      intent: null,
    });
    const { container } = render(withProviders(<VerdictsRoute />));
    const picker = await waitFor(() => {
      const el = container.querySelector("[data-working-picker]");
      expect(el).not.toBeNull();
      return el as HTMLSelectElement;
    });
    fireEvent.change(picker, { target: { value: "w-undeclared" } });
    await screen.findByText(/your later self cannot move the mark/);
    fireEvent.change(screen.getByLabelText("Declared intent"), {
      target: { value: "To see whether the well answers." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Seal the intent/ }));
    await waitFor(() => {
      expect(mocks.declareWorkingIntent).toHaveBeenCalledTimes(1);
      expect(mocks.declareWorkingIntent).toHaveBeenCalledWith("w-undeclared", {
        text: "To see whether the well answers.",
      });
    });
  });
});

describe("VerdictsRoute — sealed covenant + the two gates", () => {
  it("shows the sealed rail with fingerprint and hour, and no way to edit", async () => {
    const { container } = render(withProviders(<VerdictsRoute />));
    await openSealedWorking(container);
    const covenant = container.querySelector(
      '[data-component="intent-covenant"][data-state="sealed"]',
    ) as HTMLElement;
    expect(covenant).not.toBeNull();
    expect(covenant.querySelector("textarea")).toBeNull();
    expect(covenant.querySelector("button")).toBeNull();
    expect(covenant.textContent).toContain("SHA256:7a3f 9c21 aa55 bb66");
  });

  it("saves the gate verdicts via PUT without finalizing", async () => {
    const { container } = render(withProviders(<VerdictsRoute />));
    await openSealedWorking(container);
    const gate1 = container.querySelectorAll('[data-component="gate-card"]')[0] as HTMLElement;
    fireEvent.click(gate1.querySelector('[data-gate-option="pass"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Save without sealing" }));
    await waitFor(() => {
      expect(mocks.putWorkingVerdict).toHaveBeenCalledWith("w-new", {
        gate1: { result: "pass", notes: null },
        gate2: { result: "open", notes: null },
        finalize: false,
      });
    });
  });

  it("keeps Record the verdict disabled while a gate is open", async () => {
    const { container } = render(withProviders(<VerdictsRoute />));
    await openSealedWorking(container);
    expect(screen.getByRole("button", { name: "Record the verdict" })).toBeDisabled();
    const cards = container.querySelectorAll('[data-component="gate-card"]');
    fireEvent.click(cards[0]?.querySelector('[data-gate-option="pass"]') as HTMLElement);
    expect(screen.getByRole("button", { name: "Record the verdict" })).toBeDisabled();
    fireEvent.click(cards[1]?.querySelector('[data-gate-option="fail"]') as HTMLElement);
    expect(screen.getByRole("button", { name: "Record the verdict" })).not.toBeDisabled();
  });

  it("finalizes through a confirm and PUTs finalize:true", async () => {
    const { container } = render(withProviders(<VerdictsRoute />));
    await openSealedWorking(container);
    const cards = container.querySelectorAll('[data-component="gate-card"]');
    fireEvent.click(cards[0]?.querySelector('[data-gate-option="pass"]') as HTMLElement);
    fireEvent.click(cards[1]?.querySelector('[data-gate-option="pass"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Record the verdict" }));
    // The confirm names the consequence: sealed, unrevisable.
    await screen.findByText(/cannot be revised/);
    fireEvent.click(screen.getByRole("button", { name: "Record it" }));
    await waitFor(() => {
      expect(mocks.putWorkingVerdict).toHaveBeenCalledWith(
        "w-new",
        expect.objectContaining({ finalize: true }),
      );
    });
  });

  it("renders a judged working immutable — controls disabled, banner shown", async () => {
    mocks.getWorkingVerdict.mockResolvedValue({
      ...SEALED_VERDICT,
      gate1: { result: "pass", notes: "It held." },
      gate2: { result: "pass", notes: "Coheres." },
      judged_at: "2026-07-22T12:00:00+03:00",
      finalized_at: "2026-07-22T12:00:00+03:00",
    });
    const { container } = render(withProviders(<VerdictsRoute />));
    await openSealedWorking(container);
    await screen.findByText(/Verdict recorded/);
    for (const option of container.querySelectorAll("[data-gate-option]")) {
      expect(option).toBeDisabled();
    }
    for (const noteBox of container.querySelectorAll('[data-component="gate-card"] textarea')) {
      expect(noteBox).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: "Record the verdict" })).toBeNull();
    expect(screen.getByText(/cannot be revised/)).toBeInTheDocument();
  });
});
