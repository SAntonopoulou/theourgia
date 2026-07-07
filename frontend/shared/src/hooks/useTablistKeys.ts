/**
 * useTablistKeys — WAI-ARIA tablist keyboard navigation (b108-2g7 a11y sweep).
 *
 * Standard tablist keyboard contract:
 *   • Left/Right arrows move focus between tabs (and select).
 *   • Home / End jump to first / last tab.
 *   • Down / Up work too for vertical tablists (opt-in via orientation).
 *   • The selected tab has tabIndex=0; others have tabIndex=-1 so
 *     Tab from outside the tablist lands only once.
 *
 * Usage:
 *
 *   const { onKeyDown, tabIndexFor } = useTablistKeys(keys, active, setActive);
 *   ...
 *   <div role="tablist" onKeyDown={onKeyDown}>
 *     {keys.map(k => (
 *       <button role="tab" tabIndex={tabIndexFor(k)} onClick={() => setActive(k)}>
 *         {label}
 *       </button>
 *     ))}
 *   </div>
 */

import { useCallback, type KeyboardEvent } from "react";

export interface UseTablistKeys<K extends string> {
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  tabIndexFor: (key: K) => number;
}

export function useTablistKeys<K extends string>(
  keys: readonly K[],
  active: K,
  setActive: (next: K) => void,
  orientation: "horizontal" | "vertical" = "horizontal",
): UseTablistKeys<K> {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const i = keys.indexOf(active);
      if (i === -1) return;
      let next = -1;
      const [prevKey, nextKey] =
        orientation === "horizontal"
          ? ["ArrowLeft", "ArrowRight"]
          : ["ArrowUp", "ArrowDown"];
      if (e.key === prevKey) next = (i - 1 + keys.length) % keys.length;
      else if (e.key === nextKey) next = (i + 1) % keys.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = keys.length - 1;
      if (next !== -1) {
        e.preventDefault();
        const nextKeyValue = keys[next];
        if (nextKeyValue !== undefined) setActive(nextKeyValue);
      }
    },
    [active, keys, orientation, setActive],
  );

  const tabIndexFor = useCallback(
    (key: K) => (key === active ? 0 : -1),
    [active],
  );

  return { onKeyDown, tabIndexFor };
}
