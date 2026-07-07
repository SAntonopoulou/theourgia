/**
 * useFocusOnOpen — moves keyboard focus to the given ref when `open`
 * transitions from false to true (b108-2g1 a11y sweep).
 *
 * WAI-ARIA modal contract: on opening, focus MUST move to the modal
 * so keyboard-only + screen-reader users are actually inside it. On
 * closing, focus should return to the trigger — that half is queued
 * as a separate follow-up because it needs the trigger ref.
 *
 * Silently no-ops when `open` is false or the ref is unset. Uses the
 * same `open`-boolean signature as `useEscapeToClose` so consumers
 * can mount both from the same state.
 */

import { useEffect, type RefObject } from "react";

type Focusable = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLElement;

export function useFocusOnOpen(
  ref: RefObject<Focusable | null>,
  open: boolean,
): void {
  useEffect(() => {
    if (!open) return;
    // Defer to the next tick so the element is mounted + laid out.
    const raf = requestAnimationFrame(() => {
      ref.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, ref]);
}
