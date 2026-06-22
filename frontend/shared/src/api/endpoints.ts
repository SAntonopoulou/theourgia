/**
 * Typed methods, one per known backend endpoint.
 *
 * Methods for endpoints that exist on the backend today (health, meta)
 * return real data. Methods for endpoints that don't exist yet throw
 * ``NotImplementedError`` so callers know the contract is shaped but
 * the wire isn't connected yet.
 */

import type { ApiClient } from "./client.js";
import type {
  BookRecord,
  CreateBookInput,
  CreateEntityInput,
  CreateEntryInput,
  EntityKind,
  EntityRecord,
  EntryRecord,
  EntryStats,
  EntryType,
  HealthStatus,
  Meta,
  Session,
  TodayLedger,
  UserLocation,
} from "./types.js";

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

    // ─── Auth (live as of Batch 12) ──────────────────────────────────

    getCurrentSession(opts?: { signal?: AbortSignal }): Promise<Session | null> {
      return client.request<Session | null>("/api/v1/auth/session", { signal: opts?.signal });
    },

    signOut(): Promise<void> {
      return client.request<void>("/api/v1/auth/session", { method: "DELETE" });
    },

    /**
     * POST /api/v1/auth/demo-signin — find-or-create a demo user and
     * open a session. PHASE 02 ONLY; replaced by the WebAuthn ceremony
     * in a later batch.
     */
    demoSignIn(input: { magickal_name: string }): Promise<Session> {
      return client.request<Session>("/api/v1/auth/demo-signin", {
        method: "POST",
        json: input,
      });
    },

    // ─── Entries (live as of Batch 10) ───────────────────────────────

    listEntries(opts?: { signal?: AbortSignal; type?: EntryType }): Promise<EntryRecord[]> {
      const qs = opts?.type ? `?type=${encodeURIComponent(opts.type)}` : "";
      return client.request<EntryRecord[]>(`/api/v1/entries${qs}`, { signal: opts?.signal });
    },

    getEntry(id: string, opts?: { signal?: AbortSignal }): Promise<EntryRecord> {
      return client.request<EntryRecord>(`/api/v1/entries/${id}`, { signal: opts?.signal });
    },

    createEntry(input: CreateEntryInput): Promise<EntryRecord> {
      return client.request<EntryRecord>("/api/v1/entries", { method: "POST", json: input });
    },

    updateEntry(id: string, patch: Partial<CreateEntryInput>): Promise<EntryRecord> {
      return client.request<EntryRecord>(`/api/v1/entries/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    archiveEntry(id: string): Promise<void> {
      return client.request<void>(`/api/v1/entries/${id}`, { method: "DELETE" });
    },

    getEntryStats(opts?: { signal?: AbortSignal }): Promise<EntryStats> {
      return client.request<EntryStats>("/api/v1/entries/stats", { signal: opts?.signal });
    },

    // ─── User settings (Phase 02 minimal slice) ──────────────────────

    getMyLocation(opts?: { signal?: AbortSignal }): Promise<UserLocation> {
      return client.request<UserLocation>("/api/v1/users/me/settings/location", {
        signal: opts?.signal,
      });
    },

    putMyLocation(location: UserLocation): Promise<UserLocation> {
      return client.request<UserLocation>("/api/v1/users/me/settings/location", {
        method: "PUT",
        json: location,
      });
    },

    // ─── Library ─────────────────────────────────────────────────────

    listBooks(opts?: { signal?: AbortSignal; tradition?: string }): Promise<BookRecord[]> {
      const qs = opts?.tradition ? `?tradition=${encodeURIComponent(opts.tradition)}` : "";
      return client.request<BookRecord[]>(`/api/v1/books${qs}`, { signal: opts?.signal });
    },

    getBook(id: string, opts?: { signal?: AbortSignal }): Promise<BookRecord> {
      return client.request<BookRecord>(`/api/v1/books/${id}`, { signal: opts?.signal });
    },

    createBook(input: CreateBookInput): Promise<BookRecord> {
      return client.request<BookRecord>("/api/v1/books", { method: "POST", json: input });
    },

    updateBook(id: string, patch: Partial<CreateBookInput>): Promise<BookRecord> {
      return client.request<BookRecord>(`/api/v1/books/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    archiveBook(id: string): Promise<void> {
      return client.request<void>(`/api/v1/books/${id}`, { method: "DELETE" });
    },

    // ─── Entities ────────────────────────────────────────────────────

    listEntities(opts?: {
      signal?: AbortSignal;
      kind?: EntityKind;
      tradition?: string;
    }): Promise<EntityRecord[]> {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      if (opts?.tradition) params.set("tradition", opts.tradition);
      const qs = params.toString();
      return client.request<EntityRecord[]>(
        `/api/v1/entities${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    getEntity(id: string, opts?: { signal?: AbortSignal }): Promise<EntityRecord> {
      return client.request<EntityRecord>(`/api/v1/entities/${id}`, {
        signal: opts?.signal,
      });
    },

    createEntity(input: CreateEntityInput): Promise<EntityRecord> {
      return client.request<EntityRecord>("/api/v1/entities", {
        method: "POST",
        json: input,
      });
    },

    updateEntity(id: string, patch: Partial<CreateEntityInput>): Promise<EntityRecord> {
      return client.request<EntityRecord>(`/api/v1/entities/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    archiveEntity(id: string): Promise<void> {
      return client.request<void>(`/api/v1/entities/${id}`, { method: "DELETE" });
    },

    // ─── Today ledger (Phase 05 rail aggregator) ─────────────────────

    getTodayLedger(opts?: { signal?: AbortSignal }): Promise<TodayLedger> {
      return client.request<TodayLedger>("/api/v1/today/ledger", {
        signal: opts?.signal,
      });
    },
  };
}

export type Api = ReturnType<typeof api>;
