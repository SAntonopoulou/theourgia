/**
 * TypeScript mirrors of the backend's Pydantic API schemas.
 *
 * Hand-curated and kept in sync with ``backend/theourgia/api/schemas.py``
 * plus the per-router schemas. When the backend stabilises and ships an
 * OpenAPI export, this file becomes the target for ``openapi-typescript``
 * generation.
 */

/** RFC 7807 problem-details response — every API error uses this shape. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  request_id?: string;
}

/** GET /healthz and /readyz response. */
export interface HealthStatus {
  status: "ok";
  checks?: Record<string, string>;
}

/** GET /api/v1/meta response. */
export interface Meta {
  instance_id: string;
  version: string;
  api_version: string;
  environment: "development" | "production" | "test";
  telemetry: "none" | string;
}

/**
 * Session shape returned by ``GET /api/v1/auth/session`` once that
 * endpoint lands. The frontend defines the contract; the backend will
 * follow.
 */
export interface Session {
  user_id: string;
  display_name: string;
  magickal_name: string | null;
  vault_id: string | null;
  expires_at: string; // ISO 8601
}

export type EntryType =
  // Phase 02 legacy
  | "observation"
  | "ritual"
  | "divination"
  | "synchronicity"
  | "capture"
  // Phase 04 expansions (mirrors backend theourgia.models.entries.EntryType)
  | "note"
  | "ritual_log"
  | "dream"
  | "working"
  | "magical_record"
  | "pathworking"
  | "scrying"
  | "body_practice"
  | "meeting_note"
  | "study_note"
  | "liber_resh"
  | "blog_post";

/** Single entry — wire format from ``GET /api/v1/entries``. */
export interface EntryRecord {
  id: string;
  title: string;
  type: EntryType;
  excerpt: string;
  glyph: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Entry detail — wire format from ``GET /api/v1/entries/{id}``.
 *
 * Extends `EntryRecord` with the full Tiptap-JSON body and the
 * visibility / publish state. List endpoints keep the lean
 * `EntryRecord` shape; the detail endpoint pays for the body bytes.
 *
 * Per the B99 design decision (extend with a separate detail record
 * rather than fattening `EntryRecord` everywhere). Visibility uses
 * the same `EntityVisibility` enum the rest of the surface uses
 * (Personal · Viewer · Hub · Public).
 */
export interface EntryDetailRecord extends EntryRecord {
  /** Tiptap doc serialised as JSON. Empty string for an empty draft. */
  body: string;
  /** Personal · Viewer · Hub · Public. */
  visibility: EntityVisibility;
  /** True if the body is sealed (client-side encrypted). */
  sealed: boolean;
  /** Set when the entry was published (null for drafts). */
  published_at: string | null;
}

/** Input for ``PATCH /api/v1/entries/{id}/body``. */
export interface UpdateEntryBodyInput {
  /** Tiptap doc serialised as JSON. */
  body: string;
}

/** Query for ``GET /api/v1/astro/chart``. */
export interface ChartRequestInput {
  /** Instant (ISO 8601). The backend treats naive datetimes as UTC. */
  when: string;
  latitude: number;
  longitude: number;
  zodiac?: "tropical" | "sidereal";
  house_system?: "placidus" | "whole-sign";
}

/** Single placement in a chart response. */
export interface ChartPlacementRead {
  body_id: string;
  body_name: string;
  glyph: string;
  tropical_longitude: number;
  tropical_sign: string;
  house: number;
  is_retrograde: boolean;
}

/** Houses block in a chart response. */
export interface ChartHousesRead {
  cusps: number[];
  ascendant: number;
  midheaven: number;
}

/** Aspect line in a chart response. */
export interface ChartAspectRead {
  body_a: string;
  body_b: string;
  kind: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
}

/** Response from ``GET /api/v1/astro/chart``. */
export interface ChartResponse {
  instant: string;
  julian_day: number;
  latitude: number;
  longitude: number;
  zodiac: string;
  house_system: string;
  placements: ChartPlacementRead[];
  houses: ChartHousesRead;
  aspects: ChartAspectRead[];
  attribution: string;
}

/** Input for ``POST /api/v1/entries``. */
export interface CreateEntryInput {
  title: string;
  type: EntryType;
  excerpt: string;
  glyph: string;
  body?: string;
  /** Personal · Viewer · Hub · Public. Defaults to "personal" server-side. */
  visibility?: EntityVisibility;
  /** Client-side-encrypted body. Defaults false. */
  sealed?: boolean;
}

/** Counts within a single time window. */
export interface EntryWindowCounts {
  total: number;
  by_type: Record<EntryType, number>;
}

/** Response of ``GET /api/v1/entries/stats``. */
export interface EntryStats {
  total: number;
  by_type: Record<EntryType, number>;
  this_week: EntryWindowCounts;
  last_week: EntryWindowCounts;
}

/** Response of ``GET /api/v1/users/me/settings/location``. */
export interface UserLocation {
  lat: number;
  lng: number;
}

/** Backend ``EntityKind`` enum (theourgia/models/entities.py). Phase
 *  02 legacy values (DEITY..OTHER) plus the Phase 05 expansions per
 *  `plan/05-magical-beings.md` §1 — 17 kinds total. The Entities
 *  surface UI groups these into the five function groups
 *  (Venerated · Approached · Intimate · Constructed · Other) — see
 *  `FUNCTION_GROUPS` in shared/KindFunctionFilter. */
export type EntityKind =
  // Phase 02 legacy
  | "deity"
  | "spirit"
  | "principle"
  | "place"
  | "object"
  | "other"
  // Phase 05 expansions
  | "god"
  | "goddess"
  | "daemon"
  | "angel"
  | "demon"
  | "saint"
  | "ancestor"
  | "beloved_dead"
  | "familiar"
  | "servitor"
  | "egregore";

/** Backend ``EntityRelationshipStatus`` (theourgia/models/entities.py).
 *  How the practitioner stands with this entity right now. Severed
 *  uses the care palette, not red. */
export type EntityRelationshipStatus =
  | "open"
  | "active"
  | "dormant"
  | "severed"
  | "contracted"
  | "observing";

/** Backend ``EntityVisibility`` (theourgia/models/entities.py). */
export type EntityVisibility = "personal" | "viewer" | "hub" | "public";

/** Backend ``EntityAliasKind`` (theourgia/models/entities.py). Five
 *  directed edge kinds; symmetric kinds (`same-as`, `syncretic-with`)
 *  are treated as bidirectional at query time. */
export type EntityAliasKind =
  | "same-as"
  | "aspect-of"
  | "aspect-includes"
  | "syncretic-with"
  | "epithet-of";

/** Single entity — wire format from ``GET /api/v1/entities``. */
export interface EntityRecord {
  id: string;
  name: string;
  kind: EntityKind;
  relationship_status?: EntityRelationshipStatus;
  visibility?: EntityVisibility;
  aliases: string[];
  glyph: string;
  description: string | null;
  tradition: string;
  created_at: string;
  updated_at: string;
}

/** Input for ``POST /api/v1/entities``. */
export interface CreateEntityInput {
  name: string;
  kind?: EntityKind;
  relationship_status?: EntityRelationshipStatus;
  visibility?: EntityVisibility;
  aliases?: string[];
  glyph?: string;
  description?: string | null;
  tradition?: string;
}

/** Single book — wire format from ``GET /api/v1/books``. */
export interface BookRecord {
  id: string;
  title: string;
  author: string;
  year: number | null;
  isbn: string;
  tradition: string;
  notes: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/** Input for ``POST /api/v1/books``. */
export interface CreateBookInput {
  title: string;
  author?: string;
  year?: number | null;
  isbn?: string;
  tradition?: string;
  notes?: string | null;
}

/** ``GET /api/v1/today/ledger`` — the four Phase-05 Today rail cards.
 *
 * Mirrors ``theourgia.api.routers.v1.today_ledger.TodayLedger``. Sealed
 * oath checkpoints render count-only; ``prompt`` is null on those.
 */
export interface TodayActivePractice {
  recurring_offering_id: string;
  entity_id: string;
  label: string;
  cadence: string;
  next_due_at: string | null;
  hours_until_due: number | null;
}

export interface TodayActivePracticesCard {
  practices: TodayActivePractice[];
  total_due_in_24h: number;
}

export type TodayObligationSide = "ours" | "theirs";

export interface TodayContractObligationDue {
  contract_id: string;
  contract_title: string;
  side: TodayObligationSide;
  obligation_id: string;
  description: string;
  due_at: string | null;
  status: string;
}

export interface TodayOathCheckpointDue {
  oath_id: string;
  oath_kind: string;
  recipient: string | null;
  due_at: string;
  sealed: boolean;
  prompt: string | null;
}

export interface TodayObligationsCard {
  contract_obligations: TodayContractObligationDue[];
  oath_checkpoints: TodayOathCheckpointDue[];
  sealed_checkpoint_count: number;
}

export interface TodayServitorFeedingDue {
  servitor_id: string;
  name: string;
  kind: string;
  feeding_cadence: string | null;
  last_fed_at: string | null;
}

export interface TodayServitorFeedingCard {
  feedings_due: TodayServitorFeedingDue[];
}

export interface TodayAttestationActivity {
  attestation_id: string;
  description: string;
  signer_label: string;
  role: string;
  signed_at: string;
}

export interface TodayAttestationActivityCard {
  activity: TodayAttestationActivity[];
}

export interface TodayLedger {
  active_practices: TodayActivePracticesCard;
  obligations: TodayObligationsCard;
  servitor_feeding: TodayServitorFeedingCard;
  attestation_activity: TodayAttestationActivityCard;
  generated_at: string;
}

// ─── Daily Practice Tracker (B87) ─────────────────────────────────

export type PracticeCadenceWire =
  | "daily"
  | "weekly"
  | "morning"
  | "before-sleep"
  | "dark-moon"
  | "custom";

export type CompletionStatusWire = "done" | "skip" | "miss";
export type TodayStatusWire = "done" | "skipped" | "pending";

export interface PracticeEntityBinding {
  id: string;
  name: string;
  glyph: string | null;
}

/** Mirrors `theourgia.api.routers.v1.practices.PracticeRead`. */
export interface PracticeRecord {
  id: string;
  name: string;
  cadence: PracticeCadenceWire;
  cadence_custom: string | null;
  cadence_human: string;
  intention: string | null;
  glyph: string | null;
  entity: PracticeEntityBinding | null;
  preferred_anchor: string | null;
  streak_label: string;
  archived_at: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors `theourgia.api.routers.v1.practices.PracticeTodayView`. */
export interface PracticeTodayView {
  id: string;
  name: string;
  cadence_human: string;
  intention: string | null;
  entity: PracticeEntityBinding | null;
  status: TodayStatusWire;
  streak: number;
  streak_label: string;
  history: CompletionStatusWire[];
}

export interface PracticesToday {
  civil_date: string;
  practices: PracticeTodayView[];
}

export interface CreatePracticeInput {
  name: string;
  cadence: PracticeCadenceWire;
  cadence_custom?: string | null;
  intention?: string | null;
  glyph?: string | null;
  linked_entity_id?: string | null;
  preferred_anchor?: string | null;
  streak_label?: string;
}

export type UpdatePracticeInput = Partial<CreatePracticeInput>;

export interface CompletionInput {
  note?: string | null;
  linked_entry_id?: string | null;
  civil_date?: string | null;
}

// ─── Practice Logs (B88 wire-up: composes existing endpoints) ──────

export type BodyPracticeKindWire = "asana" | "pranayama" | "other";

export interface BodyPracticeRecord {
  id: string;
  kind: BodyPracticeKindWire;
  posture_or_pattern: string;
  started_at: string;
  duration_seconds: number;
  breaks_count: number;
  observation_notes: string | null;
  body_snapshot_id: string | null;
  entry_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBodyPracticeInput {
  kind?: BodyPracticeKindWire;
  posture_or_pattern: string;
  started_at?: string | null;
  duration_seconds: number;
  breaks_count?: number;
  observation_notes?: string | null;
  body_snapshot_id?: string | null;
  entry_id?: string | null;
}

export type BanishingMethodWire =
  | "lbrp"
  | "star_ruby"
  | "simple_ground"
  | "breath"
  | "water"
  | "salt"
  | "bell"
  | "incense"
  | "khephra"
  | "other";

export interface BanishingLogRecord {
  id: string;
  method: BanishingMethodWire;
  method_label: string | null;
  performed_at: string;
  duration_seconds: number | null;
  state_before: string | null;
  state_after: string | null;
  notes: string | null;
  correspondences: Record<string, unknown>;
  entry_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBanishingLogInput {
  method: BanishingMethodWire;
  method_label?: string | null;
  performed_at?: string | null;
  duration_seconds?: number | null;
  state_before?: string | null;
  state_after?: string | null;
  notes?: string | null;
  correspondences?: Record<string, unknown> | null;
  entry_id?: string | null;
}

// ── Phase 07 Workshop (B103-B107) ────────────────────────────────────

export type SigilModeWire =
  | "spare"
  | "kamea"
  | "rose_cross"
  | "pythagorean"
  | "hebrew"
  | "greek"
  | "hashed"
  | "harmonograph"
  | "formula"
  | "freeform"
  | "image";

export type SigilPurposeWire =
  | "workshop_draft"
  | "consecrated"
  | "gift"
  | "personal_study";

export interface SigilRecord {
  id: string;
  owner_id: string | null;
  title: string;
  intention: string;
  mode: SigilModeWire;
  parameters: Record<string, unknown>;
  svg: string;
  seed: string | null;
  purpose: SigilPurposeWire;
  citation: string | null;
  notes: string | null;
  linked_entity_id: string | null;
  linked_working_entry_id: string | null;
  parent_sigil_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSigilInput {
  title: string;
  intention: string;
  mode: SigilModeWire;
  parameters?: Record<string, unknown>;
  svg: string;
  seed?: string | null;
  purpose?: SigilPurposeWire;
  citation?: string | null;
  notes?: string | null;
  linked_entity_id?: string | null;
  linked_working_entry_id?: string | null;
}

export interface UpdateSigilInput {
  title?: string;
  purpose?: SigilPurposeWire;
  citation?: string | null;
  notes?: string | null;
  linked_entity_id?: string | null;
  linked_working_entry_id?: string | null;
}

export interface PlanetarySquareWire {
  planet: "saturn" | "jupiter" | "mars" | "sun" | "venus" | "mercury" | "moon";
  name: string;
  order: number;
  magic_constant: number;
  cells: number[][];
  citation: string;
}

export interface MagicSquareRecord {
  id: string;
  owner_id: string | null;
  name: string;
  order: number;
  cells: number[][];
  attribution: string | null;
  is_magic: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMagicSquareInput {
  name: string;
  order: number;
  cells: number[][];
  attribution?: string | null;
}

export interface UpdateMagicSquareInput {
  name?: string;
  cells?: number[][];
  attribution?: string | null;
}

export type EncryptionModeWire = "none" | "sealed";

export interface TalismanRecord {
  id: string;
  owner_id: string | null;
  name: string;
  purpose: string;
  front_svg: string | null;
  back_svg: string | null;
  components: Record<string, unknown> | null;
  materials_notes: string | null;
  linked_election: Record<string, unknown> | null;
  linked_consecration_working_id: string | null;
  encryption_mode: EncryptionModeWire;
  sealed: boolean;
  encrypted_payload_b64: string | null;
  encryption_iv_b64: string | null;
  parent_talisman_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTalismanInput {
  name: string;
  purpose: string;
  front_svg: string;
  back_svg: string;
  components?: Record<string, unknown>;
  materials_notes?: string | null;
  linked_election?: Record<string, unknown> | null;
  linked_consecration_working_id?: string | null;
}

export interface UpdateTalismanInput {
  name?: string;
  purpose?: string;
  materials_notes?: string | null;
  linked_election?: Record<string, unknown> | null;
  linked_consecration_working_id?: string | null;
}

export interface TalismanSealPayload {
  encrypted_payload_b64: string;
  encryption_iv_b64: string;
}

export interface TalismanUnsealResponse {
  encrypted_payload_b64: string;
  encryption_iv_b64: string;
}

export type CompassTraditionWire =
  | "archangels"
  | "greek_winds"
  | "watchtowers"
  | "vedic_dikpalas"
  | "custom";

export interface CircleRecord {
  id: string;
  owner_id: string | null;
  name: string;
  purpose: string;
  diameter_m: number;
  rings: Array<Record<string, unknown>>;
  compass_tradition: CompassTraditionWire;
  compass_points: Record<string, unknown>;
  centre_element: Record<string, unknown>;
  citation: string | null;
  parent_circle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCircleInput {
  name: string;
  purpose: string;
  diameter_m?: number;
  rings: Array<Record<string, unknown>>;
  compass_tradition: CompassTraditionWire;
  compass_points: Record<string, unknown>;
  centre_element: Record<string, unknown>;
  citation?: string | null;
}

export interface UpdateCircleInput {
  name?: string;
  purpose?: string;
  diameter_m?: number;
  rings?: Array<Record<string, unknown>>;
  compass_tradition?: CompassTraditionWire;
  compass_points?: Record<string, unknown>;
  centre_element?: Record<string, unknown>;
  citation?: string | null;
}

export interface PresetCircle {
  slug: string;
  name: string;
  purpose: string;
  diameter_m: number;
  rings: Array<Record<string, unknown>>;
  compass_tradition: CompassTraditionWire;
  compass_points: Record<string, string>;
  centre_element: Record<string, unknown>;
  citation: string;
}

export type ToolKindWire =
  | "athame"
  | "wand"
  | "chalice"
  | "pentacle"
  | "censer"
  | "bell"
  | "sword"
  | "lamp"
  | "mirror"
  | "bowl"
  | "statue"
  | "robe"
  | "cingulum"
  | "other";

export interface ToolRecordWire {
  id: string;
  owner_id: string | null;
  name: string;
  kind: ToolKindWire;
  description: string | null;
  materials: string[];
  dimensions: Record<string, unknown>;
  photo_upload_ids: string[];
  provenance: string | null;
  acquisition_date: string | null;
  consecration_date: string | null;
  consecration_working_entry_id: string | null;
  current_location: string | null;
  is_consecrated: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateToolInput {
  name: string;
  kind: ToolKindWire;
  description?: string | null;
  materials?: string[];
  dimensions?: Record<string, unknown>;
  provenance?: string | null;
  acquisition_date?: string | null;
  current_location?: string | null;
}

export interface UpdateToolInput {
  name?: string;
  kind?: ToolKindWire;
  description?: string | null;
  materials?: string[];
  dimensions?: Record<string, unknown>;
  provenance?: string | null;
  acquisition_date?: string | null;
  current_location?: string | null;
}

export interface ConsecrateToolPayload {
  consecration_working_entry_id: string;
  consecration_date: string;
}

export interface AltarRecordWire {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  tool_ids: string[];
  arrangement_diagram_svg: string | null;
  photo_upload_ids: string[];
  is_permanent: boolean;
  linked_working_entry_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateAltarInput {
  name: string;
  description?: string | null;
  tool_ids?: string[];
  arrangement_diagram_svg?: string | null;
  is_permanent?: boolean;
  linked_working_entry_ids?: string[];
}

export interface UpdateAltarInput {
  name?: string;
  description?: string | null;
  tool_ids?: string[];
  arrangement_diagram_svg?: string | null;
  is_permanent?: boolean;
  linked_working_entry_ids?: string[];
}

export type SourceScriptWire =
  | "greek"
  | "hebrew"
  | "latin"
  | "coptic"
  | "arabic"
  | "sanskrit"
  | "custom";

export interface VoceRecordingRecord {
  id: string;
  voce_id: string;
  audio_attachment_id: string;
  duration_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoceRecordWire {
  id: string;
  owner_id: string | null;
  name: string;
  source_text: string;
  source_script: SourceScriptWire;
  transliteration: string | null;
  ipa: string | null;
  source_citation: string;
  planetary_associations: string[];
  elemental_associations: string[];
  linked_entity_ids: string[];
  forked_from_bundled_id: string | null;
  recordings: VoceRecordingRecord[];
  created_at: string;
  updated_at: string;
}

export interface CreateVoceInput {
  name: string;
  source_text: string;
  source_script: SourceScriptWire;
  transliteration?: string | null;
  ipa?: string | null;
  source_citation: string;
  planetary_associations?: string[];
  elemental_associations?: string[];
  linked_entity_ids?: string[];
}

export interface UpdateVoceInput {
  name?: string;
  source_text?: string;
  source_script?: SourceScriptWire;
  transliteration?: string | null;
  ipa?: string | null;
  source_citation?: string;
  planetary_associations?: string[];
  elemental_associations?: string[];
  linked_entity_ids?: string[];
}

export interface BundledVoce {
  id: string;
  name: string;
  source_text: string;
  source_script: SourceScriptWire;
  transliteration: string | null;
  ipa: string | null;
  source_citation: string;
  planetary_associations: string[];
  elemental_associations: string[];
}

export interface CreateVoceRecordingInput {
  audio_attachment_id: string;
  duration_seconds: number;
  notes?: string | null;
}


// ── Phase 16 · agents (H10 C-cluster) ───────────────────────────────────

export type AgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "halted"
  | "errored";

export interface AgentRunCostSnapshot {
  tokens_in: number;
  tokens_out: number;
  tokens_cache: number;
  tokens_fresh: number;
  tokens_resume: number;
  cost_usd: string;
  reservation_usd: string;
  remaining_usd: string;
  over_reservation: boolean;
}

export interface AgentRunSnapshot {
  run_id: string;
  session_token: string;
  status: AgentRunStatus;
  started_at: string;
  ended_at: string | null;
  returncode: number | null;
  reservation_usd: string;
  cost: AgentRunCostSnapshot;
}

export interface StartAgentRunInput {
  install_id: string;
  agent_slug: string;
  task_text: string;
  granted_caps: string[];
  scope_id: string;
  monthly_cap_usd: string;
  month_spent_usd?: string;
  recent_run_cost_usd?: string[];
  api_key_plaintext?: string | null;
}

export interface AgentRunCostSampleInput {
  tokens_in?: number;
  tokens_out?: number;
  tokens_cache?: number;
  tokens_fresh?: number;
  tokens_resume?: number;
  cost_usd: string;
}

export type AgentAuditEventType =
  | "mcp.tools_list"
  | "mcp.tools_call"
  | "mcp.capability_denied"
  | "run.started"
  | "run.completed"
  | "run.halted"
  | "run.errored"
  | "cap.refused_at_wake"
  | "cap.halted_at_spend";

export interface AgentAuditEvent {
  vault_did: string;
  event_type: AgentAuditEventType;
  happened_at: string;
  run_id: string | null;
  install_id: string | null;
  tool_name: string | null;
  arguments_json: Record<string, unknown> | null;
  allowed: boolean;
  filtered_count: number;
  detail: string | null;
}

export interface AgentAuditQueryResponse {
  vault_did: string;
  limit: number;
  offset: number;
  events: AgentAuditEvent[];
}


// ── Registry (H10 A-cluster · marketplace browse) ───────────────────────

export type RegistryPluginTier = "official" | "community" | "unverified";

export interface RegistryPluginCard {
  id: string;
  name: string;
  author_did: string;
  author_display_name: string;
  description: string;
  tier: RegistryPluginTier | string;
  homepage: string | null;
  updated_at: string;
  tombstoned: boolean;
}

export interface RegistryPluginListResponse {
  plugins: RegistryPluginCard[];
}

export interface RegistryAuthorRead {
  did: string;
  display_name: string;
  homepage: string | null;
  plugin_count: number;
}


// ── Agent installs (Phase 16 lifecycle) ─────────────────────────────────

export type AgentInstallState = "inactive" | "active" | "paused" | "cost_capped";

export interface AgentInstallSnapshot {
  id: string;
  vault_id: string;
  agent_id: string;
  display_name: string;
  kind: string;
  state: AgentInstallState;
  monthly_cost_cap_usd: string;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentInstallListResponse {
  vault_id: string;
  installs: AgentInstallSnapshot[];
}

export interface CreateAgentInstallInput {
  agent_id: string;
  display_name: string;
  kind: string;
  monthly_cost_cap_usd: string;
}


export interface MemoryFile {
  name: string;
  size_bytes: number;
  modified_at: number;
}

export interface MemoryListResponse {
  files: MemoryFile[];
}

export interface MemoryFileContent {
  name: string;
  body: string;
  size_bytes: number;
}


// ── Registry author submissions (H10 A2-A4 + A8) ────────────────────────

export type RegistrySubmissionStatus =
  | "pending_review"
  | "under_review"
  | "changes_requested"
  | "accepted_community"
  | "accepted_official"
  | "rejected"
  | "withdrawn";

export interface RegistrySubmission {
  id: string;
  plugin_id: string;
  plugin_name: string;
  version: string;
  status: RegistrySubmissionStatus | string;
  license_spdx: string;
  submitted_at: string;
  decided_at: string | null;
}

export interface RegistrySubmissionListResponse {
  submissions: RegistrySubmission[];
}

export interface SubmitPluginInput {
  name: string;
  version: string;
  license_spdx: string;
  description?: string;
  homepage?: string | null;
  source_url: string;
  signature_base64: string;
  manifest?: Record<string, unknown>;
  capabilities?: string[];
  target_tier?: string;
}

export interface FileAdvisoryInput {
  plugin_id: string;
  severity: "low" | "medium" | "high";
  affected_version_range: string;
  body: string;
  remediation_version?: string | null;
}

export interface RegistryAdvisory {
  id: string;
  plugin_id: string;
  severity: string;
  affected_version_range: string;
  body: string;
  remediation_version: string | null;
  filed_at: string;
  filed_by_author_did: string;
  published_at: string | null;
}
