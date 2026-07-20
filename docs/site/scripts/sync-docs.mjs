#!/usr/bin/env node
// -----------------------------------------------------------------------------
// sync-docs.mjs — wire the real repository docs into the Starlight site.
//
// The published documentation site (this Astro Starlight project) is a *view*
// onto the canonical Markdown that lives at the repository root under
// docs/{user,admin,dev,developer,ops}. Rather than duplicate that content in
// git, this script copies each source file into src/content/docs/<section>/,
// stamping the Starlight frontmatter Astro needs (title from the H1, a short
// description, sidebar order, and an editUrl that points back at the true
// source file on GitHub). It also renders a native, zero-JavaScript API
// reference from the committed OpenAPI snapshot at public/openapi.json.
//
// The generated content directories are gitignored — running `pnpm build`
// (or `pnpm dev`) regenerates them from the single source of truth. Nothing
// here reaches out to the network: the site keeps its "no third-party scripts,
// zero telemetry" guarantee.
//
// Run automatically via the `prebuild` / `predev` npm lifecycle hooks, or by
// hand with `pnpm sync`.
// -----------------------------------------------------------------------------

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(__dirname, ".."); // docs/site
const DOCS_DIR = resolve(SITE_DIR, ".."); // docs
const CONTENT = join(SITE_DIR, "src", "content", "docs");

const GH = "https://github.com/SAntonopoulou/theourgia";
const GH_BLOB = `${GH}/blob/main`;
const GH_EDIT = `${GH}/edit/main`;

// -----------------------------------------------------------------------------
// Section configuration. `src` is the directory under docs/, `out` is the
// directory under src/content/docs/. `order` lists basenames (without .md) in
// the desired sidebar order; anything not listed sorts after, alphabetically.
// `realIndex` means the section ships its own index.md; otherwise a synthetic
// landing page (`intro`) is generated. `exclude` drops source files entirely.
// -----------------------------------------------------------------------------
const SECTIONS = [
  {
    src: "user",
    out: "user",
    realIndex: true,
    order: [
      "getting-started",
      "journal",
      "calendars-and-sky",
      "beings",
      "divination",
      "practice",
      "workshop",
      "linguistic-tools",
      "analytics",
      "media-and-pilgrimage",
      "publishing",
      "federation",
      "plugins-and-bundles",
      "ai-agents",
      "settings-and-security",
      "digital-inheritance",
    ],
  },
  {
    src: "admin",
    out: "admin",
    order: [
      "runbooks",
      "disaster-recovery",
      "observability",
      "storage",
      "email",
      "i18n",
      "kubernetes",
      "breach-notification-runbook",
      "dpia-template",
      "privacy-policy-template",
    ],
    intro: {
      title: "Self-hosting & operations",
      description:
        "Runbooks, disaster recovery, observability, and compliance templates for operating a Theourgia instance.",
      body: `Everything an operator needs to run a Theourgia instance in production: day-to-day runbooks, total-loss recovery, what the instance logs and measures, object storage and email wiring, a Kubernetes path, and the GDPR paperwork self-hosters can adapt.

Theourgia is live at [theourgia.com](https://theourgia.com) and fully self-hostable. Start with the [production deployment runbook](/ops/deployment_runbook/), keep the [operations runbooks](/admin/runbooks/) within reach, and read the [disaster-recovery runbook](/admin/disaster-recovery/) *before* you need it.

The compliance material — the [DPIA template](/admin/dpia-template/), the [breach-notification runbook](/admin/breach-notification-runbook/), and the [privacy-policy template](/admin/privacy-policy-template/) — is provided so network-hub operators can build their own GDPR posture. It is a starting point, not legal advice.`,
    },
  },
  {
    src: "ops",
    out: "ops",
    exclude: ["OVERNIGHT_HANDOFF.md", "COMPLETION_MANIFEST.md"],
    order: [
      "DEPLOYMENT_RUNBOOK",
      "R2_BUCKETS",
      "INCIDENT-2026-07-20-celery-never-ran",
      "twin-instance-federation-test-2026-07-20",
      "PERF_AUDIT_2026-07-05",
      "ACCESSIBILITY_SWEEP_2026-07-05",
    ],
    intro: {
      title: "Operations log",
      description:
        "Deployment runbook, provisioning notes, and the transparency record — incident reports, federation tests, and performance / accessibility audits.",
      body: `The operational record for the production instance. The [deployment runbook](/ops/deployment_runbook/) walks a first-time operator through standing up a fresh host; [R2 buckets](/ops/r2_buckets/) documents the provisioned storage.

The rest is transparency: a public [incident report](/ops/incident-2026-07-20-celery-never-ran/), a [twin-instance federation test](/ops/twin-instance-federation-test-2026-07-20/), and the pre-v1.0 [performance](/ops/perf_audit_2026-07-05/) and [accessibility](/ops/accessibility_sweep_2026-07-05/) audits. We publish what we measured, including what broke.`,
    },
  },
  {
    src: "dev",
    out: "dev",
    order: [
      "testing",
      "authorization",
      "events",
      "notifications",
      "cache",
      "clock",
      "email",
      "i18n",
      "gdpr",
      "storage",
      "rate-limit-and-idempotency",
      "instance-settings",
      "user-settings",
      "persona",
      "transcription",
      "ai-agents",
    ],
    intro: {
      title: "Substrate internals",
      description:
        "Developer guides to the cross-cutting substrates — auth, events, notifications, caching, storage, GDPR, i18n, and the testing strategy.",
      body: `Theourgia routes every cross-cutting concern through a dedicated substrate rather than scattering it inline. These guides document each one from the inside: how it is wired, the extension points, and the invariants a contributor must preserve.

Start with the [testing guide](/dev/testing/) for how the suite is organised, then reach for the substrate that touches the code you are changing — [authorization](/dev/authorization/), [domain events](/dev/events/), [notifications](/dev/notifications/), [cache](/dev/cache/), [storage](/dev/storage/), the [GDPR substrate](/dev/gdpr/), and [i18n](/dev/i18n/).`,
    },
  },
  {
    src: "developer",
    out: "developer",
    order: ["plugin-tutorial", "mbf", "federation-protocol"],
    intro: {
      title: "Building on Theourgia",
      description:
        "Author a plugin, produce and consume Magickal Bundles, and speak the native federation protocol.",
      body: `Guides for building *on top of* Theourgia rather than inside it. Write a plugin against the stable SDK, produce and consume the [Magickal Bundle Format](/developer/mbf/) for sharing knowledge between magicians and hubs, and implement the [federation protocol](/developer/federation-protocol/) to interoperate with other instances.

New to plugin authoring? Start with the [plugin tutorial](/developer/plugin-tutorial/). For the substrate internals behind these surfaces, see [Substrate internals](/dev/).`,
    },
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** POSIX-normalize a `/`-joined path, collapsing `.` and `..` segments. */
function posixNormalize(p) {
  const parts = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/** List the Markdown files (basenames) directly inside a directory. */
function listMd(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

/** Starlight slug for a section file. `index.md` maps to the section root. */
function slugFor(out, file) {
  const b = basename(file, ".md");
  return b === "index" ? `/${out}/` : `/${out}/${b}/`;
}

/** Sidebar order: index first, then the configured order, then the rest. */
function orderFor(section, file) {
  const b = basename(file, ".md");
  if (b === "index") return 0;
  const idx = (section.order || []).indexOf(b);
  return idx >= 0 ? idx + 1 : 500;
}

/** Build the YAML frontmatter block. */
function frontmatter({ title, description, order, editUrl }) {
  const lines = ["---", `title: ${JSON.stringify(title)}`];
  if (description) lines.push(`description: ${JSON.stringify(description)}`);
  lines.push("sidebar:", `  order: ${order}`);
  if (editUrl === false) lines.push("editUrl: false");
  else if (editUrl) lines.push(`editUrl: ${JSON.stringify(editUrl)}`);
  lines.push("---", "");
  return lines.join("\n");
}

/** Split the leading H1 off the body and return { title, body }. */
function extractTitle(raw, fallback) {
  const lines = raw.replace(/^﻿/, "").split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const m = lines[i] && lines[i].match(/^#\s+(.+?)\s*$/);
  let title = fallback;
  if (m) {
    title = m[1].replace(/`/g, "").trim();
    i++;
    if (lines[i] !== undefined && lines[i].trim() === "") i++;
  }
  const body = lines.slice(i).join("\n").replace(/\s+$/g, "") + "\n";
  return { title, body };
}

/** Derive a ~155-char plain-text description from the first real paragraph. */
function makeDescription(body) {
  for (const para of body.split(/\n\s*\n/)) {
    let t = para.trim();
    if (!t) continue;
    if (/^(#|\||```|>|[-*+]\s|\d+\.\s)/.test(t)) continue;
    t = t
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\*\*([^*]*)\*\*/g, "$1")
      .replace(/\*([^*]*)\*/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (t.length < 20) continue;
    if (t.length > 155) t = t.slice(0, 155).replace(/\s+\S*$/, "") + "…";
    return t;
  }
  return null;
}

/**
 * Rewrite relative `.md` links so they resolve on the built site. Links that
 * point at another wired page become Starlight slugs; anything else (files
 * outside the docs tree, or docs we do not publish) becomes a GitHub blob URL
 * so the reference is never a dead in-site link.
 */
function rewriteLinks(body, srcDir, slugMap) {
  return body.replace(
    /\]\((\.\.?\/[^)\s#]+\.md)(#[^)\s]*)?\)/g,
    (_full, rel, anchor) => {
      anchor = anchor || "";
      const repoPath = posixNormalize(`docs/${srcDir}/${rel}`);
      if (slugMap.has(repoPath)) return `](${slugMap.get(repoPath)}${anchor})`;
      return `](${GH_BLOB}/${repoPath}${anchor})`;
    },
  );
}

/** Remove and recreate a directory so no stale generated files survive. */
function resetDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

// -----------------------------------------------------------------------------
// Build the global slug map (every wired, non-excluded source file).
// -----------------------------------------------------------------------------
const slugMap = new Map();
for (const sec of SECTIONS) {
  const files = listMd(join(DOCS_DIR, sec.src)).filter(
    (f) => !(sec.exclude || []).includes(f),
  );
  for (const f of files) slugMap.set(`docs/${sec.src}/${f}`, slugFor(sec.out, f));
}

// -----------------------------------------------------------------------------
// Generate each documentation section.
// -----------------------------------------------------------------------------
let written = 0;
for (const sec of SECTIONS) {
  const srcPath = join(DOCS_DIR, sec.src);
  const outPath = join(CONTENT, sec.out);
  resetDir(outPath);

  const files = listMd(srcPath).filter(
    (f) => !(sec.exclude || []).includes(f),
  );

  for (const file of files) {
    const raw = readFileSync(join(srcPath, file), "utf8");
    const { title, body } = extractTitle(raw, basename(file, ".md"));
    const rewritten = rewriteLinks(body, sec.src, slugMap);
    const fm = frontmatter({
      title,
      description: makeDescription(rewritten),
      order: orderFor(sec, file),
      editUrl: `${GH_EDIT}/docs/${sec.src}/${file}`,
    });
    writeFileSync(join(outPath, file), fm + rewritten);
    written++;
  }

  // Synthetic landing page for sections that ship no index.md.
  if (!sec.realIndex && sec.intro) {
    const fm = frontmatter({
      title: sec.intro.title,
      description: sec.intro.description,
      order: 0,
      editUrl: false,
    });
    writeFileSync(join(outPath, "index.md"), fm + sec.intro.body + "\n");
    written++;
  }
}

// -----------------------------------------------------------------------------
// Generate the native API reference from the committed OpenAPI snapshot.
// -----------------------------------------------------------------------------
const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

function generateApiReference() {
  const specPath = join(SITE_DIR, "public", "openapi.json");
  if (!existsSync(specPath)) {
    console.warn(
      "[sync-docs] public/openapi.json missing — skipping API reference.",
    );
    return 0;
  }
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const outPath = join(CONTENT, "reference");
  resetDir(outPath);

  // Collect operations grouped by tag.
  const byTag = new Map();
  let opCount = 0;
  let securedCount = 0;
  for (const [p, ops] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(ops)) {
      if (!METHODS.includes(method)) continue;
      opCount++;
      const secured = Array.isArray(op.security) && op.security.length > 0;
      if (secured) securedCount++;
      const tags = op.tags && op.tags.length ? op.tags : ["(untagged)"];
      for (const tag of tags) {
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag).push({
          method: method.toUpperCase(),
          path: p,
          summary: op.summary || "",
          secured,
        });
      }
    }
  }
  const tags = [...byTag.keys()].sort((a, b) => a.localeCompare(b));
  const version = spec.info?.version || "unknown";
  const openapiVersion = spec.openapi || "3.1";

  // ---- Overview page ----
  const tagRows = tags
    .map((t) => `| \`${t}\` | ${byTag.get(t).length} |`)
    .join("\n");
  const overview = `${frontmatter({
    title: "API reference",
    description:
      "The Theourgia HTTP API — versioning, authentication, and the machine-readable OpenAPI specification.",
    order: 1,
    editUrl: false,
  })}Theourgia exposes its entire surface — the journal, entities, divinations, sigils, publishing, federation primitives, and admin operations — over a versioned HTTP API. Everything the React admin does, the API does; there are no private endpoints.

- **Base path** — every application endpoint is versioned under \`/api/v1\`.
- **Format** — JSON request and response bodies.
- **Authentication** — a bearer token issued by \`POST /api/v1/auth/login\`. Send it as \`Authorization: Bearer <token>\`. Of the ${opCount} documented operations, ${securedCount} require authentication.
- **Errors** — a consistent problem shape with a stable \`X-Request-ID\` you can quote in a support request (see the [observability runbook](/admin/observability/)).

## The specification

The complete, machine-readable specification is served as a static file:

- **[Download \`openapi.json\`](/openapi.json)** — OpenAPI ${openapiVersion}, snapshot of build \`${version}\`.

Because this documentation site ships **zero third-party scripts and zero telemetry** — a guarantee [verified in CI](/start/privacy/) — it does not embed a hosted API explorer. Instead, load the specification into the OpenAPI-aware tool you already trust:

- Import \`/openapi.json\` into **Scalar**, **Redoc**, **Swagger UI**, **Insomnia**, or **Postman** for an interactive explorer.
- Generate a typed client with **openapi-typescript**, **openapi-generator**, or your language's equivalent.
- On a development instance, the backend also serves Swagger UI at \`/api/docs\` and Redoc at \`/api/redoc\`.

## Endpoints at a glance

A browsable catalogue of every operation, grouped by tag, lives on the **[API endpoints](/reference/api-endpoints/)** page. The ${opCount} operations span ${tags.length} tags:

| Tag | Operations |
|---|---|
${tagRows}
`;
  writeFileSync(join(outPath, "api.md"), overview);

  // ---- Endpoint catalogue ----
  let cat = frontmatter({
    title: "API endpoints",
    description: `A complete catalogue of the ${opCount} Theourgia API operations, grouped by tag.`,
    order: 2,
    editUrl: false,
  });
  cat += `Every operation in the Theourgia API, grouped by tag and generated from the [OpenAPI specification](/openapi.json). A lock (🔒) marks operations that require a bearer token.

For the base path, authentication, and specification details, see the [API reference](/reference/api/).
`;
  for (const tag of tags) {
    const ops = byTag
      .get(tag)
      .slice()
      .sort(
        (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
      );
    cat += `\n## ${tag}\n\n`;
    cat += `| Method | Path | Summary |\n|---|---|---|\n`;
    for (const o of ops) {
      const lock = o.secured ? "🔒 " : "";
      const summary = (o.summary || "").replace(/\|/g, "\\|");
      cat += `| \`${o.method}\` | \`${o.path}\` | ${lock}${summary} |\n`;
    }
  }
  writeFileSync(join(outPath, "api-endpoints.md"), cat);

  return 2 + opCount; // pages written + operations documented
}

const apiOps = generateApiReference();

console.log(
  `[sync-docs] wrote ${written} content pages across ${SECTIONS.length} sections + 2 API reference pages (${apiOps - 2} operations documented).`,
);
