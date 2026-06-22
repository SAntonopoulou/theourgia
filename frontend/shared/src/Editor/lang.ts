/**
 * Editor — shared language tokens.
 *
 * Kept in its own module to keep the dependency graph between
 * `extensions.ts` and `nodes/*` strictly one-way.
 */

export type LangScript = "el" | "he" | "en";

export const LANG_FONT: Record<LangScript, string> = {
  el: "var(--font-greek)",
  he: "var(--font-hebrew, var(--font-serif))",
  en: "var(--font-serif)",
};
