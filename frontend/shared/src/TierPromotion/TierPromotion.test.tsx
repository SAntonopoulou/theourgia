/**
 * TierPromotion — H10 Cluster A7 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TierPromotionSurface } from "./TierPromotionSurface.js";
import type { ChecklistItem } from "./copy.js";

const PLUGIN = {
  name: "Decanic Faces",
  version: "v1.5.0",
  authorHandle: "@decan-press",
  inCommunityFor: "in Community for 4 months",
};

const CHECKLIST: ChecklistItem[] = [
  {
    id: "in_community_90d",
    label: "In Community ≥ 90 days (4 months)",
    kind: "automatic",
    satisfied: true,
  },
  {
    id: "no_open_advisories",
    label: "No outstanding vulnerability advisories",
    kind: "automatic",
    satisfied: true,
  },
  {
    id: "success_story",
    label: "At least one community success story or use-case",
    kind: "manual",
    satisfied: false,
  },
  {
    id: "migration_clean",
    label: "Migration history is clean",
    kind: "manual",
    satisfied: false,
  },
  {
    id: "test_coverage",
    label: "Test coverage ≥ 80% on the maintained branch",
    kind: "manual",
    satisfied: false,
  },
  {
    id: "agpl_compatible",
    label: "License remains AGPL-compatible (CC-BY-SA-4.0)",
    kind: "automatic",
    satisfied: true,
  },
];

describe("TierPromotionSurface", () => {
  test("rule 41 — Promote is DISABLED until every manual item is ticked", () => {
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={CHECKLIST} />,
    );
    expect(screen.getByText("Promote to Official")).toBeDisabled();
    expect(
      screen.getByText("Confirm every manual check to promote"),
    ).toBeInTheDocument();
  });

  test("ticking all manual checks enables Promote + flips the gate note", () => {
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={CHECKLIST} />,
    );
    const manualBoxes = screen.getAllByRole("checkbox");
    manualBoxes.forEach((b) => fireEvent.click(b));
    expect(screen.getByText("Promote to Official")).toBeEnabled();
    expect(screen.getByText("Every check satisfied")).toBeInTheDocument();
  });

  test("automatic-fail keeps Promote disabled even when all manual ticked", () => {
    const withFailingAuto: ChecklistItem[] = CHECKLIST.map((c) =>
      c.id === "no_open_advisories" ? { ...c, satisfied: false } : c,
    );
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={withFailingAuto} />,
    );
    screen.getAllByRole("checkbox").forEach((b) => fireEvent.click(b));
    expect(screen.getByText("Promote to Official")).toBeDisabled();
  });

  test("automatic items render the 'auto' badge + are NOT checkbox-toggleable", () => {
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={CHECKLIST} />,
    );
    const autoBadges = screen.getAllByText("auto");
    expect(autoBadges.length).toBe(3); // three automatic items in the fixture
    // The auto items render no checkbox role.
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3); // three manual items
  });

  test("Promote fires onPromote with justification + ticked manual ids", () => {
    const onPromote = vi.fn();
    render(
      <TierPromotionSurface
        plugin={PLUGIN}
        checklist={CHECKLIST}
        onPromote={onPromote}
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Justification"),
      { target: { value: "Solid Picatrix-citation correctness" } },
    );
    screen.getAllByRole("checkbox").forEach((b) => fireEvent.click(b));
    fireEvent.click(screen.getByText("Promote to Official"));
    expect(onPromote).toHaveBeenCalledWith({
      justification: "Solid Picatrix-citation correctness",
      manualChecksTicked: [
        "success_story",
        "migration_clean",
        "test_coverage",
      ],
    });
  });

  test("Change-plugin button fires onChangePlugin", () => {
    const onChangePlugin = vi.fn();
    render(
      <TierPromotionSurface
        plugin={PLUGIN}
        checklist={CHECKLIST}
        onChangePlugin={onChangePlugin}
      />,
    );
    fireEvent.click(screen.getByText("Change"));
    expect(onChangePlugin).toHaveBeenCalledTimes(1);
  });

  test("justification subtitle quotes the post-promotion attribution verbatim", () => {
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={CHECKLIST} />,
    );
    expect(
      screen.getByText(/Promoted to Official on \{date\}/),
    ).toBeInTheDocument();
  });

  test("checklist headline + subtitle render verbatim", () => {
    render(
      <TierPromotionSurface plugin={PLUGIN} checklist={CHECKLIST} />,
    );
    expect(screen.getByText("Promotion checklist")).toBeInTheDocument();
    expect(
      screen.getByText(/Automatic checks are read-only/i),
    ).toBeInTheDocument();
  });
});
