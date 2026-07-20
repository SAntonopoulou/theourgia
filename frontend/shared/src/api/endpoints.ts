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
  AgentAuditQueryResponse,
  AgentCostSummaryResponse,
  AgentCostWindow,
  AgentInstallListResponse,
  AgentInstallSnapshot,
  AgentInstallState,
  AgentRunCostSampleInput,
  AgentRunCostSnapshot,
  AgentRunSnapshot,
  AltarRecordWire,
  AudioAttachmentRecord,
  BanishingLogRecord,
  BodyPracticeRecord,
  BookRecord,
  BundleImportResponse,
  BundlePreviewResponse,
  BundleUninstallResponse,
  BundledPackageListResponse,
  BundledVoce,
  CastHoraryInput,
  ChartRequestInput,
  ChartResponse,
  CircleRecord,
  CompletionInput,
  ConsecrateToolPayload,
  ContractRead,
  ContractStatusWire,
  CreateAgentInstallInput,
  CreateAltarInput,
  CreateBanishingLogInput,
  CreateBodyPracticeInput,
  CreateBookInput,
  CreateCircleInput,
  CreateContractInput,
  CreateEntityInput,
  CreateEntryInput,
  CreateInitiationInput,
  CreateMagicSquareInput,
  CreateOathInput,
  CreateOfferingInput,
  CreatePendulumReadingInput,
  CreatePracticeInput,
  CreateRecurringOfferingInput,
  CreateServitorInput,
  CreateServitorTaskInput,
  CreateSigilInput,
  CreateTalismanInput,
  CreateToolInput,
  CreateVoceInput,
  CreateVoceRecordingInput,
  DataExportResponse,
  DecideSubmissionInput,
  DeletionScheduledRead,
  EndScryingSessionInput,
  EntityKind,
  EntityRecord,
  EntryDetailRecord,
  EntryRecord,
  EntryRevisionListItem,
  EntryRevisionRead,
  EntryStats,
  EntryType,
  FederationPeerCreated,
  FederationPeerRead,
  FeedServitorInput,
  FileAdvisoryInput,
  FulfillObligationInput,
  HealthStatus,
  HealthSummary,
  HoraryReadingRecord,
  InitiationRead,
  InitiationStatusWire,
  InstalledBundleListResponse,
  KeyRotationHistoryResponse,
  KeyRotationStatusResponse,
  MagicSquareRecord,
  MaintainerQueueResponse,
  MeRead,
  MemoryFileContent,
  MemoryListResponse,
  Meta,
  MyAuditListResponse,
  MyAuditQueryInput,
  MySessionsListResponse,
  OathKindWire,
  OathRead,
  OathStatusWire,
  OfferingRead,
  PendulumReadingRecord,
  PlanetarySquareWire,
  PracticeRecord,
  PracticesToday,
  PresetCircle,
  PromotePluginInput,
  RecurringOfferingRead,
  RegistryAdvisory,
  RegistryAuthorRead,
  RegistryPluginListResponse,
  RegistrySubmission,
  RegistrySubmissionListResponse,
  ScryingSessionRecord,
  SealEntryInput,
  SealedPayloadRead,
  SearchEntriesQuery,
  SearchEntriesResponse,
  ServitorKindWire,
  ServitorRead,
  ServitorStatusWire,
  ServitorTaskRead,
  ServitorTaskStatusWire,
  Session,
  SigilRecord,
  SourceScriptWire,
  StartAgentRunInput,
  StartScryingSessionInput,
  SubmitPluginInput,
  TalismanRecord,
  TalismanSealPayload,
  TalismanUnsealResponse,
  TodayLedger,
  ToolKindWire,
  ToolRecordWire,
  TranscribeQueuedResponse,
  UpdateAltarInput,
  UpdateCircleInput,
  UpdateContractInput,
  UpdateEntryBodyInput,
  UpdateInitiationInput,
  UpdateMagicSquareInput,
  UpdateOathInput,
  UpdateOfferingInput,
  UpdatePracticeInput,
  UpdateRecurringOfferingInput,
  UpdateServitorInput,
  UpdateServitorTaskInput,
  UpdateSigilInput,
  UpdateTalismanInput,
  UpdateToolInput,
  UpdateVoceInput,
  UserLocation,
  VoceRecordWire,
  VoceRecordingRecord,
  WeatherCurrentResponse,
  WebauthnCredentialListResponse,
  WebauthnCredentialRead,
  WellbeingNudge,
} from "./types.js";

export class NotImplementedError extends Error {
  constructor(endpoint: string) {
    super(`Endpoint not yet implemented on backend: ${endpoint}`);
    this.name = "NotImplementedError";
  }
}

/** The upload's own filename when it has one (``File``), else the
 *  fallback — multipart parts need a name for the backend parser. */
function fileName(file: Blob, fallback: string): string {
  return typeof File !== "undefined" && file instanceof File && file.name ? file.name : fallback;
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

    getAdminHealth(opts?: {
      signal?: AbortSignal;
    }): Promise<HealthSummary> {
      return client.request<HealthSummary>("/api/v1/admin/health", {
        signal: opts?.signal,
      });
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
    demoSignIn(input: {
      magickal_name: string;
      password?: string;
    }): Promise<Session> {
      return client.request<Session>("/api/v1/auth/demo-signin", {
        method: "POST",
        json: input,
      });
    },

    // ── WebAuthn (Phase 15) — passkey / hardware-key ceremony ────

    webauthnRegisterBegin(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/auth/webauthn/register/begin", {
        method: "POST",
      });
    },

    webauthnRegisterFinish(input: {
      credential: Record<string, unknown>;
      nickname?: string;
    }): Promise<WebauthnCredentialRead> {
      return client.request<WebauthnCredentialRead>("/api/v1/auth/webauthn/register/finish", {
        method: "POST",
        json: input,
      });
    },

    webauthnAssertBegin(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/auth/webauthn/assert/begin", {
        method: "POST",
      });
    },

    webauthnAssertFinish(input: {
      credential: Record<string, unknown>;
    }): Promise<Session> {
      return client.request<Session>("/api/v1/auth/webauthn/assert/finish", {
        method: "POST",
        json: input,
      });
    },

    listWebauthnCredentials(): Promise<WebauthnCredentialListResponse> {
      return client.request<WebauthnCredentialListResponse>("/api/v1/auth/webauthn/credentials");
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
      return client.request<{ backup_codes: string[] }>("/api/v1/auth/totp/backup-codes", {
        method: "POST",
      });
    },

    totpDisable(): Promise<void> {
      return client.request<void>("/api/v1/auth/totp", { method: "DELETE" });
    },

    // ── Divination (Phase 06) ─────────────────────────────────────

    listTarotDecks(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/tarot/decks");
    },

    getTarotDeck(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/decks/${id}`);
    },

    createTarotDeck(input: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/tarot/decks", {
        method: "POST",
        json: input,
      });
    },

    updateTarotDeck(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/decks/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteTarotDeck(id: string): Promise<void> {
      return client.request<void>(`/api/v1/tarot/decks/${id}`, { method: "DELETE" });
    },

    // Card CRUD (b108-2hc)

    addTarotCard(deckId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/decks/${deckId}/cards`, {
        method: "POST",
        json: input,
      });
    },

    updateTarotCard(
      cardId: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/cards/${cardId}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteTarotCard(cardId: string): Promise<void> {
      return client.request<void>(`/api/v1/tarot/cards/${cardId}`, { method: "DELETE" });
    },

    // ── Account password (b108-2hl SECURITY) ─────────────────────

    getPasswordStatus(): Promise<{ has_password: boolean }> {
      return client.request<{ has_password: boolean }>("/api/v1/auth/password");
    },

    setPassword(input: { new_password: string; current_password?: string | null }): Promise<{
      has_password: boolean;
    }> {
      return client.request<{ has_password: boolean }>("/api/v1/auth/password", {
        method: "PUT",
        json: input,
      });
    },

    // ── Memorial mode / digital inheritance (b108-2hg) ───────────

    getMemorialConfig(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/memorial/config");
    },

    updateMemorialConfig(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/memorial/config", {
        method: "PATCH",
        json: patch,
      });
    },

    memorialCheckIn(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/memorial/check-in", {
        method: "POST",
      });
    },

    memorialTrigger(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/memorial/trigger", {
        method: "POST",
      });
    },

    memorialReactivate(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/memorial/reactivate", {
        method: "POST",
      });
    },

    /**
     * Executor key-share (v1-018): the server splits a client-supplied
     * secret via Shamir over GF(256), returns the shares ONCE (they
     * are never stored), and keeps only a SHA-256 commitment.
     */
    memorialKeyShare(input: {
      secret_b64: string;
      shares: number;
      threshold: number;
    }): Promise<{ shares_b64: string[]; n: number; k: number; created_at: string }> {
      return client.request<{
        shares_b64: string[];
        n: number;
        k: number;
        created_at: string;
      }>("/api/v1/memorial/key-share", {
        method: "POST",
        json: input,
      });
    },

    /** Check a client-side reconstruction against the stored commitment. */
    memorialKeyShareVerify(input: {
      secret_b64: string;
    }): Promise<{ verified: boolean }> {
      return client.request<{ verified: boolean }>("/api/v1/memorial/key-share/verify", {
        method: "POST",
        json: input,
      });
    },

    // ── Pilgrimage routes (b108-2gx backend, b108-2he frontend) ───

    listPilgrimageRoutes(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/pilgrimage-routes");
    },

    getPilgrimageRoute(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/pilgrimage-routes/${id}`);
    },

    createPilgrimageRoute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/pilgrimage-routes", {
        method: "POST",
        json: input,
      });
    },

    updatePilgrimageRoute(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/pilgrimage-routes/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deletePilgrimageRoute(id: string): Promise<void> {
      return client.request<void>(`/api/v1/pilgrimage-routes/${id}`, { method: "DELETE" });
    },

    addPilgrimageRouteStop(
      routeId: string,
      input: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/pilgrimage-routes/${routeId}/stops`, {
        method: "POST",
        json: input,
      });
    },

    deletePilgrimageRouteStop(routeId: string, stopId: string): Promise<void> {
      return client.request<void>(`/api/v1/pilgrimage-routes/${routeId}/stops/${stopId}`, {
        method: "DELETE",
      });
    },

    reorderPilgrimageRouteStops(
      routeId: string,
      stopIds: string[],
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/pilgrimage-routes/${routeId}/reorder`,
        { method: "POST", json: { stop_ids: stopIds } },
      );
    },

    // ── Recipes (b108-2gy backend, b108-2he frontend) ────────────

    listRecipes(kind?: string): Promise<Array<Record<string, unknown>>> {
      const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
      return client.request<Array<Record<string, unknown>>>(`/api/v1/recipes${qs}`);
    },

    getRecipe(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/recipes/${id}`);
    },

    createRecipe(input: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/recipes", {
        method: "POST",
        json: input,
      });
    },

    updateRecipe(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/recipes/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteRecipe(id: string): Promise<void> {
      return client.request<void>(`/api/v1/recipes/${id}`, { method: "DELETE" });
    },

    listTarotSpreads(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/tarot/spreads");
    },

    getTarotSpread(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/spreads/${id}`);
    },

    createTarotSpread(input: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/tarot/spreads", {
        method: "POST",
        json: input,
      });
    },

    updateTarotSpread(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/tarot/spreads/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteTarotSpread(id: string): Promise<void> {
      return client.request<void>(`/api/v1/tarot/spreads/${id}`, { method: "DELETE" });
    },

    listTarotReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/tarot/readings");
    },

    castTarot(input: {
      deck_id: string;
      spread_id: string;
      question?: string;
      draw_method?: string;
      seed?: string;
      title?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/tarot/cast", {
        method: "POST",
        json: input,
      });
    },

    listIchingReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/iching/readings");
    },

    castIching(input: {
      question?: string;
      method?: "three_coins" | "yarrow_stalks" | "six_coins";
      seed?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/iching/cast", {
        method: "POST",
        json: input,
      });
    },

    listGeomancyReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/geomancy/readings");
    },

    castGeomancy(input: {
      question?: string;
      method?: "rng" | "sand" | "manual";
      seed?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/geomancy/cast", {
        method: "POST",
        json: input,
      });
    },

    listRuneSets(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/runes/sets");
    },

    getRuneSet(setId: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/runes/sets/${encodeURIComponent(setId)}`,
      );
    },

    listRuneSpreads(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/runes/spreads");
    },

    listRuneReadings(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/runes/readings");
    },

    castRunes(input: {
      rune_set?: "elder_futhark" | "younger_futhark" | "anglo_saxon";
      spread?: "single_rune" | "three_rune" | "cross" | "runic_five" | "nine_rune_grid";
      question?: string;
      seed?: string;
      allow_reversals?: boolean;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/runes/cast", {
        method: "POST",
        json: input,
      });
    },

    // ── Divination misc (Phase 06 · pendulum / horary / scrying) ──

    listPendulumReadings(): Promise<PendulumReadingRecord[]> {
      return client.request<PendulumReadingRecord[]>("/api/v1/pendulum/readings");
    },

    createPendulumReading(input: CreatePendulumReadingInput): Promise<PendulumReadingRecord> {
      return client.request<PendulumReadingRecord>("/api/v1/pendulum/readings", {
        method: "POST",
        json: input,
      });
    },

    listHoraryReadings(): Promise<HoraryReadingRecord[]> {
      return client.request<HoraryReadingRecord[]>("/api/v1/horary/readings");
    },

    castHorary(input: CastHoraryInput): Promise<HoraryReadingRecord> {
      return client.request<HoraryReadingRecord>("/api/v1/horary/cast", {
        method: "POST",
        json: input,
      });
    },

    listScryingSessions(): Promise<ScryingSessionRecord[]> {
      return client.request<ScryingSessionRecord[]>("/api/v1/scrying/sessions");
    },

    startScryingSession(input: StartScryingSessionInput): Promise<ScryingSessionRecord> {
      return client.request<ScryingSessionRecord>("/api/v1/scrying/sessions", {
        method: "POST",
        json: input,
      });
    },

    endScryingSession(id: string, input: EndScryingSessionInput): Promise<ScryingSessionRecord> {
      return client.request<ScryingSessionRecord>(
        `/api/v1/scrying/sessions/${encodeURIComponent(id)}/end`,
        { method: "POST", json: input },
      );
    },

    // ── Publications / Subscribers / Media / Pilgrimage / Hubs ───

    listPublications(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/publications");
    },

    createPublication(input: {
      kind: string;
      title: string;
      summary?: string;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/publications", {
        method: "POST",
        json: input,
      });
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

    /** Download the print-quality book PDF for a publication (b108-2ia).
     *  Owner-only. Returns a Blob suitable for triggering a browser
     *  download or piping into pdf.js for in-browser preview. */
    downloadPublicationBookPdf(pubId: string): Promise<Blob> {
      return client.requestBlob(`/api/v1/publications/${encodeURIComponent(pubId)}/book-pdf`);
    },

    listSubscribers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/subscribers");
    },

    listMedia(
      opts: { kind?: "image" | "audio" | "video" | "document" } = {},
    ): Promise<Array<Record<string, unknown>>> {
      const qs = opts.kind ? `?kind=${encodeURIComponent(opts.kind)}` : "";
      return client.request<Array<Record<string, unknown>>>(`/api/v1/media${qs}`);
    },

    getMedia(id: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/media/${encodeURIComponent(id)}`);
    },

    updateMedia(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/media/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: patch,
      });
    },

    listPilgrimageSites(): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/pilgrimage-sites");
    },

    listHubs(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/hubs");
    },

    getHub(hubId: string): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/hubs/${encodeURIComponent(hubId)}`);
    },

    updateHub(hubId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(`/api/v1/hubs/${encodeURIComponent(hubId)}`, {
        method: "PATCH",
        json: patch,
      });
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
      return client.request<Array<Record<string, unknown>>>("/api/v1/private-viewers");
    },

    listSynchronicities(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/synchronicities");
    },

    listStudies(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/studies");
    },

    listTemplates(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/templates");
    },

    // ── Studies + Ciphers (Phase 08) ─────────────────────────────

    createStudy(input: {
      name: string;
      kind: "gematria_calculation" | "gematria_search";
      query: Record<string, unknown>;
      description?: string;
      visibility?: "personal" | "vault_shared" | "publishable";
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/studies", {
        method: "POST",
        json: input,
      });
    },

    listCiphers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/ciphers");
    },

    listBundledCiphers(): Promise<Array<Record<string, unknown>>> {
      return client.request<Array<Record<string, unknown>>>("/api/v1/ciphers/bundled");
    },

    createCipher(input: {
      name: string;
      language: "greek" | "hebrew" | "english" | "coptic" | "arabic" | "sanskrit" | "custom";
      mapping: Record<string, number>;
      notes?: string;
      source_citation?: string | null;
    }): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>("/api/v1/ciphers", {
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

    /**
     * Seal an entry (v1-033, Mode B). The body was already encrypted
     * on this device (`sealToEnvelope`); the server stores the
     * ciphertext, NULLs the plaintext body, and purges plaintext
     * revisions in the same transaction. One-way server-side — there
     * is no unseal endpoint; reads go through `getEntrySealedPayload`
     * and decrypt client-side.
     */
    sealEntry(id: string, input: SealEntryInput): Promise<EntryDetailRecord> {
      return client.request<EntryDetailRecord>(`/api/v1/entries/${id}/seal`, {
        method: "POST",
        json: input,
      });
    },

    /**
     * Ciphertext of a sealed entry (owner-only, base64). Decrypt in
     * memory with the vault passphrase via `decryptSealedPayloadB64`
     * — the row stays sealed; this is read-only.
     */
    getEntrySealedPayload(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<SealedPayloadRead> {
      return client.request<SealedPayloadRead>(`/api/v1/entries/${id}/sealed-payload`, {
        signal: opts?.signal,
      });
    },

    /**
     * Version history (v1-028) — newest-first revision list. Sealed
     * entries 403 (they keep no server-readable history).
     */
    listEntryRevisions(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<EntryRevisionListItem[]> {
      return client.request<EntryRevisionListItem[]>(`/api/v1/entries/${id}/revisions`, {
        signal: opts?.signal,
      });
    },

    /** One revision with its full Tiptap-JSON body. */
    getEntryRevision(
      id: string,
      revisionId: string,
      opts?: { signal?: AbortSignal },
    ): Promise<EntryRevisionRead> {
      return client.request<EntryRevisionRead>(`/api/v1/entries/${id}/revisions/${revisionId}`, {
        signal: opts?.signal,
      });
    },

    /**
     * Restore an entry to a revision. Never destructive: the server
     * writes the CURRENT state as a new revision first, then applies
     * the old content (title + body only — visibility, type, and
     * publish state never time-travel). Returns the updated detail.
     */
    restoreEntryRevision(id: string, revisionId: string): Promise<EntryDetailRecord> {
      return client.request<EntryDetailRecord>(
        `/api/v1/entries/${id}/revisions/${revisionId}/restore`,
        { method: "POST" },
      );
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

    /**
     * Lexical FTS across the user's entries — ``GET /api/v1/search``
     * (B29 backend). Sealed entries never appear in hits; the
     * response carries the honest `sealed_excluded_count` so the
     * caller can render the SealedExcludedCallout.
     */
    searchEntries(
      query: SearchEntriesQuery,
      opts?: { signal?: AbortSignal },
    ): Promise<SearchEntriesResponse> {
      const params = new URLSearchParams();
      if (query.q) params.set("q", query.q);
      for (const k of query.kind ?? []) params.append("kind", k);
      for (const v of query.visibility ?? []) params.append("visibility", v);
      if (query.since) params.set("since", query.since);
      if (query.until) params.set("until", query.until);
      if (query.limit !== undefined) params.set("limit", String(query.limit));
      if (query.offset !== undefined) params.set("offset", String(query.offset));
      const qs = params.toString();
      return client.request<SearchEntriesResponse>(`/api/v1/search${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
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

    // ─── Wellbeing — crisis-aware nudge (v1-010, opt-in) ─────────────

    getWellbeingNudge(opts?: { signal?: AbortSignal }): Promise<WellbeingNudge> {
      return client.request<WellbeingNudge>("/api/v1/wellbeing/nudge", {
        signal: opts?.signal,
      });
    },

    /** Persists the `a11y.crisis_nudge` setting. Enabling clears any mute. */
    putWellbeingNudge(input: { enabled: boolean }): Promise<WellbeingNudge> {
      return client.request<WellbeingNudge>("/api/v1/wellbeing/nudge", {
        method: "PUT",
        json: input,
      });
    },

    /**
     * Mute the nudge: `until` is an ISO date or "forever" (default —
     * the user can mute indefinitely without nag).
     */
    dismissWellbeingNudge(input?: { until: string }): Promise<WellbeingNudge> {
      return client.request<WellbeingNudge>("/api/v1/wellbeing/nudge/dismiss", {
        method: "POST",
        json: input ?? { until: "forever" },
      });
    },

    // ─── Weather (H11 auto-context banner) ───────────────────────────

    getWeatherCurrent(
      params: { lat: number; lng: number },
      opts?: { signal?: AbortSignal },
    ): Promise<WeatherCurrentResponse> {
      const qs = `?lat=${encodeURIComponent(params.lat)}&lng=${encodeURIComponent(params.lng)}`;
      return client.request<WeatherCurrentResponse>(`/api/v1/weather/current${qs}`, {
        signal: opts?.signal,
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
      return client.request<EntityRecord[]>(`/api/v1/entities${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
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

    // ─── Phase 05 · Relational ledger (v1-019) ───────────────────────
    // Offerings · Contracts · Oaths · Initiations · Servitors. All
    // list endpoints return bare arrays. Status filters use the
    // backend's prefixed query keys (``contract_status`` etc.).

    listOfferings(opts?: {
      signal?: AbortSignal;
      entityId?: string;
      workingId?: string;
      limit?: number;
    }): Promise<OfferingRead[]> {
      const params = new URLSearchParams();
      if (opts?.entityId) params.set("entity_id", opts.entityId);
      if (opts?.workingId) params.set("working_id", opts.workingId);
      if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<OfferingRead[]>(`/api/v1/offerings${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getOffering(id: string, opts?: { signal?: AbortSignal }): Promise<OfferingRead> {
      return client.request<OfferingRead>(`/api/v1/offerings/${id}`, {
        signal: opts?.signal,
      });
    },

    createOffering(input: CreateOfferingInput): Promise<OfferingRead> {
      return client.request<OfferingRead>("/api/v1/offerings", {
        method: "POST",
        json: input,
      });
    },

    updateOffering(id: string, patch: UpdateOfferingInput): Promise<OfferingRead> {
      return client.request<OfferingRead>(`/api/v1/offerings/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteOffering(id: string): Promise<void> {
      return client.request<void>(`/api/v1/offerings/${id}`, { method: "DELETE" });
    },

    listRecurringOfferings(opts?: {
      signal?: AbortSignal;
      entityId?: string;
      isActive?: boolean;
    }): Promise<RecurringOfferingRead[]> {
      const params = new URLSearchParams();
      if (opts?.entityId) params.set("entity_id", opts.entityId);
      if (opts?.isActive !== undefined) params.set("is_active", String(opts.isActive));
      const qs = params.toString();
      return client.request<RecurringOfferingRead[]>(
        `/api/v1/recurring-offerings${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    createRecurringOffering(input: CreateRecurringOfferingInput): Promise<RecurringOfferingRead> {
      return client.request<RecurringOfferingRead>("/api/v1/recurring-offerings", {
        method: "POST",
        json: input,
      });
    },

    updateRecurringOffering(
      id: string,
      patch: UpdateRecurringOfferingInput,
    ): Promise<RecurringOfferingRead> {
      return client.request<RecurringOfferingRead>(`/api/v1/recurring-offerings/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteRecurringOffering(id: string): Promise<void> {
      return client.request<void>(`/api/v1/recurring-offerings/${id}`, { method: "DELETE" });
    },

    listContracts(opts?: {
      signal?: AbortSignal;
      entityId?: string;
      status?: ContractStatusWire;
      limit?: number;
    }): Promise<ContractRead[]> {
      const params = new URLSearchParams();
      if (opts?.entityId) params.set("entity_id", opts.entityId);
      // The backend's query key is ``contract_status`` (FastAPI uses
      // the Python parameter name), not ``status``.
      if (opts?.status) params.set("contract_status", opts.status);
      if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<ContractRead[]>(`/api/v1/contracts${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getContract(id: string, opts?: { signal?: AbortSignal }): Promise<ContractRead> {
      return client.request<ContractRead>(`/api/v1/contracts/${id}`, {
        signal: opts?.signal,
      });
    },

    createContract(input: CreateContractInput): Promise<ContractRead> {
      return client.request<ContractRead>("/api/v1/contracts", {
        method: "POST",
        json: input,
      });
    },

    updateContract(id: string, patch: UpdateContractInput): Promise<ContractRead> {
      return client.request<ContractRead>(`/api/v1/contracts/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteContract(id: string): Promise<void> {
      return client.request<void>(`/api/v1/contracts/${id}`, { method: "DELETE" });
    },

    fulfillObligation(contractId: string, input: FulfillObligationInput): Promise<ContractRead> {
      return client.request<ContractRead>(`/api/v1/contracts/${contractId}/fulfill-obligation`, {
        method: "POST",
        json: input,
      });
    },

    listOaths(opts?: {
      signal?: AbortSignal;
      kind?: OathKindWire;
      status?: OathStatusWire;
      limit?: number;
    }): Promise<OathRead[]> {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      // Backend query key is ``oath_status``.
      if (opts?.status) params.set("oath_status", opts.status);
      if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<OathRead[]>(`/api/v1/oaths${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getOath(id: string, opts?: { signal?: AbortSignal }): Promise<OathRead> {
      return client.request<OathRead>(`/api/v1/oaths/${id}`, { signal: opts?.signal });
    },

    /**
     * Ciphertext of a sealed oath (owner-only, base64 — v1-033).
     * Decrypt in memory with the vault passphrase via
     * `decryptSealedPayloadB64` (the SealUnlock flow). Never
     * plaintext; non-sealed rows 409.
     */
    getOathSealedPayload(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<SealedPayloadRead> {
      return client.request<SealedPayloadRead>(`/api/v1/oaths/${id}/sealed-payload`, {
        signal: opts?.signal,
      });
    },

    createOath(input: CreateOathInput): Promise<OathRead> {
      return client.request<OathRead>("/api/v1/oaths", {
        method: "POST",
        json: input,
      });
    },

    updateOath(id: string, patch: UpdateOathInput): Promise<OathRead> {
      return client.request<OathRead>(`/api/v1/oaths/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteOath(id: string): Promise<void> {
      return client.request<void>(`/api/v1/oaths/${id}`, { method: "DELETE" });
    },

    listInitiations(opts?: {
      signal?: AbortSignal;
      tradition?: string;
      status?: InitiationStatusWire;
      limit?: number;
    }): Promise<InitiationRead[]> {
      const params = new URLSearchParams();
      if (opts?.tradition) params.set("tradition", opts.tradition);
      // Backend query key is ``init_status``.
      if (opts?.status) params.set("init_status", opts.status);
      if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<InitiationRead[]>(`/api/v1/initiations${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getInitiation(id: string, opts?: { signal?: AbortSignal }): Promise<InitiationRead> {
      return client.request<InitiationRead>(`/api/v1/initiations/${id}`, {
        signal: opts?.signal,
      });
    },

    /**
     * Ciphertext of a sealed initiation (owner-only, base64 —
     * v1-033). Decrypt in memory with the vault passphrase via
     * `decryptSealedPayloadB64` (the per-read SealUnlock flow).
     * Never plaintext; rows without ciphertext 409.
     */
    getInitiationSealedPayload(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<SealedPayloadRead> {
      return client.request<SealedPayloadRead>(`/api/v1/initiations/${id}/sealed-payload`, {
        signal: opts?.signal,
      });
    },

    createInitiation(input: CreateInitiationInput): Promise<InitiationRead> {
      return client.request<InitiationRead>("/api/v1/initiations", {
        method: "POST",
        json: input,
      });
    },

    updateInitiation(id: string, patch: UpdateInitiationInput): Promise<InitiationRead> {
      return client.request<InitiationRead>(`/api/v1/initiations/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteInitiation(id: string): Promise<void> {
      return client.request<void>(`/api/v1/initiations/${id}`, { method: "DELETE" });
    },

    listServitors(opts?: {
      signal?: AbortSignal;
      kind?: ServitorKindWire;
      status?: ServitorStatusWire;
      limit?: number;
    }): Promise<ServitorRead[]> {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      // Backend query key is ``servitor_status``.
      if (opts?.status) params.set("servitor_status", opts.status);
      if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<ServitorRead[]>(`/api/v1/servitors${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getServitor(id: string, opts?: { signal?: AbortSignal }): Promise<ServitorRead> {
      return client.request<ServitorRead>(`/api/v1/servitors/${id}`, {
        signal: opts?.signal,
      });
    },

    createServitor(input: CreateServitorInput): Promise<ServitorRead> {
      return client.request<ServitorRead>("/api/v1/servitors", {
        method: "POST",
        json: input,
      });
    },

    updateServitor(id: string, patch: UpdateServitorInput): Promise<ServitorRead> {
      return client.request<ServitorRead>(`/api/v1/servitors/${id}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteServitor(id: string): Promise<void> {
      return client.request<void>(`/api/v1/servitors/${id}`, { method: "DELETE" });
    },

    feedServitor(id: string, input: FeedServitorInput = {}): Promise<ServitorRead> {
      return client.request<ServitorRead>(`/api/v1/servitors/${id}/feed`, {
        method: "POST",
        json: input,
      });
    },

    listServitorTasks(
      servitorId: string,
      opts?: { signal?: AbortSignal; status?: ServitorTaskStatusWire },
    ): Promise<ServitorTaskRead[]> {
      const params = new URLSearchParams();
      // Backend query key is ``task_status``.
      if (opts?.status) params.set("task_status", opts.status);
      const qs = params.toString();
      return client.request<ServitorTaskRead[]>(
        `/api/v1/servitors/${servitorId}/tasks${qs ? `?${qs}` : ""}`,
        { signal: opts?.signal },
      );
    },

    createServitorTask(
      servitorId: string,
      input: CreateServitorTaskInput,
    ): Promise<ServitorTaskRead> {
      return client.request<ServitorTaskRead>(`/api/v1/servitors/${servitorId}/tasks`, {
        method: "POST",
        json: input,
      });
    },

    // NOTE the un-nested base path — task update/delete live at
    // /api/v1/servitor-tasks/{taskId}, not under /servitors.
    updateServitorTask(taskId: string, patch: UpdateServitorTaskInput): Promise<ServitorTaskRead> {
      return client.request<ServitorTaskRead>(`/api/v1/servitor-tasks/${taskId}`, {
        method: "PATCH",
        json: patch,
      });
    },

    deleteServitorTask(taskId: string): Promise<void> {
      return client.request<void>(`/api/v1/servitor-tasks/${taskId}`, { method: "DELETE" });
    },

    // ─── Family tree kinship (b108-2ha) ─────────────────────────────

    getFamilyTree(
      entityId: string,
      opts?: { signal?: AbortSignal; generations?: number },
    ): Promise<{
      probe_id: string;
      nodes: Array<{
        id: string;
        name: string;
        kind: string;
        generation: number;
        ancestor_profile: Record<string, unknown>;
      }>;
      edges: Array<{
        id: string;
        source_entity_id: string;
        target_entity_id: string;
        kind: "parent-of" | "sibling-of" | "spouse-of";
      }>;
    }> {
      const params = new URLSearchParams();
      if (opts?.generations !== undefined) {
        params.set("generations", String(opts.generations));
      }
      const qs = params.toString();
      return client.request(`/api/v1/entities/${entityId}/family-tree${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    addKinship(
      entityId: string,
      input: {
        target_entity_id: string;
        kind: "parent-of" | "sibling-of" | "spouse-of";
        notes?: string | null;
      },
    ): Promise<{
      id: string;
      source_entity_id: string;
      target_entity_id: string;
      kind: "parent-of" | "sibling-of" | "spouse-of";
      notes: string | null;
    }> {
      return client.request(`/api/v1/entities/${entityId}/kinship`, {
        method: "POST",
        json: input,
      });
    },

    removeKinship(aliasId: string): Promise<void> {
      return client.request<void>(`/api/v1/entities/kinship/${aliasId}`, {
        method: "DELETE",
      });
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
      return client.request<PracticeRecord>(`/api/v1/practices/${id}/archive`, { method: "POST" });
    },

    unarchivePractice(id: string): Promise<PracticeRecord> {
      return client.request<PracticeRecord>(`/api/v1/practices/${id}/unarchive`, {
        method: "POST",
      });
    },

    deletePractice(id: string): Promise<void> {
      return client.request<void>(`/api/v1/practices/${id}`, {
        method: "DELETE",
      });
    },

    completePractice(id: string, payload?: CompletionInput, opts?: { tz?: string }): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/complete${qs}`, {
        method: "POST",
        json: payload ?? {},
      });
    },

    skipPractice(id: string, payload?: CompletionInput, opts?: { tz?: string }): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/skip${qs}`, {
        method: "POST",
        json: payload ?? {},
      });
    },

    undoPracticeToday(id: string, opts?: { tz?: string }): Promise<void> {
      const tz = opts?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = `?tz=${encodeURIComponent(tz)}`;
      return client.request<void>(`/api/v1/practices/${id}/today${qs}`, {
        method: "DELETE",
      });
    },

    // ─── Practice Logs — body + banishing (B88) ──────────────────────

    createBodyPracticeSession(input: CreateBodyPracticeInput): Promise<BodyPracticeRecord> {
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
      return client.request<BodyPracticeRecord[]>(`/api/v1/practice/body${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    createBanishingLog(input: CreateBanishingLogInput): Promise<BanishingLogRecord> {
      return client.request<BanishingLogRecord>("/api/v1/practice/banishing", {
        method: "POST",
        json: input,
      });
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
      return client.request<PlanetarySquareWire[]>("/api/v1/magic-squares/planetary", {
        signal: opts?.signal,
      });
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

    getMagicSquare(id: string, opts?: { signal?: AbortSignal }): Promise<MagicSquareRecord> {
      return client.request<MagicSquareRecord>(`/api/v1/magic-squares/${id}`, {
        signal: opts?.signal,
      });
    },

    createMagicSquare(input: CreateMagicSquareInput): Promise<MagicSquareRecord> {
      return client.request<MagicSquareRecord>("/api/v1/magic-squares", {
        method: "POST",
        json: input,
      });
    },

    updateMagicSquare(id: string, input: UpdateMagicSquareInput): Promise<MagicSquareRecord> {
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
      return client.request<TalismanRecord[]>(`/api/v1/talismans${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
    },

    getTalisman(id: string, opts?: { signal?: AbortSignal }): Promise<TalismanRecord> {
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

    updateTalisman(id: string, input: UpdateTalismanInput): Promise<TalismanRecord> {
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

    sealTalisman(id: string, payload: TalismanSealPayload): Promise<TalismanRecord> {
      return client.request<TalismanRecord>(`/api/v1/talismans/${id}/seal`, {
        method: "POST",
        json: payload,
      });
    },

    unsealTalisman(id: string): Promise<TalismanUnsealResponse> {
      return client.request<TalismanUnsealResponse>(`/api/v1/talismans/${id}/unseal`, {
        method: "POST",
      });
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

    getCircle(id: string, opts?: { signal?: AbortSignal }): Promise<CircleRecord> {
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
      if (opts?.consecrated !== undefined) params.set("consecrated", String(opts.consecrated));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<ToolRecordWire[]>(`/api/v1/tools${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
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

    consecrateTool(id: string, payload: ConsecrateToolPayload): Promise<ToolRecordWire> {
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
      return client.request<void>(`/api/v1/tools/${toolId}/photos/${uploadId}`, {
        method: "DELETE",
      });
    },

    // ─── Phase 07 Workshop — Altars (B106) ──────────────────────────

    listAltars(opts?: {
      signal?: AbortSignal;
      is_permanent?: boolean;
      limit?: number;
    }): Promise<AltarRecordWire[]> {
      const params = new URLSearchParams();
      if (opts?.is_permanent !== undefined) params.set("is_permanent", String(opts.is_permanent));
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return client.request<AltarRecordWire[]>(`/api/v1/altars${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
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
      return client.request<VoceRecordWire[]>(`/api/v1/voces${qs ? `?${qs}` : ""}`, {
        signal: opts?.signal,
      });
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
      return client.request<VoceRecordingRecord>(`/api/v1/voces/${voceId}/recordings`, {
        method: "POST",
        json: input,
      });
    },

    removeVoceRecording(voceId: string, recordingId: string): Promise<void> {
      return client.request<void>(`/api/v1/voces/${voceId}/recordings/${recordingId}`, {
        method: "DELETE",
      });
    },

    // ── Audio attachments + local Whisper transcription (v1-012) ────

    getAudioAttachment(
      id: string,
      opts?: { signal?: AbortSignal },
    ): Promise<AudioAttachmentRecord> {
      return client.request<AudioAttachmentRecord>(`/api/v1/audio/${id}`, {
        signal: opts?.signal,
      });
    },

    /**
     * Queue local Whisper transcription for one attachment. 202 with
     * ``{queued: true}``; 403 when the instance gate or the user
     * opt-in gate is closed (distinct details); 409 when a transcript
     * already exists and ``force`` isn't set.
     */
    transcribeAudio(
      id: string,
      opts?: { force?: boolean; signal?: AbortSignal },
    ): Promise<TranscribeQueuedResponse> {
      const qs = opts?.force ? "?force=true" : "";
      return client.request<TranscribeQueuedResponse>(`/api/v1/audio/${id}/transcribe${qs}`, {
        method: "POST",
        signal: opts?.signal,
      });
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

    terminateAgentRun(runId: string): Promise<{ run_id: string; status: string }> {
      return client.request<{ run_id: string; status: string }>(`/api/v1/agents/runs/${runId}`, {
        method: "DELETE",
      });
    },

    reportAgentRunCost(
      runId: string,
      sample: AgentRunCostSampleInput,
    ): Promise<AgentRunCostSnapshot> {
      return client.request<AgentRunCostSnapshot>(`/api/v1/agents/runs/${runId}/cost`, {
        method: "POST",
        json: sample,
      });
    },

    queryAgentAudit(params?: {
      eventType?: string;
      limit?: number;
      offset?: number;
    }): Promise<AgentAuditQueryResponse> {
      const search = new URLSearchParams();
      if (params?.eventType) search.set("event_type", params.eventType);
      if (params?.limit !== undefined) search.set("limit", String(params.limit));
      if (params?.offset !== undefined) search.set("offset", String(params.offset));
      const query = search.toString();
      return client.request<AgentAuditQueryResponse>(
        `/api/v1/agents/audit${query ? `?${query}` : ""}`,
      );
    },

    getAgentCostSummary(window: AgentCostWindow = "month"): Promise<AgentCostSummaryResponse> {
      return client.request<AgentCostSummaryResponse>(
        `/api/v1/agents/costs/summary?window=${window}`,
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

    createAgentInstall(input: CreateAgentInstallInput): Promise<AgentInstallSnapshot> {
      return client.request<AgentInstallSnapshot>("/api/v1/agents/installs", {
        method: "POST",
        json: input,
      });
    },

    listAgentInstalls(): Promise<AgentInstallListResponse> {
      return client.request<AgentInstallListResponse>("/api/v1/agents/installs");
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

    readInstallMemory(installId: string, name: string): Promise<MemoryFileContent> {
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
      return client.request<RegistrySubmission>("/api/v1/registry/author/submissions", {
        method: "POST",
        json: input,
      });
    },

    listMySubmissions(): Promise<RegistrySubmissionListResponse> {
      return client.request<RegistrySubmissionListResponse>("/api/v1/registry/author/submissions");
    },

    getMySubmission(submissionId: string): Promise<RegistrySubmission> {
      return client.request<RegistrySubmission>(
        `/api/v1/registry/author/submissions/${encodeURIComponent(submissionId)}`,
      );
    },

    fileAdvisory(input: FileAdvisoryInput): Promise<RegistryAdvisory> {
      return client.request<RegistryAdvisory>("/api/v1/registry/author/advisories", {
        method: "POST",
        json: input,
      });
    },

    // ── Registry maintainer (H10 A5-A7) ───────────────────────────

    reviewQueue(): Promise<MaintainerQueueResponse> {
      return client.request<MaintainerQueueResponse>("/api/v1/registry/maintainer/queue");
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

    promotePlugin(pluginId: string, input: PromotePluginInput): Promise<Record<string, unknown>> {
      return client.request<Record<string, unknown>>(
        `/api/v1/registry/maintainer/plugins/${encodeURIComponent(pluginId)}/promote`,
        { method: "POST", json: input },
      );
    },

    // ── Magickal bundles — ADR-0011 (v1-011 backend · v1-020 wiring) ──

    /** Upload + validate + verify a ``.mbf`` — no writes. Multipart. */
    bundlesPreview(file: Blob, opts?: { signal?: AbortSignal }): Promise<BundlePreviewResponse> {
      const form = new FormData();
      form.append("file", file, fileName(file, "bundle.mbf"));
      return client.request<BundlePreviewResponse>("/api/v1/bundles/preview", {
        method: "POST",
        form,
        signal: opts?.signal,
      });
    },

    /** Commit a user-selected subset of items (piecemeal by design —
     *  omit ``selectedRefs`` to import everything). Multipart. */
    bundlesImport(file: Blob, selectedRefs?: string[]): Promise<BundleImportResponse> {
      const form = new FormData();
      form.append("file", file, fileName(file, "bundle.mbf"));
      if (selectedRefs !== undefined) {
        form.append("selected_refs", JSON.stringify(selectedRefs));
      }
      return client.request<BundleImportResponse>("/api/v1/bundles/import", {
        method: "POST",
        form,
      });
    },

    /** The vault's install records — attribution always present. */
    bundlesInstalled(opts?: { signal?: AbortSignal }): Promise<InstalledBundleListResponse> {
      return client.request<InstalledBundleListResponse>("/api/v1/bundles/installed", {
        signal: opts?.signal,
      });
    },

    /**
     * Uninstall an install record (v1-033). Removes the record and
     * NOTHING else: imported content (entities, templates, recipes)
     * stays in the vault — bundle removal is a tombstone, not an
     * erasure. The response says so explicitly.
     */
    bundleUninstall(id: string): Promise<BundleUninstallResponse> {
      return client.request<BundleUninstallResponse>(`/api/v1/bundles/installed/${id}`, {
        method: "DELETE",
      });
    },

    /** Build an ``.mbf`` from vault content of one type — returns the
     *  container bytes as a Blob for download. */
    bundlesExport(
      bundleType: string,
      opts?: { sign?: boolean; signal?: AbortSignal },
    ): Promise<Blob> {
      const params = new URLSearchParams({ type: bundleType });
      if (opts?.sign) params.set("sign", "true");
      return client.requestBlob(`/api/v1/bundles/export?${params.toString()}`, {
        signal: opts?.signal,
      });
    },

    /** The seven bundled content packages that ship with Theourgia. */
    bundledList(opts?: { signal?: AbortSignal }): Promise<BundledPackageListResponse> {
      return client.request<BundledPackageListResponse>("/api/v1/bundles/bundled", {
        signal: opts?.signal,
      });
    },

    /** Import one bundled package wholesale — the standard import
     *  path; opaque kinds are listed-not-imported and the response
     *  reports every item honestly. */
    bundledImport(slug: string): Promise<BundleImportResponse> {
      return client.request<BundleImportResponse>(
        `/api/v1/bundles/bundled/${encodeURIComponent(slug)}/import`,
        { method: "POST" },
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
      return client.request<DeletionScheduledRead>("/api/v1/me/account/delete", { method: "POST" });
    },

    reactivateAccount(): Promise<MeRead> {
      return client.request<MeRead>("/api/v1/me/account/reactivate", {
        method: "POST",
      });
    },

    listMyAudit(input: MyAuditQueryInput = {}): Promise<MyAuditListResponse> {
      const params = new URLSearchParams();
      if (input.kind && input.kind !== "all") params.set("kind", input.kind);
      if (input.action && input.action !== "all") params.set("action", input.action);
      if (input.time_range) params.set("time_range", input.time_range);
      if (typeof input.limit === "number") params.set("limit", String(input.limit));
      if (typeof input.offset === "number") params.set("offset", String(input.offset));
      const qs = params.toString();
      return client.request<MyAuditListResponse>(`/api/v1/me/audit${qs ? `?${qs}` : ""}`);
    },

    myAuditCsvUrl(input: MyAuditQueryInput = {}): string {
      const params = new URLSearchParams();
      if (input.kind && input.kind !== "all") params.set("kind", input.kind);
      if (input.action && input.action !== "all") params.set("action", input.action);
      if (input.time_range) params.set("time_range", input.time_range);
      const qs = params.toString();
      return `/api/v1/me/audit.csv${qs ? `?${qs}` : ""}`;
    },

    listMySessions(): Promise<MySessionsListResponse> {
      return client.request<MySessionsListResponse>("/api/v1/me/sessions");
    },

    revokeMySession(sessionId: string): Promise<void> {
      return client.request<void>(`/api/v1/me/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
    },

    revokeOtherSessions(): Promise<MySessionsListResponse> {
      return client.request<MySessionsListResponse>("/api/v1/me/sessions/revoke-others", {
        method: "POST",
      });
    },

    // ── Federation peer directory (v1-026) ───────────────────────

    listFederationPeers(opts?: { signal?: AbortSignal }): Promise<FederationPeerRead[]> {
      return client.request<FederationPeerRead[]>("/api/v1/federation/peers", {
        signal: opts?.signal,
      });
    },

    /**
     * Add a peer by URL. The backend verifies the URL by fetching its
     * ``/.well-known/theourgia/actor`` document; the capability token
     * in the response appears ONCE and is never listed again.
     */
    addFederationPeer(input: {
      base_url: string;
      label?: string | null;
    }): Promise<FederationPeerCreated> {
      return client.request<FederationPeerCreated>("/api/v1/federation/peers", {
        method: "POST",
        json: input,
      });
    },

    removeFederationPeer(peerId: string): Promise<void> {
      return client.request<void>(`/api/v1/federation/peers/${encodeURIComponent(peerId)}`, {
        method: "DELETE",
      });
    },

    // ── Mode A vault-key rotation (v1-027 · Phase 15 B5) ─────────

    /**
     * Start a vault-key rotation. The new active DEK exists as soon
     * as this resolves; the batched re-encryption sweep runs on the
     * worker. 409 when a rotation is already pending/running.
     */
    startKeyRotation(): Promise<KeyRotationStatusResponse> {
      return client.request<KeyRotationStatusResponse>("/api/v1/keys/rotate", {
        method: "POST",
      });
    },

    getKeyRotationStatus(): Promise<KeyRotationStatusResponse> {
      return client.request<KeyRotationStatusResponse>("/api/v1/keys/rotation-status");
    },

    listKeyRotationHistory(): Promise<KeyRotationHistoryResponse> {
      return client.request<KeyRotationHistoryResponse>("/api/v1/keys/history");
    },
  };
}

export type Api = ReturnType<typeof api>;
