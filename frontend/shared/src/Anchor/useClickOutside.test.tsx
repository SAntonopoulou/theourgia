import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useClickOutside } from "./useClickOutside.js";

function Probe({ onOutside, enabled = true }: { onOutside: () => void; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside([ref], onOutside, enabled);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

describe("useClickOutside", () => {
  it("does not fire when click is inside the ref", () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Probe onOutside={onOutside} />);
    fireEvent.pointerDown(getByTestId("inside"));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it("fires when click is outside the ref", () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Probe onOutside={onOutside} />);
    fireEvent.pointerDown(getByTestId("outside"));
    expect(onOutside).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Probe onOutside={onOutside} enabled={false} />);
    fireEvent.pointerDown(getByTestId("outside"));
    expect(onOutside).not.toHaveBeenCalled();
  });
});
