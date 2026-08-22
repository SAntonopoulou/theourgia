import { describe, expect, it } from "vitest";

import {
  type OwnChart,
  chartRows,
  columnAttribution,
  livingColumns,
  mappedColumnTables,
} from "./ownCharts.js";

function chart(overrides: Partial<OwnChart>): OwnChart {
  return {
    id: "ch1",
    name: "T",
    scaleFamily: "planet",
    rows: [],
    columns: [],
    cells: {},
    ...overrides,
  };
}

describe("chartRows", () => {
  it("draws a canonical chart's rows from the canon, glyphs riding along", () => {
    const rows = chartRows(chart({ scaleFamily: "planet" }));
    expect(rows[0]).toEqual({ key: "planet.sun", label: "Sun", glyph: "☉" });
    expect(rows.map((r) => r.key)).toContain("planet.mars");
  });

  it("keeps a custom chart's own rows, in their order", () => {
    const rows = chartRows(
      chart({
        scaleFamily: null,
        rows: [
          { key: "r1", label: "Shemihazah" },
          { key: "r2", label: "Kokabel", glyph: "✶" },
        ],
      }),
    );
    expect(rows.map((r) => r.label)).toEqual(["Shemihazah", "Kokabel"]);
  });
});

describe("columnAttribution", () => {
  it("credits author and year, falls back to title, and owns the sourceless", () => {
    expect(
      columnAttribution({
        id: "c",
        caption: "Metals",
        source: { title: "Occult Philosophy", author: "Agrippa", year: 1533 },
      }),
    ).toBe("Agrippa, 1533");
    expect(columnAttribution({ id: "c", caption: "Metals", source: { title: "A handout" } })).toBe(
      "A handout",
    );
    expect(columnAttribution({ id: "c", caption: "Musings" })).toBe("Yours");
  });
});

describe("mappedColumnTables", () => {
  const base = chart({
    columns: [
      {
        id: "mapped",
        caption: "Metals",
        source: { title: "Handout", author: "Teacher" },
        categoryKey: "metal",
      },
      { id: "unmapped", caption: "Musings" },
    ],
    cells: {
      mapped: { "planet.mars": { value: "Iron" } },
      unmapped: { "planet.mars": { value: "Not for the lookup" } },
    },
  });

  it("turns a mapped column into a lookup table under its own source", () => {
    const tables = mappedColumnTables([base]);
    expect(tables).toHaveLength(1);
    expect(tables[0]?.shortLabel).toBe("Handout");
    expect(tables[0]?.entries).toEqual([
      { subject: "planet.mars", category: "metal", value: "Iron", note: undefined },
    ]);
  });

  it("never lets a custom-scale chart leak, whatever its keys collide with", () => {
    const custom = chart({
      scaleFamily: null,
      rows: [{ key: "r1", label: "A row" }],
      columns: [{ id: "c1", caption: "C", categoryKey: "metal" }],
      cells: { c1: { "planet.mars": { value: "Y" }, r1: { value: "X" } } },
    });
    expect(mappedColumnTables([custom])).toEqual([]);
  });

  it("skips soft-deleted charts and columns", () => {
    expect(mappedColumnTables([{ ...base, deletedAt: "2026-08-22T00:00:00Z" }])).toEqual([]);
    const columnGone = chart({
      columns: [
        {
          id: "mapped",
          caption: "Metals",
          categoryKey: "metal",
          deletedAt: "2026-08-22T00:00:00Z",
        },
      ],
      cells: { mapped: { "planet.mars": { value: "Iron" } } },
    });
    expect(mappedColumnTables([columnGone])).toEqual([]);
    expect(livingColumns(columnGone)).toEqual([]);
  });

  it("a sourceless mapped column stands as Yours", () => {
    const mine = chart({
      columns: [{ id: "c1", caption: "My metals", categoryKey: "metal" }],
      cells: { c1: { "planet.mars": { value: "Meteoric iron" } } },
    });
    const tables = mappedColumnTables([mine]);
    expect(tables[0]?.shortLabel).toBe("Yours");
    expect(tables[0]?.source.title).toBe("Yours");
  });
});
