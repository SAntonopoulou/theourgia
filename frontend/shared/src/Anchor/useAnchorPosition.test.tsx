import { render } from "@testing-library/react";
import { type RefObject, useRef } from "react";
import { describe, expect, it } from "vitest";

import { type Placement, useAnchorPosition } from "./useAnchorPosition.js";

interface ProbeProps {
  open: boolean;
  placement?: Placement;
  triggerRect: Partial<DOMRect>;
  contentRect: Partial<DOMRect>;
  viewport: { width: number; height: number };
  onResult: (pos: ReturnType<typeof useAnchorPosition>) => void;
}

function makeRect(r: Partial<DOMRect>): DOMRect {
  const base = { top: 0, left: 0, width: 0, height: 0 };
  const m = { ...base, ...r };
  return {
    top: m.top,
    left: m.left,
    width: m.width,
    height: m.height,
    bottom: m.top + m.height,
    right: m.left + m.width,
    x: m.left,
    y: m.top,
    toJSON: () => m,
  } as DOMRect;
}

function Probe({ open, placement, triggerRect, contentRect, viewport, onResult }: ProbeProps) {
  const tref = useRef<HTMLDivElement | null>(null);
  const cref = useRef<HTMLDivElement | null>(null);

  // Patch the refs' getBoundingClientRect before the layout effect runs.
  if (tref.current === null) {
    tref.current = {
      getBoundingClientRect: () => makeRect(triggerRect),
    } as unknown as HTMLDivElement;
  }
  if (cref.current === null) {
    cref.current = {
      getBoundingClientRect: () => makeRect(contentRect),
    } as unknown as HTMLDivElement;
  }
  window.innerWidth = viewport.width;
  window.innerHeight = viewport.height;

  const pos = useAnchorPosition({
    open,
    triggerRef: tref as RefObject<HTMLElement>,
    contentRef: cref as RefObject<HTMLElement>,
    placement,
  });
  onResult(pos);
  return null;
}

describe("useAnchorPosition", () => {
  it("returns null when closed", () => {
    let result: ReturnType<typeof useAnchorPosition> | undefined;
    render(
      <Probe
        open={false}
        triggerRect={{ top: 100, left: 100, width: 80, height: 30 }}
        contentRect={{ width: 200, height: 100 }}
        viewport={{ width: 1024, height: 768 }}
        onResult={(p) => {
          result = p;
        }}
      />,
    );
    expect(result).toBeNull();
  });

  it("positions below the trigger by default (placement='bottom')", () => {
    let result: ReturnType<typeof useAnchorPosition> | undefined;
    render(
      <Probe
        open
        triggerRect={{ top: 100, left: 100, width: 80, height: 30 }}
        contentRect={{ width: 200, height: 100 }}
        viewport={{ width: 1024, height: 768 }}
        onResult={(p) => {
          result = p;
        }}
      />,
    );
    expect(result?.placement).toBe("bottom");
    // top: triggerRect.bottom (130) + 4 offset = 134
    expect(result?.top).toBe(134);
    // left: triggerRect.left = 100 (align=start)
    expect(result?.left).toBe(100);
  });

  it("flips to 'top' when 'bottom' would overflow", () => {
    let result: ReturnType<typeof useAnchorPosition> | undefined;
    render(
      <Probe
        open
        triggerRect={{ top: 700, left: 100, width: 80, height: 30 }}
        contentRect={{ width: 200, height: 100 }}
        viewport={{ width: 1024, height: 768 }}
        onResult={(p) => {
          result = p;
        }}
      />,
    );
    expect(result?.placement).toBe("top");
  });

  it("clamps to the left edge if alignment would go negative", () => {
    let result: ReturnType<typeof useAnchorPosition> | undefined;
    render(
      <Probe
        open
        triggerRect={{ top: 100, left: -50, width: 80, height: 30 }}
        contentRect={{ width: 200, height: 100 }}
        viewport={{ width: 1024, height: 768 }}
        onResult={(p) => {
          result = p;
        }}
      />,
    );
    expect(result?.left).toBeGreaterThanOrEqual(0);
  });
});
