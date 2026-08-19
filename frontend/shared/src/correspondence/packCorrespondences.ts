/**
 * Read a `correspondence-tables` pack payload into a source and its entries —
 * so a correspondence chart installed from the feed (Agrippa, Liber 777)
 * renders on the web exactly as it does on the phone: a subject read down its
 * categories, each source's value beside another's.
 *
 * The payload is the phone's correspondence pack reshaped to MBF: a `self:`
 * item carrying the `source` block, then one item per entry
 * (`subject`, `category`, `value`, optional `note`).
 */

export interface CorrespondenceEntry {
  subject: string;
  category: string;
  value: string;
  note?: string;
}

export interface CorrespondenceSource {
  title: string;
  author?: string;
  year?: number;
}

export interface CorrespondenceTable {
  source: CorrespondenceSource;
  /** "Agrippa, 1533" — author + year, falling back to the title. */
  shortLabel: string;
  entries: CorrespondenceEntry[];
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Map one `correspondence-tables` payload to its table, or null if it carries
 *  no source (an uncited table is refused, as on the phone). */
export function packToCorrespondenceTable(payload: unknown): CorrespondenceTable | null {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return null;

  let source: CorrespondenceSource | null = null;
  const entries: CorrespondenceEntry[] = [];

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    if (item.source !== null && typeof item.source === "object") {
      const s = item.source as Record<string, unknown>;
      source = {
        title: asString(s.title) ?? "",
        author: asString(s.author),
        year: typeof s.year === "number" ? s.year : undefined,
      };
      continue;
    }
    const subject = asString(item.subject);
    const category = asString(item.category);
    const value = asString(item.value);
    if (subject !== undefined && category !== undefined && value !== undefined) {
      entries.push({ subject, category, value, note: asString(item.note) });
    }
  }

  if (source === null) return null;
  const shortLabel =
    source.author && source.year ? `${source.author}, ${source.year}` : source.title;
  return { source, shortLabel, entries };
}

/** Every subject that any table fills, in first-seen order. */
export function subjectsAcross(tables: CorrespondenceTable[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tables) {
    for (const e of t.entries) {
      if (!seen.has(e.subject)) {
        seen.add(e.subject);
        out.push(e.subject);
      }
    }
  }
  return out;
}

/** The categories filled for one subject, across all tables, first-seen order. */
export function categoriesFor(tables: CorrespondenceTable[], subject: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tables) {
    for (const e of t.entries) {
      if (e.subject === subject && !seen.has(e.category)) {
        seen.add(e.category);
        out.push(e.category);
      }
    }
  }
  return out;
}

/** The value a table gives for a subject × category, or undefined. */
export function valueIn(
  table: CorrespondenceTable,
  subject: string,
  category: string,
): string | undefined {
  return table.entries.find((e) => e.subject === subject && e.category === category)?.value;
}
