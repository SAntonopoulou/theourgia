/**
 * Frontend i18n.
 *
 * Mirrors the backend's :mod:`theourgia.core.i18n` substrate (S2) so feature
 * code can write ``_("Welcome")`` from day one. A real catalog system now
 * sits behind these calls — English ships as the identity passthrough,
 * Modern Greek (``el``) and Hebrew (``he``) ship as registered catalogs.
 * Host apps can ``registerCatalog`` for additional locales at runtime.
 *
 * The function names match the backend convention so a developer who reads
 * one set knows the other:
 *
 *     _("Hello, {name}!", { name: "Alice" })
 *     _lazy("Persona not found.")
 *     _n("{n} entry", "{n} entries", count)
 *     _n_lazy("{n} entry", "{n} entries", count)
 *
 * The active locale is tracked in a module-level ``currentLocale`` — that
 * keeps non-React callers (utility functions, validators) working without a
 * React-context dance. ``setCurrentLocale`` is wired by the ``I18nProvider``
 * hook in this same package.
 */

import { getCatalog, pluralCategory, type LocaleId } from "./locale.js";

export type Substitutions = Record<string, string | number>;

let currentLocale: LocaleId = "en";

export function setCurrentLocale(locale: LocaleId): void {
  currentLocale = locale;
}

export function getCurrentLocale(): LocaleId {
  return currentLocale;
}

function format(template: string, subs?: Substitutions): string {
  if (!subs) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in subs) return String(subs[key]);
    return match;
  });
}

/**
 * Look up ``message`` in the active catalog. Falls back to the source
 * string when no translation exists — that's the gettext convention
 * and ensures English-only locales keep rendering even without a
 * catalog.
 */
function translate(message: string, locale: LocaleId): string {
  const catalog = getCatalog(locale);
  if (!catalog) return message;
  const value = catalog[message];
  return typeof value === "string" ? value : message;
}

/** Translate ``message`` to the active locale. */
export function gettext(message: string, subs?: Substitutions): string {
  return format(translate(message, currentLocale), subs);
}

/**
 * ngettext — pick the singular / plural form by CLDR plural category.
 *
 * The simplified two-form API matches the backend shim. Languages with
 * more categories (e.g. Arabic's six) can still be handled — the
 * catalog can store branch-by-category strings keyed by source +
 * category — but the v0.x scope keeps it to one/other.
 */
export function ngettext(
  singular: string,
  plural: string,
  n: number,
  subs?: Substitutions,
): string {
  const category = pluralCategory(currentLocale, n);
  const sourceTemplate = category === "one" ? singular : plural;
  const translated = translate(sourceTemplate, currentLocale);
  return format(translated, { ...subs, n });
}

/**
 * Lazy variant — for module-level constants. Returns an object that
 * coerces to the translated string on ``toString()``. Resolution
 * defers to the active locale at coerce time, so module-init lazy
 * strings re-translate after the locale changes.
 */
export interface LazyString {
  toString(): string;
}

export function gettext_lazy(message: string, subs?: Substitutions): LazyString {
  return {
    toString(): string {
      return gettext(message, subs);
    },
  };
}

export function ngettext_lazy(
  singular: string,
  plural: string,
  n: number,
  subs?: Substitutions,
): LazyString {
  return {
    toString(): string {
      return ngettext(singular, plural, n, subs);
    },
  };
}

// Canonical short aliases — the backend's pattern.
export const _ = gettext;
export const _lazy = gettext_lazy;
export const _n = ngettext;
export const _n_lazy = ngettext_lazy;

// Re-export the locale registry surface so consumers don't have to
// import from a sub-path.
export {
  applyLocaleToDocument,
  availableLocales,
  getCatalog,
  getMeta,
  negotiateLocale,
  persistLocale,
  pluralCategory,
  readPersistedLocale,
  registerCatalog,
  resolveInitialLocale,
  type Catalog,
  type Direction,
  type LocaleId,
  type LocaleMeta,
} from "./locale.js";

// React provider + hook (consumers that want re-render on switch).
export { I18nProvider, useI18n } from "./I18nProvider.js";

// Language-picker primitive (Settings + topbar consumers).
export { LanguagePicker, type LanguagePickerProps } from "./LanguagePicker.js";
