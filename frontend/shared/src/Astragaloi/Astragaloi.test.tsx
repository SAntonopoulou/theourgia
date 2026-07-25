/**
 * Astragaloi components (H12 Sprint F2).
 *
 * The hard rules under test: faces are 1/3/4/6 only — the entry UI
 * never offers a 2 or a 5 (rule 68); a simulated cast is marked
 * simulated wherever it renders (rule 67); both channels of a reading
 * render side by side; the corpus meta shows its caveats verbatim.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AstragaloiCastRead } from "../api/types.js";
import { BoneFaceEntry } from "./BoneFaceEntry.js";
import { BoneFaceGlyph } from "./BoneFaceGlyph.js";
import { CastHistoryRow } from "./CastHistoryRow.js";
import { CorpusMetaDrawer } from "./CorpusMetaDrawer.js";
import { LadderChannelCard } from "./LadderChannelCard.js";
import { OracleChannelCard } from "./OracleChannelCard.js";
import { SimulatedThrowBar } from "./SimulatedThrowBar.js";
import {
  BONE_FACES,
  IMPOSSIBLE_SUMS,
  emptyEntry,
  entryComplete,
  entrySum,
  isBoneFace,
} from "./faces.js";

const CAST: AstragaloiCastRead = {
  id: "cast-1",
  faces: [1, 3, 4, 4, 6],
  sum: 18,
  simulated: false,
  cast_at: "2026-07-24T18:40:00+03:00",
  question: "Whether to take the house at the edge of the town",
  entry_id: null,
  declared_intent: null,
  oracle: {
    number: "XXX",
    god_greek: "Ἑρμῆς Ἐνόδιος",
    god_english: "Hermes of the Road",
    verse_greek: "ἴθι, μὴ στρέφου",
    verse_english:
      "Go, and do not turn back: the road you doubt is the road that was opened for you.",
    valence: "favourable",
  },
  ladder: { sphere: 8, octave: "embodied", ground_element: "Earth" },
  interpretation: null,
  owner_id: "op",
  created_at: "2026-07-24T18:40:00+03:00",
  updated_at: "2026-07-24T18:40:00+03:00",
};

describe("face mechanics (rule 68)", () => {
  it("legal faces are exactly 1, 3, 4, 6", () => {
    expect([...BONE_FACES]).toEqual([1, 3, 4, 6]);
    expect(isBoneFace(2)).toBe(false);
    expect(isBoneFace(5)).toBe(false);
    expect(isBoneFace(0)).toBe(false);
    expect(isBoneFace(6)).toBe(true);
  });

  it("6 and 29 are the impossible sums", () => {
    expect(IMPOSSIBLE_SUMS.has(6)).toBe(true);
    expect(IMPOSSIBLE_SUMS.has(29)).toBe(true);
    expect(IMPOSSIBLE_SUMS.has(5)).toBe(false);
    expect(IMPOSSIBLE_SUMS.has(30)).toBe(false);
  });

  it("entry helpers sum and detect completeness", () => {
    const entry = emptyEntry();
    expect(entrySum(entry)).toBe(0);
    expect(entryComplete(entry)).toBe(false);
    const full = [1, 3, 4, 4, 6] as const;
    expect(entrySum([...full])).toBe(18);
    expect(entryComplete([...full])).toBe(true);
    expect(entryComplete([1, 3, null, 4, 6])).toBe(false);
  });
});

describe("BoneFaceGlyph", () => {
  it("renders the pip cluster for each legal face", () => {
    for (const face of BONE_FACES) {
      const { container, unmount } = render(<BoneFaceGlyph face={face} />);
      const svg = container.querySelector(`svg[data-bone-face="${face}"]`);
      expect(svg).not.toBeNull();
      expect(svg?.querySelectorAll("circle")).toHaveLength(face);
      unmount();
    }
  });

  it("renders NOTHING for 2 and 5 — there is no such face", () => {
    for (const face of [2, 5, 0, 7]) {
      const { container, unmount } = render(<BoneFaceGlyph face={face} />);
      expect(container.querySelector("svg")).toBeNull();
      unmount();
    }
  });
});

describe("BoneFaceEntry", () => {
  it("offers exactly four faces per bone — no 2, no 5", () => {
    const { container } = render(<BoneFaceEntry value={emptyEntry()} onPick={vi.fn()} />);
    const bones = container.querySelectorAll("[data-bone-index]");
    expect(bones).toHaveLength(5);
    for (const bone of bones) {
      const buttons = bone.querySelectorAll("button[data-face]");
      expect(buttons).toHaveLength(4);
      const faces = Array.from(buttons).map((b) => Number(b.getAttribute("data-face")));
      expect(faces).toEqual([1, 3, 4, 6]);
    }
    expect(container.querySelector('button[data-face="2"]')).toBeNull();
    expect(container.querySelector('button[data-face="5"]')).toBeNull();
  });

  it("reports a live count while incomplete and the full sum when complete", () => {
    const { rerender } = render(
      <BoneFaceEntry value={[1, 3, null, null, null]} onPick={vi.fn()} />,
    );
    expect(screen.getByText(/2 of five faces recorded/i)).toBeInTheDocument();
    rerender(<BoneFaceEntry value={[1, 3, 4, 4, 6]} onPick={vi.fn()} />);
    expect(
      screen.getByText(/Five faces recorded · 1 \+ 3 \+ 4 \+ 4 \+ 6 = 18/),
    ).toBeInTheDocument();
  });

  it("fires onPick with the bone index and the face", () => {
    const onPick = vi.fn();
    render(<BoneFaceEntry value={emptyEntry()} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Bone 3, face 6" }));
    expect(onPick).toHaveBeenCalledWith(2, 6);
  });
});

describe("the two channels", () => {
  it("OracleChannelCard renders god, verse and the valence chip", () => {
    render(<OracleChannelCard oracle={CAST.oracle} sum={CAST.sum} />);
    expect(screen.getByText("Ἑρμῆς Ἐνόδιος")).toBeInTheDocument();
    expect(screen.getByText(/Go, and do not turn back/)).toBeInTheDocument();
    expect(screen.getByText("favourable")).toBeInTheDocument();
    // Citation carries the corpus number + sum — provenance, not decoration.
    expect(screen.getByText(/oracle XXX · sum 18/i)).toBeInTheDocument();
  });

  it("OracleChannelCard shows the Greek only when the corpus preserves it", () => {
    const { container, rerender } = render(
      <OracleChannelCard oracle={CAST.oracle} sum={CAST.sum} />,
    );
    expect(container.querySelector("[data-verse-greek]")).not.toBeNull();
    rerender(<OracleChannelCard oracle={{ ...CAST.oracle, verse_greek: null }} sum={CAST.sum} />);
    // Never synthesised for a missing entry.
    expect(container.querySelector("[data-verse-greek]")).toBeNull();
  });

  it("valence tones avoid --danger: unfavourable is --warn", () => {
    const { container } = render(
      <OracleChannelCard oracle={{ ...CAST.oracle, valence: "unfavourable" }} sum={CAST.sum} />,
    );
    const chip = container.querySelector('[data-valence="unfavourable"]') as HTMLElement;
    expect(chip.style.color).toBe("var(--warn)");
    expect(chip.style.color).not.toContain("danger");
  });

  it("LadderChannelCard renders sum → sphere, octave chip and ground", () => {
    const { container } = render(<LadderChannelCard ladder={CAST.ladder} sum={CAST.sum} />);
    expect(screen.getByText("sum 18")).toBeInTheDocument();
    expect(screen.getByText("Ogdoad")).toBeInTheDocument();
    expect(screen.getByText("sphere 8 of ten")).toBeInTheDocument();
    expect(screen.getByText("embodied")).toBeInTheDocument();
    expect(screen.getByText("Earth")).toBeInTheDocument();
    // The mini figure lights exactly one sphere.
    const svg = container.querySelector('svg[aria-label="Tetraktys with sphere 8 lit"]');
    expect(svg).not.toBeNull();
    const lit = Array.from(svg?.querySelectorAll("circle") ?? []).filter(
      (c) => c.getAttribute("stroke") === "var(--accent)",
    );
    expect(lit).toHaveLength(1);
  });
});

describe("SimulatedThrowBar (rule 67)", () => {
  it("is dashed, separated, and says the mark is forever", () => {
    const onSimulate = vi.fn();
    const { container } = render(<SimulatedThrowBar onSimulate={onSimulate} />);
    const bar = container.querySelector('[data-component="simulated-throw-bar"]') as HTMLElement;
    expect(bar.style.borderStyle).toBe("dashed");
    expect(screen.getByText(/marked as simulated in your history/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simulate a throw" }));
    expect(onSimulate).toHaveBeenCalledTimes(1);
  });
});

describe("CastHistoryRow", () => {
  it("shows faces, sum, god and question", () => {
    render(<CastHistoryRow cast={CAST} />);
    expect(screen.getByText("1 3 4 4 6")).toBeInTheDocument();
    expect(screen.getByText("= 18")).toBeInTheDocument();
    expect(screen.getByText(/Hermes of the Road · Whether to take the house/)).toBeInTheDocument();
  });

  it("marks a simulated cast — and only a simulated cast", () => {
    const { container, rerender } = render(<CastHistoryRow cast={CAST} />);
    expect(container.querySelector("[data-simulated-chip]")).toBeNull();
    rerender(<CastHistoryRow cast={{ ...CAST, simulated: true }} />);
    expect(container.querySelector("[data-simulated-chip]")).not.toBeNull();
    expect(screen.getByText("simulated")).toBeInTheDocument();
  });

  it("fires onSelect with the cast", () => {
    const onSelect = vi.fn();
    const { container } = render(<CastHistoryRow cast={CAST} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-cast-id="cast-1"]') as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith(CAST);
  });
});

describe("CorpusMetaDrawer", () => {
  it("renders caveats and gaps verbatim", () => {
    render(
      <CorpusMetaDrawer
        open
        onClose={vi.fn()}
        meta={{
          title: "Astragaloi Data Corpus — the 56 casts",
          tetraktys_overlay: "The Order's own composition, NOT attested tradition",
          caveats: [
            "All translations are drafts pending Sophia's collation of Nollé 2007.",
            "XXXVII: the surviving Greek does NOT correspond to Graf's English.",
          ],
          gaps: {
            verse_greek_missing: ["VIII", "IX", "X"],
            verse_greek_missing_count: 3,
            final_sophia_renderings: "all 56 'Final (Sophia)' lines blank at assembly",
          },
        }}
      />,
    );
    expect(screen.getByText(/drafts pending Sophia's collation/)).toBeInTheDocument();
    expect(screen.getByText(/does NOT correspond to Graf's English/)).toBeInTheDocument();
    // Gap lists keep their raw keys and roman numerals.
    expect(screen.getByText("verse_greek_missing")).toBeInTheDocument();
    expect(screen.getByText("VIII · IX · X")).toBeInTheDocument();
    // _count keys are elided, not prettified into stats.
    expect(screen.queryByText("verse_greek_missing_count")).toBeNull();
    expect(screen.getByText(/blank at assembly/)).toBeInTheDocument();
  });
});
