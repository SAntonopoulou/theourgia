/**
 * ScrollGate — H09 reusable primitive (rule 31).
 *
 * Wraps a scrollable element and reports when the user has
 * reached the bottom (within a 6px epsilon, matching the H09
 * brief's `scrollTop + clientHeight >= scrollHeight - 6` rule).
 * Once gated open the Install / Update CTA in the consumer
 * becomes enabled — the gesture proves intent without a
 * checkbox.
 *
 * The gate is **one-way** within a single render — once
 * ``open`` flips true, future scrolls do not flip it back.
 * The H09 brief specifies this with `&& !this.state.scrolledEnd`.
 *
 * Reused on surface 3 (Plugin Capability Review) and surface 17
 * (Plugin Update Diff Preview) — both gated install paths.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

export interface ScrollGateProps {
  /** Fires once when the gate opens (bottom reached). */
  onOpen?: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Returns:
 *   - `containerProps` — spread on the `<div>` whose body
 *     scrolls.
 *   - `open` — `true` once the user has scrolled to the bottom.
 *
 * Hook variant (preferred when the modal owns its own layout).
 */
export function useScrollGate(onOpen?: () => void): {
  open: boolean;
  containerProps: {
    onScroll: (
      e: React.UIEvent<HTMLDivElement, UIEvent>,
    ) => void;
    "data-scroll-gate": "open" | "closed";
  };
} {
  const [open, setOpen] = useState(false);
  return {
    open,
    containerProps: {
      onScroll: (e) => {
        if (open) return;
        const el = e.currentTarget;
        if (
          el.scrollTop + el.clientHeight >=
          el.scrollHeight - 6
        ) {
          setOpen(true);
          onOpen?.();
        }
      },
      "data-scroll-gate": open ? "open" : "closed",
    },
  };
}

/**
 * Component variant for the simpler case where the gate wraps
 * its own scrollable region.
 */
export function ScrollGate({
  onOpen,
  className,
  style,
  children,
}: ScrollGateProps) {
  const { open, containerProps } = useScrollGate(onOpen);
  return (
    <div
      className={`scroll ${className ?? ""}`}
      style={style}
      data-gate-open={open}
      {...containerProps}
    >
      {children}
    </div>
  );
}
