/**
 * useApiCall — fetch-on-mount hook with status / data / error / refresh.
 *
 * The minimum useful shape for "render a surface that pulls from the API."
 * Bigger needs (cache across navigation, dedupe, infinite scroll) are out
 * of scope; reach for React Query when those actually matter.
 *
 *   const { status, data, error, refresh } = useApiCall(
 *     () => apiMethods.listEntries(),
 *   );
 *   if (status === "loading") return <Skeleton />;
 *   if (status === "error") return <ErrorState onRetry={refresh} />;
 *   return <List items={data} />;
 *
 * Cancels the in-flight call on unmount via an AbortController + a
 * ``mounted`` flag so a late-resolving promise can't update state on a
 * dead component.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ApiCallStatus = "idle" | "loading" | "ok" | "error";

export interface ApiCallState<T> {
  status: ApiCallStatus;
  data: T | null;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseApiCallOptions {
  /** Skip the initial call. Default false. */
  skip?: boolean;
  /**
   * Inputs the call closes over (a lat/lng, an id). When one changes the
   * call re-runs — without this the hook fetches once and holds whatever
   * the FIRST render's inputs were, which is how Today's solar stations
   * stayed computed for Greenwich after the user's stored location arrived.
   * Values are compared by JSON serialisation; keep them primitive.
   */
  deps?: readonly (string | number | boolean | null | undefined)[];
}

export function useApiCall<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: UseApiCallOptions = {},
): ApiCallState<T> {
  const { skip = false, deps } = options;
  const [status, setStatus] = useState<ApiCallStatus>(skip ? "idle" : "loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setError(null);
    try {
      const result = await fnRef.current(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setData(result);
      setStatus("ok");
    } catch (e) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus("error");
    }
  }, []);

  // A change of declared inputs re-runs the call; the serialised key keeps
  // the dependency array a fixed length for the rules of hooks.
  const depsKey = deps === undefined ? null : JSON.stringify(deps);
  useEffect(() => {
    if (skip) return;
    void run();
  }, [skip, run, depsKey]);

  return { status, data, error, refresh: run };
}
