import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useApiCall } from "./useApiCall.js";

describe("useApiCall", () => {
  it("starts in 'loading' and transitions to 'ok' with data", async () => {
    const fn = vi.fn(async () => "hello");
    const { result } = renderHook(() => useApiCall(fn));
    expect(result.current.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeNull();
  });

  it("transitions to 'error' when fn rejects", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useApiCall(fn));
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeNull();
  });

  it("refresh re-runs fn", async () => {
    let count = 0;
    const fn = vi.fn(async () => {
      count += 1;
      return count;
    });
    const { result } = renderHook(() => useApiCall(fn));
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(result.current.data).toBe(1);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("skip=true holds status at 'idle' and does not call fn", () => {
    const fn = vi.fn(async () => "x");
    const { result } = renderHook(() => useApiCall(fn, { skip: true }));
    expect(result.current.status).toBe("idle");
    expect(fn).not.toHaveBeenCalled();
  });

  it("re-runs when a declared dep changes — the stale-Greenwich bug", async () => {
    // Today's rite row mounts with a stand-in location; the stored one
    // arrives a beat later as new props. The call must follow the inputs.
    const fn = vi.fn(async () => "ok");
    const { result, rerender } = renderHook(({ lat }) => useApiCall(fn, { deps: [lat] }), {
      initialProps: { lat: 51.4769 },
    });
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(fn).toHaveBeenCalledTimes(1);

    rerender({ lat: 37.9838 });
    await waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(2);
    });

    // An unchanged dep does not re-run the call.
    rerender({ lat: 37.9838 });
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("without deps, changed props do NOT re-run (the documented default)", async () => {
    const fn = vi.fn(async () => "ok");
    const { result, rerender } = renderHook(({ lat: _lat }) => useApiCall(fn), {
      initialProps: { lat: 51.4769 },
    });
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    rerender({ lat: 37.9838 });
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("aborts in-flight call on unmount (state doesn't update after)", async () => {
    const resolveRef: { current: ((v: string) => void) | null } = { current: null };
    const fn = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((res, rej) => {
          resolveRef.current = res;
          signal.addEventListener("abort", () => rej(new Error("aborted")));
        }),
    );
    const { result, unmount } = renderHook(() => useApiCall(fn));
    expect(result.current.status).toBe("loading");
    unmount();
    // Resolve after unmount — the hook should have already cleaned up,
    // and the late resolution shouldn't blow up.
    resolveRef.current?.("late");
    // No assertions to make here other than "no crash" — if state were
    // updating on a dead component, React would warn.
  });

  it("passes an AbortSignal that fires on unmount", async () => {
    const seen: AbortSignal[] = [];
    const fn = vi.fn(async (signal: AbortSignal) => {
      seen.push(signal);
      return "ok";
    });
    const { unmount } = renderHook(() => useApiCall(fn));
    await waitFor(() => {
      expect(fn).toHaveBeenCalled();
    });
    unmount();
    expect(seen[0]?.aborted).toBe(true);
  });
});
