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
  AltarRecordWire,
  BanishingLogRecord,
  BodyPracticeRecord,
  BookRecord,
  BundledVoce,
  CircleRecord,
  CompletionInput,
  ConsecrateToolPayload,
  CreateAltarInput,
  CreateBanishingLogInput,
  CreateBodyPracticeInput,
  CreateBookInput,
  CreateCircleInput,
  CreateEntityInput,
  CreateEntryInput,
  CreateMagicSquareInput,
  CreatePracticeInput,
  CreateSigilInput,
  CreateTalismanInput,
  CreateToolInput,
  CreateVoceInput,
  CreateVoceRecordingInput,
  ChartRequestInput,
  ChartResponse,
  EntityKind,
  EntityRecord,
  EntryDetailRecord,
  EntryRecord,
  EntryStats,
  EntryType,
  MagicSquareRecord,
  PlanetarySquareWire,
  PresetCircle,
  SigilRecord,
  SourceScriptWire,
  TalismanRecord,
  TalismanSealPayload,
  TalismanUnsealResponse,
  ToolKindWire,
  ToolRecordWire,
  UpdateAltarInput,
  UpdateCircleInput,
  UpdateEntryBodyInput,
  UpdateMagicSquareInput,
  UpdateSigilInput,
  UpdateTalismanInput,
  UpdateToolInput,
  UpdateVoceInput,
  VoceRecordWire,
  VoceRecordingRecord,
  HealthStatus,
  Meta,
  PracticeRecord,
  PracticesToday,
  Session,
  TodayLedger,
  UpdatePracticeInput,
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

    /**
     * Returns the full entry with its Tiptap body + visibility +
     * publish state. Used by the Editor surface. Backend must answer
     * the same `/entries/{id}` route with the expanded shape — list
     * endpoints keep the lean `EntryRecord` shape per the B99 design
     * decision.
     */
    getEntryDetail(id: string, opts?: { signal?: AbortSignal }): Promise<EntryDetailRecord> {
      return client.request<EntryDetailRecord>(`/api/v1/entries/${id}`, {
        signal: opts?.signal,
        headers: { Accept: "application/vnd.theourgia.entry-detail+json" },
      });
    },

    /**
     * Debounced auto-save target for the Editor. Sends only the body
     * field; the entry's other metadata (title, visibility, sealed
     * state) is patched through `updateEntry`.
     */
    updateEntryBody(
      id: string,
      input: UpdateEntryBodyInput,
      opts?: { signal?: AbortSignal },
    ): Promise<EntryDetailRecord> {
      return client.request<EntryDetailRecord>(`/api/v1/entries/${id}/body`, {
        method: "PATCH",
        json: input,
        signal: opts?.signal,
      });
    },

    /**
     * Compute a chart for the supplied instant + location. Used by
     * the Editor's ChartPicker to populate the snapshot on the
     * `chart` Tiptap node.
     */
    getChart(input: ChartRequestInput, opts?: { signal?: AbortSignal }): Promise<ChartResponse> {
      const qs = new URLSearchParams({
        when: input.when,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        zodiac: input.zodiac ?? "tropical",
        house_system: input.house_system ?? "placidus",
      });
      return client.request<ChartResponse>(`/api/v1/astro/chart?${qs.toString()}`, {
        signal: opts?.signal,
      });
    },

    /** Transition a draft to `published_at = now`. */
    publishEntry(id: string, opts?: { signal?: AbortSignal }): Promise<EntryDetailRecord> {
      return client.request<EntryDetailRecord>(`/api/v1/entries/${id}/publish`, {
        method: "POST",
        signal: opts?.signal,
      });
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

    // ─── Daily Practice Tracker (B87) ────────────────────────────────

    listPractices(opts?: {
      signal?: AbortSignal;
      archived?: boolean;
    }): Promise<PracticeRecord[]> {
      const qs = opts?.archived ? "?archived=true" : "";
      return client.request<PracticeRecord[]>(`/api/v1/practices${qs}`, {
        signal: opts?.signal,
      });
    },

    practicesToday(opts?: {
      signal?: AbortSignal;
      tz?: string;
    }): Promise<PracticesToday> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<PracticesToday>(`/api/v1/practices/today${qs}`, {
        signal: opts?.signal,
      });
    },

    getPractice(id: string, opts?: { signal?: AbortSignal }): Promise<PracticeRecord> {
      return client.request<PracticeRecord>(`/api/v1/practices/${id}`, {
        signal: opts?.signal,
      });
    },

    createPractice(input: CreatePracticeInput): Promise<PracticeRecord> {
      return client.request<PracticeRecord>("/api/v1/practices", {
        method: "POST",
        json: input,
      });
    },

    updatePractice(id: string, patch: UpdatePracticeInput): Promise<PracticeRecord> {
      return client.request<PracticeRecord>(`/api/v1/practices/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    archivePractice(id: string): Promise<PracticeRecord> {
      return client.request<PracticeRecord>(
        `/api/v1/practices/${id}/archive`,
        { method: "POST" },
      );
    },

    unarchivePractice(id: string): Promise<PracticeRecord> {
      return client.request<PracticeRecord>(
        `/api/v1/practices/${id}/unarchive`,
        { method: "POST" },
      );
    },

    deletePractice(id: string): Promise<void> {
      return client.request<void>(`/api/v1/practices/${id}`, {
        method: "DELETE",
      });
    },

    completePractice(
      id: string,
      payload?: CompletionInput,
      opts?: { tz?: string },
    ): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/complete${qs}`, {
        method: "POST",
        json: payload ?? {},
      });
    },

    skipPractice(
      id: string,
      payload?: CompletionInput,
      opts?: { tz?: string },
    ): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/skip${qs}`, {
        method: "POST",
        json: payload ?? {},
      });
    },

    undoPracticeToday(
      id: string,
      opts?: { tz?: string },
    ): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/today${qs}`, {
        method: "DELETE",
      });
    },

    // ─── Practice Logs — body + banishing (B88) ──────────────────────

    createBodyPracticeSession(
      input: CreateBodyPracticeInput,
    ): Promise<BodyPracticeRecord> {
      return client.request<BodyPracticeRecord>("/api/v1/practice/body", {
        method: "POST",
        json: input,
      });
    },

    listBodyPracticeSessions(opts?: {
      signal?: AbortSignal;
      kind?: "asana" | "pranayama" | "other";
      limit?: number;
    }): Promise<BodyPracticeRecord[]> {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<BodyPracticeRecord[]>(
        `/api/v1/practice/body${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    createBanishingLog(
      input: CreateBanishingLogInput,
    ): Promise<BanishingLogRecord> {
      return client.request<BanishingLogRecord>(
        "/api/v1/practice/banishing",
        { method: "POST", json: input },
      );
    },

    listBanishingLogs(opts?: {
      signal?: AbortSignal;
      method?: string;
      limit?: number;
    }): Promise<BanishingLogRecord[]> {
      const params = new URLSearchParams();
      if (opts?.method) params.set("method", opts.method);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<BanishingLogRecord[]>(
        `/api/v1/practice/banishing${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    // ─── Phase 07 Workshop — Sigils (B103) ──────────────────────────

    listSigils(opts?: {
      signal?: AbortSignal;
      limit?: number;
    }): Promise<SigilRecord[]> {
      const qs = opts?.limit ? `?limit=${opts.limit}` : "";
      return client.request<SigilRecord[]>(`/api/v1/sigils${qs}`, {
        signal: opts?.signal,
      });
    },

    getSigil(id: string, opts?: { signal?: AbortSignal }): Promise<SigilRecord> {
      return client.request<SigilRecord>(`/api/v1/sigils/${id}`, {
        signal: opts?.signal,
      });
    },

    createSigil(input: CreateSigilInput): Promise<SigilRecord> {
      return client.request<SigilRecord>("/api/v1/sigils", {
        method: "POST",
        json: input,
      });
    },

    updateSigil(id: string, input: UpdateSigilInput): Promise<SigilRecord> {
      return client.request<SigilRecord>(`/api/v1/sigils/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteSigil(id: string): Promise<void> {
      return client.request<void>(`/api/v1/sigils/${id}`, { method: "DELETE" });
    },

    forkSigil(id: string, input?: { title?: string }): Promise<SigilRecord> {
      return client.request<SigilRecord>(`/api/v1/sigils/${id}/fork`, {
        method: "POST",
        json: input ?? {},
      });
    },

    // ─── Phase 07 Workshop — Magic Squares (B103) ───────────────────

    listPlanetarySquares(opts?: {
      signal?: AbortSignal;
    }): Promise<PlanetarySquareWire[]> {
      return client.request<PlanetarySquareWire[]>(
        "/api/v1/magic-squares/planetary",
        { signal: opts?.signal },
      );
    },

    listMagicSquares(opts?: {
      signal?: AbortSignal;
      limit?: number;
    }): Promise<MagicSquareRecord[]> {
      const qs = opts?.limit ? `?limit=${opts.limit}` : "";
      return client.request<MagicSquareRecord[]>(`/api/v1/magic-squares${qs}`, {
        signal: opts?.signal,
      });
    },

    getMagicSquare(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<MagicSquareRecord> {
      return client.request<MagicSquareRecord>(`/api/v1/magic-squares/${id}`, {
        signal: opts?.signal,
      });
    },

    createMagicSquare(
      input: CreateMagicSquareInput,
    ): Promise<MagicSquareRecord> {
      return client.request<MagicSquareRecord>("/api/v1/magic-squares", {
        method: "POST",
        json: input,
      });
    },

    updateMagicSquare(
      id: string,
      input: UpdateMagicSquareInput,
    ): Promise<MagicSquareRecord> {
      return client.request<MagicSquareRecord>(`/api/v1/magic-squares/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteMagicSquare(id: string): Promise<void> {
      return client.request<void>(`/api/v1/magic-squares/${id}`, {
        method: "DELETE",
      });
    },

    // ─── Phase 07 Workshop — Talismans (B104) ───────────────────────

    listTalismans(opts?: {
      signal?: AbortSignal;
      sealed?: boolean;
      limit?: number;
    }): Promise<TalismanRecord[]> {
      const params = new URLSearchParams();
      if (opts?.sealed !== undefined) params.set("sealed", String(opts.sealed));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<TalismanRecord[]>(
        `/api/v1/talismans${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    getTalisman(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<TalismanRecord> {
      return client.request<TalismanRecord>(`/api/v1/talismans/${id}`, {
        signal: opts?.signal,
      });
    },

    createTalisman(input: CreateTalismanInput): Promise<TalismanRecord> {
      return client.request<TalismanRecord>("/api/v1/talismans", {
        method: "POST",
        json: input,
      });
    },

    updateTalisman(
      id: string,
      input: UpdateTalismanInput,
    ): Promise<TalismanRecord> {
      return client.request<TalismanRecord>(`/api/v1/talismans/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteTalisman(id: string): Promise<void> {
      return client.request<void>(`/api/v1/talismans/${id}`, {
        method: "DELETE",
      });
    },

    sealTalisman(
      id: string,
      payload: TalismanSealPayload,
    ): Promise<TalismanRecord> {
      return client.request<TalismanRecord>(`/api/v1/talismans/${id}/seal`, {
        method: "POST",
        json: payload,
      });
    },

    unsealTalisman(id: string): Promise<TalismanUnsealResponse> {
      return client.request<TalismanUnsealResponse>(
        `/api/v1/talismans/${id}/unseal`,
        { method: "POST" },
      );
    },

    forkTalisman(id: string, input?: { name?: string }): Promise<TalismanRecord> {
      return client.request<TalismanRecord>(`/api/v1/talismans/${id}/fork`, {
        method: "POST",
        json: input ?? {},
      });
    },

    // ─── Phase 07 Workshop — Circles (B105) ─────────────────────────

    listPresetCircles(opts?: {
      signal?: AbortSignal;
    }): Promise<PresetCircle[]> {
      return client.request<PresetCircle[]>("/api/v1/circles/presets", {
        signal: opts?.signal,
      });
    },

    listCircles(opts?: {
      signal?: AbortSignal;
      limit?: number;
    }): Promise<CircleRecord[]> {
      const qs = opts?.limit ? `?limit=${opts.limit}` : "";
      return client.request<CircleRecord[]>(`/api/v1/circles${qs}`, {
        signal: opts?.signal,
      });
    },

    getCircle(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<CircleRecord> {
      return client.request<CircleRecord>(`/api/v1/circles/${id}`, {
        signal: opts?.signal,
      });
    },

    createCircle(input: CreateCircleInput): Promise<CircleRecord> {
      return client.request<CircleRecord>("/api/v1/circles", {
        method: "POST",
        json: input,
      });
    },

    updateCircle(id: string, input: UpdateCircleInput): Promise<CircleRecord> {
      return client.request<CircleRecord>(`/api/v1/circles/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteCircle(id: string): Promise<void> {
      return client.request<void>(`/api/v1/circles/${id}`, { method: "DELETE" });
    },

    forkCircle(id: string, input?: { name?: string }): Promise<CircleRecord> {
      return client.request<CircleRecord>(`/api/v1/circles/${id}/fork`, {
        method: "POST",
        json: input ?? {},
      });
    },

    // ─── Phase 07 Workshop — Tools (B106) ───────────────────────────

    listTools(opts?: {
      signal?: AbortSignal;
      kind?: ToolKindWire;
      consecrated?: boolean;
      limit?: number;
    }): Promise<ToolRecordWire[]> {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      if (opts?.consecrated !== undefined)
        params.set("consecrated", String(opts.consecrated));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<ToolRecordWire[]>(
        `/api/v1/tools${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    getTool(id: string, opts?: { signal?: AbortSignal }): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>(`/api/v1/tools/${id}`, {
        signal: opts?.signal,
      });
    },

    createTool(input: CreateToolInput): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>("/api/v1/tools", {
        method: "POST",
        json: input,
      });
    },

    updateTool(id: string, input: UpdateToolInput): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>(`/api/v1/tools/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteTool(id: string): Promise<void> {
      return client.request<void>(`/api/v1/tools/${id}`, { method: "DELETE" });
    },

    consecrateTool(
      id: string,
      payload: ConsecrateToolPayload,
    ): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>(`/api/v1/tools/${id}/consecrate`, {
        method: "POST",
        json: payload,
      });
    },

    unconsecrateTool(id: string): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>(`/api/v1/tools/${id}/unconsecrate`, {
        method: "POST",
      });
    },

    addToolPhoto(toolId: string, uploadId: string): Promise<ToolRecordWire> {
      return client.request<ToolRecordWire>(`/api/v1/tools/${toolId}/photos`, {
        method: "POST",
        json: { upload_id: uploadId },
      });
    },

    removeToolPhoto(toolId: string, uploadId: string): Promise<void> {
      return client.request<void>(
        `/api/v1/tools/${toolId}/photos/${uploadId}`,
        { method: "DELETE" },
      );
    },

    // ─── Phase 07 Workshop — Altars (B106) ──────────────────────────

    listAltars(opts?: {
      signal?: AbortSignal;
      is_permanent?: boolean;
      limit?: number;
    }): Promise<AltarRecordWire[]> {
      const params = new URLSearchParams();
      if (opts?.is_permanent !== undefined)
        params.set("is_permanent", String(opts.is_permanent));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<AltarRecordWire[]>(
        `/api/v1/altars${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    getAltar(id: string, opts?: { signal?: AbortSignal }): Promise<AltarRecordWire> {
      return client.request<AltarRecordWire>(`/api/v1/altars/${id}`, {
        signal: opts?.signal,
      });
    },

    createAltar(input: CreateAltarInput): Promise<AltarRecordWire> {
      return client.request<AltarRecordWire>("/api/v1/altars", {
        method: "POST",
        json: input,
      });
    },

    updateAltar(id: string, input: UpdateAltarInput): Promise<AltarRecordWire> {
      return client.request<AltarRecordWire>(`/api/v1/altars/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteAltar(id: string): Promise<void> {
      return client.request<void>(`/api/v1/altars/${id}`, { method: "DELETE" });
    },

    addAltarPhoto(altarId: string, uploadId: string): Promise<AltarRecordWire> {
      return client.request<AltarRecordWire>(`/api/v1/altars/${altarId}/photos`, {
        method: "POST",
        json: { upload_id: uploadId },
      });
    },

    // ─── Phase 07 Workshop — Voces Magicae (B107) ───────────────────

    listBundledVoces(opts?: {
      signal?: AbortSignal;
    }): Promise<BundledVoce[]> {
      return client.request<BundledVoce[]>("/api/v1/voces/bundled", {
        signal: opts?.signal,
      });
    },

    listVoces(opts?: {
      signal?: AbortSignal;
      source_script?: SourceScriptWire;
      limit?: number;
    }): Promise<VoceRecordWire[]> {
      const params = new URLSearchParams();
      if (opts?.source_script) params.set("source_script", opts.source_script);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<VoceRecordWire[]>(
        `/api/v1/voces${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    getVoce(id: string, opts?: { signal?: AbortSignal }): Promise<VoceRecordWire> {
      return client.request<VoceRecordWire>(`/api/v1/voces/${id}`, {
        signal: opts?.signal,
      });
    },

    createVoce(input: CreateVoceInput): Promise<VoceRecordWire> {
      return client.request<VoceRecordWire>("/api/v1/voces", {
        method: "POST",
        json: input,
      });
    },

    updateVoce(id: string, input: UpdateVoceInput): Promise<VoceRecordWire> {
      return client.request<VoceRecordWire>(`/api/v1/voces/${id}`, {
        method: "PATCH",
        json: input,
      });
    },

    deleteVoce(id: string): Promise<void> {
      return client.request<void>(`/api/v1/voces/${id}`, { method: "DELETE" });
    },

    forkBundledVoce(bundledId: string): Promise<VoceRecordWire> {
      return client.request<VoceRecordWire>("/api/v1/voces/fork-bundled", {
        method: "POST",
        json: { bundled_id: bundledId },
      });
    },

    addVoceRecording(
      voceId: string,
      input: CreateVoceRecordingInput,
    ): Promise<VoceRecordingRecord> {
      return client.request<VoceRecordingRecord>(
        `/api/v1/voces/${voceId}/recordings`,
        { method: "POST", json: input },
      );
    },

    removeVoceRecording(voceId: string, recordingId: string): Promise<void> {
      return client.request<void>(
        `/api/v1/voces/${voceId}/recordings/${recordingId}`,
        { method: "DELETE" },
      );
    },
  };
}

export type Api = ReturnType<typeof api>;
