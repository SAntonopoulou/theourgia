/**
 * Built-in fixtures for mock-mode ApiClient.
 *
 * Surfaces in dev should call ``new ApiClient({ mock: true, fixtureFor:
 * defaultFixtures })`` to get realistic-shaped data without a backend
 * connection.
 */

import { NotFoundError } from "./errors.js";
import type {
  BookRecord,
  CreateBookInput,
  CreateEntryInput,
  EntryRecord,
  EntryStats,
  EntryType,
  HealthStatus,
  Meta,
  Problem,
  Session,
  TodayLedger,
} from "./types.js";

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

  const entryMatch = /^\/api\/v1\/entries\/(.+)$/.exec(bare ?? "");
  if (entryMatch) {
    const [, id] = entryMatch;
    const idx = ENTRIES.findIndex((e) => e.id === id);
    if (idx < 0) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    if (method === "DELETE") {
      ENTRIES.splice(idx, 1);
      return null;
    }
    if (method === "PATCH") {
      const patch = (body ?? {}) as Partial<EntryRecord>;
      const current = ENTRIES[idx] as EntryRecord;
      const updated: EntryRecord = {
        ...current,
        ...patch,
        id: current.id,
        created_at: current.created_at,
        updated_at: new Date().toISOString(),
      };
      ENTRIES[idx] = updated;
      return updated;
    }
    return ENTRIES[idx];
  }

  return new NotFoundError(problem(404, "Not Found", `No fixture for ${method} ${path}`));
}
