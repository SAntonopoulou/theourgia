/**
 * useClickOutside — fire ``onOutside`` when a pointerdown lands outside
 * the supplied set of refs.
 *
 * Anchored overlays are portaled, so a click inside the popover content
 * isn't a DOM-descendant of the trigger. The hook accepts an array of
 * refs (trigger + content) so clicks inside either are treated as
 * "inside."
 */

import { type RefObject, useEffect } from "react";

export function useClickOutside(
  refs: readonly RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    function handler(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      for (const ref of refs) {
        const el = ref.current;
        if (el?.contains(target)) return;
      }
      onOutside();
    }
    document.addEventListener("pointerdown", handler, true);
    return () => {
      document.removeEventListener("pointerdown", handler, true);
    };
  }, [refs, onOutside, enabled]);
}
