/**
 * Raw-link invariant (v1-067) — the basename-escape class must not return.
 *
 * The admin SPA is served under Vite's BASE_URL ("/app/" in prod, "/" in
 * dev). BrowserRouter applies that basename to <Link>/<NavLink>/
 * useNavigate — but a RAW absolute-path link (`<a href="/verdicts">`,
 * `window.location.assign("/")`, `window.open("/…")`) bypasses the
 * router, full-page-loads into the public Astro site, and 404s. Dev
 * never catches it because the basename is "" there; prod did
 * (/daily-practice/resh 404'd live).
 *
 * This suite scans admin/src + shared/src source (tests/stories
 * excluded) for the whole pattern class and fails on any new site.
 * The fix is always one of:
 *   · route it through the router — <Link to>/<NavLink>/useNavigate();
 *   · where a plain string is genuinely needed (shared components taking
 *     href props, intentional full reloads), resolve it through
 *     appHref() from admin/src/lib/appHref.ts.
 *
 * Allowed without resolution: /api/* and /ical/* (server routes, never
 * SPA routes), external http(s)/mailto links, SVG "#…" fragment refs,
 * and the enumerated links below that INTENTIONALLY leave the SPA for
 * the public Astro site.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// ─── Scan roots ────────────────────────────────────────────────────────────
// Vitest runs with cwd = the admin package root (import.meta.url is
// http-scheme under jsdom, so process.cwd() is the stable anchor).

const ADMIN_SRC = join(process.cwd(), "src");
const SHARED_SRC = join(process.cwd(), "..", "shared", "src");
const FRONTEND_ROOT = join(process.cwd(), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  "__tests__",
  "storybook-static",
  "test-results",
  "dist",
]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|stories)\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    out.push(full);
  }
  return out;
}

/** Repo-relative posix path for stable allowlist keys + messages. */
function rel(file: string): string {
  return relative(FRONTEND_ROOT, file).split(sep).join("/");
}

// ─── The pattern class ─────────────────────────────────────────────────────
// Every regex requires a literal root-absolute path and carves out
// /api/ + /ical/ (server routes) and protocol-relative "//".

const PATTERNS: readonly { name: string; re: RegExp }[] = [
  {
    name: 'JSX literal href="/…"',
    re: /href="\/(?!\/|api\/|ical\/)[^"]*"/g,
  },
  {
    name: "JSX expression href={\"/…\"} / href={'/…'}",
    re: /href=\{["']\/(?!\/|api\/|ical\/)[^"']*["']\}/g,
  },
  {
    name: "JSX template href={`/…`}",
    re: /href=\{`\/(?!\/|api\/|ical\/)/g,
  },
  {
    name: "window.location write with literal app path",
    re: /window\.location\.(?:href\s*=|assign\(|replace\()\s*["'`]\/(?!\/|api\/|ical\/)/g,
  },
  {
    name: "window.open with literal app path",
    re: /window\.open\(\s*["'`]\/(?!\/|api\/|ical\/)/g,
  },
  {
    // Data-level defaults (copy files) that feed raw <a href={…}> sinks.
    name: 'object-literal href: "/…"',
    re: /href:\s*["'`]\/(?!\/|api\/|ical\/)[^"'`]*["'`]/g,
  },
];

// ─── Allowlist — intentional exits + admin-resolved defaults ───────────────
// Keyed by repo-relative path; values are exact matched substrings that
// are permitted in that file. Add here ONLY links that intentionally
// leave the SPA (public Astro site) or raw defaults that are provably
// resolved through appHref() at every admin call site.

const ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  // Public Astro page — the sign-in footer intentionally leaves the SPA.
  "admin/src/routes/SignInRoute.tsx": ['href="/self-host"'],
  // Public-site chrome — the brand link targets the Astro site root by
  // design (this component renders on public surfaces, not in the shell).
  "shared/src/PublicChrome/PublicChrome.tsx": ['href="/"'],
  // Raw design defaults, resolved via appHref() at the admin call site
  // (AccountSettingsRoute SECTIONS map). Kept raw for root-served hosts.
  "shared/src/AccountSettings/copy.ts": [
    'href: "/settings/keys"',
    'href: "/settings/sessions"',
    'href: "/settings/webauthn"',
    'href: "/settings/data-export"',
    'href: "/settings/audit"',
    'href: "/settings/accessibility"',
    'href: "/settings/delete-account"',
  ],
  // Raw design defaults, overridden via subnavHrefFor at the admin call
  // site (AgentsHomeRoute SUBNAV_HREF). Kept raw for root-served hosts.
  "shared/src/AgentsHome/copy.ts": [
    'href: "/agents"',
    'href: "/agents/marketplace"',
    'href: "/agents/memory"',
    'href: "/agents/cost"',
    'href: "/agents/settings/keys"',
  ],
};

function isAllowed(relPath: string, match: string): boolean {
  return (ALLOWLIST[relPath] ?? []).includes(match);
}

// ─── The invariant ─────────────────────────────────────────────────────────

describe("raw-link invariant — no basename-escaping links in SPA source", () => {
  const files = [...sourceFiles(ADMIN_SRC), ...sourceFiles(SHARED_SRC)];

  it("scans a plausible number of source files", () => {
    // Guard against the walker silently scanning nothing (moved dirs).
    expect(files.length).toBeGreaterThan(400);
  });

  for (const { name, re } of PATTERNS) {
    it(`no unresolved ${name}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        const relPath = rel(file);
        for (const m of text.matchAll(new RegExp(re.source, re.flags))) {
          if (isAllowed(relPath, m[0])) continue;
          const line = text.slice(0, m.index).split("\n").length;
          offenders.push(`${relPath}:${line} → ${m[0]}`);
        }
      }
      const advice =
        "Route them through <Link>/useNavigate, or resolve the string via appHref() (admin/src/lib/appHref.ts)";
      expect(
        offenders,
        `Raw internal link(s) escape the /app basename in prod builds.\n${advice}:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }

  it("allowlist entries still exist in their files (no stale exemptions)", () => {
    const stale: string[] = [];
    for (const [relPath, matches] of Object.entries(ALLOWLIST)) {
      let text: string;
      try {
        text = readFileSync(join(FRONTEND_ROOT, relPath), "utf8");
      } catch {
        stale.push(`${relPath} (file missing)`);
        continue;
      }
      for (const m of matches) {
        if (!text.includes(m)) stale.push(`${relPath} → ${m}`);
      }
    }
    expect(stale, `Stale allowlist entries — prune them:\n${stale.join("\n")}`).toEqual([]);
  });
});
