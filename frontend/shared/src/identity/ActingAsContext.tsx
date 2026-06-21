/**
 * ActingAsContext — the global "authoring as" identity for the admin app.
 *
 * Per ``agent_onboarding.md §`` Theourgia Identities.dc.html — acting-as is
 * global state consumed by the Editor, Blog, Profile, memberships, SSO.
 * The owner sees their own selection (and can switch it from the topbar
 * acting-as chip or the Identities surface).
 *
 * Same split-context pattern as :mod:`TopbarContext`. State and setter
 * live in two providers because a combined ``{ value, set }`` object's
 * identity changes whenever value changes, looping any effect that
 * depends on the setter.
 *
 * Persistence: the acting-as id is mirrored to localStorage so reloads
 * survive. The Identities surface is the canonical source for the
 * available identities; this context only owns the *current selection*.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "theourgia.actingAs";

type SetActingAs = (next: string) => void;

const ActingAsStateContext = createContext<string | null>(null);
const ActingAsSetterContext = createContext<SetActingAs | null>(null);

export interface ActingAsProviderProps {
  /** Default acting-as id used when nothing is in localStorage. */
  initial?: string;
  children: ReactNode;
}

export function ActingAsProvider({ initial, children }: ActingAsProviderProps) {
  const [value, setValue] = useState<string | null>(() => {
    if (typeof window === "undefined") return initial ?? null;
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? initial ?? null;
    } catch (_) {
      return initial ?? null;
    }
  });

  const set = useCallback((next: string) => {
    setValue(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {
      /* noop — Safari private mode etc. */
    }
  }, []);

  // Cross-tab sync: respond to localStorage updates from other tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setValue(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ActingAsSetterContext.Provider value={set}>
      <ActingAsStateContext.Provider value={value}>
        {children}
      </ActingAsStateContext.Provider>
    </ActingAsSetterContext.Provider>
  );
}

/**
 * The current acting-as identity id, or ``null`` when no identity has
 * been chosen yet (or the provider isn't mounted).
 */
export function useActingAs(): string | null {
  return useContext(ActingAsStateContext);
}

/**
 * Set the current acting-as identity id. Persists to localStorage.
 * Returns a no-op when called outside the provider.
 */
export function useSetActingAs(): SetActingAs {
  const set = useContext(ActingAsSetterContext);
  return set ?? (() => undefined);
}
