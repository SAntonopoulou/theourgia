/**
 * useFocusOnOpen — moves keyboard focus to the given ref when `open`
 * transitions from false to true (b108-2g1 a11y sweep). Also restores
 * focus to the previously-focused element when `open` flips back to
 * false (b108-2gf follow-up), completing the WAI-ARIA modal contract.
 *
 * On opening, focus MUST move to the modal so keyboard-only + AT
 * users are actually inside it. On closing, focus returns to the
 * trigger — captured from `document.activeElement` at open time, so
 * consumers don't need to pass a trigger ref.
 *
 * Silently no-ops when `open` is false or the ref is unset. Uses the
 * same `open`-boolean signature as `useEscapeToClose` so consumers
 * can mount both from the same state.
 */

import { useEffect, useRef, type RefObject } from "react";

type Focusable = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLElement;

export function useFocusOnOpen(
  ref: RefObject<Focusable | null>,
  open: boolean,
): void {
  const previousActiveRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    // Capture the trigger (the element that had focus at open time)
    // so we can restore focus to it on close.
    previousActiveRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    // Defer the focus() call to the next tick so the element is
    // mounted + laid out.
    const raf = requestAnimationFrame(() => {
      ref.current?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      // Restore focus to the trigger when the modal unmounts (open→false).
      const trigger = previousActiveRef.current;
      if (trigger && typeof trigger.focus === "function") {
        // Guard against the trigger having been removed from the DOM
        // (e.g. re-rendered): document.contains returns false for
        // detached nodes.
        if (typeof document === "undefined" || document.contains(trigger)) {
          trigger.focus();
        }
      }
      previousActiveRef.current = null;
    };
  }, [open, ref]);
}
