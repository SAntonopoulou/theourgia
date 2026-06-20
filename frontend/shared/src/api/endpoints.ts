/**
 * Typed methods, one per known backend endpoint.
 *
 * Methods for endpoints that exist on the backend today (health, meta)
 * return real data. Methods for endpoints that don't exist yet throw
 * ``NotImplementedError`` so callers know the contract is shaped but
 * the wire isn't connected yet.
 */

import type { ApiClient } from "./client.js";
import type { CreateEntryInput, EntryRecord, HealthStatus, Meta, Session } from "./types.js";

export class NotImplementedError extends Error {
  constructor(endpoint: string) {
    super(`Endpoint not yet implemented on backend: ${endpoint}`);
    this.name = "NotImplementedError";
  }
}

export function api(client: ApiClient) {
  return {
    // ─── Health + meta (real endpoints) ──────────────────────────────

    getHealth(opts?: { signal?: AbortSignal }): Promise<HealthStatus> {
      return client.request<HealthStatus>("/healthz", { signal: opts?.signal });
    },

    getReadiness(opts?: { signal?: AbortSignal }): Promise<HealthStatus> {
      return client.request<HealthStatus>("/readyz", { signal: opts?.signal });
    },

    getMeta(opts?: { signal?: AbortSignal }): Promise<Meta> {
      return client.request<Meta>("/api/v1/meta", { signal: opts?.signal });
    },

    // ─── Auth (contract shape; backend routes pending) ───────────────

    /**
     * GET /api/v1/auth/session — return the current session if one exists.
     * Endpoint not yet implemented; in mock mode the fixture provides the
     * value, in live mode this throws NotImplementedError until the
     * backend ships the route.
     */
    async getCurrentSession(opts?: { signal?: AbortSignal }): Promise<Session | null> {
      if (client.isMock()) {
        return client.request<Session | null>("/api/v1/auth/session", { signal: opts?.signal });
      }
      throw new NotImplementedError("GET /api/v1/auth/session");
    },

    async signOut(): Promise<void> {
      if (client.isMock()) {
        return client.request<void>("/api/v1/auth/session", { method: "DELETE" });
      }
      throw new NotImplementedError("DELETE /api/v1/auth/session");
    },

    // ─── Entries (contract shape; backend routes pending) ────────────

    async listEntries(opts?: { signal?: AbortSignal }): Promise<EntryRecord[]> {
      if (client.isMock()) {
        return client.request<EntryRecord[]>("/api/v1/entries", { signal: opts?.signal });
      }
      throw new NotImplementedError("GET /api/v1/entries");
    },

    async getEntry(id: string, opts?: { signal?: AbortSignal }): Promise<EntryRecord> {
      if (client.isMock()) {
        return client.request<EntryRecord>(`/api/v1/entries/${id}`, { signal: opts?.signal });
      }
      throw new NotImplementedError(`GET /api/v1/entries/${id}`);
    },

    async createEntry(input: CreateEntryInput): Promise<EntryRecord> {
      if (client.isMock()) {
        return client.request<EntryRecord>("/api/v1/entries", { method: "POST", json: input });
      }
      throw new NotImplementedError("POST /api/v1/entries");
    },
  };
}

export type Api = ReturnType<typeof api>;
