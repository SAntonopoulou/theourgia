/**
 * The practitioner's authored correspondence charts — the web mirror of the
 * phone's §10 model (its docs/CORRESPONDENCES-DESIGN.md; here via
 * NOTE_FROM_THE_PHONE-correspondences-v2.md).
 *
 * Rows run down a scale — a canonical taxonomy family, or the practitioner's
 * own — and columns run across, each carrying ITS OWN source, because the
 * honest unit of attribution is the claim, not the table. A blank cell is
 * absent, never an empty string. A mapped column (categoryKey set; canonical
 * scales only) stands in the subject lookup beside the packs' values, under
 * the column's source; custom scales never leak there. Charts and columns
 * soft-delete.
 *
 * Field names match the phone's JSON exactly (camelCase), and the backend
 * models in ``user_settings.py`` — one shape across every surface.
 */

import type { CorrespondenceSource, CorrespondenceTable } from "./packCorrespondences.js";
import { familyMembers } from "./taxonomy.js";

export interface OwnChartSource {
  title: string;
  author?: string | null;
  year?: number | null;
  note?: string | null;
}

export interface OwnChartRow {
  key: string;
  label: string;
  glyph?: string | null;
}

export interface OwnChartColumn {
  id: string;
  caption: string;
  /** Absent means the practitioner's own claim — "Yours", never anonymous. */
  source?: OwnChartSource | null;
  /** Set (canonical charts only), the column's cells stand in the lookup. */
  categoryKey?: string | null;
  commentary?: string;
  /** Tombstone (ISO-8601). Hidden, not erased. */
  deletedAt?: string | null;
}

export interface OwnChartCell {
  value: string;
  note?: string | null;
}

export interface OwnChart {
  id: string;
  name: string;
  /** A canonical taxonomy family key, or null for a scale of one's own. */
  scaleFamily?: string | null;
  commentary?: string;
  /** Custom-scale rows; empty for canonical charts (rows are the canon's). */
  rows: OwnChartRow[];
  columns: OwnChartColumn[];
  /** columnId → rowKey → cell. */
  cells: Record<string, Record<string, OwnChartCell>>;
  deletedAt?: string | null;
}

/** The charts not soft-deleted. */
export function livingCharts(charts: readonly OwnChart[]): OwnChart[] {
  return charts.filter((c) => !c.deletedAt);
}

/** A chart's columns not soft-deleted, in stored order. */
export function livingColumns(chart: OwnChart): OwnChartColumn[] {
  return chart.columns.filter((c) => !c.deletedAt);
}

/** The rows a chart's grid shows: the canon's members for a canonical scale
 *  (keys are subject keys, glyphs ride along), the stored rows for a custom
 *  one. */
export function chartRows(chart: OwnChart): OwnChartRow[] {
  if (chart.scaleFamily) {
    return familyMembers(chart.scaleFamily).map((s) => ({
      key: s.key,
      label: s.label,
      glyph: s.glyph ?? null,
    }));
  }
  return chart.rows;
}

/** "Agrippa, 1533" — author + year, falling back to the title; a column
 *  without a source is the practitioner's own and says so. */
export function columnAttribution(column: OwnChartColumn): string {
  const s = column.source;
  if (!s || !s.title) return "Yours";
  return s.author && s.year ? `${s.author}, ${s.year}` : s.title;
}

/**
 * The lookup bridge: each mapped column of each living canonical-scale chart
 * becomes one table the existing side-by-side lookup renders untouched —
 * subject = the row's canonical key, category = the column's mapping, source
 * = the COLUMN's own. Unmapped columns and custom-scale charts contribute
 * nothing, whatever their row keys collide with.
 */
export function mappedColumnTables(charts: readonly OwnChart[]): CorrespondenceTable[] {
  const out: CorrespondenceTable[] = [];
  for (const chart of livingCharts(charts)) {
    if (!chart.scaleFamily) continue;
    const subjectKeys = new Set(chartRows(chart).map((r) => r.key));
    for (const column of livingColumns(chart)) {
      const category = column.categoryKey;
      if (!category) continue;
      const held = chart.cells[column.id];
      if (!held) continue;
      const entries = Object.entries(held)
        .filter(([rowKey, cell]) => subjectKeys.has(rowKey) && cell.value.trim() !== "")
        .map(([rowKey, cell]) => ({
          subject: rowKey,
          category,
          value: cell.value,
          note: cell.note ?? undefined,
        }));
      if (entries.length === 0) continue;
      const source: CorrespondenceSource = column.source?.title
        ? {
            title: column.source.title,
            author: column.source.author ?? undefined,
            year: column.source.year ?? undefined,
          }
        : { title: "Yours" };
      out.push({ source, shortLabel: columnAttribution(column), entries });
    }
  }
  return out;
}
