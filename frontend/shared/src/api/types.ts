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

export type EntryType = "observation" | "ritual" | "divination" | "synchronicity" | "capture";

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

/** Input for ``POST /api/v1/entries``. */
export interface CreateEntryInput {
  title: string;
  type: EntryType;
  excerpt: string;
  glyph: string;
  body?: string;
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
