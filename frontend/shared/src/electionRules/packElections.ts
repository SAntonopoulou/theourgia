/**
 * Read an `election-templates` pack into its matters and rulesets — for the
 * web reference.
 *
 * The phone elects: it scrubs a chart through time and finds the hours a matter
 * may be begun. The web has no chart to scrub, so it shows the rules themselves
 * — the sixteen matters, each with its place and significators, and the five
 * rulesets read through them, clause by clause with the reason for each.
 *
 * The payload is the phone's rules reshaped to MBF: `matters:*` items and
 * `rulesets:*` items. A ruleset's clauses can nest (`all`/`any` groups); the
 * reasons are collected flat, because a reference reads them as a list.
 */

export interface ElectionClause {
  /** The condition, humanised from its slug — "moon not void". */
  condition: string;
  /** Why the corpus holds it. */
  because: string;
  /** A hard requirement (the hour is refused without it) vs. a preference. */
  veto: boolean;
}

export interface Ruleset {
  id: string;
  name: string;
  summary: string;
  /** What it takes to be read — `matter`, or a fixed subject. */
  takes?: string;
  clauses: ElectionClause[];
  /** The clauses verbatim as the pack carries them — the elector's wire
   *  format, passed untouched to `POST /astro/elect`. */
  clausesRaw: unknown[];
  /** The pack's own warnings about running this ruleset. */
  cautions: string[];
}

export interface Matter {
  key: string;
  name: string;
  /** The place of the matter, 1–12. */
  house: number;
  /** The bodies that carry it. */
  significators: string[];
  /** The ruleset id this matter is read through. */
  ruleset: string;
  summary: string;
}

export interface ElectionTemplates {
  matters: Matter[];
  rulesets: Ruleset[];
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ");
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Every reasoned clause, flattened out of any `all`/`any` grouping. */
function collectClauses(value: unknown): ElectionClause[] {
  if (!Array.isArray(value)) return [];
  const out: ElectionClause[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") continue;
    const clause = raw as Record<string, unknown>;
    if (typeof clause.because === "string") {
      out.push({
        condition: typeof clause.condition === "string" ? humanize(clause.condition) : "",
        because: clause.because,
        veto: clause.veto === true,
      });
    }
    // Compound groups carry their own reasoned clauses beneath them.
    for (const group of ["all", "any"] as const) {
      if (Array.isArray(clause[group])) out.push(...collectClauses(clause[group]));
    }
  }
  return out;
}

export function packToElectionTemplates(payload: unknown): ElectionTemplates {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return { matters: [], rulesets: [] };

  const matters: Matter[] = [];
  const rulesets: Ruleset[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const ref = typeof item.ref === "string" ? item.ref : "";

    if (ref.startsWith("matters:")) {
      const key = typeof item.key === "string" ? item.key : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (key === null || name === null) continue;
      matters.push({
        key,
        name,
        house: typeof item.house === "number" ? item.house : 0,
        significators: strings(item.significators),
        ruleset: typeof item.ruleset === "string" ? item.ruleset : "",
        summary: typeof item.summary === "string" ? item.summary : "",
      });
    } else if (ref.startsWith("rulesets:")) {
      const id = typeof item.id === "string" ? item.id : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (id === null || name === null) continue;
      rulesets.push({
        id,
        name,
        summary: typeof item.summary === "string" ? item.summary : "",
        takes: typeof item.takes === "string" ? item.takes : undefined,
        clauses: collectClauses(item.clauses),
        clausesRaw: Array.isArray(item.clauses) ? item.clauses : [],
        cautions: strings(item.cautions),
      });
    }
  }
  return { matters, rulesets };
}
