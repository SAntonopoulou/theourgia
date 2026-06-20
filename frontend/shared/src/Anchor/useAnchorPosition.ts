/**
 * useAnchorPosition — compute floating-content coordinates relative to a
 * trigger element.
 *
 * Re-measures on window resize + scroll. Flips to the opposite placement
 * when the preferred one overflows the viewport. Clamps the final result
 * so the corner never escapes the screen.
 *
 * Returns null when the floating content is not open or when either ref
 * hasn't measured yet.
 */

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

export type Placement = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";

export interface AnchorPosition {
  top: number;
  left: number;
  placement: Placement;
}

export interface UseAnchorPositionOpts {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  placement?: Placement;
  align?: Align;
  /** Gap in px between the trigger and the content edge. */
  offset?: number;
  /** Flip to the opposite placement when overflowing. Default true. */
  flip?: boolean;
}

const OPPOSITE: Record<Placement, Placement> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function fits(
  candidate: { top: number; left: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): boolean {
  return (
    candidate.top >= 0 &&
    candidate.left >= 0 &&
    candidate.top + size.height <= viewport.height &&
    candidate.left + size.width <= viewport.width
  );
}

function place(
  trigger: DOMRect,
  size: { width: number; height: number },
  placement: Placement,
  align: Align,
  offset: number,
): { top: number; left: number } {
  let top = 0;
  let left = 0;
  switch (placement) {
    case "bottom":
      top = trigger.bottom + offset;
      left = alignAxis(trigger.left, trigger.width, size.width, align);
      break;
    case "top":
      top = trigger.top - size.height - offset;
      left = alignAxis(trigger.left, trigger.width, size.width, align);
      break;
    case "right":
      top = alignAxis(trigger.top, trigger.height, size.height, align);
      left = trigger.right + offset;
      break;
    case "left":
      top = alignAxis(trigger.top, trigger.height, size.height, align);
      left = trigger.left - size.width - offset;
      break;
  }
  return { top, left };
}

function alignAxis(
  triggerStart: number,
  triggerExtent: number,
  contentExtent: number,
  align: Align,
): number {
  switch (align) {
    case "center":
      return triggerStart + triggerExtent / 2 - contentExtent / 2;
    case "end":
      return triggerStart + triggerExtent - contentExtent;
    default:
      return triggerStart;
  }
}

function clamp(
  candidate: { top: number; left: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  return {
    top: Math.max(0, Math.min(candidate.top, viewport.height - size.height)),
    left: Math.max(0, Math.min(candidate.left, viewport.width - size.width)),
  };
}

export function useAnchorPosition({
  open,
  triggerRef,
  contentRef,
  placement = "bottom",
  align = "start",
  offset = 4,
  flip = true,
}: UseAnchorPositionOpts): AnchorPosition | null {
  const [position, setPosition] = useState<AnchorPosition | null>(null);

  // Use layout effect for initial placement so the first paint has the
  // right coordinates and we avoid a flicker at (0, 0).
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    function measure(): void {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const size = { width: contentRect.width, height: contentRect.height };
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let effectivePlacement = placement;
      let candidate = place(triggerRect, size, effectivePlacement, align, offset);
      if (flip && !fits(candidate, size, viewport)) {
        const alt = OPPOSITE[effectivePlacement];
        const altCandidate = place(triggerRect, size, alt, align, offset);
        if (fits(altCandidate, size, viewport)) {
          effectivePlacement = alt;
          candidate = altCandidate;
        }
      }
      const clamped = clamp(candidate, size, viewport);
      setPosition({ top: clamped.top, left: clamped.left, placement: effectivePlacement });
    }
    measure();
  }, [open, triggerRef, contentRef, placement, align, offset, flip]);

  // Re-measure on resize + scroll while open. Skipping the dependency on
  // `placement`/`align`/etc. is intentional — those are stable across the
  // open lifetime, and we don't want to re-flip mid-scroll.
  useEffect(() => {
    if (!open) return;
    function reposition(): void {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const size = { width: contentRect.width, height: contentRect.height };
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      const candidate = place(triggerRect, size, placement, align, offset);
      const clamped = clamp(candidate, size, viewport);
      setPosition({ top: clamped.top, left: clamped.left, placement });
    }
    window.addEventListener("resize", reposition, { passive: true });
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, { capture: true });
    };
  }, [open, triggerRef, contentRef, placement, align, offset]);

  return position;
}
