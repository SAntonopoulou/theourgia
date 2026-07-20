/**
 * ApiClient — typed fetch wrapper.
 *
 * Construct one at the app root, pass via React context (or import the
 * default singleton) and call ``request<T>(path)``. The client handles:
 *   - base-URL composition
 *   - JSON encode / decode
 *   - RFC 7807 ``Problem`` parsing on non-2xx
 *   - AbortSignal-driven cancellation
 *   - Timeout (default 30s) — fires AbortController internally if the
 *     caller didn't supply a signal
 *   - Bearer auth header
 *   - Mock mode: every request resolves a fixture without touching fetch
 */

import { NetworkError, errorFromResponse } from "./errors.js";
import type { Problem } from "./types.js";

export interface ApiClientConfig {
  /** Base URL — empty string means use same-origin relative paths. */
  baseUrl: string;
  /** When true, ``request`` resolves the fixture instead of touching fetch. */
  mock: boolean;
  /** Default timeout in ms. Default 30000. */
  timeoutMs?: number;
  /** Optional bearer token. */
  authToken?: string | null;
  /** Fixture provider used when ``mock`` is true. Required if mock=true. */
  fixtureFor?: (path: string, init: RequestInit | undefined) => unknown;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "signal"> {
  /** JSON-serialisable request body. */
  json?: unknown;
  /** Multipart form body (file uploads). Mutually exclusive with
   *  ``json``; the Content-Type header is left unset so the runtime
   *  writes the multipart boundary itself. */
  form?: FormData;
  /** Custom AbortSignal — if absent we install a timeout-driven one. */
  signal?: AbortSignal;
  /** Per-request timeout override. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiClient {
  private baseUrl: string;
  private mock: boolean;
  private timeoutMs: number;
  private authToken: string | null;
  private fixtureFor?: ApiClientConfig["fixtureFor"];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.mock = config.mock;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.authToken = config.authToken ?? null;
    this.fixtureFor = config.fixtureFor;
    if (this.mock && !this.fixtureFor) {
      throw new Error("ApiClient: mock=true requires a fixtureFor function");
    }
  }

  /** Returns a fresh client with the supplied auth token. */
  withAuthToken(token: string | null): ApiClient {
    const next = Object.create(ApiClient.prototype) as ApiClient;
    Object.assign(next, this);
    next.authToken = token;
    return next;
  }

  isMock(): boolean {
    return this.mock;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async request<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
    const { json, form, signal: callerSignal, timeoutMs, headers: callerHeaders, ...rest } = opts;
    const headers = new Headers(callerHeaders);
    if (json !== undefined) headers.set("Content-Type", "application/json");
    if (this.authToken) headers.set("Authorization", `Bearer ${this.authToken}`);
    headers.set("Accept", "application/json, application/problem+json");

    const init: RequestInit = {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
    };

    if (this.mock) {
      // Bypass the network entirely. The fixture function decides what to return.
      const fixture = this.fixtureFor?.(path, init);
      if (fixture instanceof Error) throw fixture;
      return fixture as T;
    }

    // Compose the AbortSignal: timeout-driven, optionally combined with the
    // caller's signal so external cancellation also wins.
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("timeout")),
      timeoutMs ?? this.timeoutMs,
    );
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason);
      else
        callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), {
          once: true,
        });
    }
    init.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (cause) {
      clearTimeout(timeout);
      throw new NetworkError(
        cause instanceof Error ? cause.message : "Network request failed",
        cause,
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      let problem: Problem;
      try {
        problem = (await response.json()) as Problem;
      } catch {
        problem = {
          type: "about:blank",
          title: response.statusText || "Request failed",
          status: response.status,
        };
      }
      throw errorFromResponse(response.status, problem);
    }

    // 204 No Content (or empty body) → null.
    if (response.status === 204) return null as T;
    const text = await response.text();
    if (text.length === 0) return null as T;
    return JSON.parse(text) as T;
  }

  /** Fetch a binary payload (PDF, ZIP, etc.) with the same auth +
   *  timeout + error semantics as ``request``. Returned as a Blob so
   *  the caller can download or preview it. */
  async requestBlob(path: string, opts: ApiRequestOptions = {}): Promise<Blob> {
    const { json, form, signal: callerSignal, timeoutMs, headers: callerHeaders, ...rest } = opts;
    const headers = new Headers(callerHeaders);
    if (json !== undefined) headers.set("Content-Type", "application/json");
    if (this.authToken) headers.set("Authorization", `Bearer ${this.authToken}`);
    if (!headers.has("Accept")) headers.set("Accept", "*/*");

    const init: RequestInit = {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
    };

    if (this.mock) {
      const fixture = this.fixtureFor?.(path, init);
      if (fixture instanceof Error) throw fixture;
      if (fixture instanceof Blob) return fixture;
      return new Blob([JSON.stringify(fixture ?? null)]);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("timeout")),
      timeoutMs ?? this.timeoutMs,
    );
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason);
      else
        callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), {
          once: true,
        });
    }
    init.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (cause) {
      clearTimeout(timeout);
      throw new NetworkError(
        cause instanceof Error ? cause.message : "Network request failed",
        cause,
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      let problem: Problem;
      try {
        problem = (await response.json()) as Problem;
      } catch {
        problem = {
          type: "about:blank",
          title: response.statusText || "Request failed",
          status: response.status,
        };
      }
      throw errorFromResponse(response.status, problem);
    }

    return response.blob();
  }
}
