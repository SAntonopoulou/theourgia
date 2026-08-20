/**
 * PracticesSettingsRoute — the built-in-discipline toggles, web parity with
 * the phone. Covers: the list renders from the server with each switch
 * reflecting its state, and flipping one PUTs the new switched-off set and
 * reconciles from the response.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

function renderRoute(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mocks = vi.hoisted(() => {
  const PRACTICES = {
    practices: [
      {
        key: "lunarAdorations",
        label: "Lunar adorations",
        glyph: "☽",
        detail: "Moonrise, culmination, moonset, nadir",
        enabled: true,
      },
      {
        key: "rituals",
        label: "Rituals",
        glyph: "☩",
        detail: "Rites you have written",
        enabled: false,
      },
    ],
  };
  return {
    PRACTICES,
    getMyPractices: vi.fn(() => Promise.resolve(PRACTICES)),
    // Echo the phone's rule: enabled = not in the disabled set.
    putMyPractices: vi.fn((input: { disabled: string[] }) =>
      Promise.resolve({
        practices: PRACTICES.practices.map((p) => ({
          ...p,
          enabled: !input.disabled.includes(p.key),
        })),
      }),
    ),
  };
});

vi.mock("../../data/api.js", () => ({
  apiMethods: {
    getMyPractices: mocks.getMyPractices,
    putMyPractices: mocks.putMyPractices,
  },
}));

import { PracticesSettingsRoute } from "../PracticesSettingsRoute.js";

afterEach(() => {
  cleanup();
  mocks.getMyPractices.mockClear();
  mocks.putMyPractices.mockClear();
});

describe("PracticesSettingsRoute", () => {
  it("renders each discipline with its switch reflecting on/off", async () => {
    renderRoute(<PracticesSettingsRoute />);
    expect(await screen.findByText("Lunar adorations")).toBeInTheDocument();
    expect(screen.getByText("Rituals")).toBeInTheDocument();

    expect(screen.getByRole("switch", { name: "Lunar adorations" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Rituals" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("switching one off PUTs the whole off-set and reconciles", async () => {
    renderRoute(<PracticesSettingsRoute />);
    const lunar = await screen.findByRole("switch", { name: "Lunar adorations" });

    await act(async () => {
      fireEvent.click(lunar);
    });

    // Rituals was already off; turning Lunar off makes the set both keys.
    await waitFor(() =>
      expect(mocks.putMyPractices).toHaveBeenCalledWith({
        disabled: ["lunarAdorations", "rituals"],
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Lunar adorations" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
  });
});
