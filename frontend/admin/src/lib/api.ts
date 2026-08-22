/**
 * Tiny request helpers for the admin SPA — a thin skin over the shared
 * ApiClient, kept for the thirty-odd call sites written against them.
 *
 * Delegating (rather than fetching raw, as this file once did) means these
 * helpers honour mock mode too: `VITE_THEOURGIA_API_MOCK=1` walks answer
 * from the shared fixtures instead of 404ing every apiGet surface — the
 * trap that kept blanking pages in headless screenshot walks.
 *
 * Error model preserved: any failure throws this file's `ApiError`
 * carrying the status + a human detail + the raw problem body.
 */

import { ApiError as SharedApiError, NetworkError } from "@theourgia/shared";

import { API_MODE, apiClient } from "../data/api.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly raw?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

const DEFAULT_BASE = "/api/v1";

async function through<T>(
  path: string,
  init: { method: string; json?: unknown },
): Promise<T> {
  try {
    const result = await apiClient.request<T>(`${DEFAULT_BASE}${path}`, {
      method: init.method,
      ...(init.json === undefined ? {} : { json: init.json }),
    });
    if (result === undefined && API_MODE === "mock") {
      // The fixture set doesn't know this path. A raw fetch would have
      // 404ed; say so the same way rather than handing back undefined.
      throw new ApiError(404, `No mock fixture answers ${path}.`);
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SharedApiError) {
      throw new ApiError(
        error.status,
        error.problem.detail ?? error.problem.title ?? `Request failed (HTTP ${error.status}).`,
        error.problem,
      );
    }
    if (error instanceof NetworkError) {
      throw new ApiError(0, error.message, error.cause);
    }
    throw error;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return through<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return through<T>(path, { method: "POST", json: body });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return through<T>(path, { method: "PUT", json: body });
}

export async function apiDelete(path: string): Promise<void> {
  await through<unknown>(path, { method: "DELETE" });
}
