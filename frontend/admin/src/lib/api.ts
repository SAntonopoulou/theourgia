/**
 * Tiny `fetch` wrapper for the admin SPA.
 *
 * The admin app talks to its backend at the same origin (or proxied
 * through Vite during dev). The session cookie carries auth — so
 * every request includes `credentials: "include"`.
 *
 * Error model: any non-2xx response throws an `ApiError` carrying the
 * status code + the JSON-decoded body (when available) + the raw text.
 * The TanStack Query layer surfaces these to the surface's inline
 * --warn-soft banner.
 */

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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    await raise(res);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    await raise(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function raise(res: Response): Promise<never> {
  let detail = `Request failed (HTTP ${res.status}).`;
  let raw: unknown;
  try {
    raw = await res.json();
    if (
      raw &&
      typeof raw === "object" &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
    ) {
      detail = (raw as { detail: string }).detail;
    }
  } catch {
    // body wasn't JSON — keep the default detail message
  }
  throw new ApiError(res.status, detail, raw);
}
