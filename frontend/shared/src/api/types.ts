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
