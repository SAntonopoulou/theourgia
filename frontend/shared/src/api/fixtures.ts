/**
 * Built-in fixtures for mock-mode ApiClient.
 *
 * Surfaces in dev should call ``new ApiClient({ mock: true, fixtureFor:
 * defaultFixtures })`` to get realistic-shaped data without a backend
 * connection.
 */

import { NotFoundError } from "./errors.js";
import type {
  CreateEntryInput,
  EntryRecord,
  HealthStatus,
  Meta,
  Problem,
  Session,
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

  if (path === "/api/v1/auth/session") {
    if (method === "GET") return SESSION;
    if (method === "DELETE") return null;
  }

  if (path === "/api/v1/entries") {
    if (method === "GET") return [...ENTRIES];
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

  const entryMatch = /^\/api\/v1\/entries\/(.+)$/.exec(path);
  if (entryMatch) {
    const [, id] = entryMatch;
    const found = ENTRIES.find((e) => e.id === id);
    if (!found) {
      return new NotFoundError(problem(404, "Not Found", `Entry ${id} not found`));
    }
    return found;
  }

  return new NotFoundError(problem(404, "Not Found", `No fixture for ${method} ${path}`));
}
