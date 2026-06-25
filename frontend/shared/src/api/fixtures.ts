/**
 * Built-in fixtures for mock-mode ApiClient.
 *
 * Surfaces in dev should call ``new ApiClient({ mock: true, fixtureFor:
 * defaultFixtures })`` to get realistic-shaped data without a backend
 * connection.
 */

import { NotFoundError } from "./errors.js";
import type {
  AltarRecordWire,
  BookRecord,
  BundledVoce,
  CircleRecord,
  CreateAltarInput,
  CreateBookInput,
  CreateCircleInput,
  CreateEntryInput,
  CreateMagicSquareInput,
  CreateSigilInput,
  CreateTalismanInput,
  CreateToolInput,
  CreateVoceInput,
  EntryDetailRecord,
  EntryRecord,
  EntryStats,
  EntryType,
  HealthStatus,
  MagicSquareRecord,
  Meta,
  PlanetarySquareWire,
  PresetCircle,
  Problem,
  Session,
  SigilRecord,
  TalismanRecord,
  ToolRecordWire,
  VoceRecordWire,
  TodayLedger,
} from "./types.js";

/**
 * Body store for `getEntryDetail` / `updateEntryBody` fixtures. Keyed
 * by entry id. Empty default means "empty draft" — the editor mounts
 * `EMPTY_DOC` and an auto-save round-trips.
 */
const ENTRY_BODIES: Map<string, string> = new Map();

/**
 * Per-entry visibility + sealed + published_at state for the
 * detail/PATCH fixtures. Defaults: personal · not-sealed · not-published.
 */
type EntryMeta = Pick<EntryDetailRecord, "visibility" | "sealed" | "published_at">;
const ENTRY_META: Map<string, EntryMeta> = new Map();

function entryMeta(id: string): EntryMeta {
  return (
    ENTRY_META.get(id) ?? { visibility: "personal", sealed: false, published_at: null }
  );
}

/**
 * Compose an `EntryDetailRecord` from a lean entry + the body store.
 * Used by the GET `/entries/{id}` + PATCH `/entries/{id}/body` +
 * POST `/entries/{id}/publish` fixture handlers.
 */
function entryDetail(
  e: EntryRecord,
  over: Partial<EntryDetailRecord> = {},
): EntryDetailRecord {
  return {
    ...e,
    body: ENTRY_BODIES.get(e.id) ?? "",
    ...entryMeta(e.id),
    ...over,
  };
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
  display_name: "Soror Ευ. Α.",
  magickal_name: "Soror Ευ. Α.",
  vault_id: "demo-vault",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const MOCK_LOCATION = { lat: 51.4769, lng: 0 };

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
          description:
            "Initiation as Minerval in the Lyceum tradition.",
          signer_label: "Frater Lykourgos",
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
  if (path === "/api/v1/today/ledger") return todayLedger();

  if (path === "/api/v1/auth/session") {
    if (method === "GET") return SESSION;
    if (method === "DELETE") return null;
  }

  if (path === "/api/v1/auth/demo-signin") {
    if (method === "POST") {
      // Mock mode synthesises a session from the submitted name.
      const input = (body ?? {}) as { magickal_name?: string };
      const name = input.magickal_name ?? "Soror Ευ. Α.";
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
        id: String(Date.now()),
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

  if (bare === "/api/v1/users/me/settings/location") {
    if (method === "GET") return { ...MOCK_LOCATION };
    if (method === "PUT") {
      const input = (body ?? {}) as { lat?: number; lng?: number };
      if (typeof input.lat === "number") MOCK_LOCATION.lat = input.lat;
      if (typeof input.lng === "number") MOCK_LOCATION.lng = input.lng;
      return { ...MOCK_LOCATION };
    }
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
        { body_id: "sun", body_name: "Sun", glyph: "☉", tropical_longitude: 12.5, tropical_sign: "Aries", house: 1, is_retrograde: false },
        { body_id: "moon", body_name: "Moon", glyph: "☽", tropical_longitude: 92.0, tropical_sign: "Cancer", house: 4, is_retrograde: false },
        { body_id: "mercury", body_name: "Mercury", glyph: "☿", tropical_longitude: 18.0, tropical_sign: "Aries", house: 1, is_retrograde: false },
        { body_id: "venus", body_name: "Venus", glyph: "♀", tropical_longitude: 38.0, tropical_sign: "Taurus", house: 2, is_retrograde: false },
        { body_id: "mars", body_name: "Mars", glyph: "♂", tropical_longitude: 145.0, tropical_sign: "Leo", house: 5, is_retrograde: false },
        { body_id: "jupiter", body_name: "Jupiter", glyph: "♃", tropical_longitude: 195.0, tropical_sign: "Libra", house: 7, is_retrograde: false },
        { body_id: "saturn", body_name: "Saturn", glyph: "♄", tropical_longitude: 285.0, tropical_sign: "Capricorn", house: 10, is_retrograde: true },
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
      const patch = (body ?? {}) as Partial<EntryRecord> & {
        visibility?: EntryMeta["visibility"];
        sealed?: boolean;
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
      // Persist visibility / sealed into the meta store so subsequent
      // detail reads see the new values.
      if (patch.visibility !== undefined || patch.sealed !== undefined) {
        const existing = entryMeta(id!);
        ENTRY_META.set(id!, {
          ...existing,
          ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
          ...(patch.sealed !== undefined ? { sealed: patch.sealed } : {}),
        });
      }
      return updated;
    }
    // GET — returns the detail record (superset of the lean record).
    // The lean `EntryRecord` shape is what older callers read; new
    // `getEntryDetail` callers read body / visibility / sealed / published_at.
    return entryDetail(ENTRIES[idx]!);
  }

  // ── Phase 07 Workshop fixtures (B108-2) ──────────────────────────

  if (bare !== undefined) {
    const workshop = workshopFixture(method, bare, qs, body);
    if (workshop !== undefined) return workshop;
  }

  return new NotFoundError(problem(404, "Not Found", `No fixture for ${method} ${path}`));
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
    citation:
      "Israel Regardie, The Golden Dawn (1937–40), PD per first-publication.",
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

function workshopFixture(
  method: string,
  bare: string,
  _qs: string,
  body: unknown,
): unknown {
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Sigil ${id} not found`),
      );
    if (sub === "fork" && method === "POST") {
      const parent = SIGILS[idx]!;
      const fork: SigilRecord = {
        ...parent,
        id: workshopId(),
        title: ((body as { title?: string })?.title) ?? `${parent.title} — new version`,
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
      return new NotFoundError(
        problem(404, "Not Found", `Magic square ${id} not found`),
      );
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
        linked_consecration_working_id:
          input.linked_consecration_working_id ?? null,
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Talisman ${id} not found`),
      );
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
      const name =
        ((body as { name?: string })?.name) ?? `${row.name} — new version`;
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Circle ${id} not found`),
      );
    const row = CIRCLES[idx]!;
    if (sub === "fork" && method === "POST") {
      const name =
        ((body as { name?: string })?.name) ?? `${row.name} — new version`;
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Tool ${id} not found`),
      );
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
        row.photo_upload_ids = row.photo_upload_ids.filter(
          (p) => p !== subId,
        );
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Altar ${id} not found`),
      );
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
    if (idx < 0)
      return new NotFoundError(
        problem(404, "Not Found", `Voce ${id} not found`),
      );
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

  return undefined;
}

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
