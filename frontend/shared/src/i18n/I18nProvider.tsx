/**
 * I18nProvider — React context that holds the active locale and rerenders
 * descendant components when it changes.
 *
 * Split into state + setter contexts (per
 * ``feedback_split_setter_state_contexts.md``) so consumers that only
 * need to switch the locale don't rerender every time the locale
 * changes downstream.
 *
 * The provider:
 *   1. Initializes the locale from persistence + ``navigator.languages``
 *      via ``resolveInitialLocale``.
 *   2. Pushes the locale to the module-level ``setCurrentLocale`` so
 *      non-React callers (gettext / ngettext) see the same value.
 *   3. Mirrors the locale to ``<html lang>`` + ``<html dir>``.
 *   4. Persists every change.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setCurrentLocale } from "./index.js";
import {
  applyLocaleToDocument,
  availableLocales,
  getMeta,
  type Direction,
  type LocaleId,
  type LocaleMeta,
  persistLocale,
  resolveInitialLocale,
} from "./locale.js";

interface I18nState {
  locale: LocaleId;
  dir: Direction;
  meta: LocaleMeta;
  available: LocaleMeta[];
}

type SetLocale = (locale: LocaleId) => void;

const I18nStateContext = createContext<I18nState | null>(null);
const I18nSetterContext = createContext<SetLocale | null>(null);

export interface I18nProviderProps {
  /** Override the initial locale (defaults to ``resolveInitialLocale``). */
  initial?: LocaleId;
  children: ReactNode;
}

export function I18nProvider({ initial, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleId>(() => initial ?? resolveInitialLocale());

  // Push to the module-level gettext + DOM on every change. Effects
  // also run on mount so the initial locale propagates before any
  // child reads from gettext.
  useEffect(() => {
    setCurrentLocale(locale);
    applyLocaleToDocument(locale);
    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback<SetLocale>((next) => {
    setLocaleState(next);
  }, []);

  const state = useMemo<I18nState>(() => {
    const meta = getMeta(locale) ?? getMeta("en")!;
    return {
      locale,
      dir: meta.dir,
      meta,
      available: availableLocales(),
    };
  }, [locale]);

  return (
    <I18nStateContext.Provider value={state}>
      <I18nSetterContext.Provider value={setLocale}>{children}</I18nSetterContext.Provider>
    </I18nStateContext.Provider>
  );
}

export function useI18n(): I18nState & { setLocale: SetLocale } {
  const state = useContext(I18nStateContext);
  const setLocale = useContext(I18nSetterContext);
  if (!state || !setLocale) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return { ...state, setLocale };
}
