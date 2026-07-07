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
  WeatherCurrentResponse,
  AgentAuditQueryResponse,
  AgentRunCostSampleInput,
  AgentRunCostSnapshot,
  AgentRunSnapshot,
  StartAgentRunInput,
  RegistryAuthorRead,
  RegistryPluginListResponse,
  AgentInstallListResponse,
  AgentInstallSnapshot,
  AgentInstallState,
  CreateAgentInstallInput,
  MemoryFileContent,
  MemoryListResponse,
  FileAdvisoryInput,
  RegistryAdvisory,
  RegistrySubmission,
  RegistrySubmissionListResponse,
  SubmitPluginInput,
  DecideSubmissionInput,
  MaintainerQueueResponse,
  PromotePluginInput,
  MeRead,
  DeletionScheduledRead,
  DataExportResponse,
  MyAuditListResponse,
  MyAuditQueryInput,
  MySessionsListResponse,
  WebauthnCredentialRead,
  WebauthnCredentialListResponse,
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
     * open a session. PHASE 02 ONLY; superseded by the WebAuthn
     * ceremony below and scheduled for removal once every prod user
     * has enrolled at least one authenticator.
     */
    demoSignIn(input: { magickal_name: string }): Promise<Session> {
      return client.request<Session>("/api/v1/auth/demo-signin", {
        method: "POST",
        json: input,
      });
    },

    // ── WebAuthn (Phase 15) — passkey / hardware-key ceremony ────

    webauthnRegisterBegin(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/auth/webauthn/register/begin",
        { method: "POST" },
      );
    },

    webauthnRegisterFinish(input: {
      credential: Record<string, unknown>;
      nickname?: string;
    }): Promise<WebauthnCredentialRead> {
      return client.request<WebauthnCredentialRead>(
        "/api/v1/auth/webauthn/register/finish",
        { method: "POST", json: input },
      );
    },

    webauthnAssertBegin(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/auth/webauthn/assert/begin",
        { method: "POST" },
      );
    },

    webauthnAssertFinish(input: {
      credential: Record<string, unknown>;
    }): Promise<Session> {
      return client.request<Session>(
        "/api/v1/auth/webauthn/assert/finish",
        { method: "POST", json: input },
      );
    },

    listWebauthnCredentials(): Promise<WebauthnCredentialListResponse> {
      return client.request<WebauthnCredentialListResponse>(
        "/api/v1/auth/webauthn/credentials",
      );
    },

    renameWebauthnCredential(
      credentialId: string,
      nickname: string,
    ): Promise<WebauthnCredentialRead> {
      return client.request<WebauthnCredentialRead>(
        `/api/v1/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`,
        { method: "PATCH", json: { nickname } },
      );
    },

    revokeWebauthnCredential(credentialId: string): Promise<void> {
      return client.request<void>(
        `/api/v1/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`,
        { method: "DELETE" },
      );
    },

    // ── TOTP 2FA (Phase 15) ──────────────────────────────────────

    totpStatus(): Promise<{ enrolled: boolean; remaining_backup_codes: number }> {
      return client.request<{ enrolled: boolean; remaining_backup_codes: number }>(
        "/api/v1/auth/totp/status",
      );
    },

    totpBegin(): Promise<{
      secret: string;
      uri: string;
      account_name: string;
      issuer: string;
    }> {
      return client.request<{
        secret: string;
        uri: string;
        account_name: string;
        issuer: string;
      }>("/api/v1/auth/totp/begin", { method: "POST" });
    },

    totpVerify(input: { code: string }): Promise<{
      enrolled: boolean;
      backup_codes: string[];
    }> {
      return client.request<{ enrolled: boolean; backup_codes: string[] }>(
        "/api/v1/auth/totp/verify",
        { method: "POST", json: input },
      );
    },

    totpChallenge(input: { code: string }): Promise<{
      ok: boolean;
      used_backup_code: boolean;
      remaining_backup_codes: number;
    }> {
      return client.request<{
        ok: boolean;
        used_backup_code: boolean;
        remaining_backup_codes: number;
      }>("/api/v1/auth/totp/challenge", { method: "POST", json: input });
    },

    totpRegenerateBackupCodes(): Promise<{ backup_codes: string[] }> {
      return client.request<{ backup_codes: string[] }>(
        "/api/v1/auth/totp/backup-codes",
        { method: "POST" },
      );
    },

    totpDisable(): Promise<void> {
      return client.request<void>("/api/v1/auth/totp", { method: "DELETE" });
    },

    // ── Divination (Phase 06) ─────────────────────────────────────

    listTarotDecks(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/tarot/decks",
      );
    },

    listTarotSpreads(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/tarot/spreads",
      );
    },

    listTarotReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/tarot/readings",
      );
    },

    castTarot(input: {
      deck_id: string;
      spread_id: string;
      question?: string;
      draw_method?: string;
      seed?: string;
      title?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/tarot/cast",
        { method: "POST", json: input },
      );
    },

    listIchingReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/iching/readings",
      );
    },

    castIching(input: {
      question?: string;
      method?: "three_coins" | "yarrow_stalks" | "six_coins";
      seed?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/iching/cast",
        { method: "POST", json: input },
      );
    },

    listGeomancyReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/geomancy/readings",
      );
    },

    castGeomancy(input: {
      question?: string;
      method?: "rng" | "sand" | "manual";
      seed?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/geomancy/cast",
        { method: "POST", json: input },
      );
    },

    listRuneSets(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/runes/sets",
      );
    },

    listRuneSpreads(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/runes/spreads",
      );
    },

    listRuneReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/runes/readings",
      );
    },

    castRunes(input: {
      rune_set?: "elder_futhark" | "younger_futhark" | "anglo_saxon";
      spread?: "single_rune" | "three_rune" | "cross" | "runic_five" | "nine_rune_grid";
      question?: string;
      seed?: string;
      allow_reversals?: boolean;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/runes/cast",
        { method: "POST", json: input },
      );
    },

    // ── Publications / Subscribers / Media / Pilgrimage / Hubs ───

    listPublications(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/publications",
      );
    },

    createPublication(input: {
      kind: string;
      title: string;
      summary?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/publications",
        { method: "POST", json: input },
      );
    },

    getPublication(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/publications/${encodeURIComponent(id)}`,
      );
    },

    updatePublication(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/publications/${encodeURIComponent(id)}`,
        { method: "PATCH", json: patch },
      );
    },

    createPublicationChapter(
      pubId: string,
      input: { title: string; body?: Record<string, unknown> },
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/publications/${encodeURIComponent(pubId)}/chapters`,
        { method: "POST", json: input },
      );
    },

    updatePublicationChapter(
      pubId: string,
      chapterId: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/publications/${encodeURIComponent(pubId)}/chapters/${encodeURIComponent(chapterId)}`,
        { method: "PATCH", json: patch },
      );
    },

    listSubscribers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/subscribers",
      );
    },

    listMedia(
      opts: { kind?: "image" | "audio" | "video" | "document" } = {},
    ): Promise<Array<Record<string, unknown>>> {
      const qs = opts.kind ? `?kind=${encodeURIComponent(opts.kind)}` : "";
      return client.request<Array<Record<string, unknown>>>(
        `/api/v1/media${qs}`,
      );
    },

    getMedia(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/media/${encodeURIComponent(id)}`,
      );
    },

    updateMedia(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/media/${encodeURIComponent(id)}`,
        { method: "PATCH", json: patch },
      );
    },

    listPilgrimageSites(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/pilgrimage-sites",
      );
    },

    listHubs(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/hubs");
    },

    getHub(hubId: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}`,
      );
    },

    updateHub(
      hubId: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}`,
        { method: "PATCH", json: patch },
      );
    },

    listHubMembers(hubId: string): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/members`,
      );
    },

    changeHubMemberRole(
      hubId: string,
      userId: string,
      role: "hub_admin" | "hub_officer" | "hub_moderator" | "hub_member" | "hub_observer",
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/members/${encodeURIComponent(userId)}/role`,
        { method: "POST", json: { role } },
      );
    },

    removeHubMember(hubId: string, userId: string): Promise<void> {
      return client.request<void>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/members/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
    },

    getHubRoleMatrix(hubId: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/roles`,
      );
    },

    updateHubRoleMatrix(
      hubId: string,
      matrix: Record<string, string[]>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/roles`,
        { method: "PATCH", json: { matrix } },
      );
    },

    listPrivateViewers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/private-viewers",
      );
    },

    listSynchronicities(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/synchronicities",
      );
    },

    listStudies(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/studies",
      );
    },

    listTemplates(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/templates",
      );
    },

    // ── Studies + Ciphers (Phase 08) ─────────────────────────────

    createStudy(input: {
      name: string;
      kind: "gematria_calculation" | "gematria_search";
      query: Record<string, unknown>;
      description?: string;
      visibility?: "personal" | "vault_shared" | "publishable";
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/studies",
        { method: "POST", json: input },
      );
    },

    listCiphers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/ciphers",
      );
    },

    listBundledCiphers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>(
        "/api/v1/ciphers/bundled",
      );
    },

    createCipher(input: {
      name: string;
      language:
        | "greek"
        | "hebrew"
        | "english"
        | "coptic"
        | "arabic"
        | "sanskrit"
        | "custom";
      mapping: Record<string, number>;
      notes?: string;
      source_citation?: string | null;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        "/api/v1/ciphers",
        { method: "POST", json: input },
      );
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

    // ─── Weather (H11 auto-context banner) ───────────────────────────

    getWeatherCurrent(
      params: { lat: number; lng: number },
      opts?: { signal?: AbortSignal },
    ): Promise<WeatherCurrentResponse> {
      const qs = `?lat=${encodeURIComponent(params.lat)}&lng=${encodeURIComponent(params.lng)}`;
      return client.request<WeatherCurrentResponse>(
        `/api/v1/weather/current${qs}`,
        { signal: opts?.signal },
      );
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

    // ── Phase 16 · agents (H10 C-cluster) ────────────────────────────

    startAgentRun(input: StartAgentRunInput): Promise<AgentRunSnapshot> {
      return client.request<AgentRunSnapshot>("/api/v1/agents/runs", {
        method: "POST",
        json: input,
      });
    },

    getAgentRun(runId: string): Promise<AgentRunSnapshot> {
      return client.request<AgentRunSnapshot>(`/api/v1/agents/runs/${runId}`);
    },

    terminateAgentRun(
      runId: string,
    ): Promise<{ run_id: string; status: string }> {
      return client.request<{ run_id: string; status: string }>(
        `/api/v1/agents/runs/${runId}`,
        { method: "DELETE" },
      );
    },

    reportAgentRunCost(
      runId: string,
      sample: AgentRunCostSampleInput,
    ): Promise<AgentRunCostSnapshot> {
      return client.request<AgentRunCostSnapshot>(
        `/api/v1/agents/runs/${runId}/cost`,
        { method: "POST", json: sample },
      );
    },

    queryAgentAudit(params?: {
      eventType?: string;
      limit?: number;
      offset?: number;
    }): Promise<AgentAuditQueryResponse> {
      const search = new URLSearchParams();
      if (params?.eventType) search.set("event_type", params.eventType);
      if (params?.limit !== undefined)
        search.set("limit", String(params.limit));
      if (params?.offset !== undefined)
        search.set("offset", String(params.offset));
      const query = search.toString();
      return client.request<AgentAuditQueryResponse>(
        `/api/v1/agents/audit${query ? `?${query}` : ""}`,
      );
    },

    // ── Registry browse (H10 A1 + C2) ─────────────────────────────

    listRegistryPlugins(params?: {
      sort?: "alpha" | "recent_update" | "recently_added";
    }): Promise<RegistryPluginListResponse> {
      const search = new URLSearchParams();
      if (params?.sort) search.set("sort", params.sort);
      const query = search.toString();
      return client.request<RegistryPluginListResponse>(
        `/api/v1/registry/plugins${query ? `?${query}` : ""}`,
      );
    },

    getRegistryAuthor(did: string): Promise<RegistryAuthorRead> {
      return client.request<RegistryAuthorRead>(
        `/api/v1/registry/authors/${encodeURIComponent(did)}`,
      );
    },

    // ── Agent installs (Phase 16) ─────────────────────────────────

    createAgentInstall(
      input: CreateAgentInstallInput,
    ): Promise<AgentInstallSnapshot> {
      return client.request<AgentInstallSnapshot>(
        "/api/v1/agents/installs",
        { method: "POST", json: input },
      );
    },

    listAgentInstalls(): Promise<AgentInstallListResponse> {
      return client.request<AgentInstallListResponse>(
        "/api/v1/agents/installs",
      );
    },

    getAgentInstall(installId: string): Promise<AgentInstallSnapshot> {
      return client.request<AgentInstallSnapshot>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}`,
      );
    },

    updateAgentInstallState(
      installId: string,
      state: AgentInstallState,
    ): Promise<AgentInstallSnapshot> {
      return client.request<AgentInstallSnapshot>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}/state`,
        { method: "PATCH", json: { state } },
      );
    },

    deleteAgentInstall(installId: string): Promise<{ deleted: boolean }> {
      return client.request<{ deleted: boolean }>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}`,
        { method: "DELETE" },
      );
    },

    listInstallMemory(installId: string): Promise<MemoryListResponse> {
      return client.request<MemoryListResponse>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}/memory`,
      );
    },

    readInstallMemory(
      installId: string,
      name: string,
    ): Promise<MemoryFileContent> {
      return client.request<MemoryFileContent>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}/memory/${encodeURIComponent(name)}`,
      );
    },

    writeInstallMemory(
      installId: string,
      name: string,
      body: string,
    ): Promise<{ name: string; size_bytes: number }> {
      return client.request<{ name: string; size_bytes: number }>(
        `/api/v1/agents/installs/${encodeURIComponent(installId)}/memory/${encodeURIComponent(name)}`,
        { method: "PUT", json: { body } },
      );
    },

    // ── Registry author (H10 A2-A4 + A8) ──────────────────────────

    submitPlugin(input: SubmitPluginInput): Promise<RegistrySubmission> {
      return client.request<RegistrySubmission>(
        "/api/v1/registry/author/submissions",
        { method: "POST", json: input },
      );
    },

    listMySubmissions(): Promise<RegistrySubmissionListResponse> {
      return client.request<RegistrySubmissionListResponse>(
        "/api/v1/registry/author/submissions",
      );
    },

    getMySubmission(submissionId: string): Promise<RegistrySubmission> {
      return client.request<RegistrySubmission>(
        `/api/v1/registry/author/submissions/${encodeURIComponent(submissionId)}`,
      );
    },

    fileAdvisory(input: FileAdvisoryInput): Promise<RegistryAdvisory> {
      return client.request<RegistryAdvisory>(
        "/api/v1/registry/author/advisories",
        { method: "POST", json: input },
      );
    },

    // ── Registry maintainer (H10 A5-A7) ───────────────────────────

    reviewQueue(): Promise<MaintainerQueueResponse> {
      return client.request<MaintainerQueueResponse>(
        "/api/v1/registry/maintainer/queue",
      );
    },

    takeSubmission(submissionId: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/registry/maintainer/submissions/${encodeURIComponent(submissionId)}/take`,
        { method: "POST" },
      );
    },

    decideSubmission(
      submissionId: string,
      input: DecideSubmissionInput,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/registry/maintainer/submissions/${encodeURIComponent(submissionId)}/decide`,
        { method: "POST", json: input },
      );
    },

    promotePlugin(
      pluginId: string,
      input: PromotePluginInput,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/registry/maintainer/plugins/${encodeURIComponent(pluginId)}/promote`,
        { method: "POST", json: input },
      );
    },

    // ── B-cluster (H10 Hardening) — account / privacy / sessions ──

    getMe(opts?: { signal?: AbortSignal }): Promise<MeRead> {
      return client.request<MeRead>("/api/v1/me", { signal: opts?.signal });
    },

    requestDataExport(): Promise<DataExportResponse> {
      return client.request<DataExportResponse>("/api/v1/me/data-export", {
        method: "POST",
      });
    },

    scheduleAccountDeletion(): Promise<DeletionScheduledRead> {
      return client.request<DeletionScheduledRead>(
        "/api/v1/me/account/delete",
        { method: "POST" },
      );
    },

    reactivateAccount(): Promise<MeRead> {
      return client.request<MeRead>("/api/v1/me/account/reactivate", {
        method: "POST",
      });
    },

    listMyAudit(input: MyAuditQueryInput = {}): Promise<MyAuditListResponse> {
      const params = new URLSearchParams();
      if (input.kind && input.kind !== "all") params.set("kind", input.kind);
      if (input.action && input.action !== "all")
        params.set("action", input.action);
      if (input.time_range) params.set("time_range", input.time_range);
      if (typeof input.limit === "number")
        params.set("limit", String(input.limit));
      if (typeof input.offset === "number")
        params.set("offset", String(input.offset));
      const qs = params.toString();
      return client.request<MyAuditListResponse>(
        `/api/v1/me/audit${qs ? `?${qs}` : ""}`,
      );
    },

    myAuditCsvUrl(input: MyAuditQueryInput = {}): string {
      const params = new URLSearchParams();
      if (input.kind && input.kind !== "all") params.set("kind", input.kind);
      if (input.action && input.action !== "all")
        params.set("action", input.action);
      if (input.time_range) params.set("time_range", input.time_range);
      const qs = params.toString();
      return `/api/v1/me/audit.csv${qs ? `?${qs}` : ""}`;
    },

    listMySessions(): Promise<MySessionsListResponse> {
      return client.request<MySessionsListResponse>("/api/v1/me/sessions");
    },

    revokeMySession(sessionId: string): Promise<void> {
      return client.request<void>(
        `/api/v1/me/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );
    },

    revokeOtherSessions(): Promise<MySessionsListResponse> {
      return client.request<MySessionsListResponse>(
        "/api/v1/me/sessions/revoke-others",
        { method: "POST" },
      );
    },
  };
}

export type Api = ReturnType<typeof api>;
