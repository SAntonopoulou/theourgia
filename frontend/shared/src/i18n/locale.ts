/**
 * Locale registry — small set of metadata + lazy catalog loaders for the
 * locales the frontend supports today.
 *
 * The shared package only ships catalogs for the locales it knows about
 * (English / Modern Greek / Hebrew so far); host apps can register
 * additional catalogs via ``registerCatalog`` before any rendering.
 *
 * Direction (``ltr`` / ``rtl``) is stored on the locale meta so the
 * provider can flip ``<html dir>`` along with ``<html lang>`` when the
 * user switches.
 *
 * Plural rules use the platform ``Intl.PluralRules`` — that's the
 * authoritative CLDR source, so we don't reinvent per-locale tables.
 */

import enCatalog from "./catalogs/en.json" with { type: "json" };
import elCatalog from "./catalogs/el.json" with { type: "json" };
import heCatalog from "./catalogs/he.json" with { type: "json" };

export type LocaleId = string;
export type Direction = "ltr" | "rtl";

export interface LocaleMeta {
  locale: LocaleId;
  name: string;
  dir: Direction;
  pluralCategories: string[];
}

export interface Catalog {
  $meta: LocaleMeta;
  [key: string]: string | LocaleMeta;
}

const REGISTRY = new Map<LocaleId, Catalog>([
  ["en", enCatalog as Catalog],
  ["el", elCatalog as Catalog],
  ["he", heCatalog as Catalog],
]);

/**
 * Register or replace a catalog at runtime. Useful for host apps that
 * load translations from the API (server-managed catalogs) rather than
 * shipping them with the bundle.
 */
export function registerCatalog(locale: LocaleId, catalog: Catalog): void {
  REGISTRY.set(locale, catalog);
}

/** All locales the runtime currently knows about. */
export function availableLocales(): LocaleMeta[] {
  return Array.from(REGISTRY.values()).map((c) => c.$meta);
}

export function getCatalog(locale: LocaleId): Catalog | undefined {
  return REGISTRY.get(locale);
}

export function getMeta(locale: LocaleId): LocaleMeta | undefined {
  return REGISTRY.get(locale)?.$meta;
}

/**
 * Match the user's preferred languages (e.g. ``navigator.languages``)
 * against the available registry. Prefers exact match, then language
 * primary subtag, then falls back to ``"en"``.
 */
export function negotiateLocale(preferences: readonly string[]): LocaleId {
  for (const pref of preferences) {
    if (REGISTRY.has(pref)) return pref;
    const primary = pref.split("-")[0];
    if (primary && REGISTRY.has(primary)) return primary;
  }
  return "en";
}

const STORAGE_KEY = "theourgia.locale";

export function readPersistedLocale(): LocaleId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && REGISTRY.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistLocale(locale: LocaleId): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // best-effort
  }
}

/**
 * Resolve the initial locale: persisted choice wins, otherwise negotiate
 * against ``navigator.languages``, otherwise English.
 */
export function resolveInitialLocale(): LocaleId {
  const persisted = readPersistedLocale();
  if (persisted) return persisted;
  if (typeof navigator !== "undefined" && navigator.languages?.length) {
    return negotiateLocale(navigator.languages);
  }
  return "en";
}

/**
 * Apply locale to ``<html>``: sets ``lang`` and ``dir`` so CSS-level
 * RTL rules + screen readers + browser hyphenation all align.
 */
export function applyLocaleToDocument(locale: LocaleId): void {
  if (typeof document === "undefined") return;
  const meta = getMeta(locale) ?? getMeta("en")!;
  const root = document.documentElement;
  root.setAttribute("lang", locale);
  root.setAttribute("dir", meta.dir);
}

/**
 * CLDR plural category for ``n`` under ``locale`` (e.g. "one" / "few" /
 * "many" / "other"). Uses the platform ``Intl.PluralRules``.
 */
export function pluralCategory(locale: LocaleId, n: number): string {
  try {
    return new Intl.PluralRules(locale).select(n);
  } catch {
    // Fallback to English rules if the runtime doesn't know the locale.
    return n === 1 ? "one" : "other";
  }
}
