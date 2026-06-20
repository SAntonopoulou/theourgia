/**
 * Frontend i18n shim.
 *
 * Mirrors the backend's :mod:`theourgia.core.i18n` substrate (S2) so feature
 * code can write ``_("Welcome")`` from day one and the substrate decides
 * later whether the value is a passthrough (untranslated) or rendered
 * against a catalog.
 *
 * For now this is a thin passthrough — every call returns the source string
 * (formatted with any substitutions). When the API client + locale-loading
 * land in a later batch, this module gets wired to a real catalog without
 * any change to call sites.
 *
 * The function names match the backend convention so a developer who reads
 * one set knows the other:
 *
 *     _("Hello, {name}!", { name: "Alice" })
 *     _lazy("Persona not found.")
 *     _n("{n} entry", "{n} entries", count)
 *     _n_lazy("{n} entry", "{n} entries", count)
 */

export type Substitutions = Record<string, string | number>;

function format(template: string, subs?: Substitutions): string {
  if (!subs) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in subs) return String(subs[key]);
    return match;
  });
}

/** Translate ``message`` to the current locale. Passthrough today. */
export function gettext(message: string, subs?: Substitutions): string {
  return format(message, subs);
}

/** ngettext — singular / plural by count. Passthrough today (English rules). */
export function ngettext(
  singular: string,
  plural: string,
  n: number,
  subs?: Substitutions,
): string {
  const template = n === 1 ? singular : plural;
  return format(template, { ...subs, n });
}

/**
 * Lazy variant — for module-level constants. Returns an object that
 * coerces to the translated string on ``toString()``. Today this is a
 * trivial wrapper around the immediate `gettext`; once the catalog
 * pipeline lands, the resolution defers to the active locale at coerce
 * time.
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
