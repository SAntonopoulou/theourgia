/**
 * Mark a link that INTENTIONALLY leaves the SPA for a root-served
 * public page (the Astro site, the server-rendered /blog/{slug} posts,
 * /sitemap.xml). The admin shell lives under /app, so the raw-link
 * invariant refuses literal root-absolute hrefs in JSX — rightly, for
 * anything meant to stay inside the shell. Public pages are the
 * exception, and routing them through this identity function names the
 * intent at the call site instead of widening the invariant's
 * allowlist per file.
 */
export function publicHref(path: string): string {
  return path;
}
