/**
 * useMediaQuery — subscribe to a CSS media query.
 *
 * Returns the current match state. Updates on viewport changes. SSR-safe:
 * defaults to ``false`` on the server (the consumer's responsibility to
 * pick the right default for their layout).
 */

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const update = (e: MediaQueryListEvent | MediaQueryList): void => {
      setMatches(e.matches);
    };
    // matchMedia returns initial state; sync once on subscribe.
    update(mql);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
