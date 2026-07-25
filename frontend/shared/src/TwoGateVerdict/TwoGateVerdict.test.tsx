/**
 * Two-gate covenant components (H12 Sprint F2, rule 69).
 *
 * Under test: the covenant's immutability UI (sealed intent renders no
 * edit affordance, fingerprint + hour shown, "cannot be rewritten" in
 * words), gate verdict tones (fail is --warn, never --danger), queue
 * rows with age + pips, and the install-by-proof transition legality.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AwaitingJudgmentRead } from "../api/types.js";
import { AwaitingJudgmentQueue } from "./AwaitingJudgmentQueue.js";
import { GateCard } from "./GateCard.js";
import { IntentCovenantField } from "./IntentCovenantField.js";
import { PracticeModuleStateChip } from "./PracticeModuleStateChip.js";
import {
  LEGAL_MODULE_TRANSITIONS,
  canFinalize,
  isAwaiting,
  legalModuleTransitions,
  shortFingerprint,
} from "./covenant.js";

const SEALED = {
  text: "That the room be quiet enough to work in.",
  declared_at: "2026-07-09T20:44:00+03:00",
  fingerprint: "7a3f9c21aa55bb66cc77dd88ee99ff00112233445566778899aabbccddeeff00",
  immutable: true as const,
};

describe("covenant logic", () => {
  it("finalize requires both gates non-open", () => {
    expect(canFinalize("pass", "pass")).toBe(true);
    expect(canFinalize("pass", "fail")).toBe(true);
    expect(canFinalize("fail", "fail")).toBe(true);
    expect(canFinalize("open", "pass")).toBe(false);
    expect(canFinalize("pass", "open")).toBe(false);
    expect(canFinalize("open", "open")).toBe(false);
  });

  it("a working awaits judgment while any gate is open", () => {
    expect(isAwaiting("open", "open")).toBe(true);
    expect(isAwaiting("pass", "open")).toBe(true);
    expect(isAwaiting("pass", "fail")).toBe(false);
  });

  it("shortFingerprint spaces the first sixteen hex chars", () => {
    expect(shortFingerprint(SEALED.fingerprint)).toBe("SHA256:7a3f 9c21 aa55 bb66");
  });
});

describe("IntentCovenantField — undeclared", () => {
  it("says the covenant's terms in words and disables Seal on empty text", () => {
    render(<IntentCovenantField intent={null} onSeal={vi.fn()} />);
    expect(screen.getByText(/cannot be rewritten/)).toBeInTheDocument();
    expect(screen.getByText(/your later self cannot move the mark/)).toBeInTheDocument();
    const seal = screen.getByRole("button", { name: /Seal the intent/ });
    expect(seal).toBeDisabled();
  });

  it("seals once with the trimmed text", async () => {
    const onSeal = vi.fn().mockResolvedValue(undefined);
    render(<IntentCovenantField intent={null} onSeal={onSeal} />);
    fireEvent.change(screen.getByLabelText("Declared intent"), {
      target: { value: "  A quiet room.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Seal the intent/ }));
    expect(onSeal).toHaveBeenCalledWith("A quiet room.");
  });
});

describe("IntentCovenantField — sealed (immutability UI)", () => {
  it("renders the covenant rail with hour + fingerprint and NO edit affordance", () => {
    const { container } = render(<IntentCovenantField intent={SEALED} />);
    expect(screen.getByText("Sealed · cannot be rewritten")).toBeInTheDocument();
    expect(screen.getByText(/That the room be quiet enough to work in/)).toBeInTheDocument();
    const fp = container.querySelector("[data-fingerprint]") as HTMLElement;
    expect(fp.textContent).toContain("SHA256:7a3f 9c21 aa55 bb66");
    // The sealed hour renders from declared_at.
    expect(container.querySelector("[data-sealed-hour]")?.textContent).toMatch(/2026/);
    // Immutability: no textarea, no button, nothing to rewrite with.
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    // Covenant styling, not a plain card.
    const rail = container.querySelector('[data-state="sealed"]') as HTMLElement;
    expect(rail.style.background).toBe("var(--covenant-soft)");
  });
});

describe("GateCard", () => {
  it("offers exactly pass / fail / open and reports the pick", () => {
    const onChange = vi.fn();
    const { container } = render(
      <GateCard
        num="Gate 1"
        question="Did it work?"
        test="Repeatable — did the effect appear, and would it appear again?"
        value="open"
        note=""
        onChange={onChange}
      />,
    );
    const options = container.querySelectorAll("button[data-gate-option]");
    expect(Array.from(options).map((o) => o.getAttribute("data-gate-option"))).toEqual([
      "pass",
      "fail",
      "open",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "It did" }));
    expect(onChange).toHaveBeenCalledWith("pass");
  });

  it("a fail wears --gate-fail (an alias of --warn), never --danger", () => {
    const { container } = render(
      <GateCard num="Gate 2" question="Is it true?" test="Coherent" value="fail" note="" />,
    );
    const card = container.querySelector('[data-component="gate-card"]') as HTMLElement;
    expect(card.style.borderColor).toBe("var(--gate-fail)");
    expect(card.getAttribute("style") ?? "").not.toContain("danger");
  });

  it("disables all controls when finalized and shows the stamp", () => {
    const { container } = render(
      <GateCard
        num="Gate 1"
        question="Did it work?"
        test="Repeatable"
        value="pass"
        note="It held."
        disabled
        stamp="judged 22 Jul 2026"
      />,
    );
    for (const b of container.querySelectorAll("button")) {
      expect(b).toBeDisabled();
    }
    expect(container.querySelector("textarea")).toBeDisabled();
    expect(screen.getByText("judged 22 Jul 2026")).toBeInTheDocument();
  });
});

describe("AwaitingJudgmentQueue", () => {
  const ITEMS: AwaitingJudgmentRead[] = [
    {
      entry_id: "w-1",
      title: "The petition left at the crossroads stone",
      declared_at: "2026-06-19T21:00:00+03:00",
      gate1: "open",
      gate2: "open",
      age_days: 36,
    },
    {
      entry_id: "w-2",
      title: "Saturn talisman — first consecration",
      declared_at: "2026-07-02T20:00:00+03:00",
      gate1: "pass",
      gate2: "open",
      age_days: 23,
    },
  ];

  it("renders rows in the order given (server sends oldest first) with ages", () => {
    const { container } = render(<AwaitingJudgmentQueue items={ITEMS} />);
    const rows = container.querySelectorAll("[data-queue-row]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("data-queue-row")).toBe("w-1");
    expect(screen.getByText("36 days")).toBeInTheDocument();
    expect(screen.getByText("23 days")).toBeInTheDocument();
  });

  it("carries two gate pips per row reflecting each verdict", () => {
    const { container } = render(<AwaitingJudgmentQueue items={ITEMS} />);
    const second = container.querySelector('[data-queue-row="w-2"]') as HTMLElement;
    expect(second.querySelector('[data-gate-pip="1"]')?.getAttribute("data-result")).toBe("pass");
    expect(second.querySelector('[data-gate-pip="2"]')?.getAttribute("data-result")).toBe("open");
  });

  it("selects a working on click", () => {
    const onSelect = vi.fn();
    const { container } = render(<AwaitingJudgmentQueue items={ITEMS} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-queue-row="w-2"]') as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
  });

  it("renders the honest empty state when nothing awaits", () => {
    const { container } = render(<AwaitingJudgmentQueue items={[]} />);
    expect(container.querySelector("[data-empty]")).not.toBeNull();
    expect(screen.getByText(/Nothing awaits judgment/)).toBeInTheDocument();
  });
});

describe("install-by-proof transitions", () => {
  it("mirrors the backend's legal map exactly", () => {
    expect(LEGAL_MODULE_TRANSITIONS.candidate).toEqual(["testing"]);
    expect([...LEGAL_MODULE_TRANSITIONS.testing].sort()).toEqual(["installed", "rejected"]);
    expect(LEGAL_MODULE_TRANSITIONS.installed).toEqual([]);
    expect(LEGAL_MODULE_TRANSITIONS.rejected).toEqual(["candidate"]);
  });

  it("legalModuleTransitions never offers an illegal move", () => {
    expect(legalModuleTransitions("candidate")).not.toContain("installed");
    expect(legalModuleTransitions("candidate")).not.toContain("rejected");
    expect(legalModuleTransitions("installed")).toHaveLength(0);
    expect(legalModuleTransitions("rejected")).toEqual(["candidate"]);
  });

  it("PracticeModuleStateChip renders every state, rejected in --gate-fail", () => {
    for (const state of ["candidate", "testing", "installed", "rejected"] as const) {
      const { container, unmount } = render(<PracticeModuleStateChip state={state} />);
      const chip = container.querySelector(`[data-module-state="${state}"]`) as HTMLElement;
      expect(chip).not.toBeNull();
      expect(chip.textContent).toBe(state);
      if (state === "rejected") {
        expect(chip.style.color).toBe("var(--gate-fail)");
      }
      unmount();
    }
  });
});
