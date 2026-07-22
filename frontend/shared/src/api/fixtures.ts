/**
 * Built-in fixtures for mock-mode ApiClient.
 *
 * Surfaces in dev should call ``new ApiClient({ mock: true, fixtureFor:
 * defaultFixtures })`` to get realistic-shaped data without a backend
 * connection.
 */

import { ApiError, NotFoundError } from "./errors.js";
import type {
  AltarRecordWire,
  BookRecord,
  BundleImportItemResultWire,
  BundledPackageRead,
  BundledVoce,
  CastHoraryInput,
  CircleRecord,
  ContractRead,
  CreateAltarInput,
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
  CreateRecurringOfferingInput,
  CreateServitorInput,
  CreateServitorTaskInput,
  CreateSigilInput,
  CreateTalismanInput,
  CreateToolInput,
  CreateVoceInput,
  EndScryingSessionInput,
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
  FulfillObligationInput,
  HealthStatus,
  HoraryReadingRecord,
  InitiationRead,
  InstalledBundleRead,
  KeyRotationCurrentKey,
  KeyRotationHistoryItem,
  KeyRotationRead,
  KeyRotationStatusResponse,
  MagicSquareRecord,
  Meta,
  OathRead,
  OfferingRead,
  PendulumReadingRecord,
  PlanetarySquareWire,
  PresetCircle,
  Problem,
  RecurringOfferingRead,
  ScryingSessionRecord,
  SearchEntriesResponse,
  ServitorRead,
  ServitorTaskRead,
  Session,
  SigilRecord,
  StartScryingSessionInput,
  TalismanRecord,
  TodayLedger,
  ToolRecordWire,
  UpdateContractInput,
  UpdateInitiationInput,
  UpdateOathInput,
  UpdateOfferingInput,
  UpdateRecurringOfferingInput,
  UpdateServitorInput,
  UpdateServitorTaskInput,
  VoceRecordWire,
} from "./types.js";

/**
 * Body store for `getEntryDetail` / `updateEntryBody` fixtures. Keyed
 * by entry id. Empty default means "empty draft" — the editor mounts
 * `EMPTY_DOC` and an auto-save round-trips.
 */
const ENTRY_BODIES: Map<string, string> = new Map();

/**
 * Monotonic suffix for created-entry ids. `Date.now()` alone collides
 * when two creates land in the same millisecond, which made a fresh
 * entry inherit a previous entry's meta (sealed!) state (v1-033).
 */
let ENTRY_ID_SEQ = 0;

/**
 * Per-entry visibility + sealed + published_at + tag state for the
 * detail/PATCH fixtures. Defaults: personal · not-sealed · not-published
 * · untagged.
 */
type EntryMeta = Pick<
  EntryDetailRecord,
  "visibility" | "sealed" | "published_at" | "tags" | "tradition_tags" | "publish_on_death"
>;
const ENTRY_META: Map<string, EntryMeta> = new Map();

/**
 * Sealed-envelope store (v1-033). One opaque envelope string per
 * sealed row, keyed by id — set by the seal / sealed-create fixtures,
 * read back (base64) by the ``/sealed-payload`` fixtures. Mirrors the
 * backend: the plaintext is gone the moment the envelope lands.
 */
const ENTRY_SEALED: Map<string, string> = new Map();
const OATH_SEALED: Map<string, string> = new Map();
const INITIATION_SEALED: Map<string, string> = new Map();

/**
 * Seeded sealed fixture rows predate the payload store — hand back a
 * syntactically valid envelope that no passphrase decrypts, which is
 * exactly what a wrong-passphrase attempt looks like. Mock mode stays
 * honest: nothing plaintext ever comes back for a sealed row.
 */
const UNDECRYPTABLE_ENVELOPE = JSON.stringify({
  v: 1,
  iv: "AAAAAAAAAAAAAAAA",
  ct: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
});

function entryMeta(id: string): EntryMeta {
  return (
    ENTRY_META.get(id) ?? {
      visibility: "personal",
      sealed: false,
      published_at: null,
      tags: [],
      tradition_tags: [],
      publish_on_death: false,
    }
  );
}

/**
 * Compose an `EntryDetailRecord` from a lean entry + the body store.
 * Used by the GET `/entries/{id}` + PATCH `/entries/{id}/body` +
 * POST `/entries/{id}/publish` fixture handlers.
 */
function entryDetail(e: EntryRecord, over: Partial<EntryDetailRecord> = {}): EntryDetailRecord {
  return {
    ...e,
    body: ENTRY_BODIES.get(e.id) ?? "",
    ...entryMeta(e.id),
    ...over,
  };
}

/**
 * Version-history store (v1-028), keyed by entry id, oldest-first.
 * Mirrors backend semantics: restore pushes the CURRENT state as a
 * new revision before applying the old content (never destructive).
 */
const ENTRY_REVISIONS: Map<string, EntryRevisionRead[]> = new Map();

function tiptapDoc(...paragraphs: string[]): string {
  return JSON.stringify({
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  });
}

/** Plaintext excerpt of a Tiptap-JSON body — mirrors the backend's. */
function revisionExcerpt(body: string | null): string {
  if (!body) return "";
  let text = body;
  try {
    const doc = JSON.parse(body) as unknown;
    const parts: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const child of node) walk(child);
      } else if (node && typeof node === "object") {
        const n = node as { text?: unknown; content?: unknown };
        if (typeof n.text === "string") parts.push(n.text);
        walk(n.content);
      }
    };
    walk(doc);
    text = parts.join(" ");
  } catch {
    // Legacy prose body — excerpt the raw string.
  }
  const collapsed = text.split(/\s+/).filter(Boolean).join(" ");
  return collapsed.length <= 240 ? collapsed : `${collapsed.slice(0, 239).trimEnd()}…`;
}

function toRevisionListItem(rev: EntryRevisionRead): EntryRevisionListItem {
  return {
    id: rev.id,
    revision_number: rev.revision_number,
    created_at: rev.created_at,
    title: rev.title,
    body_excerpt: revisionExcerpt(rev.body),
  };
}

/** Seed entry "1" with a browsable history (+ a current body so the
 * pre-restore snapshot of the current state is never empty). */
function seedEntryRevisions(): void {
  if (ENTRY_REVISIONS.size > 0) return;
  if (!ENTRY_BODIES.has("1")) {
    ENTRY_BODIES.set(
      "1",
      tiptapDoc(
        "The taper at the eastern station burned through the entire opening invocation without flickering.",
        "No draught reached the altar; the flame stood like a spearpoint.",
        "Closed with the license to depart; the wax pooled clean.",
      ),
    );
  }
  ENTRY_REVISIONS.set("1", [
    {
      id: "rev-1",
      revision_number: 1,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      title: "Candle observation (draft)",
      body: tiptapDoc("First note: the taper burned steadily during the opening."),
      edit_summary: null,
    },
    {
      id: "rev-2",
      revision_number: 2,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      title: "Candle held its flame",
      body: tiptapDoc(
        "The taper at the eastern station burned through the entire opening invocation.",
      ),
      edit_summary: null,
    },
    {
      id: "rev-3",
      revision_number: 3,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      title: "Candle held its flame",
      body: tiptapDoc(
        "The taper at the eastern station burned through the entire opening invocation without flickering.",
        "No draught reached the altar; the flame stood like a spearpoint.",
      ),
      edit_summary: "Before publish",
    },
  ]);
}

const NOW_ISO = new Date().toISOString();
const FIVE_MIN_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const HEALTH: HealthStatus = { status: "ok" };
const READYZ: HealthStatus = { status: "ok", checks: { database: "ok" } };

const META: Meta = {
  instance_id: "dev.theourgia.com",
  version: "0.0.0-dev",
  api_version: "v1",
  environment: "development",
  telemetry: "none",
};

const SESSION: Session = {
  user_id: "demo-soror-eva",
  display_name: "Practitioner",
  magickal_name: "Practitioner",
  vault_id: "demo-vault",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const MOCK_LOCATION = { lat: 51.4769, lng: 0 };

// Wellbeing crisis-aware nudge (v1-010). Opt-in OFF by default — the
// mock mirrors the backend contract: resources only when enabled,
// show=false while opted out or muted, mood data never consulted.
// Resource entries mirror backend/theourgia/core/wellbeing/resources.py
// and stay pending maintainer review (Sacred Well Directory rule).
const MOCK_WELLBEING = { enabled: false, muted: false };
const WELLBEING_RESOURCES = [
  {
    region: "international",
    name: "IASP Crisis Centres directory",
    url: "https://www.iasp.info/resources/Crisis_Centres/",
  },
  {
    region: "international",
    name: "Find a Helpline",
    url: "https://findahelpline.com",
  },
];

function wellbeingNudgeRead() {
  return {
    enabled: MOCK_WELLBEING.enabled,
    show: false,
    resources: MOCK_WELLBEING.enabled ? [...WELLBEING_RESOURCES] : [],
  };
}

const IN_4_HOURS = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
const IN_18_HOURS = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const SIX_DAYS_AGO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

function todayLedger(): TodayLedger {
  return {
    active_practices: {
      practices: [
        {
          recurring_offering_id: "ro1",
          entity_id: "e-hekate",
          label: "Crossroads candle for Hekate",
          cadence: "Every dark moon",
          next_due_at: IN_4_HOURS,
          hours_until_due: 4,
        },
        {
          recurring_offering_id: "ro2",
          entity_id: "e-brigid",
          label: "Imbolc milk-pour for Brigid",
          cadence: "Weekly · Sundays",
          next_due_at: IN_18_HOURS,
          hours_until_due: 18,
        },
      ],
      total_due_in_24h: 2,
    },
    obligations: {
      contract_obligations: [
        {
          contract_id: "c1",
          contract_title: "Beltane Pact with Brigid, 2026",
          side: "ours",
          obligation_id: "ob1",
          description: "Pour milk at sunset before the equinox.",
          due_at: IN_4_HOURS,
          status: "open",
        },
      ],
      oath_checkpoints: [
        {
          oath_id: "o1",
          oath_kind: "discipline",
          recipient: null,
          due_at: IN_18_HOURS,
          sealed: false,
          prompt: "Three pages of Liber Resh memorisation due.",
        },
      ],
      sealed_checkpoint_count: 2,
    },
    servitor_feeding: {
      feedings_due: [
        {
          servitor_id: "s1",
          name: "The Threshold Guardian",
          kind: "Servitor",
          feeding_cadence: "Every 7 days",
          last_fed_at: SIX_DAYS_AGO,
        },
      ],
    },
    attestation_activity: {
      activity: [
        {
          attestation_id: "a1",
          description: "Sample attestation for mock-mode preview.",
          signer_label: "Sample signer",
          role: "witness",
          signed_at: TWO_DAYS_AGO,
        },
      ],
    },
    generated_at: NOW_ISO,
  };
}

const BOOKS: BookRecord[] = [
  {
    id: "b1",
    title: "Three Books of Occult Philosophy",
    author: "Heinrich Cornelius Agrippa",
    year: 1533,
    isbn: "",
    tradition: "hermetic",
    notes: "Foundational synthesis of natural, celestial, and ceremonial magic.",
    created_at: TWO_HOURS_AGO,
    updated_at: TWO_HOURS_AGO,
  },
  {
    id: "b2",
    title: "The Picatrix (Ghāyat al-Ḥakīm)",
    author: "Anonymous (Pseudo-al-Majrīṭī)",
    year: 1000,
    isbn: "",
    tradition: "hermetic",
    notes: "Andalusian translation; the medieval West's primary source for talismanic magic.",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];

const ENTRIES: EntryRecord[] = [
  {
    id: "1",
    title: "Candle held its flame",
    type: "observation",
    excerpt:
      "The taper at the eastern station burned through the entire opening invocation without flickering.",
    glyph: "candle",
    created_at: FIVE_MIN_AGO,
    updated_at: FIVE_MIN_AGO,
  },
  {
    id: "2",
    title: "Mercury retrograde station",
    type: "synchronicity",
    excerpt: "Three correspondents wrote independently about lost packages.",
    glyph: "star",
    created_at: TWO_HOURS_AGO,
    updated_at: TWO_HOURS_AGO,
  },
  {
    id: "3",
    title: "Geomancy: Acquisitio in House X",
    type: "divination",
    excerpt: "Querent: the Phase 02 work. Reading: Acquisitio → Populus.",
    glyph: "divination",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];

function problem(status: number, title: string, detail?: string): Problem {
  const result: Problem = { type: "about:blank", title, status };
  if (detail !== undefined) result.detail = detail;
  return result;
}

const ALL_ENTRY_TYPES: EntryType[] = [
  "observation",
  "ritual",
  "divination",
  "synchronicity",
  "capture",
];

function emptyByType(): Record<EntryType, number> {
  return {
    observation: 0,
    ritual: 0,
    divination: 0,
    synchronicity: 0,
    capture: 0,
    note: 0,
    ritual_log: 0,
    dream: 0,
    working: 0,
    magical_record: 0,
    pathworking: 0,
    scrying: 0,
    body_practice: 0,
    meeting_note: 0,
    study_note: 0,
    liber_resh: 0,
    blog_post: 0,
  };
}

function computeStats(): EntryStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const all = emptyByType();
  const thisWeek = emptyByType();
  const lastWeek = emptyByType();
  let totalAll = 0;
  let totalThis = 0;
  let totalLast = 0;

  for (const e of ENTRIES) {
    const ms = new Date(e.created_at).getTime();
    all[e.type] += 1;
    totalAll += 1;
    if (ms >= weekAgo) {
      thisWeek[e.type] += 1;
      totalThis += 1;
    } else if (ms >= twoWeeksAgo) {
      lastWeek[e.type] += 1;
      totalLast += 1;
    }
  }
  // Type assertion: ALL_ENTRY_TYPES enumerates the closed union; tsc can verify.
  void ALL_ENTRY_TYPES;
  return {
    total: totalAll,
    by_type: all,
    this_week: { total: totalThis, by_type: thisWeek },
    last_week: { total: totalLast, by_type: lastWeek },
  };
}

interface ParsedInit {
  method: string;
  body: unknown;
}

function parseInit(init?: RequestInit): ParsedInit {
  const method = (init?.method ?? "GET").toUpperCase();
  let body: unknown = undefined;
  if (typeof init?.body === "string" && init.body.length > 0) {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }
  return { method, body };
}

/**
 * Default fixture provider. Returns the canonical response for each
 * known endpoint. Mutates an in-memory entries array for POST/DELETE
 * so the mock feels alive within a single page session.
 */
export function defaultFixtures(path: string, init?: RequestInit): unknown {
  const { method, body } = parseInit(init);

  if (path === "/healthz") return HEALTH;
  if (path === "/readyz") return READYZ;
  if (path === "/api/v1/meta") return META;
  if (path === "/api/v1/admin/health") {
    const probes = [
      { id: "database", label: "Database", status: "operational", status_label: "Operational", detail: "PostgreSQL reachable" },
      { id: "migrations", label: "Migrations", status: "operational", status_label: "Up to date", detail: "head 0085" },
      { id: "backups", label: "Backups", status: "operational", status_label: "Healthy", detail: "last success 3h ago" },
      { id: "federation", label: "Federation", status: "pending", status_label: "Disabled", detail: "transport off (opt-in)" },
      { id: "plugins", label: "Plugins", status: "operational", status_label: "Loaded", detail: "0 active" },
      { id: "storage", label: "Object storage", status: "operational", status_label: "LOCAL", detail: "backend=local" },
      { id: "agents", label: "AI agents", status: "pending", status_label: "Disabled", detail: "no daemon configured (opt-in)" },
    ];
    return {
      probes,
      live_count: probes.filter((p) => p.status !== "pending").length,
      total_count: probes.length,
    };
  }
  if (path === "/api/v1/today/ledger") return todayLedger();

  if (path === "/api/v1/auth/session") {
    if (method === "GET") return SESSION;
    if (method === "DELETE") return null;
  }

  if (path === "/api/v1/auth/demo-signin") {
    if (method === "POST") {
      // Mock mode synthesises a session from the submitted name.
      const input = (body ?? {}) as { magickal_name?: string };
      const name = input.magickal_name ?? "Practitioner";
      return {
        ...SESSION,
        display_name: name,
        magickal_name: name,
      } satisfies Session;
    }
  }

  // Strip the querystring portion for matching but preserve it for parsing.
  const [bare, qs = ""] = path.split("?");

  if (bare === "/api/v1/entries") {
    if (method === "GET") {
      const params = new URLSearchParams(qs);
      const typeFilter = params.get("type") as EntryType | null;
      const list = typeFilter ? ENTRIES.filter((e) => e.type === typeFilter) : ENTRIES;
      return [...list];
    }
    if (method === "POST") {
      const input = body as CreateEntryInput;
      const next: EntryRecord = {
        id: `${Date.now()}-${++ENTRY_ID_SEQ}`,
        title: input.title,
        type: input.type,
        excerpt: input.excerpt,
        glyph: input.glyph,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      ENTRIES.unshift(next);
      return next;
    }
  }

  if (bare === "/api/v1/entries/stats") {
    return computeStats();
  }

  // Lexical FTS (B29). Mock approximates websearch_to_tsquery with a
  // case-insensitive substring match over title + excerpt. Always
  // reports sealed_excluded_count > 0 so the SealedExcludedCallout
  // is exercised in mock mode.
  if (bare === "/api/v1/search" && method === "GET") {
    const params = new URLSearchParams(qs);
    const q = (params.get("q") ?? "").trim().toLowerCase();
    const kinds = params.getAll("kind") as EntryType[];
    const matching = ENTRIES.filter((e) => {
      if (kinds.length > 0 && !kinds.includes(e.type)) return false;
      if (q.length > 0) {
        const haystack = `${e.title} ${e.excerpt}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const limit = Number(params.get("limit") ?? "20");
    const offset = Number(params.get("offset") ?? "0");
    return {
      hits: matching.slice(offset, offset + limit).map((e) => ({
        ...e,
        visibility: entryMeta(e.id).visibility,
      })),
      total: matching.length,
      limit,
      offset,
      sealed_excluded_count: 2,
    } satisfies SearchEntriesResponse;
  }

  if (bare === "/api/v1/users/me/settings/location") {
    if (method === "GET") return { ...MOCK_LOCATION };
    if (method === "PUT") {
      const input = (body ?? {}) as { lat?: number; lng?: number };
      if (typeof input.lat === "number") MOCK_LOCATION.lat = input.lat;
      if (typeof input.lng === "number") MOCK_LOCATION.lng = input.lng;
      return { ...MOCK_LOCATION };
    }
  }

  if (bare === "/api/v1/wellbeing/nudge") {
    if (method === "GET") return wellbeingNudgeRead();
    if (method === "PUT") {
      const input = (body ?? {}) as { enabled?: boolean };
      if (typeof input.enabled === "boolean") {
        MOCK_WELLBEING.enabled = input.enabled;
        // Enabling clears the mute horizon — mirrors the backend.
        if (input.enabled) MOCK_WELLBEING.muted = false;
      }
      return wellbeingNudgeRead();
    }
  }

  if (bare === "/api/v1/wellbeing/nudge/dismiss" && method === "POST") {
    MOCK_WELLBEING.muted = true;
    return wellbeingNudgeRead();
  }

  if (bare === "/api/v1/books") {
    if (method === "GET") {
      const params = new URLSearchParams(qs);
      const traditionFilter = params.get("tradition");
      const list = traditionFilter ? BOOKS.filter((b) => b.tradition === traditionFilter) : BOOKS;
      return [...list];
    }
    if (method === "POST") {
      const input = body as CreateBookInput;
      const next: BookRecord = {
        id: String(Date.now()),
        title: input.title,
        author: input.author ?? "",
        year: input.year ?? null,
        isbn: input.isbn ?? "",
        tradition: input.tradition ?? "",
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      BOOKS.unshift(next);
      return next;
    }
  }

  const bookMatch = /^\/api\/v1\/books\/(.+)$/.exec(bare ?? "");
  if (bookMatch) {
    const [, id] = bookMatch;
    const idx = BOOKS.findIndex((b) => b.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Book ${id} not found`));
    }
    if (method === "DELETE") {
      BOOKS.splice(idx, 1);
      return null;
    }
    if (method === "PATCH") {
      const patch = (body ?? {}) as Partial<BookRecord>;
      const current = BOOKS[idx] as BookRecord;
      const updated: BookRecord = {
        ...current,
        ...patch,
        id: current.id,
        created_at: current.created_at,
        updated_at: new Date().toISOString(),
      };
      BOOKS[idx] = updated;
      return updated;
    }
    return BOOKS[idx];
  }

  // /api/v1/astro/chart — returns a deterministic mock snapshot.
  if (bare === "/api/v1/astro/chart" && method === "GET") {
    return {
      instant: new Date().toISOString(),
      julian_day: 2460000,
      latitude: 51.5074,
      longitude: -0.1278,
      zodiac: "tropical",
      house_system: "placidus",
      placements: [
        {
          body_id: "sun",
          body_name: "Sun",
          glyph: "☉",
          tropical_longitude: 12.5,
          tropical_sign: "Aries",
          house: 1,
          is_retrograde: false,
        },
        {
          body_id: "moon",
          body_name: "Moon",
          glyph: "☽",
          tropical_longitude: 92.0,
          tropical_sign: "Cancer",
          house: 4,
          is_retrograde: false,
        },
        {
          body_id: "mercury",
          body_name: "Mercury",
          glyph: "☿",
          tropical_longitude: 18.0,
          tropical_sign: "Aries",
          house: 1,
          is_retrograde: false,
        },
        {
          body_id: "venus",
          body_name: "Venus",
          glyph: "♀",
          tropical_longitude: 38.0,
          tropical_sign: "Taurus",
          house: 2,
          is_retrograde: false,
        },
        {
          body_id: "mars",
          body_name: "Mars",
          glyph: "♂",
          tropical_longitude: 145.0,
          tropical_sign: "Leo",
          house: 5,
          is_retrograde: false,
        },
        {
          body_id: "jupiter",
          body_name: "Jupiter",
          glyph: "♃",
          tropical_longitude: 195.0,
          tropical_sign: "Libra",
          house: 7,
          is_retrograde: false,
        },
        {
          body_id: "saturn",
          body_name: "Saturn",
          glyph: "♄",
          tropical_longitude: 285.0,
          tropical_sign: "Capricorn",
          house: 10,
          is_retrograde: true,
        },
      ],
      houses: {
        cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
        ascendant: 0,
        midheaven: 270,
      },
      aspects: [
        { body_a: "sun", body_b: "moon", kind: "square", orb: 0.5 },
        { body_a: "venus", body_b: "jupiter", kind: "trine", orb: 1.2 },
      ],
      attribution: "Swiss Ephemeris (mock fixture)",
    };
  }

  // /api/v1/events — deterministic June-2026 snapshot (the Calendar
  // .dc.html's demo month), whatever range was requested.
  if (bare === "/api/v1/events" && method === "GET") {
    const srcOvid = {
      kind: "primary", title: "Fasti VI.249–348", author: "Ovid",
      year: 8, locator: "VI.249", notes: "The fullest surviving account of the rites.",
    };
    const srcBNP = {
      kind: "scholarly", title: "Religions of Rome, I", author: "Beard, North & Price",
      year: 1998, locator: "pp. 51–52", notes: "",
    };
    const srcHesiod = {
      kind: "primary", title: "Works and Days, l.770", author: "Hesiod",
      year: -700, locator: "770", notes: "“the first of the month … a holy day.”",
    };
    const srcHutton = {
      kind: "scholarly", title: "The Stations of the Sun", author: "Ronald Hutton",
      year: 1996, locator: "ch. 31", notes: "How much of the midsummer fire is medieval, not ancient.",
    };
    return {
      start: "2026-06-01T00:00:00+00:00",
      end: "2026-07-01T00:00:00+00:00",
      astronomical: [
        { kind: "last-quarter", instant: "2026-06-08T12:00:00+00:00", body: "moon", sign: "Pisces", meta: {} },
        { kind: "new-moon", instant: "2026-06-15T12:00:00+00:00", body: "moon", sign: "Gemini", meta: {} },
        { kind: "solstice", instant: "2026-06-21T12:00:00+00:00", body: "sun", sign: "Cancer", meta: {} },
        { kind: "first-quarter", instant: "2026-06-22T12:00:00+00:00", body: "moon", sign: "Virgo", meta: {} },
        { kind: "full-moon", instant: "2026-06-29T12:00:00+00:00", body: "moon", sign: "Sagittarius", meta: {} },
      ],
      festivals: [
        {
          festival_id: "vestalia", name: "Vestalia", tradition: "roman",
          label: "7–15 June", start: "2026-06-07T00:00:00+00:00", end: "2026-06-15T23:59:59+00:00",
          description: "The festival of Vesta, when the penus Vestae — the inner store of the goddess’s temple — was opened to the matrons of Rome.",
          practice: "Mola salsa offered and the hearth honoured through the week; on the Ides the temple was ritually swept and the sweepings carried to the Tiber.",
          sources: [srcOvid, srcBNP], source_count: 2,
        },
        {
          festival_id: "deipnon", name: "Deipnon", tradition: "hekatean",
          label: "dark of the moon", start: "2026-06-14T00:00:00+00:00", end: "2026-06-14T23:59:59+00:00",
          description: "Hekate’s Supper, laid at a three-way crossing on the last night of the lunar month, when the moon has gone dark.",
          practice: "A meal — eggs, garlic, sprat, a cake — set down at the crossroads and not looked back upon; the house purged for the month’s turning.",
          sources: [
            { kind: "primary", title: "Against Conon §39", author: "Demosthenes", year: -341, locator: "§39", notes: "On the crossroads suppers of Hekate." },
          ], source_count: 1,
        },
        {
          festival_id: "noumenia", name: "Noumenia", tradition: "greek",
          label: "first crescent", start: "2026-06-16T00:00:00+00:00", end: "2026-06-16T23:59:59+00:00",
          description: "The first visible sliver of the new moon — the first day of the Hellenic month, sacred to the gods of the household.",
          practice: "The hearth re-lit; Hestia, Apollon Noumenios and Zeus Herkeios honoured; the home set in order for the new month.",
          sources: [srcHesiod], source_count: 1,
        },
        {
          festival_id: "litha", name: "Litha · Midsummer", tradition: "wheel-of-the-year",
          label: "summer solstice", start: "2026-06-21T00:00:00+00:00", end: "2026-06-21T23:59:59+00:00",
          description: "The Wheel’s midsummer station — the longest day, the sun at the height of its strength before the turn toward winter.",
          practice: "Bonfires kept through the short night; herbs gathered at their peak; the sun’s zenith marked and its decline acknowledged.",
          sources: [srcHutton], source_count: 1,
        },
      ],
      attribution: "Swiss Ephemeris (mock fixture)",
    };
  }

  // /api/v1/entries/{id}/publish — sets published_at, returns detail.
  const publishMatch = /^\/api\/v1\/entries\/(.+)\/publish$/.exec(bare ?? "");
  if (publishMatch && method === "POST") {
    const [, id] = publishMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    const now = new Date().toISOString();
    ENTRIES[idx] = { ...ENTRIES[idx]!, updated_at: now };
    ENTRY_META.set(id!, { ...entryMeta(id!), published_at: now });
    return entryDetail(ENTRIES[idx]!);
  }

  // /api/v1/entries/{id}/body — auto-save target.
  const bodyMatch = /^\/api\/v1\/entries\/(.+)\/body$/.exec(bare ?? "");
  if (bodyMatch && method === "PATCH") {
    const [, id] = bodyMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    const next = (body ?? {}) as { body?: string };
    if (typeof next.body === "string") ENTRY_BODIES.set(id!, next.body);
    const now = new Date().toISOString();
    ENTRIES[idx] = { ...ENTRIES[idx]!, updated_at: now };
    return entryDetail(ENTRIES[idx]!);
  }

  // /api/v1/entries/{id}/seal — Mode B one-way seal (v1-033).
  // Mirrors the backend transaction: envelope stored, plaintext body
  // gone, plaintext revisions purged. No unseal fixture exists.
  const sealMatch = /^\/api\/v1\/entries\/(.+)\/seal$/.exec(bare ?? "");
  if (sealMatch && method === "POST") {
    const [, id] = sealMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    const meta = entryMeta(id!);
    if (meta.sealed) {
      return new ApiError(409, problem(409, "Conflict", "This entry is already sealed."));
    }
    if (meta.visibility === "public") {
      return new ApiError(
        403,
        problem(
          403,
          "Forbidden",
          "Public entries cannot be sealed. Lower the visibility first — " +
            "sealed content is never publicly visible.",
        ),
      );
    }
    const input = (body ?? {}) as { encrypted_payload?: string };
    ENTRY_SEALED.set(id!, input.encrypted_payload ?? "");
    ENTRY_BODIES.delete(id!);
    ENTRY_REVISIONS.delete(id!);
    ENTRY_META.set(id!, { ...meta, sealed: true });
    ENTRIES[idx] = { ...ENTRIES[idx]!, updated_at: new Date().toISOString() };
    return entryDetail(ENTRIES[idx]!);
  }

  // /api/v1/entries/{id}/sealed-payload — owner ciphertext read.
  const sealedPayloadMatch = /^\/api\/v1\/entries\/(.+)\/sealed-payload$/.exec(bare ?? "");
  if (sealedPayloadMatch && method === "GET") {
    const [, id] = sealedPayloadMatch;
    if (!ENTRIES.some((e) => e.id === id)) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    if (!entryMeta(id!).sealed) {
      return new ApiError(409, problem(409, "Conflict", "This entry is not sealed."));
    }
    const envelope = ENTRY_SEALED.get(id!) ?? UNDECRYPTABLE_ENVELOPE;
    return { encrypted_payload_b64: btoa(envelope) };
  }

  // /api/v1/entries/{id}/revisions/{revId}/restore — v1-028.
  // Mirrors the backend: current state pushed as a new revision FIRST,
  // then the old content applied (title + body only; visibility and
  // publish state never time-travel).
  const restoreMatch = /^\/api\/v1\/entries\/([^/]+)\/revisions\/([^/]+)\/restore$/.exec(
    bare ?? "",
  );
  if (restoreMatch && method === "POST") {
    seedEntryRevisions();
    const [, id, revId] = restoreMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    const revs = ENTRY_REVISIONS.get(id!) ?? [];
    const target = revs.find((r) => r.id === revId);
    if (idx < 0 || !target) {
      return new NotFoundError(problem(404, "Not Found", `Revision ${revId} not found`));
    }
    const now = new Date().toISOString();
    const nextNumber = Math.max(0, ...revs.map((r) => r.revision_number)) + 1;
    revs.push({
      id: `rev-${nextNumber}-${Date.now()}`,
      revision_number: nextNumber,
      created_at: now,
      title: ENTRIES[idx]!.title,
      body: ENTRY_BODIES.get(id!) ?? "",
      edit_summary: `Before restore to revision ${target.revision_number}`,
    });
    ENTRY_REVISIONS.set(id!, revs);
    ENTRIES[idx] = { ...ENTRIES[idx]!, title: target.title, updated_at: now };
    ENTRY_BODIES.set(id!, target.body ?? "");
    return entryDetail(ENTRIES[idx]!);
  }

  // /api/v1/entries/{id}/revisions/{revId} — full revision body.
  const revisionMatch = /^\/api\/v1\/entries\/([^/]+)\/revisions\/([^/]+)$/.exec(bare ?? "");
  if (revisionMatch && method === "GET") {
    seedEntryRevisions();
    const [, id, revId] = revisionMatch;
    const target = (ENTRY_REVISIONS.get(id!) ?? []).find((r) => r.id === revId);
    if (!target) {
      return new NotFoundError(problem(404, "Not Found", `Revision ${revId} not found`));
    }
    return { ...target };
  }

  // /api/v1/entries/{id}/revisions — newest-first list.
  const revisionsMatch = /^\/api\/v1\/entries\/([^/]+)\/revisions$/.exec(bare ?? "");
  if (revisionsMatch && method === "GET") {
    seedEntryRevisions();
    const [, id] = revisionsMatch;
    if (!ENTRIES.some((e) => e.id === id)) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    const revs = ENTRY_REVISIONS.get(id!) ?? [];
    return [...revs].sort((a, b) => b.revision_number - a.revision_number).map(toRevisionListItem);
  }

  const entryMatch = /^\/api\/v1\/entries\/(.+)$/.exec(bare ?? "");
  if (entryMatch) {
    const [, id] = entryMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    if (method === "DELETE") {
      ENTRIES.splice(idx, 1);
      ENTRY_BODIES.delete(id!);
      return null;
    }
    if (method === "PATCH") {
      // NOTE: no ``sealed`` here — the real PATCH schema is
      // extra=forbid and sealing routes through the dedicated
      // POST /entries/{id}/seal endpoint (v1-033).
      const patch = (body ?? {}) as Partial<EntryRecord> & {
        visibility?: EntryMeta["visibility"];
        tags?: string[];
        tradition_tags?: string[];
        publish_on_death?: boolean;
      };
      const current = ENTRIES[idx] as EntryRecord;
      const updated: EntryRecord = {
        ...current,
        ...patch,
        id: current.id,
        created_at: current.created_at,
        updated_at: new Date().toISOString(),
      };
      ENTRIES[idx] = updated;
      // Persist visibility / tags into the meta store so subsequent
      // detail reads see the new values.
      if (
        patch.visibility !== undefined ||
        patch.tags !== undefined ||
        patch.tradition_tags !== undefined ||
        patch.publish_on_death !== undefined
      ) {
        const existing = entryMeta(id!);
        ENTRY_META.set(id!, {
          ...existing,
          ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          ...(patch.tradition_tags !== undefined ? { tradition_tags: patch.tradition_tags } : {}),
          ...(patch.publish_on_death !== undefined
            ? { publish_on_death: patch.publish_on_death }
            : {}),
        });
      }
      return updated;
    }
    // GET — returns the detail record (superset of the lean record).
    // The lean `EntryRecord` shape is what older callers read; new
    // `getEntryDetail` callers read body / visibility / sealed / published_at.
    return entryDetail(ENTRIES[idx]!);
  }

  // ── Phase 06 divination lite fixtures (v1-014) ──────────────────

  if (bare !== undefined) {
    const divination = divinationLiteFixture(method, bare, body);
    if (divination !== undefined) return divination;
  }

  // ── Phase 07 Workshop fixtures (B108-2) ──────────────────────────

  if (bare !== undefined) {
    const workshop = workshopFixture(method, bare, qs, body);
    if (workshop !== undefined) return workshop;
  }

  // ── Phase 05 relational-ledger fixtures (v1-019) ─────────────────

  if (bare !== undefined) {
    const ledger = beingsLedgerFixture(method, bare, qs, body);
    if (ledger !== undefined) return ledger;
  }

  // ── Magickal bundles fixtures (v1-020) ───────────────────────────

  if (bare !== undefined) {
    const bundles = bundlesFixture(method, bare);
    if (bundles !== undefined) return bundles;
  }

  // ── Mode A vault-key rotation fixtures (v1-027) ──────────────────

  if (bare !== undefined) {
    const keys = keyRotationFixture(method, bare);
    if (keys !== undefined) return keys;
  }

  // ── Federation peer directory fixtures (v1-026) ──────────────────

  if (bare !== undefined) {
    const peers = federationPeersFixture(method, bare, body);
    if (peers !== undefined) return peers;
  }

  return new NotFoundError(problem(404, "Not Found", `No fixture for ${method} ${path}`));
}

// ── Phase 06 divination lite fixture state + handler (v1-014) ───────

const PENDULUM_READINGS: PendulumReadingRecord[] = [];
const HORARY_READINGS: HoraryReadingRecord[] = [];
const SCRYING_SESSIONS: ScryingSessionRecord[] = [];

function divinationLiteFixture(method: string, bare: string, body: unknown): unknown {
  if (bare === "/api/v1/pendulum/readings") {
    if (method === "GET") return [...PENDULUM_READINGS];
    if (method === "POST") {
      const input = body as CreatePendulumReadingInput;
      const row: PendulumReadingRecord = {
        id: workshopId(),
        question: input.question,
        asked_at: input.asked_at ?? nowIso(),
        outcome: input.outcome,
        confidence: input.confidence ?? null,
        board_image_upload_id: null,
        board_landing: null,
        notes: input.notes ?? null,
        calibration: null,
        calibration_at: null,
        entry_id: input.entry_id ?? null,
        entity_id: input.entity_id ?? null,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      PENDULUM_READINGS.unshift(row);
      return row;
    }
  }

  if (bare === "/api/v1/horary/readings" && method === "GET") {
    return [...HORARY_READINGS];
  }

  if (bare === "/api/v1/horary/cast" && method === "POST") {
    const input = body as CastHoraryInput;
    const askedAt = input.asked_at ?? nowIso();
    const row: HoraryReadingRecord = {
      id: workshopId(),
      question: input.question,
      asked_at: askedAt,
      latitude: input.latitude,
      longitude: input.longitude,
      location_label: input.location_label ?? null,
      chart_snapshot: {
        instant: askedAt,
        latitude: input.latitude,
        longitude: input.longitude,
        attribution: "Swiss Ephemeris (mock fixture)",
      },
      significator_querent: input.significator_querent ?? null,
      significator_quesited: input.significator_quesited ?? null,
      perfection_notes: null,
      interpretation: null,
      retrospective_rating: null,
      retrospective_notes: null,
      entry_id: input.entry_id ?? null,
      entity_id: input.entity_id ?? null,
      owner_id: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    HORARY_READINGS.unshift(row);
    return row;
  }

  if (bare === "/api/v1/scrying/sessions") {
    if (method === "GET") return [...SCRYING_SESSIONS];
    if (method === "POST") {
      const input = body as StartScryingSessionInput;
      const row: ScryingSessionRecord = {
        id: workshopId(),
        mode: input.mode,
        started_at: input.started_at ?? nowIso(),
        ended_at: null,
        duration_seconds: null,
        intention: input.intention ?? null,
        preparation_notes: input.preparation_notes ?? null,
        entity_id: input.entity_id ?? null,
        vision_notes: null,
        symbols: [],
        sketch_upload_id: null,
        voice_memo_upload_id: null,
        planetary_hour: input.planetary_hour ?? null,
        entry_id: null,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      SCRYING_SESSIONS.unshift(row);
      return row;
    }
  }

  const endMatch = /^\/api\/v1\/scrying\/sessions\/(.+)\/end$/.exec(bare);
  if (endMatch && method === "POST") {
    const [, id] = endMatch;
    const idx = SCRYING_SESSIONS.findIndex((s) => s.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Session ${id} not found`));
    }
    const input = (body ?? {}) as EndScryingSessionInput;
    const current = SCRYING_SESSIONS[idx]!;
    const endedAt = input.ended_at ?? nowIso();
    const durationMs = new Date(endedAt).getTime() - new Date(current.started_at).getTime();
    const next: ScryingSessionRecord = {
      ...current,
      ended_at: endedAt,
      duration_seconds: Math.max(0, Math.round(durationMs / 1000)),
      vision_notes: input.vision_notes ?? current.vision_notes,
      symbols: input.symbols ?? current.symbols,
      entry_id: input.entry_id ?? current.entry_id,
      updated_at: nowIso(),
    };
    SCRYING_SESSIONS[idx] = next;
    return next;
  }

  return undefined;
}

// ── Phase 07 Workshop fixture state + handler ───────────────────────

const SIGILS: SigilRecord[] = [];
const MAGIC_SQUARES: MagicSquareRecord[] = [];
const TALISMANS: TalismanRecord[] = [];
const CIRCLES: CircleRecord[] = [];
const TOOLS: ToolRecordWire[] = [];
const ALTARS: AltarRecordWire[] = [];
const VOCES: VoceRecordWire[] = [];

let workshopIdCounter = 1;
function workshopId(): string {
  // ULID-like sortable id (timestamp + counter). Real backend uses
  // UUIDv7; the shape is opaque to fixture consumers.
  const ts = Date.now().toString(36);
  const n = (workshopIdCounter++).toString(36).padStart(3, "0");
  return `wks-${ts}-${n}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Mirrors the seven Agrippa planetary squares from the backend
// (`theourgia.core.workshop.planetary_squares`). Cells are the
// authoritative published values; magic constants verified.
const PLANETARY_SQUARES_FIXTURE: PlanetarySquareWire[] = [
  {
    planet: "saturn",
    name: "Saturn — order 3",
    order: 3,
    magic_constant: 15,
    cells: [
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ],
    citation: "Cornelius Agrippa, De occulta philosophia, 1531.",
  },
  {
    planet: "jupiter",
    name: "Jupiter — order 4",
    order: 4,
    magic_constant: 34,
    cells: [
      [4, 14, 15, 1],
      [9, 7, 6, 12],
      [5, 11, 10, 8],
      [16, 2, 3, 13],
    ],
    citation: "Cornelius Agrippa, De occulta philosophia, 1531.",
  },
];

const PRESET_CIRCLES_FIXTURE: PresetCircle[] = [
  {
    slug: "lbrp_classic",
    name: "LBRP — Lesser Banishing Ritual of the Pentagram",
    purpose:
      "Daily banishing, clearing the sphere, and establishing the elemental quarters before further work.",
    diameter_m: 2.5,
    rings: [
      {
        kind: "inscription",
        content: "ATEH MALKUTH VE-GEBURAH VE-GEDULAH LE-OLAHM AMEN",
      },
      { kind: "glyph_row", content: "pentagram" },
    ],
    compass_tradition: "archangels",
    compass_points: {
      E: "Raphael",
      S: "Michael",
      W: "Gabriel",
      N: "Uriel",
    },
    centre_element: { kind: "hexagram" },
    citation: "Israel Regardie, The Golden Dawn (1937–40), PD per first-publication.",
  },
];

const BUNDLED_VOCES_FIXTURE: BundledVoce[] = [
  {
    id: "pgm_iv_2785_hekate_hymn_opening",
    name: "Hekate Hymn — opening invocation",
    source_text: "ΕΛΘΕ ΜΟΙ ΩΦΡΟΥ ΚΕΡΑΑΥ ΚΡΕΟΥΣ ΑΣΗΡ",
    source_script: "greek",
    transliteration: "elthe moi, Phrou, Keraau, Kreous, Aser",
    ipa: "ˈel.tʰe moi̯ pʰruː ke.ˈraː.au̯ ˈkre.us aˈseːr",
    source_citation: "PGM IV.2785 (Preisendanz 1928 vol I, p. 168)",
    planetary_associations: ["moon"],
    elemental_associations: [],
  },
];

function workshopFixture(method: string, bare: string, qs: string, body: unknown): unknown {
  // ── Sigils ────────────────────────────────────────────────────
  if (bare === "/api/v1/sigils") {
    if (method === "GET") return [...SIGILS];
    if (method === "POST") {
      const input = body as CreateSigilInput;
      const row: SigilRecord = {
        id: workshopId(),
        owner_id: null,
        title: input.title,
        intention: input.intention,
        mode: input.mode,
        parameters: input.parameters ?? {},
        svg: input.svg,
        seed: input.seed ?? null,
        purpose: input.purpose ?? "workshop_draft",
        citation: input.citation ?? null,
        notes: input.notes ?? null,
        linked_entity_id: input.linked_entity_id ?? null,
        linked_working_entry_id: input.linked_working_entry_id ?? null,
        parent_sigil_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      SIGILS.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/sigils/")) {
    const rest = bare.slice("/api/v1/sigils/".length);
    const [idMaybe, sub] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = SIGILS.findIndex((s) => s.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Sigil ${id} not found`));
    if (sub === "fork" && method === "POST") {
      const parent = SIGILS[idx]!;
      const fork: SigilRecord = {
        ...parent,
        id: workshopId(),
        title: (body as { title?: string })?.title ?? `${parent.title} — new version`,
        purpose: "workshop_draft",
        parent_sigil_id: parent.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      SIGILS.unshift(fork);
      return fork;
    }
    if (sub === undefined) {
      if (method === "GET") return SIGILS[idx];
      if (method === "DELETE") {
        SIGILS.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<SigilRecord>;
        const next = { ...SIGILS[idx]!, ...patch, id, updated_at: nowIso() };
        SIGILS[idx] = next;
        return next;
      }
    }
  }

  // ── Magic Squares ─────────────────────────────────────────────
  if (bare === "/api/v1/magic-squares/planetary" && method === "GET") {
    return [...PLANETARY_SQUARES_FIXTURE];
  }
  if (bare === "/api/v1/magic-squares") {
    if (method === "GET") return [...MAGIC_SQUARES];
    if (method === "POST") {
      const input = body as CreateMagicSquareInput;
      // Sum check: classic n(n²+1)/2 across each row + col + diag.
      const isMagic = isValidMagicSquareFixture(input.cells);
      const row: MagicSquareRecord = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        order: input.order,
        cells: input.cells,
        attribution: input.attribution ?? null,
        is_magic: isMagic,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      MAGIC_SQUARES.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/magic-squares/")) {
    const id = bare.slice("/api/v1/magic-squares/".length);
    const idx = MAGIC_SQUARES.findIndex((m) => m.id === id);
    if (idx < 0)
      return new NotFoundError(problem(404, "Not Found", `Magic square ${id} not found`));
    if (method === "GET") return MAGIC_SQUARES[idx];
    if (method === "DELETE") {
      MAGIC_SQUARES.splice(idx, 1);
      return null;
    }
    if (method === "PATCH") {
      const patch = body as Partial<MagicSquareRecord>;
      const next = {
        ...MAGIC_SQUARES[idx]!,
        ...patch,
        id,
        updated_at: nowIso(),
      };
      if (patch.cells) next.is_magic = isValidMagicSquareFixture(patch.cells);
      MAGIC_SQUARES[idx] = next;
      return next;
    }
  }

  // ── Talismans ─────────────────────────────────────────────────
  if (bare === "/api/v1/talismans") {
    if (method === "GET") return [...TALISMANS];
    if (method === "POST") {
      const input = body as CreateTalismanInput;
      const row: TalismanRecord = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        purpose: input.purpose,
        front_svg: input.front_svg,
        back_svg: input.back_svg,
        components: input.components ?? {},
        materials_notes: input.materials_notes ?? null,
        linked_election: input.linked_election ?? null,
        linked_consecration_working_id: input.linked_consecration_working_id ?? null,
        encryption_mode: "none",
        sealed: false,
        encrypted_payload_b64: null,
        encryption_iv_b64: null,
        parent_talisman_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      TALISMANS.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/talismans/")) {
    const rest = bare.slice("/api/v1/talismans/".length);
    const [idMaybe, sub] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = TALISMANS.findIndex((t) => t.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Talisman ${id} not found`));
    const row = TALISMANS[idx]!;
    if (sub === "seal" && method === "POST") {
      const payload = body as {
        encrypted_payload_b64: string;
        encryption_iv_b64: string;
      };
      const next: TalismanRecord = {
        ...row,
        encryption_mode: "sealed",
        sealed: true,
        encrypted_payload_b64: payload.encrypted_payload_b64,
        encryption_iv_b64: payload.encryption_iv_b64,
        front_svg: null,
        back_svg: null,
        components: null,
        updated_at: nowIso(),
      };
      TALISMANS[idx] = next;
      return next;
    }
    if (sub === "unseal" && method === "POST") {
      return {
        encrypted_payload_b64: row.encrypted_payload_b64 ?? "",
        encryption_iv_b64: row.encryption_iv_b64 ?? "",
      };
    }
    if (sub === "fork" && method === "POST") {
      const name = (body as { name?: string })?.name ?? `${row.name} — new version`;
      const fork: TalismanRecord = {
        ...row,
        id: workshopId(),
        name,
        parent_talisman_id: row.id,
        linked_consecration_working_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      TALISMANS.unshift(fork);
      return fork;
    }
    if (sub === undefined) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        TALISMANS.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<TalismanRecord>;
        const next = { ...row, ...patch, id, updated_at: nowIso() };
        TALISMANS[idx] = next;
        return next;
      }
    }
  }

  // ── Circles ──────────────────────────────────────────────────
  if (bare === "/api/v1/circles/presets" && method === "GET") {
    return [...PRESET_CIRCLES_FIXTURE];
  }
  if (bare === "/api/v1/circles") {
    if (method === "GET") return [...CIRCLES];
    if (method === "POST") {
      const input = body as CreateCircleInput;
      const row: CircleRecord = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        purpose: input.purpose,
        diameter_m: input.diameter_m ?? 2.0,
        rings: input.rings,
        compass_tradition: input.compass_tradition,
        compass_points: input.compass_points,
        centre_element: input.centre_element,
        citation: input.citation ?? null,
        parent_circle_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      CIRCLES.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/circles/")) {
    const rest = bare.slice("/api/v1/circles/".length);
    const [idMaybe, sub] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = CIRCLES.findIndex((c) => c.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Circle ${id} not found`));
    const row = CIRCLES[idx]!;
    if (sub === "fork" && method === "POST") {
      const name = (body as { name?: string })?.name ?? `${row.name} — new version`;
      const fork: CircleRecord = {
        ...row,
        id: workshopId(),
        name,
        parent_circle_id: row.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      CIRCLES.unshift(fork);
      return fork;
    }
    if (sub === undefined) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        CIRCLES.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<CircleRecord>;
        const next = { ...row, ...patch, id, updated_at: nowIso() };
        CIRCLES[idx] = next;
        return next;
      }
    }
  }

  // ── Tools ────────────────────────────────────────────────────
  if (bare === "/api/v1/tools") {
    if (method === "GET") return [...TOOLS];
    if (method === "POST") {
      const input = body as CreateToolInput;
      const row: ToolRecordWire = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        kind: input.kind,
        description: input.description ?? null,
        materials: input.materials ?? [],
        dimensions: input.dimensions ?? {},
        photo_upload_ids: [],
        provenance: input.provenance ?? null,
        acquisition_date: input.acquisition_date ?? null,
        consecration_date: null,
        consecration_working_entry_id: null,
        current_location: input.current_location ?? null,
        is_consecrated: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      TOOLS.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/tools/")) {
    const rest = bare.slice("/api/v1/tools/".length);
    const [idMaybe, sub, subId] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = TOOLS.findIndex((t) => t.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Tool ${id} not found`));
    const row = TOOLS[idx]!;
    if (sub === "consecrate" && method === "POST") {
      const payload = body as {
        consecration_working_entry_id: string;
        consecration_date: string;
      };
      const next: ToolRecordWire = {
        ...row,
        consecration_working_entry_id: payload.consecration_working_entry_id,
        consecration_date: payload.consecration_date,
        is_consecrated: true,
        updated_at: nowIso(),
      };
      TOOLS[idx] = next;
      return next;
    }
    if (sub === "unconsecrate" && method === "POST") {
      const next: ToolRecordWire = {
        ...row,
        consecration_working_entry_id: null,
        consecration_date: null,
        is_consecrated: false,
        updated_at: nowIso(),
      };
      TOOLS[idx] = next;
      return next;
    }
    if (sub === "photos") {
      if (method === "POST") {
        const payload = body as { upload_id: string };
        if (!row.photo_upload_ids.includes(payload.upload_id)) {
          row.photo_upload_ids.push(payload.upload_id);
        }
        row.updated_at = nowIso();
        return row;
      }
      if (method === "DELETE" && subId) {
        row.photo_upload_ids = row.photo_upload_ids.filter((p) => p !== subId);
        row.updated_at = nowIso();
        return null;
      }
    }
    if (sub === undefined) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        TOOLS.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<ToolRecordWire>;
        const next = { ...row, ...patch, id, updated_at: nowIso() };
        TOOLS[idx] = next;
        return next;
      }
    }
  }

  // ── Altars ──────────────────────────────────────────────────
  if (bare === "/api/v1/altars") {
    if (method === "GET") return [...ALTARS];
    if (method === "POST") {
      const input = body as CreateAltarInput;
      const row: AltarRecordWire = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        description: input.description ?? null,
        tool_ids: input.tool_ids ?? [],
        arrangement_diagram_svg: input.arrangement_diagram_svg ?? null,
        photo_upload_ids: [],
        is_permanent: input.is_permanent ?? false,
        linked_working_entry_ids: input.linked_working_entry_ids ?? [],
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      ALTARS.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/altars/")) {
    const rest = bare.slice("/api/v1/altars/".length);
    const [idMaybe, sub] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = ALTARS.findIndex((a) => a.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Altar ${id} not found`));
    const row = ALTARS[idx]!;
    if (sub === "photos" && method === "POST") {
      const payload = body as { upload_id: string };
      if (!row.photo_upload_ids.includes(payload.upload_id)) {
        row.photo_upload_ids.push(payload.upload_id);
      }
      row.updated_at = nowIso();
      return row;
    }
    if (sub === undefined) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        ALTARS.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<AltarRecordWire>;
        const next = { ...row, ...patch, id, updated_at: nowIso() };
        ALTARS[idx] = next;
        return next;
      }
    }
  }

  // ── Voces ───────────────────────────────────────────────────
  if (bare === "/api/v1/voces/bundled" && method === "GET") {
    return [...BUNDLED_VOCES_FIXTURE];
  }
  if (bare === "/api/v1/voces/fork-bundled" && method === "POST") {
    const payload = body as { bundled_id: string };
    const src = BUNDLED_VOCES_FIXTURE.find((v) => v.id === payload.bundled_id);
    if (!src)
      return new NotFoundError(
        problem(404, "Not Found", `Bundled voce ${payload.bundled_id} not found`),
      );
    const row: VoceRecordWire = {
      id: workshopId(),
      owner_id: null,
      name: src.name,
      source_text: src.source_text,
      source_script: src.source_script,
      transliteration: src.transliteration,
      ipa: src.ipa,
      source_citation: src.source_citation,
      planetary_associations: [...src.planetary_associations],
      elemental_associations: [...src.elemental_associations],
      linked_entity_ids: [],
      forked_from_bundled_id: src.id,
      recordings: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    VOCES.unshift(row);
    return row;
  }
  if (bare === "/api/v1/voces") {
    if (method === "GET") return [...VOCES];
    if (method === "POST") {
      const input = body as CreateVoceInput;
      const row: VoceRecordWire = {
        id: workshopId(),
        owner_id: null,
        name: input.name,
        source_text: input.source_text,
        source_script: input.source_script,
        transliteration: input.transliteration ?? null,
        ipa: input.ipa ?? null,
        source_citation: input.source_citation,
        planetary_associations: input.planetary_associations ?? [],
        elemental_associations: input.elemental_associations ?? [],
        linked_entity_ids: input.linked_entity_ids ?? [],
        forked_from_bundled_id: null,
        recordings: [],
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      VOCES.unshift(row);
      return row;
    }
  }
  if (bare.startsWith("/api/v1/voces/")) {
    const rest = bare.slice("/api/v1/voces/".length);
    const [idMaybe, sub, subId] = rest.split("/");
    if (!idMaybe) return undefined;
    const id = idMaybe;
    const idx = VOCES.findIndex((v) => v.id === id);
    if (idx < 0) return new NotFoundError(problem(404, "Not Found", `Voce ${id} not found`));
    const row = VOCES[idx]!;
    if (sub === "recordings") {
      if (method === "POST") {
        const payload = body as {
          audio_attachment_id: string;
          duration_seconds: number;
          notes?: string | null;
        };
        const rec = {
          id: workshopId(),
          voce_id: row.id,
          audio_attachment_id: payload.audio_attachment_id,
          duration_seconds: payload.duration_seconds,
          notes: payload.notes ?? null,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        row.recordings.push(rec);
        row.updated_at = nowIso();
        return rec;
      }
      if (method === "DELETE" && subId) {
        row.recordings = row.recordings.filter((r) => r.id !== subId);
        row.updated_at = nowIso();
        return null;
      }
    }
    if (sub === undefined) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        VOCES.splice(idx, 1);
        return null;
      }
      if (method === "PATCH") {
        const patch = body as Partial<VoceRecordWire>;
        const next = { ...row, ...patch, id, updated_at: nowIso() };
        VOCES[idx] = next;
        return next;
      }
    }
  }

  // ── Phase 16 · agents (H10 C-cluster) ────────────────────────────────
  // NB: lives inside the workshopFixture dispatcher historically; it's
  // invoked for every fixture call that didn't match a more-specific
  // handler above, so /api/v1/agents/* paths route through here too.
  // Cleaner home would be a dedicated agentFixture() with its own
  // delegated dispatch — a small refactor to do separately.

  if (bare === "/api/v1/agents/runs") {
    if (method === "POST") {
      const runId = `mock-run-${Date.now()}`;
      const startedAt = nowIso();
      const fixture: AgentRunFixture = {
        run_id: runId,
        session_token: `mock-session-${runId}`,
        status: "running",
        started_at: startedAt,
        ended_at: null,
        returncode: null,
        reservation_usd: "0.50",
        cost: {
          tokens_in: 0,
          tokens_out: 0,
          tokens_cache: 0,
          tokens_fresh: 0,
          tokens_resume: 0,
          cost_usd: "0",
          reservation_usd: "0.50",
          remaining_usd: "0.50",
          over_reservation: false,
        },
      };
      AGENT_RUNS.set(runId, fixture);
      return fixture;
    }
  }

  if (bare.startsWith("/api/v1/agents/runs/")) {
    const rest = bare.slice("/api/v1/agents/runs/".length);
    const [runIdMaybe, sub] = rest.split("/");
    const runId = runIdMaybe ?? "";
    const fixture = AGENT_RUNS.get(runId);
    if (!fixture) {
      return new NotFoundError(problem(404, "Not Found", `Agent run ${runId} not found`));
    }
    if (sub === undefined) {
      if (method === "GET") return fixture;
      if (method === "DELETE") {
        fixture.status = "halted";
        fixture.ended_at = nowIso();
        return { run_id: runId, status: "halted" };
      }
    }
    if (sub === "cost") {
      if (method === "POST") {
        const sample = (body ?? {}) as {
          tokens_in?: number;
          tokens_out?: number;
          tokens_cache?: number;
          tokens_fresh?: number;
          tokens_resume?: number;
          cost_usd?: string;
        };
        fixture.cost.tokens_in += sample.tokens_in ?? 0;
        fixture.cost.tokens_out += sample.tokens_out ?? 0;
        fixture.cost.tokens_cache += sample.tokens_cache ?? 0;
        fixture.cost.tokens_fresh += sample.tokens_fresh ?? 0;
        fixture.cost.tokens_resume += sample.tokens_resume ?? 0;
        const delta = Number.parseFloat(sample.cost_usd ?? "0");
        const next = Number.parseFloat(fixture.cost.cost_usd) + delta;
        fixture.cost.cost_usd = next.toFixed(4);
        const reservation = Number.parseFloat(fixture.cost.reservation_usd);
        fixture.cost.remaining_usd = (reservation - next).toFixed(4);
        fixture.cost.over_reservation = next > reservation;
        return { ...fixture.cost };
      }
    }
  }

  if (bare === "/api/v1/agents/costs/summary") {
    if (method === "GET") {
      const params = new URLSearchParams(qs);
      const window = params.get("window") ?? "month";
      return {
        vault_id: "mock-vault",
        window,
        window_start: "2026-07-01T00:00:00+00:00",
        totals: {
          cost_usd: "3.10",
          tokens_in: 512_000,
          tokens_out: 128_000,
          tokens_cache: 180_000,
          tokens_fresh: 180_000,
          tokens_resume: 640_000,
          run_count: 12,
        },
        per_install: [
          {
            install_id: "mock-install-tutor",
            display_name: "Study tutor",
            kind: "study-tutor",
            cost_usd: "1.80",
            tokens_in: 300_000,
            tokens_out: 80_000,
            tokens_cache: 120_000,
            tokens_fresh: 100_000,
            tokens_resume: 400_000,
            run_count: 7,
            monthly_cap_usd: "10.00",
            month_cost_usd: "1.80",
            cap_used_pct: 18,
          },
          {
            install_id: "mock-install-sync",
            display_name: "Synchronicity reviewer",
            kind: "synchronicity-reviewer",
            cost_usd: "1.30",
            tokens_in: 212_000,
            tokens_out: 48_000,
            tokens_cache: 60_000,
            tokens_fresh: 80_000,
            tokens_resume: 240_000,
            run_count: 5,
            monthly_cap_usd: "1.50",
            month_cost_usd: "1.30",
            cap_used_pct: 87,
          },
        ],
      };
    }
  }

  if (bare === "/api/v1/agents/audit") {
    if (method === "GET") {
      const params = new URLSearchParams(qs);
      const limit = Number.parseInt(params.get("limit") ?? "100", 10);
      const offset = Number.parseInt(params.get("offset") ?? "0", 10);
      const eventType = params.get("event_type");
      let rows = [...AGENT_AUDIT];
      if (eventType) {
        rows = rows.filter((r) => r.event_type === eventType);
      }
      return {
        vault_did: "did:vault:mock",
        limit,
        offset,
        events: rows.slice(offset, offset + limit),
      };
    }
  }

  return undefined;
}

// ── Phase 16 fixture state ─────────────────────────────────────────────

interface AgentRunFixture {
  run_id: string;
  session_token: string;
  status: "running" | "completed" | "halted" | "errored" | "pending";
  started_at: string;
  ended_at: string | null;
  returncode: number | null;
  reservation_usd: string;
  cost: {
    tokens_in: number;
    tokens_out: number;
    tokens_cache: number;
    tokens_fresh: number;
    tokens_resume: number;
    cost_usd: string;
    reservation_usd: string;
    remaining_usd: string;
    over_reservation: boolean;
  };
}

const AGENT_RUNS: Map<string, AgentRunFixture> = new Map();

const AGENT_AUDIT: Array<{
  vault_did: string;
  event_type: string;
  happened_at: string;
  run_id: string | null;
  install_id: string | null;
  tool_name: string | null;
  arguments_json: Record<string, unknown> | null;
  allowed: boolean;
  filtered_count: number;
  detail: string | null;
}> = [
  {
    vault_did: "did:vault:mock",
    event_type: "run.completed",
    happened_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    run_id: "mock-prior-run-1",
    install_id: null,
    tool_name: null,
    arguments_json: null,
    allowed: true,
    filtered_count: 0,
    detail: "returncode=0",
  },
  {
    vault_did: "did:vault:mock",
    event_type: "mcp.tools_call",
    happened_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    run_id: "mock-prior-run-1",
    install_id: null,
    tool_name: "read.entries",
    arguments_json: { tag: "hekate", limit: 10 },
    allowed: true,
    filtered_count: 2,
    detail: null,
  },
];

function isValidMagicSquareFixture(cells: number[][]): boolean {
  const n = cells.length;
  if (n === 0) return false;
  const expected = (n * (n * n + 1)) / 2;
  // rows + cols
  for (let i = 0; i < n; i++) {
    let r = 0;
    let c = 0;
    for (let j = 0; j < n; j++) {
      r += cells[i]?.[j] ?? 0;
      c += cells[j]?.[i] ?? 0;
    }
    if (r !== expected || c !== expected) return false;
  }
  // diagonals
  let d1 = 0;
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    d1 += cells[i]?.[i] ?? 0;
    d2 += cells[i]?.[n - 1 - i] ?? 0;
  }
  return d1 === expected && d2 === expected;
}

// ── Phase 05 relational-ledger fixture state + handler (v1-019) ─────
// Deterministic seed rows mirror the H01-H03 design seeds and exercise
// every status-pill variant: all 5 reception levels, all 6 contract
// statuses, all 5 obligation statuses, all 5 oath statuses, all 4
// initiation statuses, all 4 servitor statuses, all 4 task statuses.

let LEDGER_SEQ = 0;
function ledgerId(prefix: string): string {
  LEDGER_SEQ += 1;
  return `${prefix}-fx-${LEDGER_SEQ}`;
}

const LEDGER_ENTITIES: EntityRecord[] = [
  {
    id: "ent-hekate",
    name: "Hekate",
    kind: "deity",
    aliases: ["Ἑκάτη"],
    glyph: "entity",
    description: null,
    tradition: "hellenic",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ent-brigid",
    name: "Brigid",
    kind: "deity",
    aliases: [],
    glyph: "entity",
    description: null,
    tradition: "celtic",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ent-apollon",
    name: "Apollon",
    kind: "deity",
    aliases: ["Ἀπόλλων"],
    glyph: "entity",
    description: null,
    tradition: "hellenic",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ent-agathos",
    name: "Agathos Daimon",
    kind: "spirit",
    aliases: [],
    glyph: "entity",
    description: null,
    tradition: "hellenic",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ent-yiayia",
    name: "Yiayia (María)",
    kind: "ancestor",
    aliases: [],
    glyph: "entity",
    description: null,
    tradition: "folk",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ent-threshold",
    name: "The Threshold Guardian",
    kind: "spirit",
    aliases: [],
    glyph: "entity",
    description: null,
    tradition: "personal",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// Ordered offered_at desc (the backend list order).
const LEDGER_OFFERINGS: OfferingRead[] = [
  {
    id: "off-overwhelming",
    entity_id: "ent-hekate",
    working_id: null,
    offered_at: "2026-06-21T23:30:00Z",
    location: "The crossroads",
    location_lat: null,
    location_lon: null,
    items: [
      { kind: "food", quantity: "1", unit: "plate" },
      { kind: "wine", quantity: "1", unit: "cup" },
    ],
    intention: "Deipnon at the crossroads, the dark of the moon.",
    reception_perceived: "overwhelming",
    outcome_notes: null,
    astro_snapshot: "Sun ☉ Gemini · dark moon · hour of Saturn",
    calendar_snapshot: "24 Sivan 5786",
    owner_id: null,
    created_at: "2026-06-21T23:31:00Z",
    updated_at: "2026-06-21T23:31:00Z",
  },
  {
    id: "off-strong",
    entity_id: "ent-brigid",
    working_id: null,
    offered_at: "2026-06-21T19:00:00Z",
    location: "The household shrine",
    location_lat: null,
    location_lon: null,
    items: [{ kind: "milk" }, { kind: "flowers" }],
    intention: "Gratitude for the mending of a long quarrel.",
    reception_perceived: "strong",
    outcome_notes: null,
    astro_snapshot: "Sun ☉ Gemini · waning crescent",
    calendar_snapshot: null,
    owner_id: null,
    created_at: "2026-06-21T19:01:00Z",
    updated_at: "2026-06-21T19:01:00Z",
  },
  {
    id: "off-clear",
    entity_id: "ent-apollon",
    working_id: null,
    offered_at: "2026-06-20T08:12:00Z",
    location: null,
    location_lat: null,
    location_lon: null,
    items: [{ kind: "incense", quantity: "3", unit: "sticks" }, { kind: "song" }],
    intention: "Morning paean before the workday.",
    reception_perceived: "clear",
    outcome_notes: null,
    astro_snapshot: "Sun ☉ Gemini · waning crescent",
    calendar_snapshot: null,
    owner_id: null,
    created_at: "2026-06-20T08:13:00Z",
    updated_at: "2026-06-20T08:13:00Z",
  },
  {
    id: "off-faint",
    entity_id: "ent-agathos",
    working_id: null,
    offered_at: "2026-06-20T06:05:00Z",
    location: "The household shrine",
    location_lat: null,
    location_lon: null,
    items: [{ kind: "libation", quantity: "1", unit: "cup" }],
    intention: "Daily libation at dawn.",
    reception_perceived: "faint",
    outcome_notes: null,
    astro_snapshot: null,
    calendar_snapshot: null,
    owner_id: null,
    created_at: "2026-06-20T06:06:00Z",
    updated_at: "2026-06-20T06:06:00Z",
  },
  {
    id: "off-none",
    entity_id: "ent-yiayia",
    working_id: null,
    offered_at: "2026-06-18T20:00:00Z",
    location: "The kitchen ikon",
    location_lat: null,
    location_lon: null,
    items: [{ kind: "food" }, { kind: "time" }],
    intention: "Sunday remembrance at the kitchen ikon.",
    reception_perceived: "none",
    outcome_notes: null,
    astro_snapshot: "Sun ☉ Gemini · waxing gibbous",
    calendar_snapshot: null,
    owner_id: null,
    created_at: "2026-06-18T20:01:00Z",
    updated_at: "2026-06-18T20:01:00Z",
  },
];

// Ordered next_due_at asc nulls-last (the backend list order).
const LEDGER_RECURRING: RecurringOfferingRead[] = [
  {
    id: "rec-libation",
    entity_id: "ent-agathos",
    label: "Morning libation",
    cadence: "Daily at dawn",
    items_template: [{ kind: "libation", quantity: "1", unit: "cup" }],
    next_due_at: "2026-06-22T06:00:00Z",
    is_active: true,
    owner_id: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-06-21T06:00:00Z",
  },
  {
    id: "rec-deipnon",
    entity_id: "ent-hekate",
    label: "Hekate's Deipnon",
    cadence: "Every dark moon",
    items_template: [{ kind: "food" }, { kind: "wine", quantity: "1", unit: "cup" }],
    next_due_at: "2026-06-23T21:00:00Z",
    is_active: true,
    owner_id: null,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-05-26T00:00:00Z",
  },
  {
    id: "rec-memorial",
    entity_id: "ent-yiayia",
    label: "Memorial candle",
    cadence: "Every Sunday",
    items_template: [{ kind: "time" }],
    next_due_at: "2026-06-25T19:00:00Z",
    is_active: false,
    owner_id: null,
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-06-14T19:00:00Z",
  },
];

// Ordered created_at desc (the backend list order). One row per
// status; the active row's obligations exercise all five obligation
// statuses across both sides.
const LEDGER_CONTRACTS: ContractRead[] = [
  {
    id: "ct-active",
    entity_id: "ent-brigid",
    title: "Midsummer accord",
    terms:
      "A candle kept at the hearth each evening; in return, a steady hand at the forge work until the harvest.",
    our_obligations: [
      {
        id: "ob-ours-1",
        description: "Daily candle at the hearth shrine",
        status: "pending",
        due_at: "2026-06-24T20:00:00Z",
      },
      {
        id: "ob-ours-2",
        description: "Well visit at Imbolc",
        status: "fulfilled",
        fulfilled_at: "2026-05-01T12:00:00Z",
      },
      {
        id: "ob-ours-3",
        description: "A poem for the festival",
        status: "waived",
        notes: "Waived by mutual agreement at the spring rite.",
      },
    ],
    their_obligations: [
      {
        id: "ob-theirs-1",
        description: "Steady hand for the forge work",
        status: "in-progress",
      },
      {
        id: "ob-theirs-2",
        description: "Spring rain for the garden",
        status: "overdue",
        due_at: "2026-06-19T00:00:00Z",
      },
    ],
    status: "active",
    effective_at: "2026-05-01T00:00:00Z",
    expires_at: "2026-09-01T00:00:00Z",
    renewable: true,
    binding_kind: "written",
    witness_entity_ids: ["ent-hekate"],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
  },
  {
    id: "ct-draft",
    entity_id: "ent-threshold",
    title: "Threshold ward",
    terms: "Watch over the door; a monthly libation in return.",
    our_obligations: [],
    their_obligations: [],
    status: "draft",
    effective_at: null,
    expires_at: null,
    renewable: false,
    binding_kind: "verbal",
    witness_entity_ids: [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
  },
  {
    id: "ct-fulfilled",
    entity_id: "ent-apollon",
    title: "Healing accord",
    terms: null,
    our_obligations: [],
    their_obligations: [],
    status: "fulfilled",
    effective_at: "2026-02-01T00:00:00Z",
    expires_at: "2026-05-01T00:00:00Z",
    renewable: false,
    binding_kind: "breath",
    witness_entity_ids: [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-05-02T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
  },
  {
    id: "ct-dissolved",
    entity_id: "ent-hekate",
    title: "Crossroads bargain",
    terms: null,
    our_obligations: [],
    their_obligations: [],
    status: "dissolved",
    effective_at: "2026-01-01T00:00:00Z",
    expires_at: null,
    renewable: false,
    binding_kind: "blood",
    witness_entity_ids: [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "ct-expired",
    entity_id: "ent-agathos",
    title: "Winter watch",
    terms: null,
    our_obligations: [],
    their_obligations: [],
    status: "expired",
    effective_at: "2025-11-01T00:00:00Z",
    expires_at: "2026-03-01T00:00:00Z",
    renewable: false,
    binding_kind: "item-bound",
    witness_entity_ids: [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "ct-breached",
    entity_id: "ent-threshold",
    title: "Silence pact",
    terms: null,
    our_obligations: [],
    their_obligations: [],
    status: "breached",
    effective_at: "2025-12-01T00:00:00Z",
    expires_at: null,
    renewable: false,
    binding_kind: "name-bound",
    witness_entity_ids: [],
    dissolution_ritual_id: null,
    owner_id: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
];

// Ordered taken_at desc (the backend list order). Sealed rows carry
// text=null per the read model — the ciphertext is write-only.
const LEDGER_OATHS: OathRead[] = [
  {
    id: "oath-broken",
    kind: "partner",
    recipient_entity_id: null,
    recipient_text: "A partner in the work",
    text: null,
    encryption_mode: "sealed",
    sealed: true,
    taken_at: "2026-02-14T00:00:00Z",
    expires_at: null,
    renewal_cadence: null,
    status: "broken",
    accountability_checkpoints: [],
    owner_id: null,
    created_at: "2026-02-14T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "oath-active",
    kind: "self",
    recipient_entity_id: null,
    recipient_text: null,
    text: null,
    encryption_mode: "sealed",
    sealed: true,
    taken_at: "2026-01-01T00:00:00Z",
    expires_at: null,
    renewal_cadence: "Renews each lunar month",
    status: "active",
    accountability_checkpoints: [{ due_at: "2026-06-24T00:00:00Z" }],
    owner_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "oath-fulfilled",
    kind: "deity",
    recipient_entity_id: "ent-hekate",
    recipient_text: null,
    text: "To keep the household shrine lit through the dark half of the year.",
    encryption_mode: "none",
    sealed: false,
    taken_at: "2025-11-01T00:00:00Z",
    expires_at: "2026-05-01T00:00:00Z",
    renewal_cadence: null,
    status: "fulfilled",
    accountability_checkpoints: [],
    owner_id: null,
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "oath-lapsed",
    kind: "community",
    recipient_entity_id: null,
    recipient_text: "The grove",
    text: "To tend the shared garden each full moon.",
    encryption_mode: "none",
    sealed: false,
    taken_at: "2025-08-09T00:00:00Z",
    expires_at: null,
    renewal_cadence: "Yearly",
    status: "lapsed",
    accountability_checkpoints: [{ due_at: "2026-06-10T00:00:00Z" }],
    owner_id: null,
    created_at: "2025-08-09T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
  },
  {
    id: "oath-renounced",
    kind: "order",
    recipient_entity_id: null,
    recipient_text: "The old order",
    text: null,
    encryption_mode: "sealed",
    sealed: true,
    taken_at: "2025-06-01T00:00:00Z",
    expires_at: null,
    renewal_cadence: null,
    status: "renounced",
    accountability_checkpoints: [],
    owner_id: null,
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

// Ordered created_at desc. Always sealed — the read model carries only
// tradition, status and the optional disclosure mark.
const LEDGER_INITIATIONS: InitiationRead[] = [
  {
    id: "init-active",
    tradition: "Hellenic mystery",
    status: "active",
    sealed: true,
    publicly_disclosed_at: null,
    owner_id: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "init-suspended",
    tradition: "Rosicrucian order",
    status: "suspended",
    sealed: true,
    publicly_disclosed_at: null,
    owner_id: null,
    created_at: "2026-03-15T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
  },
  {
    id: "init-lapsed",
    tradition: "Druidic grove",
    status: "lapsed",
    sealed: true,
    publicly_disclosed_at: "2026-04-12T00:00:00Z",
    owner_id: null,
    created_at: "2025-09-01T00:00:00Z",
    updated_at: "2026-04-12T00:00:00Z",
  },
  {
    id: "init-resigned",
    tradition: "Ceremonial lodge",
    status: "resigned",
    sealed: true,
    publicly_disclosed_at: null,
    owner_id: null,
    created_at: "2024-11-11T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

// Ordered name asc (the backend list order).
const LEDGER_SERVITORS: ServitorRead[] = [
  {
    id: "sv-dormant",
    name: "Chalkeia",
    kind: "egregore",
    purpose: "Group working for the forge circle.",
    sigil_upload_id: null,
    creation_entry_id: null,
    feeding_cadence: "Monthly",
    feeding_method: "group attention",
    last_fed_at: "2026-05-30T20:00:00Z",
    lifespan_limit: null,
    status: "dormant",
    members: ["Soror E.", "Frater A.", "Soror K."],
    owner_id: null,
    created_at: "2026-01-20T00:00:00Z",
    updated_at: "2026-05-30T20:00:00Z",
  },
  {
    id: "sv-retired",
    name: "Lampas",
    kind: "servitor",
    purpose: "Carried petitions to the crossroads.",
    sigil_upload_id: null,
    creation_entry_id: null,
    feeding_cadence: null,
    feeding_method: null,
    last_fed_at: null,
    lifespan_limit: "2026-07-11",
    status: "retired",
    members: [],
    owner_id: null,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "sv-active",
    name: "Phylax",
    kind: "servitor",
    purpose: "Guards the threshold of the flat and turns away unwanted attention.",
    sigil_upload_id: null,
    creation_entry_id: null,
    feeding_cadence: "Weekly",
    feeding_method: "attention + a lit lamp",
    last_fed_at: "2026-06-15T21:10:00Z",
    lifespan_limit: null,
    status: "active",
    members: [],
    owner_id: null,
    created_at: "2026-02-02T00:00:00Z",
    updated_at: "2026-06-15T21:10:00Z",
  },
  {
    id: "sv-decommissioned",
    name: "Skiouros",
    kind: "servitor",
    purpose: "An errand-runner for small findings.",
    sigil_upload_id: null,
    creation_entry_id: null,
    feeding_cadence: null,
    feeding_method: null,
    last_fed_at: null,
    lifespan_limit: "2026-05-30",
    status: "decommissioned",
    members: [],
    owner_id: null,
    created_at: "2025-08-15T00:00:00Z",
    updated_at: "2026-05-30T00:00:00Z",
  },
];

// Ordered given_at desc (the backend list order). All four task
// statuses, all on the active servitor.
const LEDGER_SERVITOR_TASKS: ServitorTaskRead[] = [
  {
    id: "task-progress",
    servitor_id: "sv-active",
    description: "Turn away the salesman's persistence",
    given_at: "2026-06-10T00:00:00Z",
    target_completion_at: "2026-06-25T00:00:00Z",
    completed_at: null,
    status: "in-progress",
    outcome_notes: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
  },
  {
    id: "task-pending",
    servitor_id: "sv-active",
    description: "Watch the door while the household sleeps",
    given_at: "2026-06-01T00:00:00Z",
    target_completion_at: null,
    completed_at: null,
    status: "pending",
    outcome_notes: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "task-completed",
    servitor_id: "sv-active",
    description: "Find the lost ring",
    given_at: "2026-05-20T00:00:00Z",
    target_completion_at: "2026-06-10T00:00:00Z",
    completed_at: "2026-06-04T00:00:00Z",
    status: "completed",
    outcome_notes: "Found beneath the third floorboard.",
    created_at: "2026-05-20T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
  },
  {
    id: "task-abandoned",
    servitor_id: "sv-active",
    description: "Follow the noisy neighbour's mood",
    given_at: "2026-04-02T00:00:00Z",
    target_completion_at: null,
    completed_at: null,
    status: "abandoned",
    outcome_notes: null,
    created_at: "2026-04-02T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
];

/** Merge only the keys the patch actually defines (mirrors the
 *  backend's ``exclude_unset`` PATCH semantics). */
function mergeDefined<T extends object>(row: T, patch: object): T {
  const next = { ...row } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) next[k] = v;
  }
  return next as T;
}

function beingsLedgerFixture(method: string, bare: string, qs: string, body: unknown): unknown {
  const params = new URLSearchParams(qs);

  // ── Entities (list + create + detail) ─────────────────────────────
  if (bare === "/api/v1/entities") {
    if (method === "GET") {
      const kind = params.get("kind");
      const tradition = params.get("tradition");
      return LEDGER_ENTITIES.filter(
        (e) => (!kind || e.kind === kind) && (!tradition || e.tradition === tradition),
      );
    }
    if (method === "POST") {
      const input = body as CreateEntityInput;
      const row: EntityRecord = {
        id: ledgerId("ent"),
        name: input.name,
        kind: input.kind ?? "other",
        aliases: input.aliases ?? [],
        glyph: input.glyph ?? "entity",
        description: input.description ?? null,
        tradition: input.tradition ?? "",
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_ENTITIES.unshift(row);
      return row;
    }
  }
  const entityMatch = /^\/api\/v1\/entities\/([^/]+)$/.exec(bare);
  if (entityMatch && method === "GET") {
    const row = LEDGER_ENTITIES.find((e) => e.id === entityMatch[1]);
    return (
      row ?? new NotFoundError(problem(404, "Not Found", `Entity ${entityMatch[1]} not found`))
    );
  }

  // ── Offerings ─────────────────────────────────────────────────────
  if (bare === "/api/v1/offerings") {
    if (method === "GET") {
      const entityId = params.get("entity_id");
      return LEDGER_OFFERINGS.filter((o) => !entityId || o.entity_id === entityId);
    }
    if (method === "POST") {
      const input = body as CreateOfferingInput;
      const row: OfferingRead = {
        id: ledgerId("off"),
        entity_id: input.entity_id,
        working_id: input.working_id ?? null,
        offered_at: input.offered_at,
        location: input.location ?? null,
        location_lat: input.location_lat ?? null,
        location_lon: input.location_lon ?? null,
        items: input.items ?? [],
        intention: input.intention ?? null,
        reception_perceived: input.reception_perceived ?? null,
        outcome_notes: input.outcome_notes ?? null,
        astro_snapshot: input.astro_snapshot ?? null,
        calendar_snapshot: input.calendar_snapshot ?? null,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_OFFERINGS.unshift(row);
      return row;
    }
  }
  const offeringMatch = /^\/api\/v1\/offerings\/([^/]+)$/.exec(bare);
  if (offeringMatch) {
    const idx = LEDGER_OFFERINGS.findIndex((o) => o.id === offeringMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Offering ${offeringMatch[1]} not found`));
    }
    if (method === "GET") return LEDGER_OFFERINGS[idx];
    if (method === "PATCH") {
      const next = mergeDefined(LEDGER_OFFERINGS[idx]!, (body ?? {}) as UpdateOfferingInput);
      next.updated_at = nowIso();
      LEDGER_OFFERINGS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_OFFERINGS.splice(idx, 1);
      return null;
    }
  }

  // ── Recurring offerings ───────────────────────────────────────────
  if (bare === "/api/v1/recurring-offerings") {
    if (method === "GET") {
      const entityId = params.get("entity_id");
      const isActive = params.get("is_active");
      return LEDGER_RECURRING.filter(
        (r) =>
          (!entityId || r.entity_id === entityId) &&
          (isActive === null || String(r.is_active) === isActive),
      );
    }
    if (method === "POST") {
      const input = body as CreateRecurringOfferingInput;
      const row: RecurringOfferingRead = {
        id: ledgerId("rec"),
        entity_id: input.entity_id,
        label: input.label,
        cadence: input.cadence,
        items_template: input.items_template ?? [],
        next_due_at: input.next_due_at ?? null,
        is_active: input.is_active ?? true,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_RECURRING.unshift(row);
      return row;
    }
  }
  const recurringMatch = /^\/api\/v1\/recurring-offerings\/([^/]+)$/.exec(bare);
  if (recurringMatch) {
    const idx = LEDGER_RECURRING.findIndex((r) => r.id === recurringMatch[1]);
    if (idx < 0) {
      return new NotFoundError(
        problem(404, "Not Found", `Recurring offering ${recurringMatch[1]} not found`),
      );
    }
    if (method === "GET") return LEDGER_RECURRING[idx];
    if (method === "PATCH") {
      const next = mergeDefined(
        LEDGER_RECURRING[idx]!,
        (body ?? {}) as UpdateRecurringOfferingInput,
      );
      next.updated_at = nowIso();
      LEDGER_RECURRING[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_RECURRING.splice(idx, 1);
      return null;
    }
  }

  // ── Contracts ─────────────────────────────────────────────────────
  if (bare === "/api/v1/contracts") {
    if (method === "GET") {
      const entityId = params.get("entity_id");
      const status = params.get("contract_status");
      return LEDGER_CONTRACTS.filter(
        (c) => (!entityId || c.entity_id === entityId) && (!status || c.status === status),
      );
    }
    if (method === "POST") {
      const input = body as CreateContractInput;
      const row: ContractRead = {
        id: ledgerId("ct"),
        entity_id: input.entity_id,
        title: input.title,
        terms: input.terms ?? null,
        our_obligations: input.our_obligations ?? [],
        their_obligations: input.their_obligations ?? [],
        status: input.status ?? "draft",
        effective_at: input.effective_at ?? null,
        expires_at: input.expires_at ?? null,
        renewable: input.renewable ?? false,
        binding_kind: input.binding_kind ?? "verbal",
        witness_entity_ids: input.witness_entity_ids ?? [],
        dissolution_ritual_id: input.dissolution_ritual_id ?? null,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_CONTRACTS.unshift(row);
      return row;
    }
  }
  const fulfillMatch = /^\/api\/v1\/contracts\/([^/]+)\/fulfill-obligation$/.exec(bare);
  if (fulfillMatch && method === "POST") {
    const idx = LEDGER_CONTRACTS.findIndex((c) => c.id === fulfillMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Contract ${fulfillMatch[1]} not found`));
    }
    const input = body as FulfillObligationInput;
    const contract = LEDGER_CONTRACTS[idx]!;
    const key = input.side === "ours" ? "our_obligations" : "their_obligations";
    const obligations = contract[key].map((ob) =>
      ob.id === input.obligation_id
        ? {
            ...ob,
            status: input.new_status ?? "fulfilled",
            ...(input.fulfilled_at ? { fulfilled_at: input.fulfilled_at } : {}),
            ...(input.notes ? { notes: input.notes } : {}),
          }
        : ob,
    );
    if (!obligations.some((ob) => ob.id === input.obligation_id)) {
      return new NotFoundError(
        problem(
          404,
          "Not Found",
          `Obligation '${input.obligation_id}' not found on the ${input.side} side.`,
        ),
      );
    }
    const next: ContractRead = { ...contract, [key]: obligations, updated_at: nowIso() };
    LEDGER_CONTRACTS[idx] = next;
    return next;
  }
  const contractMatch = /^\/api\/v1\/contracts\/([^/]+)$/.exec(bare);
  if (contractMatch) {
    const idx = LEDGER_CONTRACTS.findIndex((c) => c.id === contractMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Contract ${contractMatch[1]} not found`));
    }
    if (method === "GET") return LEDGER_CONTRACTS[idx];
    if (method === "PATCH") {
      const next = mergeDefined(LEDGER_CONTRACTS[idx]!, (body ?? {}) as UpdateContractInput);
      next.updated_at = nowIso();
      LEDGER_CONTRACTS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_CONTRACTS.splice(idx, 1);
      return null;
    }
  }

  // ── Oaths ─────────────────────────────────────────────────────────
  if (bare === "/api/v1/oaths") {
    if (method === "GET") {
      const kind = params.get("kind");
      const status = params.get("oath_status");
      return LEDGER_OATHS.filter(
        (o) => (!kind || o.kind === kind) && (!status || o.status === status),
      );
    }
    if (method === "POST") {
      const input = body as CreateOathInput;
      const sealed = (input.encryption_mode ?? "sealed") === "sealed";
      const row: OathRead = {
        id: ledgerId("oath"),
        kind: input.kind,
        recipient_entity_id: input.recipient_entity_id ?? null,
        recipient_text: input.recipient_text ?? null,
        // The backend drops plaintext for sealed oaths and never
        // returns the ciphertext — mirror both behaviours.
        text: sealed ? null : (input.text ?? null),
        encryption_mode: sealed ? "sealed" : "none",
        sealed,
        taken_at: input.taken_at,
        expires_at: input.expires_at ?? null,
        renewal_cadence: input.renewal_cadence ?? null,
        status: input.status ?? "active",
        accountability_checkpoints: input.accountability_checkpoints ?? [],
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      // v1-033: keep the write-only envelope so the sealed-payload
      // read can hand it back (base64) for client-side decrypt.
      if (sealed && typeof input.encrypted_payload === "string") {
        OATH_SEALED.set(row.id, input.encrypted_payload);
      }
      LEDGER_OATHS.unshift(row);
      return row;
    }
  }
  // /api/v1/oaths/{id}/sealed-payload — owner ciphertext read (v1-033).
  const oathSealedMatch = /^\/api\/v1\/oaths\/([^/]+)\/sealed-payload$/.exec(bare);
  if (oathSealedMatch && method === "GET") {
    const row = LEDGER_OATHS.find((o) => o.id === oathSealedMatch[1]);
    if (!row) {
      return new NotFoundError(problem(404, "Not Found", `Oath ${oathSealedMatch[1]} not found`));
    }
    if (!row.sealed) {
      return new ApiError(409, problem(409, "Conflict", "This oath is not sealed."));
    }
    const envelope = OATH_SEALED.get(row.id) ?? UNDECRYPTABLE_ENVELOPE;
    return { encrypted_payload_b64: btoa(envelope) };
  }
  const oathMatch = /^\/api\/v1\/oaths\/([^/]+)$/.exec(bare);
  if (oathMatch) {
    const idx = LEDGER_OATHS.findIndex((o) => o.id === oathMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Oath ${oathMatch[1]} not found`));
    }
    if (method === "GET") return LEDGER_OATHS[idx];
    if (method === "PATCH") {
      const patch = (body ?? {}) as UpdateOathInput;
      const current = LEDGER_OATHS[idx]!;
      const next = mergeDefined(current, patch);
      // Sealed rows silently drop patched plaintext (backend rule).
      if (current.sealed) next.text = null;
      next.updated_at = nowIso();
      LEDGER_OATHS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_OATHS.splice(idx, 1);
      return null;
    }
  }

  // ── Initiations ───────────────────────────────────────────────────
  if (bare === "/api/v1/initiations") {
    if (method === "GET") {
      const tradition = params.get("tradition");
      const status = params.get("init_status");
      return LEDGER_INITIATIONS.filter(
        (i) => (!tradition || i.tradition === tradition) && (!status || i.status === status),
      );
    }
    if (method === "POST") {
      const input = body as CreateInitiationInput;
      const row: InitiationRead = {
        id: ledgerId("init"),
        tradition: input.tradition,
        status: input.status ?? "active",
        sealed: true,
        publicly_disclosed_at: input.publicly_disclosed_at ?? null,
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      // v1-033: keep the write-only envelope so the sealed-payload
      // read can hand it back (base64) for client-side decrypt.
      if (typeof input.encrypted_payload === "string") {
        INITIATION_SEALED.set(row.id, input.encrypted_payload);
      }
      LEDGER_INITIATIONS.unshift(row);
      return row;
    }
  }
  // /api/v1/initiations/{id}/sealed-payload — owner ciphertext read
  // (v1-033).
  const initiationSealedMatch = /^\/api\/v1\/initiations\/([^/]+)\/sealed-payload$/.exec(bare);
  if (initiationSealedMatch && method === "GET") {
    const row = LEDGER_INITIATIONS.find((i) => i.id === initiationSealedMatch[1]);
    if (!row) {
      return new NotFoundError(
        problem(404, "Not Found", `Initiation ${initiationSealedMatch[1]} not found`),
      );
    }
    const envelope = INITIATION_SEALED.get(row.id);
    if (!row.sealed && !envelope) {
      return new ApiError(409, problem(409, "Conflict", "This initiation is not sealed."));
    }
    return { encrypted_payload_b64: btoa(envelope ?? UNDECRYPTABLE_ENVELOPE) };
  }
  const initiationMatch = /^\/api\/v1\/initiations\/([^/]+)$/.exec(bare);
  if (initiationMatch) {
    const idx = LEDGER_INITIATIONS.findIndex((i) => i.id === initiationMatch[1]);
    if (idx < 0) {
      return new NotFoundError(
        problem(404, "Not Found", `Initiation ${initiationMatch[1]} not found`),
      );
    }
    if (method === "GET") return LEDGER_INITIATIONS[idx];
    if (method === "PATCH") {
      const patch = (body ?? {}) as UpdateInitiationInput;
      const next = mergeDefined(LEDGER_INITIATIONS[idx]!, {
        tradition: patch.tradition ?? undefined,
        status: patch.status ?? undefined,
        publicly_disclosed_at: patch.publicly_disclosed_at,
      });
      next.updated_at = nowIso();
      LEDGER_INITIATIONS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_INITIATIONS.splice(idx, 1);
      return null;
    }
  }

  // ── Servitors + tasks ─────────────────────────────────────────────
  if (bare === "/api/v1/servitors") {
    if (method === "GET") {
      const kind = params.get("kind");
      const status = params.get("servitor_status");
      return LEDGER_SERVITORS.filter(
        (s) => (!kind || s.kind === kind) && (!status || s.status === status),
      );
    }
    if (method === "POST") {
      const input = body as CreateServitorInput;
      const row: ServitorRead = {
        id: ledgerId("sv"),
        name: input.name,
        kind: input.kind ?? "servitor",
        purpose: input.purpose ?? null,
        sigil_upload_id: input.sigil_upload_id ?? null,
        creation_entry_id: input.creation_entry_id ?? null,
        feeding_cadence: input.feeding_cadence ?? null,
        feeding_method: input.feeding_method ?? null,
        last_fed_at: null,
        lifespan_limit: input.lifespan_limit ?? null,
        status: input.status ?? "active",
        members: input.members ?? [],
        owner_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_SERVITORS.unshift(row);
      return row;
    }
  }
  const feedMatch = /^\/api\/v1\/servitors\/([^/]+)\/feed$/.exec(bare);
  if (feedMatch && method === "POST") {
    const idx = LEDGER_SERVITORS.findIndex((s) => s.id === feedMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Servitor ${feedMatch[1]} not found`));
    }
    const input = (body ?? {}) as FeedServitorInput;
    const next: ServitorRead = {
      ...LEDGER_SERVITORS[idx]!,
      last_fed_at: input.fed_at ?? nowIso(),
      updated_at: nowIso(),
    };
    LEDGER_SERVITORS[idx] = next;
    return next;
  }
  const tasksMatch = /^\/api\/v1\/servitors\/([^/]+)\/tasks$/.exec(bare);
  if (tasksMatch) {
    const servitor = LEDGER_SERVITORS.find((s) => s.id === tasksMatch[1]);
    if (!servitor) {
      return new NotFoundError(problem(404, "Not Found", `Servitor ${tasksMatch[1]} not found`));
    }
    if (method === "GET") {
      const status = params.get("task_status");
      return LEDGER_SERVITOR_TASKS.filter(
        (t) => t.servitor_id === servitor.id && (!status || t.status === status),
      );
    }
    if (method === "POST") {
      const input = body as CreateServitorTaskInput;
      const row: ServitorTaskRead = {
        id: ledgerId("task"),
        servitor_id: servitor.id,
        description: input.description,
        given_at: input.given_at,
        target_completion_at: input.target_completion_at ?? null,
        completed_at: null,
        status: input.status ?? "pending",
        outcome_notes: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      LEDGER_SERVITOR_TASKS.unshift(row);
      return row;
    }
  }
  const servitorMatch = /^\/api\/v1\/servitors\/([^/]+)$/.exec(bare);
  if (servitorMatch) {
    const idx = LEDGER_SERVITORS.findIndex((s) => s.id === servitorMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Servitor ${servitorMatch[1]} not found`));
    }
    if (method === "GET") return LEDGER_SERVITORS[idx];
    if (method === "PATCH") {
      const next = mergeDefined(LEDGER_SERVITORS[idx]!, (body ?? {}) as UpdateServitorInput);
      next.updated_at = nowIso();
      LEDGER_SERVITORS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_SERVITORS.splice(idx, 1);
      return null;
    }
  }
  const taskMatch = /^\/api\/v1\/servitor-tasks\/([^/]+)$/.exec(bare);
  if (taskMatch) {
    const idx = LEDGER_SERVITOR_TASKS.findIndex((t) => t.id === taskMatch[1]);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Task ${taskMatch[1]} not found`));
    }
    if (method === "PATCH") {
      const next = mergeDefined(
        LEDGER_SERVITOR_TASKS[idx]!,
        (body ?? {}) as UpdateServitorTaskInput,
      );
      next.updated_at = nowIso();
      LEDGER_SERVITOR_TASKS[idx] = next;
      return next;
    }
    if (method === "DELETE") {
      LEDGER_SERVITOR_TASKS.splice(idx, 1);
      return null;
    }
  }

  return undefined;
}

// ── Magickal bundles fixture state + handler (v1-020) ───────────────
// Mirrors the seven real bundled packages in
// `backend/theourgia/core/bundles/bundled_content.py` — slugs, types,
// versions, per-kind counts, and licenses match the backend exactly.

/** Payload kinds with a v1 importer (mirror of the backend's
 *  KIND_IMPORTERS). Everything else is opaque-but-listed. */
const BUNDLE_IMPORTABLE_KINDS = new Set([
  "entities",
  "entry-templates",
  "tarot-spreads",
  "voces",
  "recipes",
]);

interface BundledPackageFixture extends BundledPackageRead {
  /** First bundle-level source citation (short form) — used for the
   *  install record's citation chip. */
  citation: string;
}

const HELLENIC_PACKAGE: BundledPackageFixture = {
  slug: "hellenic-pantheon",
  name: "Hellenic Pantheon",
  type: "pantheon",
  version: "1.0.0",
  description:
    "The twelve Olympians and Hekate — thirteen entities with epithets, domains, and the classically documented planetary attributions.",
  license: "CC0-1.0",
  item_counts: { entities: 13 },
  total_items: 13,
  citation: "Hesiod, Theogony; the Homeric Hymns (PD)",
};

const BUNDLED_PACKAGES: BundledPackageFixture[] = [
  HELLENIC_PACKAGE,
  {
    slug: "thelemic-ritual-set",
    name: "Thelemic Ritual Set",
    type: "ritual-set",
    version: "1.0.0",
    description:
      "Liber Resh, the Star Ruby (1913 text), and the Will meal saying — entry templates carrying the full public-domain texts.",
    license: "LicenseRef-Public-Domain",
    item_counts: { "entry-templates": 3 },
    total_items: 3,
    citation: "Crowley, The Equinox I(6), 1911 (PD)",
  },
  {
    slug: "classic-tarot-spreads",
    name: "Classic Tarot Spreads",
    type: "tarot-spreads",
    version: "1.0.0",
    description:
      "Five traditional layouts — Celtic Cross, Three Card, Horseshoe, Tree of Life, and a thirteen-card Year Ahead.",
    license: "CC0-1.0",
    item_counts: { "tarot-spreads": 5 },
    total_items: 5,
    citation: "Waite, The Pictorial Key to the Tarot (1911, PD)",
  },
  {
    slug: "pgm-voces-selection",
    name: "PGM Voces — a Further Selection",
    type: "voces-library",
    version: "1.0.0",
    description:
      "Twelve voces magicae from the Greek Magical Papyri, each with its PGM reference, none duplicating the bundled Workshop corpus.",
    license: "LicenseRef-Public-Domain",
    item_counts: { voces: 12 },
    total_items: 12,
    citation: "PGM, Preisendanz ed. 1928-31 (PD)",
  },
  {
    slug: "planetary-correspondences",
    name: "Planetary Correspondences (Agrippa)",
    type: "correspondences",
    version: "1.0.0",
    description:
      "The classical seven-planet table per Agrippa (1533). No v1 importer for this kind — imports as a listed reference document.",
    license: "CC0-1.0",
    item_counts: { correspondences: 7 },
    total_items: 7,
    citation: "Agrippa, De Occulta Philosophia (1533, PD)",
  },
  {
    slug: "traditional-incense-recipes",
    name: "Traditional Incense Recipes",
    type: "recipe-book",
    version: "1.0.0",
    description:
      "Six documented historical formulas: two kyphi, the Exodus temple compound, two Orphic rubrics, and the seven planetary fumes.",
    license: "CC0-1.0",
    item_counts: { recipes: 6 },
    total_items: 6,
    citation: "Plutarch, De Iside et Osiride §80 (PD)",
  },
  {
    slug: "dream-symbols-traditional",
    name: "Traditional Dream Symbols",
    type: "dream-symbols",
    version: "1.0.0",
    description:
      "Forty symbols with traditional meanings, citing Artemidorus or the folk tradition each compiles. No v1 importer for this kind.",
    license: "CC0-1.0",
    item_counts: { "dream-symbols": 40 },
    total_items: 40,
    citation: "Artemidorus, Oneirocritica (2nd c. CE, PD)",
  },
];

let BUNDLE_SEQ = 0;

function makeInstalledBundle(pkg: BundledPackageFixture): InstalledBundleRead {
  BUNDLE_SEQ += 1;
  const importable = Object.entries(pkg.item_counts)
    .filter(([kind]) => BUNDLE_IMPORTABLE_KINDS.has(kind))
    .reduce((sum, [, count]) => sum + count, 0);
  return {
    id: `ib-${pkg.slug}-${BUNDLE_SEQ}`,
    slug: pkg.slug,
    version: pkg.version,
    name: pkg.name,
    type: pkg.type,
    signature_verdict: "unsigned",
    imported_item_count: importable,
    closed_tradition: false,
    attribution: `${pkg.name} v${pkg.version} by Theourgia Project — ${pkg.license} (public-domain). Sources: ${pkg.citation}`,
    provenance: [],
    installed_at: nowIso(),
    author_name: "Theourgia Project",
    description: pkg.description,
    license_spdx: pkg.license,
    source_citation: pkg.citation,
    item_counts: { ...pkg.item_counts },
  };
}

/** Seeded with one install so the /bundles surface is alive in mock
 *  mode; bundledImport appends to it within the page session. */
const INSTALLED_BUNDLES: InstalledBundleRead[] = [
  { ...makeInstalledBundle(HELLENIC_PACKAGE), installed_at: "2026-07-16T00:00:00Z" },
];

/** Federation peer directory (v1-026). Deliberately EMPTY at seed —
 *  the Network Browser never pretends peers exist; POST appends
 *  within the page session. */
const FEDERATION_PEERS: FederationPeerRead[] = [];
let PEER_SEQ = 0;

function bundleImportResults(pkg: BundledPackageFixture): BundleImportItemResultWire[] {
  const results: BundleImportItemResultWire[] = [];
  for (const [kind, count] of Object.entries(pkg.item_counts)) {
    const importable = BUNDLE_IMPORTABLE_KINDS.has(kind);
    for (let i = 1; i <= count; i += 1) {
      results.push({
        ref: `${kind}-${i}`,
        kind,
        status: importable ? "imported" : "skipped",
        detail: importable ? "" : `kind '${kind}' has no v1 importer — listed but not materialized`,
        created_id: importable ? `row-${kind}-${i}` : null,
      });
    }
  }
  return results;
}

function bundlesFixture(method: string, bare: string): unknown {
  if (bare === "/api/v1/bundles/installed" && method === "GET") {
    return { bundles: [...INSTALLED_BUNDLES] };
  }

  // DELETE /api/v1/bundles/installed/{id} — uninstall (v1-033).
  // Removes the install record and NOTHING else: imported content
  // stays (MBF tombstone-not-erasure), and the response says so.
  const uninstallMatch = /^\/api\/v1\/bundles\/installed\/([^/]+)$/.exec(bare);
  if (uninstallMatch && method === "DELETE") {
    const idx = INSTALLED_BUNDLES.findIndex((b) => b.id === uninstallMatch[1]);
    if (idx < 0) {
      return new NotFoundError(
        problem(404, "Not Found", `installed bundle ${uninstallMatch[1]} not found`),
      );
    }
    const [removed] = INSTALLED_BUNDLES.splice(idx, 1);
    return {
      removed_id: removed!.id,
      slug: removed!.slug,
      version: removed!.version,
      imported_content_retained: true,
      detail:
        "Install record removed. Content imported from this bundle " +
        "(entities, templates, recipes, …) stays in your vault — bundle " +
        "removal is a tombstone, not an erasure.",
    };
  }

  if (bare === "/api/v1/bundles/bundled" && method === "GET") {
    return {
      bundles: BUNDLED_PACKAGES.map(({ citation: _citation, ...pkg }) => pkg),
    };
  }

  const bundledImportMatch = /^\/api\/v1\/bundles\/bundled\/([^/]+)\/import$/.exec(bare);
  if (bundledImportMatch && method === "POST") {
    const pkg = BUNDLED_PACKAGES.find((b) => b.slug === bundledImportMatch[1]);
    if (!pkg) {
      return new NotFoundError(
        problem(404, "Not Found", `unknown bundled package '${bundledImportMatch[1]}'`),
      );
    }
    const installed = makeInstalledBundle(pkg);
    INSTALLED_BUNDLES.unshift(installed);
    const results = bundleImportResults(pkg);
    const imported = results.filter((r) => r.status === "imported").length;
    return {
      installed_bundle_id: installed.id,
      attribution: installed.attribution,
      signature_verdict: "unsigned",
      results,
      imported,
      skipped: results.length - imported,
      total: results.length,
    };
  }

  if (bare === "/api/v1/bundles/preview" && method === "POST") {
    // Mock mode cannot open the uploaded zip — return a canonical
    // preview shaped like the backend's (unsigned verdict, warn not
    // block).
    const pkg = HELLENIC_PACKAGE;
    return {
      manifest: {
        mbf_version: 1,
        type: pkg.type,
        name: pkg.name,
        slug: pkg.slug,
        version: pkg.version,
        description: pkg.description,
      },
      signature: { verdict: "unsigned", reason: "no signature.json present" },
      unsigned_warning:
        "This bundle is unsigned — its origin cannot be verified. Import proceeds with this warning; unsigned bundles are warned about, never blocked.",
      items: bundleImportResults(pkg).map((r) => ({
        ref: r.ref,
        kind: r.kind,
        display_name: r.ref,
        importable: r.status === "imported",
      })),
      license: { spdx: pkg.license, magickal_tags: ["public-domain"] },
      attribution: `${pkg.name} v${pkg.version} by Theourgia Project — ${pkg.license}`,
      closed_tradition: false,
      closed_tradition_note: "",
      respect_source_notice: null,
      closed_tradition_conflicts: [],
      conflicts: { entity_names: [], installed_bundle_slug: false },
    };
  }

  if (bare === "/api/v1/bundles/import" && method === "POST") {
    const pkg = HELLENIC_PACKAGE;
    const installed = makeInstalledBundle(pkg);
    INSTALLED_BUNDLES.unshift(installed);
    const results = bundleImportResults(pkg);
    return {
      installed_bundle_id: installed.id,
      attribution: installed.attribution,
      signature_verdict: "unsigned",
      results,
      imported: results.length,
      skipped: 0,
      total: results.length,
    };
  }

  if (bare === "/api/v1/bundles/export" && method === "GET") {
    // A tiny stand-in blob — the real endpoint streams the .mbf zip.
    return new Blob(["mock-mbf-container"], { type: "application/zip" });
  }

  return undefined;
}

// ── Federation peer directory fixture state + handler (v1-026) ──────

function federationPeersFixture(method: string, bare: string, body: unknown): unknown {
  // Starts EMPTY — the Network Browser's honesty rule: never pretend
  // peers exist. Adding in mock mode simulates a successful actor
  // verification.
  if (bare === "/api/v1/federation/peers") {
    if (method === "GET") return [...FEDERATION_PEERS];
    if (method === "POST") {
      const input = (body ?? {}) as { base_url?: string; label?: string | null };
      const baseUrl = (input.base_url ?? "").replace(/\/+$/, "");
      const host = baseUrl.replace(/^https?:\/\//, "");
      const now = new Date().toISOString();
      PEER_SEQ += 1;
      const created: FederationPeerCreated = {
        id: `peer-${PEER_SEQ}`,
        base_url: baseUrl,
        instance_did: `did:theourgia:${host}`,
        label: input.label ?? null,
        status: "successful",
        added_at: now,
        last_seen_at: now,
        capability_token: "mock-capability-token",
      };
      const { capability_token: _token, ...listed } = created;
      FEDERATION_PEERS.push(listed);
      return created;
    }
  }

  const peerMatch = /^\/api\/v1\/federation\/peers\/([^/]+)$/.exec(bare);
  if (peerMatch && method === "DELETE") {
    const idx = FEDERATION_PEERS.findIndex((p) => p.id === peerMatch[1]);
    if (idx >= 0) FEDERATION_PEERS.splice(idx, 1);
    return null;
  }

  return undefined;
}

// ── Mode A vault-key rotation fixture state + handler (v1-027) ──────
//
// The mock vault ships with one prior rotation in history so the
// trusted-history list renders. POST /keys/rotate retires the current
// key and starts a "running" rotation; the NEXT status poll completes
// it and appends to history — one round-trip of visible progress
// without timers.

let KEY_SEQ = 1;

function mockFingerprint(): string {
  // 64 hex chars, deterministic per key within a page session.
  const seed = `mock-vault-key-${KEY_SEQ}`;
  let out = "";
  for (let i = 0; out.length < 64; i += 1) {
    const code = seed.charCodeAt(i % seed.length) * (i + 7) * KEY_SEQ;
    out += (code % 256).toString(16).padStart(2, "0");
  }
  return out.slice(0, 64);
}

function mintMockKey(createdAt: string): KeyRotationCurrentKey {
  KEY_SEQ += 1;
  return {
    key_id: `vk-${KEY_SEQ.toString().padStart(4, "0")}`,
    fingerprint_sha256: mockFingerprint(),
    created_at: createdAt,
  };
}

const KEY_ROTATION_STATE: {
  current: KeyRotationCurrentKey;
  rotation: KeyRotationRead | null;
  pendingRetireFingerprint: string | null;
  history: KeyRotationHistoryItem[];
} = {
  current: mintMockKey("2026-05-04T09:00:00Z"),
  rotation: {
    id: "rot-0001",
    state: "done",
    rows_total: 34,
    rows_done: 34,
    started_at: "2026-05-04T09:00:00Z",
    finished_at: "2026-05-04T09:02:00Z",
    error: null,
  },
  pendingRetireFingerprint: null,
  history: [
    {
      rotation_id: "rot-0001",
      state: "done",
      retired_key_fingerprint_sha256:
        "3f2a9c81d5b04e7f6a1c8d92e0b35f47a6d1c0e9b82f5a34c7d60e18f92ab450",
      retired_at: "2026-05-04T09:02:00Z",
      rows_total: 34,
      rows_done: 34,
    },
  ],
};

function keyRotationFixture(method: string, bare: string): unknown {
  if (bare === "/api/v1/keys/rotate" && method === "POST") {
    const now = nowIso();
    KEY_ROTATION_STATE.pendingRetireFingerprint = KEY_ROTATION_STATE.current.fingerprint_sha256;
    KEY_ROTATION_STATE.current = mintMockKey(now);
    KEY_ROTATION_STATE.rotation = {
      id: `rot-${Date.now()}`,
      state: "running",
      rows_total: 34,
      rows_done: 8,
      started_at: now,
      finished_at: null,
      error: null,
    };
    return {
      current_key: { ...KEY_ROTATION_STATE.current },
      rotation: { ...KEY_ROTATION_STATE.rotation },
    } satisfies KeyRotationStatusResponse;
  }

  if (bare === "/api/v1/keys/rotation-status" && method === "GET") {
    const rotation = KEY_ROTATION_STATE.rotation;
    if (rotation && rotation.state === "running") {
      const now = nowIso();
      rotation.state = "done";
      rotation.rows_done = rotation.rows_total;
      rotation.finished_at = now;
      KEY_ROTATION_STATE.history.unshift({
        rotation_id: rotation.id,
        state: "done",
        retired_key_fingerprint_sha256: KEY_ROTATION_STATE.pendingRetireFingerprint,
        retired_at: now,
        rows_total: rotation.rows_total,
        rows_done: rotation.rows_done,
      });
      KEY_ROTATION_STATE.pendingRetireFingerprint = null;
    }
    return {
      current_key: { ...KEY_ROTATION_STATE.current },
      rotation: rotation ? { ...rotation } : null,
    } satisfies KeyRotationStatusResponse;
  }

  if (bare === "/api/v1/keys/history" && method === "GET") {
    return { items: KEY_ROTATION_STATE.history.map((h) => ({ ...h })) };
  }

  return undefined;
}
