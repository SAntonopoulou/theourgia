import { describe, expect, it } from "vitest";

import {
  SERPENT_ORDER,
  SPHERE_NAMES,
  TETRAKTYS_ROWS,
  octaveForSum,
  sphereForSum,
  tetraktysLayout,
} from "./tetraktys.js";

describe("tetraktys — the serpent walk", () => {
  it("is the fixed order 10→9→8→7→4→5→6→3→2→1", () => {
    expect([...SERPENT_ORDER]).toEqual([10, 9, 8, 7, 4, 5, 6, 3, 2, 1]);
  });

  it("visits every sphere exactly once", () => {
    expect([...SERPENT_ORDER].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("names all ten spheres, with 10 as Hekate's Decad", () => {
    for (const n of SERPENT_ORDER) {
      expect(SPHERE_NAMES[n]).toBeTruthy();
    }
    expect(SPHERE_NAMES[10]).toBe("Hekate / Decad");
    expect(SPHERE_NAMES[1]).toBe("Monad");
  });

  it("lays the figure as four rows of 1/2/3/4", () => {
    expect(TETRAKTYS_ROWS.map((r) => r.length)).toEqual([1, 2, 3, 4]);
    expect(TETRAKTYS_ROWS.flat().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("tetraktys — astragaloi sum overlay", () => {
  it("maps sum mod 10 with 0→10 (the backend's locked rule)", () => {
    expect(sphereForSum(5)).toBe(5);
    expect(sphereForSum(10)).toBe(10);
    expect(sphereForSum(18)).toBe(8);
    expect(sphereForSum(20)).toBe(10);
    expect(sphereForSum(21)).toBe(1);
    expect(sphereForSum(30)).toBe(10);
  });

  it("bands octaves as luminous ≤10 / embodied 11–20 / chthonic 21–30", () => {
    expect(octaveForSum(5)).toBe("luminous");
    expect(octaveForSum(10)).toBe("luminous");
    expect(octaveForSum(11)).toBe("embodied");
    expect(octaveForSum(20)).toBe("embodied");
    expect(octaveForSum(21)).toBe("chthonic");
    expect(octaveForSum(30)).toBe("chthonic");
  });
});

describe("tetraktysLayout", () => {
  it("positions ten points and threads the serpent through them in order", () => {
    const layout = tetraktysLayout(320, 300, { top: 40, rowGap: 72, step: 76 });
    expect(layout.points).toHaveLength(10);
    const pairs = layout.serpentPoints.split(" ");
    expect(pairs).toHaveLength(10);
    // The serpent path's coordinates follow SERPENT_ORDER exactly.
    SERPENT_ORDER.forEach((n, i) => {
      const p = layout.byNumber[n];
      expect(pairs[i]).toBe(`${p.x},${p.y}`);
    });
  });

  it("keeps row 1 on top and row 4 at the bottom", () => {
    const layout = tetraktysLayout(320, 300);
    expect(layout.byNumber[1].y).toBeLessThan(layout.byNumber[7].y);
    // All bottom-row spheres share a y.
    const bottomY = layout.byNumber[7].y;
    for (const n of [8, 9, 10] as const) {
      expect(layout.byNumber[n].y).toBe(bottomY);
    }
  });
});
